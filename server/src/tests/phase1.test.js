import request from 'supertest';
import { createApp } from '../app.js';
import { getDb } from '../config/db.js';

describe('Phase 1: Profile Creation, Passcode Auth & Member Directory', () => {
  let app;
  let db;

  beforeAll(() => {
    app = createApp();
    db = getDb();
  });

  beforeEach(() => {
    if (db.clear) {
      db.clear();
    }
  });

  test('POST /api/profiles creates profile, hashes passcode and returns admin session', async () => {
    const res = await request(app)
      .post('/api/profiles')
      .send({
        elderly: {
          name: 'Kamala Devi',
          age: 75,
          language: 'hi',
          timezone: 'Asia/Kolkata',
          emergencyNote: 'Allergic to penicillin, diabetic',
        },
        passcode: 'SecretPass123',
        creator: {
          displayName: 'Priya Sharma',
          role: 'family',
          relationship: 'Daughter',
          email: 'priya@example.com',
          phone: '+919876543210',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.name).toBe('Kamala Devi');
    expect(res.body.data.profile.profileCode).toMatch(/^CARE-[A-Z0-9]{4}$/);
    expect(res.body.data.profile.passcodeHash).toBeUndefined(); // Never leak hash
    expect(res.body.data.member.displayName).toBe('Priya Sharma');
    expect(res.body.data.member.isAdmin).toBe(true);
    expect(res.body.data.token).toBeDefined();

    // Check cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('carecircle_token=');
  });

  test('POST /api/auth/login validates profile code and passcode', async () => {
    // 1. Create Profile
    const createRes = await request(app)
      .post('/api/profiles')
      .send({
        elderly: { name: 'Ramesh Patel', age: 78, language: 'en', timezone: 'Asia/Kolkata' },
        passcode: 'SafeCode789',
        creator: {
          displayName: 'Rahul Patel',
          role: 'family',
          relationship: 'Son',
          email: 'rahul@example.com',
          phone: '+919876543211',
        },
      });

    const { profileCode } = createRes.body.data.profile;
    const memberId = createRes.body.data.member.id;

    // 2. Login with wrong passcode
    const failRes = await request(app)
      .post('/api/auth/login')
      .send({
        profileCode,
        passcode: 'WrongPassword',
        memberId,
      });

    expect(failRes.status).toBe(401);
    expect(failRes.body.success).toBe(false);

    // 3. Login with correct passcode
    const successRes = await request(app)
      .post('/api/auth/login')
      .send({
        profileCode,
        passcode: 'SafeCode789',
        memberId,
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
    expect(successRes.body.data.member.displayName).toBe('Rahul Patel');
  });

  test('POST /api/auth/join adds a second member to the circle', async () => {
    // 1. Create Profile
    const createRes = await request(app)
      .post('/api/profiles')
      .send({
        elderly: { name: 'Savitri Devi', age: 80, language: 'hi', timezone: 'Asia/Kolkata' },
        passcode: 'CirclePass123',
        creator: {
          displayName: 'Anita',
          role: 'caretaker',
          relationship: 'Visiting Nurse',
          email: 'nurse.anita@example.com',
          phone: '+919876543212',
        },
      });

    const { profileCode } = createRes.body.data.profile;

    // 2. Join as daughter
    const joinRes = await request(app)
      .post('/api/auth/join')
      .send({
        profileCode,
        passcode: 'CirclePass123',
        displayName: 'Sunita (Daughter)',
        role: 'family',
        relationship: 'Daughter',
        email: 'sunita@example.com',
        phone: '+919876543213',
      });

    expect(joinRes.status).toBe(201);
    expect(joinRes.body.success).toBe(true);
    expect(joinRes.body.data.member.displayName).toBe('Sunita (Daughter)');
    expect(joinRes.body.data.member.isAdmin).toBe(false);

    // 3. Verify member list has both members
    const membersRes = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${joinRes.body.data.token}`);

    expect(membersRes.status).toBe(200);
    expect(membersRes.body.data).toHaveLength(2);
  });

  test('Cross-tenant profile isolation: Member A cannot access Profile B', async () => {
    // Profile A
    const resA = await request(app)
      .post('/api/profiles')
      .send({
        elderly: { name: 'Elder A', age: 70, language: 'en', timezone: 'Asia/Kolkata' },
        passcode: 'PasswordA1',
        creator: {
          displayName: 'User A',
          role: 'family',
          relationship: 'Son',
          email: 'a@example.com',
          phone: '+919876543214',
        },
      });

    // Profile B
    const resB = await request(app)
      .post('/api/profiles')
      .send({
        elderly: { name: 'Elder B', age: 72, language: 'en', timezone: 'Asia/Kolkata' },
        passcode: 'PasswordB1',
        creator: {
          displayName: 'User B',
          role: 'family',
          relationship: 'Daughter',
          email: 'b@example.com',
          phone: '+919876543215',
        },
      });

    const tokenA = resA.body.data.token;
    const membersA = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(membersA.status).toBe(200);
    expect(membersA.body.data).toHaveLength(1);
    expect(membersA.body.data[0].displayName).toBe('User A');

    // Attempt to delete Profile B's member using Token A
    const memberBId = resB.body.data.member.id;
    const deleteAttempt = await request(app)
      .delete(`/api/members/${memberBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(deleteAttempt.status).toBe(404); // Scoped by Profile A, doc doesn't exist in Profile A
  });
});
