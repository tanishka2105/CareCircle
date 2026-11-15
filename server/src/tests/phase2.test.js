import request from 'supertest';
import { createApp } from '../app.js';
import { getDb } from '../config/db.js';

describe('Phase 2: Medications CRUD & 7-Day Dose Logging', () => {
  let app;
  let db;
  let authToken;
  let profileId;
  let memberId;
  let createdMedicationId;

  beforeAll(async () => {
    app = createApp();
    db = getDb();

    // Create a test profile and admin member
    const profileRes = await request(app)
      .post('/api/profiles')
      .send({
        elderly: { name: 'Savitri Devi', age: 79, language: 'en', timezone: 'Asia/Kolkata' },
        passcode: 'SecretPass123',
        creator: {
          displayName: 'Ravi Kumar',
          role: 'family',
          relationship: 'Son',
          email: 'ravi@example.com',
          phone: '+919876543220',
        },
      });

    authToken = profileRes.body.data.token;
    profileId = profileRes.body.data.profile.id;
    memberId = profileRes.body.data.member.id;
  });

  test('POST /api/medications creates med and generates 7 days of dose entries', async () => {
    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Metformin',
        dosage: '500 mg',
        form: 'tablet',
        times: ['08:00', '20:00'],
        days: [0, 1, 2, 3, 4, 5, 6],
        mealRelation: 'after_food',
        stockCount: 60,
        refillThreshold: 10,
        active: true,
        colour: '#10b981',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Metformin');
    expect(res.body.duplicateWarning).toBeNull();
    createdMedicationId = res.body.data.id;

    // Verify doseLogs generated (2 times per day * 7 days = 14 doses)
    const dosesSnap = await db.collection('doseLogs')
      .where('profileId', '==', profileId)
      .where('medicationId', '==', createdMedicationId)
      .get();

    expect(dosesSnap.size).toBe(14);
  });

  test('POST /api/medications detects duplicates', async () => {
    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Metformin',
        dosage: '500 mg',
        form: 'tablet',
        times: ['08:00'],
        days: [0, 1, 2, 3, 4, 5, 6],
        mealRelation: 'after_food',
      });

    expect(res.status).toBe(201);
    expect(res.body.duplicateWarning).toBeDefined();
    expect(res.body.duplicateWarning).toContain('already scheduled');
  });

  test('PATCH /api/doses/:id marks dose taken and decrements stockCount', async () => {
    // 1. Fetch doses specifically for createdMedicationId
    const dosesRes = await request(app)
      .get('/api/doses')
      .set('Authorization', `Bearer ${authToken}`);

    expect(dosesRes.status).toBe(200);
    const targetDoses = dosesRes.body.data.filter((d) => d.medicationId === createdMedicationId);
    expect(targetDoses.length).toBeGreaterThan(0);

    const doseToTake = targetDoses[0];

    // 2. Mark taken
    const takeRes = await request(app)
      .patch(`/api/doses/${doseToTake.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'taken' });

    expect(takeRes.status).toBe(200);
    expect(takeRes.body.data.status).toBe('taken');
    expect(takeRes.body.data.markedByName).toBe('Ravi Kumar');

    // 3. Verify medication stock was decremented from 60 to 59
    const medDoc = await db.collection('medications').doc(createdMedicationId).get();
    expect(medDoc.data().stockCount).toBe(59);

    // 4. Undo the mark within window
    const undoRes = await request(app)
      .patch(`/api/doses/${doseToTake.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'undo' });

    expect(undoRes.status).toBe(200);
    expect(undoRes.body.data.status).toBe('pending');
    expect(undoRes.body.data.markedBy).toBeNull();

    // 5. Verify stock was restored to 60
    const restoredMedDoc = await db.collection('medications').doc(createdMedicationId).get();
    expect(restoredMedDoc.data().stockCount).toBe(60);
  });

  test('POST /api/doses/:id/handle acknowledges missed dose', async () => {
    const dosesRes = await request(app)
      .get('/api/doses')
      .set('Authorization', `Bearer ${authToken}`);

    const targetDose = dosesRes.body.data.find((d) => d.medicationId === createdMedicationId);

    const handleRes = await request(app)
      .post(`/api/doses/${targetDose.id}/handle`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ note: 'Called Mother and reminded her to take it' });

    expect(handleRes.status).toBe(200);
    expect(handleRes.body.data.handledByName).toBe('Ravi Kumar');
    expect(handleRes.body.data.handledNote).toContain('Called Mother');
  });
});
