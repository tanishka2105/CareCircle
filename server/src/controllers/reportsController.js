import { getDb } from '../config/db.js';
import { subDays, format, parseISO, startOfDay, endOfDay } from 'date-fns';

export const getAdherenceReport = async (req, res, next) => {
  try {
    const { profileId } = req.user;
    const db = getDb();

    const { period = 'week' } = req.query;
    const days = period === 'month' ? 30 : 7;

    const since = subDays(new Date(), days);
    const sinceStr = since.toISOString().split('T')[0];

    // Get all dose logs in this period
    const dosesSnap = await db
      .collection('doseLogs')
      .where('profileId', '==', profileId)
      .where('scheduledDate', '>=', sinceStr)
      .get();

    const doses = dosesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Daily breakdown (last N days)
    const dailyMap = {};
    for (let i = 0; i < days; i++) {
      const d = subDays(new Date(), i);
      const key = format(d, 'yyyy-MM-dd');
      dailyMap[key] = { date: key, taken: 0, missed: 0, skipped: 0, total: 0 };
    }

    // Per-medication adherence
    const medMap = {};

    doses.forEach((dose) => {
      const dateKey = dose.scheduledDate;
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].total++;
        if (dose.status === 'taken') dailyMap[dateKey].taken++;
        else if (dose.status === 'missed') dailyMap[dateKey].missed++;
        else if (dose.status === 'skipped') dailyMap[dateKey].skipped++;
      }

      // Per-med
      const medId = dose.medicationId;
      if (!medMap[medId]) {
        medMap[medId] = {
          medicationId: medId,
          medicationName: dose.medicationName || 'Unknown',
          total: 0,
          taken: 0,
          missed: 0,
          skipped: 0,
        };
      }
      medMap[medId].total++;
      if (dose.status === 'taken') medMap[medId].taken++;
      else if (dose.status === 'missed') medMap[medId].missed++;
      else if (dose.status === 'skipped') medMap[medId].skipped++;
    });

    // Overall stats
    const totalDoses = doses.length;
    const takenDoses = doses.filter((d) => d.status === 'taken').length;
    const missedDoses = doses.filter((d) => d.status === 'missed').length;
    const skippedDoses = doses.filter((d) => d.status === 'skipped').length;
    const adherencePercent = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

    // Calculate current streak (consecutive days with 100% taken)
    const sortedDays = Object.values(dailyMap).sort((a, b) =>
      a.date > b.date ? -1 : 1
    );
    let streak = 0;
    for (const day of sortedDays) {
      if (day.total === 0) continue; // skip days with no doses
      if (day.taken === day.total) streak++;
      else break;
    }

    // Best streak
    let bestStreak = 0;
    let currentStreak = 0;
    const ascDays = [...sortedDays].reverse();
    for (const day of ascDays) {
      if (day.total === 0) continue;
      if (day.taken === day.total) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // Missed doses list with handler
    const missedList = doses
      .filter((d) => d.status === 'missed')
      .map((d) => ({
        id: d.id,
        medicationName: d.medicationName,
        scheduledDate: d.scheduledDate,
        scheduledTime: d.scheduledTime,
        handledBy: d.handledBy || null,
        handledNote: d.handledNote || null,
        handledAt: d.handledAt || null,
      }))
      .sort((a, b) => (a.scheduledDate > b.scheduledDate ? -1 : 1));

    return res.json({
      success: true,
      data: {
        period,
        days,
        summary: {
          totalDoses,
          takenDoses,
          missedDoses,
          skippedDoses,
          adherencePercent,
          currentStreak: streak,
          bestStreak,
        },
        dailyBreakdown: Object.values(dailyMap).sort((a, b) => (a.date > b.date ? 1 : -1)),
        perMedication: Object.values(medMap).map((m) => ({
          ...m,
          adherencePercent: m.total > 0 ? Math.round((m.taken / m.total) * 100) : 0,
        })),
        missedList,
      },
    });
  } catch (err) {
    next(err);
  }
};
