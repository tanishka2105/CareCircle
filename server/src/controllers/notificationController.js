import { getDb } from '../config/db.js';

export const getNotifications = async (req, res, next) => {
  try {
    const db = getDb();
    const notifsSnap = await db.collection('notifications')
      .where('profileId', '==', req.profileId)
      .where('memberId', '==', req.memberId)
      .get();

    const notifications = notifsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by createdAt desc
    notifications.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const unreadCount = notifications.filter((n) => !n.readAt).length;

    return res.status(200).json({
      success: true,
      unreadCount,
      data: notifications,
    });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const notifRef = db.collection('notifications').doc(id);
    const notifDoc = await notifRef.get();

    if (!notifDoc.exists || notifDoc.data().memberId !== req.memberId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Notification not found', code: 'NOT_FOUND' },
      });
    }

    await notifRef.update({
      readAt: new Date().toISOString(),
    });

    const updatedSnap = await notifRef.get();
    return res.status(200).json({
      success: true,
      data: updatedSnap.data(),
    });
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const db = getDb();
    const notifsSnap = await db.collection('notifications')
      .where('profileId', '==', req.profileId)
      .where('memberId', '==', req.memberId)
      .get();

    const now = new Date().toISOString();
    const batch = db.batch();

    notifsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (!data.readAt) {
        batch.update(db.collection('notifications').doc(doc.id), { readAt: now });
      }
    });

    await batch.commit();

    return res.status(200).json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (err) {
    next(err);
  }
};
