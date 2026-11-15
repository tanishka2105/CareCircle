import { z } from 'zod';
import { getDb } from '../config/db.js';

const updateDoseStatusSchema = z.object({
  status: z.enum(['taken', 'skipped', 'undo']),
});

const handleDoseSchema = z.object({
  note: z.string().optional().default(''),
});

export const getDoses = async (req, res, next) => {
  try {
    const { date, startDate, endDate } = req.query;
    const db = getDb();

    let query = db.collection('doseLogs').where('profileId', '==', req.profileId);

    if (date) {
      query = query.where('scheduledDate', '==', date);
    }

    const dosesSnap = await query.get();
    let doses = dosesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // If date range specified
    if (startDate && endDate) {
      doses = doses.filter(
        (d) => d.scheduledDate >= startDate && d.scheduledDate <= endDate
      );
    }

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

    // 1. UNDO Action (within 15 minutes window)
    if (status === 'undo') {
      if (!currentDose.markedAt) {
        return res.status(400).json({
          success: false,
          error: { message: 'Dose has not been marked yet.', code: 'BAD_REQUEST' },
        });
      }

      const markedTime = new Date(currentDose.markedAt).getTime();
      const diffMinutes = (Date.now() - markedTime) / (60 * 1000);
      if (diffMinutes > 15) {
        return res.status(400).json({
          success: false,
          error: { message: 'Undo window of 15 minutes has expired.', code: 'UNDO_EXPIRED' },
        });
      }

      // If it was marked 'taken', restore stock
      if (currentDose.status === 'taken' && currentDose.medicationId) {
        const medRef = db.collection('medications').doc(currentDose.medicationId);
        const medDoc = await medRef.get();
        if (medDoc.exists) {
          const currentStock = medDoc.data().stockCount || 0;
          await medRef.update({ stockCount: currentStock + 1 });
        }
      }

      await doseRef.update({
        status: 'pending',
        markedBy: null,
        markedByName: null,
        markedAt: null,
      });

      // Log activity
      await db.collection('activity').add({
        profileId: req.profileId,
        actorId: req.memberId,
        action: 'undid_dose',
        entityType: 'dose',
        entityId: id,
        details: { medicationName: currentDose.medicationName, scheduledTime: currentDose.scheduledTime },
        createdAt: now,
      });

      const updatedSnap = await doseRef.get();
      return res.status(200).json({
        success: true,
        data: updatedSnap.data(),
      });
    }

    // 2. MARK AS TAKEN OR SKIPPED
    const updatePayload = {
      status,
      markedBy: req.memberId,
      markedByName: req.member.displayName,
      markedAt: now,
    };

    await doseRef.update(updatePayload);

    // If taken, decrement stock
    if (status === 'taken' && currentDose.medicationId) {
      const medRef = db.collection('medications').doc(currentDose.medicationId);
      const medDoc = await medRef.get();

      if (medDoc.exists) {
        const medData = medDoc.data();
        const currentStock = medData.stockCount || 0;
        const newStock = Math.max(0, currentStock - 1);
        await medRef.update({ stockCount: newStock });

        // Check refill threshold
        if (newStock <= (medData.refillThreshold || 5) && currentStock > (medData.refillThreshold || 5)) {
          // Trigger low stock notification
          const membersSnap = await db.collection('members').where('profileId', '==', req.profileId).get();
          membersSnap.forEach(async (memberDoc) => {
            await db.collection('notifications').add({
              profileId: req.profileId,
              memberId: memberDoc.id,
              type: 'stock',
              title: `Low Stock: ${medData.name}`,
              body: `Only ${newStock} pills remaining for ${medData.name}. Please plan a refill soon.`,
              readAt: null,
              createdAt: now,
            });
          });
        }
      }
    }

    // Log Activity
    await db.collection('activity').add({
      profileId: req.profileId,
      actorId: req.memberId,
      action: status === 'taken' ? 'took_dose' : 'skipped_dose',
      entityType: 'dose',
      entityId: id,
      details: {
        medicationName: currentDose.medicationName,
        scheduledTime: currentDose.scheduledTime,
        markedByName: req.member.displayName,
      },
      createdAt: now,
    });

    const updatedSnap = await doseRef.get();
    return res.status(200).json({
      success: true,
      data: updatedSnap.data(),
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
    const now = new Date().toISOString();

    const updatePayload = {
      handledBy: req.memberId,
      handledByName: req.member.displayName,
      handledAt: now,
      handledNote: note || 'Handling confirmed',
    };

    await doseRef.update(updatePayload);

    // Activity log
    await db.collection('activity').add({
      profileId: req.profileId,
      actorId: req.memberId,
      action: 'handled_missed_dose',
      entityType: 'dose',
      entityId: id,
      details: {
        medicationName: currentDose.medicationName,
        handler: req.member.displayName,
        note: updatePayload.handledNote,
      },
      createdAt: now,
    });

    // Notify other circle members so nobody duplicates effort
    const membersSnap = await db.collection('members').where('profileId', '==', req.profileId).get();
    membersSnap.forEach(async (doc) => {
      if (doc.id !== req.memberId) {
        await db.collection('notifications').add({
          profileId: req.profileId,
          memberId: doc.id,
          type: 'missed_dose_handled',
          title: 'Missed Dose Acknowledged',
          body: `${req.member.displayName} acknowledged missed ${currentDose.medicationName}: "${updatePayload.handledNote}"`,
          readAt: null,
          createdAt: now,
        });
      }
    });

    const updatedSnap = await doseRef.get();
    return res.status(200).json({
      success: true,
      data: updatedSnap.data(),
    });
  } catch (err) {
    next(err);
  }
};
