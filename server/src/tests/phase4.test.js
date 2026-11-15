import request from 'supertest';
import { createApp } from '../app.js';
import { getDb } from '../config/db.js';
import { env } from '../config/env.js';

describe('Phase 4: Cron Scheduler, Proactive Reminders & Notifications', () => {
  let app;
  let db;
  let authToken;
  let profileId;
  let memberId;

  beforeAll(async () => {
    app = createApp();
    db = getDb();

    // 1. Create Profile & Admin Member
    const profileRes = await request(app)
      .post('/api/profiles')
      .send({
        elderly: { name: 'Shanti Devi', age: 74, language: 'en', timezone: 'Asia/Kolkata' },
        passcode: 'SecretPass123',
        creator: {
          displayName: 'Vikram',
          role: 'family',
          relationship: 'Son',
          email: 'vikram@example.com',
          phone: '+919876543240',
        },
      });

    authToken = profileRes.body.data.token;
    profileId = profileRes.body.data.profile.id;
    memberId = profileRes.body.data.member.id;
  });

  test('GET /api/cron/tick rejects unauthorized calls without valid secret', async () => {
    const res = await request(app).get('/api/cron/tick');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);

    const badSecretRes = await request(app)
      .get('/api/cron/tick')
      .set('x-cron-secret', 'wrong_secret');
    expect(badSecretRes.status).toBe(401);
  });

  test('GET /api/cron/tick triggers upcoming dose email within 10 minutes', async () => {
    // Insert a dose scheduled 5 minutes from now
    const fiveMinsAhead = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const doseRef = await db.collection('doseLogs').add({
      profileId,
      medicationId: 'med_test_1',
      medicationName: 'Amlodipine',
      dosage: '5 mg',
      scheduledAtUtc: fiveMinsAhead,
      scheduledDate: fiveMinsAhead.split('T')[0],
      scheduledTime: '10:00',
      status: 'pending',
      upcomingSent: false,
      missedSent: false,
    });

    // Make Vikram subscribed to upcoming dose emails
    await db.collection('members').doc(memberId).update({
      notificationPrefs: {
        upcomingDoseEmail: true,
        missedDoseEmail: true,
        inAppAlerts: true,
      },
    });

    const res = await request(app)
      .get('/api/cron/tick')
      .set('x-cron-secret', env.CRON_SECRET);

    expect(res.status).toBe(200);
    expect(res.body.stats.upcomingDoseEmailsSent).toBeGreaterThanOrEqual(1);

    // Verify upcomingSent flag was set to true
    const updatedDose = await db.collection('doseLogs').doc(doseRef.id).get();
    expect(updatedDose.data().upcomingSent).toBe(true);

    // Calling tick AGAIN does not re-send (Idempotency)
    const secondRes = await request(app)
      .get('/api/cron/tick')
      .set('x-cron-secret', env.CRON_SECRET);

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.stats.upcomingDoseEmailsSent).toBe(0);
  });

  test('GET /api/cron/tick transitions overdue dose (>30 min) to MISSED', async () => {
    // Insert a dose scheduled 45 minutes ago
    const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    const doseRef = await db.collection('doseLogs').add({
      profileId,
      medicationId: 'med_test_2',
      medicationName: 'Atorvastatin',
      dosage: '10 mg',
      scheduledAtUtc: fortyFiveMinsAgo,
      scheduledDate: fortyFiveMinsAgo.split('T')[0],
      scheduledTime: '08:00',
      status: 'pending',
      upcomingSent: true,
      missedSent: false,
    });

    const res = await request(app)
      .get('/api/cron/tick')
      .set('x-cron-secret', env.CRON_SECRET);

    expect(res.status).toBe(200);
    expect(res.body.stats.dosesMarkedMissed).toBeGreaterThanOrEqual(1);
    expect(res.body.stats.missedDoseEmailsSent).toBeGreaterThanOrEqual(1);

    // Verify status became missed
    const updatedDose = await db.collection('doseLogs').doc(doseRef.id).get();
    expect(updatedDose.data().status).toBe('missed');
    expect(updatedDose.data().missedSent).toBe(true);
  });

  test('GET /api/notifications returns user in-app notifications and marks read', async () => {
    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${authToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThan(0);

    const firstNotif = listRes.body.data[0];

    // Mark single read
    const readRes = await request(app)
      .patch(`/api/notifications/${firstNotif.id}/read`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(readRes.status).toBe(200);
    expect(readRes.body.data.readAt).toBeDefined();

    // Mark all read
    const allReadRes = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${authToken}`);

    expect(allReadRes.status).toBe(200);
    expect(allReadRes.body.success).toBe(true);
  });
});
