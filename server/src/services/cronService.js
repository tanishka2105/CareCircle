import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { getDb } from '../config/db.js';
import { env } from '../config/env.js';
import {
  sendEmail,
  getUpcomingDoseHtml,
  getMissedDoseHtml,
  getAppointmentReminderHtml,
  getDailySummaryHtml,
} from './emailService.js';
import { generateDosesForMedication } from './doseSchedulerService.js';

export const runCronTick = async () => {
  const db = getDb();
  const now = new Date();
  const nowUtc = now.toISOString();
  const appUrl = env.CLIENT_URL || 'http://localhost:5173';

  const stats = {
    upcomingDoseEmailsSent: 0,
    missedDoseEmailsSent: 0,
    appointmentEmailsSent: 0,
    dailySummaryEmailsSent: 0,
    dosesMarkedMissed: 0,
  };

  const profilesSnap = await db.collection('profiles').get();

  for (const profileDoc of profilesSnap.docs) {
    const profile = profileDoc.data();
    const profileId = profileDoc.id;
    const timezone = profile.timezone || 'Asia/Kolkata';

    // Fetch members and their preferences
    const membersSnap = await db.collection('members').where('profileId', '==', profileId).get();
    const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // ========================================================
    // RULE A: Dose due within 10 minutes (upcoming dose)
    // ========================================================
    const tenMinutesAheadUtc = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const upcomingDosesSnap = await db.collection('doseLogs')
      .where('profileId', '==', profileId)
      .where('status', '==', 'pending')
      .where('upcomingSent', '==', false)
      .get();

    for (const doseDoc of upcomingDosesSnap.docs) {
      const dose = doseDoc.data();
      // If scheduled within 10 minutes
      if (dose.scheduledAtUtc >= nowUtc && dose.scheduledAtUtc <= tenMinutesAheadUtc) {
        // Mark upcomingSent: true first (idempotent flag)
        await db.collection('doseLogs').doc(doseDoc.id).update({ upcomingSent: true });

        // Find subscribed members
        const subscribers = members.filter(
          (m) => m.notificationPrefs?.upcomingDoseEmail && m.email
        );

        for (const sub of subscribers) {
          await sendEmail({
            to: sub.email,
            subject: `Upcoming dose: ${dose.medicationName} (${dose.dosage}) for ${profile.name} at ${dose.scheduledTime}`,
            html: getUpcomingDoseHtml({
              elderlyName: profile.name,
              medicineName: dose.medicationName,
              dosage: dose.dosage,
              time: dose.scheduledTime,
              mealRelation: dose.mealRelation,
              appUrl,
            }),
          });
          stats.upcomingDoseEmailsSent++;
        }

        // In-app notification
        for (const m of members) {
          if (m.notificationPrefs?.inAppAlerts !== false) {
            await db.collection('notifications').add({
              profileId,
              memberId: m.id,
              type: 'upcoming_dose',
              title: `Dose Due Soon: ${dose.medicationName}`,
              body: `${dose.medicationName} (${dose.dosage}) for ${profile.name} is due at ${dose.scheduledTime}.`,
              readAt: null,
              createdAt: nowUtc,
            });
          }
        }
      }
    }

    // ========================================================
    // RULE B: Dose still pending 30 minutes after scheduled time (MISSED)
    // ========================================================
    const thirtyMinutesAgoUtc = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const missedDosesSnap = await db.collection('doseLogs')
      .where('profileId', '==', profileId)
      .where('status', '==', 'pending')
      .get();

    for (const doseDoc of missedDosesSnap.docs) {
      const dose = doseDoc.data();
      // Overdue by 30+ minutes
      if (dose.scheduledAtUtc <= thirtyMinutesAgoUtc && !dose.missedSent) {
        // Update to MISSED & mark missedSent: true
        await db.collection('doseLogs').doc(doseDoc.id).update({
          status: 'missed',
          missedSent: true,
        });
        stats.dosesMarkedMissed++;

        // Send alert to subscribed members
        const subscribers = members.filter(
          (m) => m.notificationPrefs?.missedDoseEmail && m.email
        );

        for (const sub of subscribers) {
          await sendEmail({
            to: sub.email,
            subject: `Missed dose: ${dose.medicationName} for ${profile.name} at ${dose.scheduledTime}`,
            html: getMissedDoseHtml({
              elderlyName: profile.name,
              medicineName: dose.medicationName,
              dosage: dose.dosage,
              time: dose.scheduledTime,
              appUrl,
            }),
          });
          stats.missedDoseEmailsSent++;
        }

        // High priority in-app notification to all members
        for (const m of members) {
          if (m.notificationPrefs?.inAppAlerts !== false) {
            await db.collection('notifications').add({
              profileId,
              memberId: m.id,
              type: 'missed_dose',
              title: `Missed Dose: ${dose.medicationName}`,
              body: `${profile.name} has not logged ${dose.medicationName} scheduled at ${dose.scheduledTime}. Tap to acknowledge.`,
              readAt: null,
              createdAt: nowUtc,
            });
          }
        }

        // Log activity
        await db.collection('activity').add({
          profileId,
          actorId: 'system_cron',
          action: 'dose_missed',
          entityType: 'dose',
          entityId: doseDoc.id,
          details: { medicationName: dose.medicationName, scheduledTime: dose.scheduledTime },
          createdAt: nowUtc,
        });
      }
    }

    // ========================================================
    // RULE C: Appointments in 24 hours & in 1 hour
    // ========================================================
    const apptsSnap = await db.collection('appointments')
      .where('profileId', '==', profileId)
      .get();

    for (const apptDoc of apptsSnap.docs) {
      const appt = apptDoc.data();
      const apptTime = new Date(appt.dateTimeUtc).getTime();
      const diffMs = apptTime - now.getTime();
      const diffHours = diffMs / (60 * 60 * 1000);

      // 24 Hour Reminder (23h - 25h)
      if (diffHours >= 23 && diffHours <= 25 && !appt.reminder24hSent) {
        await db.collection('appointments').doc(apptDoc.id).update({ reminder24hSent: true });

        const subscribers = members.filter((m) => m.notificationPrefs?.appointmentEmail && m.email);
        for (const sub of subscribers) {
          await sendEmail({
            to: sub.email,
            subject: `Doctor Appointment Reminder (Tomorrow): Dr. ${appt.doctor} for ${profile.name}`,
            html: getAppointmentReminderHtml({
              elderlyName: profile.name,
              doctor: appt.doctor,
              specialty: appt.specialty,
              time: new Date(appt.dateTimeUtc).toLocaleString(),
              location: appt.location,
              appUrl,
              timeframe: 'Tomorrow',
            }),
          });
          stats.appointmentEmailsSent++;
        }
      }

      // 1 Hour Reminder (0 - 1.2h)
      if (diffHours >= 0 && diffHours <= 1.2 && !appt.reminder1hSent) {
        await db.collection('appointments').doc(apptDoc.id).update({ reminder1hSent: true });

        const subscribers = members.filter((m) => m.notificationPrefs?.appointmentEmail && m.email);
        for (const sub of subscribers) {
          await sendEmail({
            to: sub.email,
            subject: `Doctor Appointment Starting Soon (1 Hour): Dr. ${appt.doctor} for ${profile.name}`,
            html: getAppointmentReminderHtml({
              elderlyName: profile.name,
              doctor: appt.doctor,
              specialty: appt.specialty,
              time: new Date(appt.dateTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              location: appt.location,
              appUrl,
              timeframe: 'in 1 Hour',
            }),
          });
          stats.appointmentEmailsSent++;
        }
      }
    }

    // ========================================================
    // RULE D: Daily Summary at 8:00 PM local profile time
    // ========================================================
    const zonedNow = toZonedTime(now, timezone);
    const localHour = zonedNow.getHours();
    const todayDateStr = formatTz(zonedNow, 'yyyy-MM-dd', { timeZone: timezone });

    if (localHour === 20 && profile.dailySummarySentDate !== todayDateStr) {
      await db.collection('profiles').doc(profileId).update({ dailySummarySentDate: todayDateStr });

      const todayDosesSnap = await db.collection('doseLogs')
        .where('profileId', '==', profileId)
        .where('scheduledDate', '==', todayDateStr)
        .get();

      const todayDoses = todayDosesSnap.docs.map((d) => d.data());
      const taken = todayDoses.filter((d) => d.status === 'taken').length;
      const missed = todayDoses.filter((d) => d.status === 'missed').length;

      const subscribers = members.filter((m) => m.notificationPrefs?.dailySummaryEmail && m.email);
      for (const sub of subscribers) {
        await sendEmail({
          to: sub.email,
          subject: `Daily Health Summary for ${profile.name} (${todayDateStr})`,
          html: getDailySummaryHtml({
            elderlyName: profile.name,
            takenCount: taken,
            missedCount: missed,
            appUrl,
          }),
        });
        stats.dailySummaryEmailsSent++;
      }
    }

    // ========================================================
    // RULE E: Rolling 7-day dose schedule top-up maintenance
    // ========================================================
    const activeMedsSnap = await db.collection('medications')
      .where('profileId', '==', profileId)
      .where('active', '==', true)
      .get();

    for (const medDoc of activeMedsSnap.docs) {
      await generateDosesForMedication({ id: medDoc.id, ...medDoc.data() }, 7);
    }
  }

  return stats;
};
