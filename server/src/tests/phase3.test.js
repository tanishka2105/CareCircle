import request from 'supertest';
import { createApp } from '../app.js';
import { getDb } from '../config/db.js';

describe('Phase 3: Appointments CRUD, Calendar & Accompany Flow', () => {
  let app;
  let db;
  let authToken;
  let profileId;
  let memberId;

  beforeAll(async () => {
    app = createApp();
    db = getDb();

    // Create test profile & admin member
    const profileRes = await request(app)
      .post('/api/profiles')
      .send({
        elderly: { name: 'Kusum Devi', age: 76, language: 'en', timezone: 'Asia/Kolkata' },
        passcode: 'SecretPass123',
        creator: {
          displayName: 'Aarti',
          role: 'family',
          relationship: 'Daughter',
          email: 'aarti@example.com',
          phone: '+919876543230',
        },
      });

    authToken = profileRes.body.data.token;
    profileId = profileRes.body.data.profile.id;
    memberId = profileRes.body.data.member.id;
  });

  test('POST /api/appointments creates appointment with doctor and location', async () => {
    // 2 days from now
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        doctor: 'Dr. R. K. Mehta',
        specialty: 'Cardiologist',
        dateTimeUtc: futureDate,
        location: 'Apollo Clinic, Bangalore',
        notes: 'Follow-up on ECG and BP medication',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.doctor).toBe('Dr. R. K. Mehta');
    expect(res.body.data.specialty).toBe('Cardiologist');
    expect(res.body.data.accompaniedBy).toBeNull();
  });

  test('POST /api/appointments/:id/accompany confirms accompanying member', async () => {
    // 1. Fetch appointments
    const listRes = await request(app)
      .get('/api/appointments?filter=upcoming')
      .set('Authorization', `Bearer ${authToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    const targetAppt = listRes.body.data[0];

    // 2. Accompany
    const accompanyRes = await request(app)
      .post(`/api/appointments/${targetAppt.id}/accompany`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(accompanyRes.status).toBe(200);
    expect(accompanyRes.body.data.accompaniedByName).toBe('Aarti');
    expect(accompanyRes.body.data.accompaniedBy).toBe(memberId);
  });

  test('GET /api/appointments?filter=upcoming filters correctly', async () => {
    // Add past appointment
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        doctor: 'Dr. Sharma',
        specialty: 'Dentist',
        dateTimeUtc: pastDate,
        location: 'City Dental Care',
        notes: 'Annual teeth cleaning',
      });

    const upcomingRes = await request(app)
      .get('/api/appointments?filter=upcoming')
      .set('Authorization', `Bearer ${authToken}`);

    expect(upcomingRes.status).toBe(200);
    expect(upcomingRes.body.data.length).toBe(1);
    expect(upcomingRes.body.data[0].doctor).toBe('Dr. R. K. Mehta');

    const pastRes = await request(app)
      .get('/api/appointments?filter=past')
      .set('Authorization', `Bearer ${authToken}`);

    expect(pastRes.status).toBe(200);
    expect(pastRes.body.data.length).toBe(1);
    expect(pastRes.body.data[0].doctor).toBe('Dr. Sharma');
  });
});
