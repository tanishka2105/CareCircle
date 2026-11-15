import { getDb } from '../config/db.js';

export const getActivity = async (req, res, next) => {
  try {
    const { profileId } = req.user;
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const snap = await db
      .collection('activities')
      .where('profileId', '==', profileId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const activities = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
};

export const logActivity = async (db, profileId, memberId, memberName, type, description, meta = {}) => {
  return db.collection('activities').add({
    profileId,
    memberId,
    memberName,
    type,
    description,
    meta,
    createdAt: new Date().toISOString(),
  });
};
