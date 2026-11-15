import { addDays, parseISO, format, isAfter, isBefore, startOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { getDb } from '../config/db.js';

export const generateDosesForMedication = async (medication, daysAhead = 7) => {
  if (!medication.active) return [];

  const db = getDb();
  const profileDoc = await db.collection('profiles').doc(medication.profileId).get();
  const timezone = profileDoc.exists ? profileDoc.data().timezone || 'Asia/Kolkata' : 'Asia/Kolkata';

  const nowZoned = toZonedTime(new Date(), timezone);
  const startDateZoned = medication.startDate
    ? toZonedTime(parseISO(medication.startDate), timezone)
    : startOfDay(nowZoned);
  const endDateZoned = medication.endDate
    ? toZonedTime(parseISO(medication.endDate), timezone)
    : null;

  const generatedDoses = [];

  // Iterate over each of the next daysAhead days
  for (let d = 0; d < daysAhead; d++) {
    const targetDay = addDays(nowZoned, d);
    const dayOfWeek = targetDay.getDay(); // 0 = Sunday, 6 = Saturday

    // Check if medication is scheduled for this day of week
    if (Array.isArray(medication.days) && medication.days.length > 0) {
      if (!medication.days.includes(dayOfWeek)) {
        continue;
      }
    }

    // Check start and end date bounds
    if (isBefore(targetDay, startOfDay(startDateZoned))) {
      continue;
    }
    if (endDateZoned && isAfter(targetDay, endDateZoned)) {
      continue;
    }

    const dateStr = format(targetDay, 'yyyy-MM-dd');

    // For each scheduled time (e.g. ['08:00', '20:00'])
    for (const timeStr of medication.times || []) {
      const scheduledDateTimeStr = `${dateStr}T${timeStr}:00`;
      const scheduledUtc = fromZonedTime(scheduledDateTimeStr, timezone).toISOString();

      // Check if dose already exists (Idempotent)
      const existingDose = await db.collection('doseLogs')
        .where('profileId', '==', medication.profileId)
        .where('medicationId', '==', medication.id)
        .where('scheduledAtUtc', '==', scheduledUtc)
        .get();

      if (existingDose.empty) {
        const newDose = {
          profileId: medication.profileId,
          medicationId: medication.id,
          medicationName: medication.name,
          dosage: medication.dosage,
          form: medication.form,
          mealRelation: medication.mealRelation,
          colour: medication.colour || '#10b981',
          scheduledAtUtc: scheduledUtc,
          scheduledDate: dateStr,
          scheduledTime: timeStr,
          status: 'pending', // pending | taken | skipped | missed
          markedBy: null,
          markedByName: null,
          markedAt: null,
          upcomingSent: false,
          missedSent: false,
          handledBy: null,
          handledByName: null,
          handledAt: null,
          handledNote: null,
          createdAt: new Date().toISOString(),
        };

        const docRef = await db.collection('doseLogs').add(newDose);
        generatedDoses.push({ id: docRef.id, ...newDose });
      }
    }
  }

  return generatedDoses;
};

export const cleanupFuturePendingDoses = async (profileId, medicationId) => {
  const db = getDb();
  const nowUtc = new Date().toISOString();

  const dosesSnap = await db.collection('doseLogs')
    .where('profileId', '==', profileId)
    .where('medicationId', '==', medicationId)
    .where('status', '==', 'pending')
    .get();

  const batch = db.batch();
  dosesSnap.forEach((doc) => {
    const data = doc.data();
    if (data.scheduledAtUtc >= nowUtc) {
      batch.delete(doc.ref || db.collection('doseLogs').doc(doc.id));
    }
  });

  await batch.commit();
};
