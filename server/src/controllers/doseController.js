import { z } from 'zod';
import { getDb } from '../config/db.js';
import { logActivity } from './activityController.js';

const UNDO_WINDOW_MINUTES = 15;

const updateDoseStatusSchema = z.object({
  status: z.enum(['taken', 'skipped', 'undo']),
});

const handleDoseSchema = z.object({
  note: z.string().max(300, 'Note too long').optional().default(''),
});

// Atomically adjust stock. Returns { med, before, after } or null if med not found.
const adjustStock = async (db, medicationId, delta) => {
  if (!medicationId) return null;
  const medRef = db.collection('medications').doc(medicationId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(medRef);
    if (!snap.exists) return null;
    const med = snap.data();
    const before = med.stockCount || 0;
    const after = Math.max(0, before + delta);
    tx.update(medRef, { stockCount: after });
    return { med, before, after };
  });
};

// Create an in-app notification for every member of the circle (optionally skipping one)
const notifyMembers = async (db, profileId, { excludeMemberId = null, type, title, body, meta = {} }) => {
  const membersSnap = await db.collection('members').where('profileId', '==', profileId).get();
  const now = new Date().toISOString();
  const batch = db.batch();
  let count = 0;

  membersSnap.docs.forEach((m) => {
    if (m.id === excludeMemberId) return;
    batch.set(db.collection('notifications').doc(), {
      profileId,
      memberId: m.id,
      type,
      title,
      body,
      isRead: false,
      readAt: null,
      createdAt: now,
      meta,
    });
    count++;
  });

  if (count > 0) await batch.commit();
};

export const getDoses = async (req, res, next) => {
  try {
    const { date, startDate, endDate } = req.query;
    const db = getDb();

    let query = db.collection('doseLogs').where('profileId', '==', req.profileId);

    if (date) {
      query = query.where('scheduledDate', '==', date);
    } else if (startDate && endDate) {
      // Needs composite index: profileId ASC + scheduledDate ASC (same one reports use)
      query = query
        .where('scheduledDate', '>=', startDate)
        .where('scheduledDate', '<=', endDate);
    }

    const dosesSnap = await query.get();
    const doses = dosesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by scheduledAtUtc ascending
    doses.sort((a, b) => (a.scheduledAtUtc > b.scheduledAtUtc ? 1 : -1));

    return res.status(200).json({
      success: true,
      data: doses,
    });
  } catch (err) {
    next(err);
  }
};

