import { z } from 'zod';
import { getDb } from '../config/db.js';
import {
  generateDosesForMedication,
  cleanupFuturePendingDoses,
} from '../services/doseSchedulerService.js';

const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required (e.g. 500 mg)'),
  form: z.enum(['tablet', 'capsule', 'syrup', 'injection', 'drops', 'inhaler', 'other']).default('tablet'),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM format')).min(1, 'At least one scheduled time is required'),
  days: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
  startDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  endDate: z.string().nullable().optional(),
  mealRelation: z.enum(['before_food', 'after_food', 'with_food', 'independent']).default('after_food'),
  notes: z.string().optional().default(''),
  stockCount: z.number().int().min(0).default(30),
  refillThreshold: z.number().int().min(0).default(5),
  active: z.boolean().default(true),
  colour: z.string().default('#10b981'),
});

export const getMedications = async (req, res, next) => {
  try {
    const db = getDb();
    const medsSnap = await db.collection('medications')
      .where('profileId', '==', req.profileId)
      .get();

    const medications = medsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({
      success: true,
      data: medications,
    });
  } catch (err) {
    next(err);
  }
};

export const createMedication = async (req, res, next) => {
  try {
    const validated = medicationSchema.parse(req.body);
    const db = getDb();

    // Duplicate Check: Check if medicine with similar name and time already exists
    const existingMedsSnap = await db.collection('medications')
      .where('profileId', '==', req.profileId)
      .where('active', '==', true)
      .get();

    let duplicateWarning = null;
    const lowerName = validated.name.toLowerCase().trim();

    for (const doc of existingMedsSnap.docs) {
      const existing = doc.data();
      if (existing.name.toLowerCase().trim() === lowerName) {
        const overlappingTimes = (existing.times || []).filter((t) => validated.times.includes(t));
        if (overlappingTimes.length > 0) {
          duplicateWarning = `Warning: "${existing.name}" is already scheduled at ${overlappingTimes.join(', ')}.`;
          break;
        }
      }
    }

    const now = new Date().toISOString();
    const medRef = await db.collection('medications').add({
      profileId: req.profileId,
      ...validated,
      createdBy: req.memberId,
      createdByName: req.member.displayName,
      createdAt: now,
      updatedAt: now,
    });

    const newMed = {
      id: medRef.id,
      profileId: req.profileId,
      ...validated,
    };

    // Generate upcoming 7 days doses if active
    if (newMed.active) {
      await generateDosesForMedication(newMed, 7);
    }

    // Log Activity
    await db.collection('activity').add({
      profileId: req.profileId,
      actorId: req.memberId,
      action: 'added_medication',
      entityType: 'medication',
      entityId: medRef.id,
      details: { name: newMed.name, dosage: newMed.dosage, times: newMed.times },
      createdAt: now,
    });

    return res.status(201).json({
      success: true,
      duplicateWarning,
      data: newMed,
    });
  } catch (err) {
    next(err);
  }
};

export const updateMedication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = medicationSchema.partial().parse(req.body);
    const db = getDb();

    const medRef = db.collection('medications').doc(id);
    const medDoc = await medRef.get();

    if (!medDoc.exists || medDoc.data().profileId !== req.profileId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Medication not found', code: 'NOT_FOUND' },
      });
    }

    const currentMed = medDoc.data();
    const now = new Date().toISOString();
    const updatePayload = {
      ...validated,
      updatedAt: now,
    };

    await medRef.update(updatePayload);
    const updatedMed = { id, ...currentMed, ...updatePayload };

    // Sync future pending doses
    await cleanupFuturePendingDoses(req.profileId, id);
    if (updatedMed.active) {
      await generateDosesForMedication(updatedMed, 7);
    }

    // Log activity
    await db.collection('activity').add({
      profileId: req.profileId,
      actorId: req.memberId,
      action: 'updated_medication',
      entityType: 'medication',
      entityId: id,
      details: { name: updatedMed.name, updatedFields: Object.keys(validated) },
      createdAt: now,
    });

    return res.status(200).json({
      success: true,
      data: updatedMed,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteMedication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const medRef = db.collection('medications').doc(id);
    const medDoc = await medRef.get();

    if (!medDoc.exists || medDoc.data().profileId !== req.profileId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Medication not found', code: 'NOT_FOUND' },
      });
    }

    const medName = medDoc.data().name;

    // Remove future pending doses
    await cleanupFuturePendingDoses(req.profileId, id);

    // Delete medication doc
    await medRef.delete();

    // Log activity
    await db.collection('activity').add({
      profileId: req.profileId,
      actorId: req.memberId,
      action: 'deleted_medication',
      entityType: 'medication',
      entityId: id,
      details: { name: medName },
      createdAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      data: { message: `Medication ${medName} removed successfully.` },
    });
  } catch (err) {
    next(err);
  }
};
