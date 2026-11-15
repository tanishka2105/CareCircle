import { getDb } from '../config/db.js';
import { z } from 'zod';

const createNoteSchema = z.object({
  content: z.string().min(1, 'Note cannot be empty').max(2000, 'Note too long'),
  isPinned: z.boolean().optional().default(false),
});

const updateNoteSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  isPinned: z.boolean().optional(),
});

// Helper: log activity
async function logActivity(db, profileId, memberId, memberName, type, description, meta = {}) {
  await db.collection('activities').add({
    profileId,
    memberId,
    memberName,
    type,
    description,
    meta,
    createdAt: new Date().toISOString(),
  });
}

export const getNotes = async (req, res, next) => {
  try {
    const { profileId } = req.user;
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const snap = await db
      .collection('careNotes')
      .where('profileId', '==', profileId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const notes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ success: true, data: notes });
  } catch (err) {
    next(err);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const { profileId, memberId, memberName } = req.user;
    const db = getDb();

    const body = createNoteSchema.parse(req.body);

    const noteData = {
      profileId,
      memberId,
      memberName,
      content: body.content,
      isPinned: body.isPinned,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = await db.collection('careNotes').add(noteData);

    // Log activity
    await logActivity(
      db,
      profileId,
      memberId,
      memberName,
      'note_added',
      `${memberName} added a care note`,
      { noteId: ref.id, preview: body.content.slice(0, 80) }
    );

    // Create in-app notification for all members
    const membersSnap = await db
      .collection('members')
      .where('profileId', '==', profileId)
      .get();

    const notifBatch = db.batch();
    membersSnap.docs.forEach((m) => {
      if (m.id !== memberId) {
        const notifRef = db.collection('notifications').doc();
        notifBatch.set(notifRef, {
          profileId,
          memberId: m.id,
          type: 'note_added',
          title: 'New Care Note',
          body: `${memberName}: "${body.content.slice(0, 60)}${body.content.length > 60 ? '...' : ''}"`,
          isRead: false,
          readAt: null,
          createdAt: new Date().toISOString(),
          meta: { noteId: ref.id },
        });
      }
    });
    await notifBatch.commit();

    return res.status(201).json({ success: true, data: { id: ref.id, ...noteData } });
  } catch (err) {
    next(err);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const { profileId, memberId, memberName, isAdmin } = req.user;
    const { noteId } = req.params;
    const db = getDb();

    const docSnap = await db.collection('careNotes').doc(noteId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: { message: 'Note not found' } });
    }

    const existing = docSnap.data();
    if (existing.profileId !== profileId) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    // Only the author or admin can edit
    if (existing.memberId !== memberId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the note author or admin can edit this note' },
      });
    }

    const body = updateNoteSchema.parse(req.body);
    const updates = { ...body, updatedAt: new Date().toISOString() };

    await db.collection('careNotes').doc(noteId).update(updates);

    return res.json({ success: true, data: { id: noteId, ...existing, ...updates } });
  } catch (err) {
    next(err);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const { profileId, memberId, isAdmin } = req.user;
    const { noteId } = req.params;
    const db = getDb();

    const docSnap = await db.collection('careNotes').doc(noteId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: { message: 'Note not found' } });
    }

    const existing = docSnap.data();
    if (existing.profileId !== profileId) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    if (existing.memberId !== memberId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the note author or admin can delete this note' },
      });
    }

    await db.collection('careNotes').doc(noteId).delete();
    return res.json({ success: true, data: { id: noteId } });
  } catch (err) {
    next(err);
  }
};