export const updateDoseStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = updateDoseStatusSchema.parse(req.body);
    const db = getDb();

    const doseRef = db.collection('doseLogs').doc(id);
    const doseDoc = await doseRef.get();

    if (!doseDoc.exists || doseDoc.data().profileId !== req.profileId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Dose record not found', code: 'NOT_FOUND' },
      });
    }

    const currentDose = doseDoc.data();
    const now = new Date().toISOString();
    const memberName = req.member.displayName;
    const doseMeta = {
      doseId: id,
      medicationName: currentDose.medicationName,
      scheduledTime: currentDose.scheduledTime,
    };

    // 1. UNDO Action (within 15 minutes window)
    if (status === 'undo') {
      if (!currentDose.markedAt) {
        return res.status(400).json({
          success: false,
          error: { message: 'Dose has not been marked yet.', code: 'BAD_REQUEST' },
        });
      }

      const diffMinutes = (Date.now() - new Date(currentDose.markedAt).getTime()) / (60 * 1000);
      if (diffMinutes > UNDO_WINDOW_MINUTES) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Undo window of ${UNDO_WINDOW_MINUTES} minutes has expired.`,
            code: 'UNDO_EXPIRED',
          },
        });
      }

      // If it was marked 'taken', restore stock
      if (currentDose.status === 'taken') {
        await adjustStock(db, currentDose.medicationId, +1);
      }

      const resetPayload = {
        status: 'pending',
        markedBy: null,
        markedByName: null,
        markedAt: null,
      };
      await doseRef.update(resetPayload);

      await logActivity(
        db,
        req.profileId,
        req.memberId,
        memberName,
        'dose_undone',
        `${memberName} undid ${currentDose.medicationName}`,
        doseMeta
      );

      return res.status(200).json({
        success: true,
        data: { id, ...currentDose, ...resetPayload },
      });
    }

    // 2. Idempotent: already in this state -> do nothing (prevents double stock decrement)
    if (currentDose.status === status) {
      return res.status(200).json({
        success: true,
        data: { id, ...currentDose },
      });
    }

    // 3. MARK AS TAKEN OR SKIPPED
    const updatePayload = {
      status,
      markedBy: req.memberId,
      markedByName: memberName,
      markedAt: now,
    };

    await doseRef.update(updatePayload);

    // Stock bookkeeping
    if (status === 'taken') {
      const result = await adjustStock(db, currentDose.medicationId, -1);

      if (result) {
        const threshold = result.med.refillThreshold || 5;
        if (result.after <= threshold && result.before > threshold) {
          await notifyMembers(db, req.profileId, {
            type: 'stock',
            title: `Low Stock: ${result.med.name}`,
            body: `Only ${result.after} pills remaining for ${result.med.name}. Please plan a refill soon.`,
            meta: { medicationId: currentDose.medicationId },
          });
        }
      }
    } else if (currentDose.status === 'taken') {
      // taken -> skipped: give the pill back
      await adjustStock(db, currentDose.medicationId, +1);
    }

    await logActivity(
      db,
      req.profileId,
      req.memberId,
      memberName,
      status === 'taken' ? 'dose_taken' : 'dose_skipped',
      status === 'taken'
        ? `${memberName} marked ${currentDose.medicationName} as taken`
        : `${memberName} skipped ${currentDose.medicationName}`,
      doseMeta
    );

    return res.status(200).json({
      success: true,
      data: { id, ...currentDose, ...updatePayload },
    });
  } catch (err) {
    next(err);
  }
};

export const handleMissedDose = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = handleDoseSchema.parse(req.body);
    const db = getDb();

    const doseRef = db.collection('doseLogs').doc(id);
    const doseDoc = await doseRef.get();

    if (!doseDoc.exists || doseDoc.data().profileId !== req.profileId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Dose record not found', code: 'NOT_FOUND' },
      });
    }

    const currentDose = doseDoc.data();

    if (currentDose.status !== 'missed') {
      return res.status(400).json({
        success: false,
        error: { message: 'Only missed doses can be handled.', code: 'NOT_MISSED' },
      });
    }

    // Someone else already claimed it -> tell this member who
    if (currentDose.handledBy && currentDose.handledBy !== req.memberId) {
      return res.status(409).json({
        success: false,
        error: {
          message: `${currentDose.handledByName || 'Another member'} is already handling this dose.`,
          code: 'ALREADY_HANDLED',
        },
      });
    }

    const now = new Date().toISOString();
    const memberName = req.member.displayName;

    const updatePayload = {
      handledBy: req.memberId,
      handledByName: memberName,
      handledAt: now,
      handledNote: note || 'Handling confirmed',
    };

    await doseRef.update(updatePayload);

    await logActivity(
      db,
      req.profileId,
      req.memberId,
      memberName,
      'missed_dose_handled',
      `${memberName} is handling the missed ${currentDose.medicationName} dose`,
      {
        doseId: id,
        medicationName: currentDose.medicationName,
        scheduledTime: currentDose.scheduledTime,
        note: updatePayload.handledNote,
      }
    );

    // Notify other circle members so nobody duplicates effort
    await notifyMembers(db, req.profileId, {
      excludeMemberId: req.memberId,
      type: 'missed_dose_handled',
      title: 'Missed Dose Acknowledged',
      body: `${memberName} is handling missed ${currentDose.medicationName}: "${updatePayload.handledNote}"`,
      meta: { doseId: id },
    });

    return res.status(200).json({
      success: true,
      data: { id, ...currentDose, ...updatePayload },
    });
  } catch (err) {
    next(err);
  }
};