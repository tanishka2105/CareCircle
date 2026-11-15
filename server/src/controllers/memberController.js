import { z } from 'zod';
import { getDb } from '../config/db.js';
import { hashPasscode, checkPasscodeStrength } from '../utils/passcode.js';

const updateMemberSchema = z.object({
  displayName: z.string().min(2).optional(),
  relationship: z.string().min(1).optional(),
  role: z.enum(['elderly', 'caretaker', 'family']).optional(),
  phone: z.string().min(6).optional(),
  photoUrl: z.string().optional(),
  notificationPrefs: z.object({
    upcomingDoseEmail: z.boolean().optional(),
    missedDoseEmail: z.boolean().optional(),
    appointmentEmail: z.boolean().optional(),
    dailySummaryEmail: z.boolean().optional(),
    sosEmail: z.boolean().optional(),
    inAppAlerts: z.boolean().optional(),
  }).optional(),
});

const rotatePasscodeSchema = z.object({
  newPasscode: z.string().min(6, 'New passcode must be at least 6 characters long'),
});

export const getMembers = async (req, res, next) => {
  try {
    const db = getDb();
    const membersSnap = await db.collection('members').where('profileId', '==', req.profileId).get();
    
    const members = membersSnap.docs.map((doc) => {
      const data = doc.data();
      const lastActive = data.lastActiveAt ? new Date(data.lastActiveAt).getTime() : 0;
      const isOnline = Date.now() - lastActive < 5 * 60 * 1000; // active within 5 mins
      return {
        id: doc.id,
        ...data,
        isOnline,
      };
    });

    return res.status(200).json({
      success: true,
      data: members,
    });
  } catch (err) {
    next(err);
  }
};

export const updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = updateMemberSchema.parse(req.body);
    const db = getDb();

    // Check permission: only self or admin can update
    if (req.memberId !== id && !req.isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'You can only update your own profile details.', code: 'FORBIDDEN' },
      });
    }

    const memberRef = db.collection('members').doc(id);
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists || memberDoc.data().profileId !== req.profileId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found', code: 'NOT_FOUND' },
      });
    }

    const currentData = memberDoc.data();
    const updatePayload = {};

    if (validated.displayName) updatePayload.displayName = validated.displayName;
    if (validated.relationship) updatePayload.relationship = validated.relationship;
    if (validated.phone) updatePayload.phone = validated.phone;
    if (validated.photoUrl !== undefined) updatePayload.photoUrl = validated.photoUrl;

    // Only admin can change roles
    if (validated.role) {
      if (!req.isAdmin) {
        return res.status(403).json({
          success: false,
          error: { message: 'Only Circle Admin can change member roles.', code: 'FORBIDDEN' },
        });
      }
      updatePayload.role = validated.role;
    }

    if (validated.notificationPrefs) {
      updatePayload.notificationPrefs = {
        ...currentData.notificationPrefs,
        ...validated.notificationPrefs,
      };
    }

    await memberRef.update(updatePayload);

    // Activity log
    await db.collection('activity').add({
      profileId: req.profileId,
      actorId: req.memberId,
      action: 'updated_member',
      entityType: 'member',
      entityId: id,
      details: { updatedFields: Object.keys(updatePayload) },
      createdAt: new Date().toISOString(),
    });

    const updatedSnap = await memberRef.get();
    return res.status(200).json({
      success: true,
      data: updatedSnap.data(),
    });
  } catch (err) {
    next(err);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDb();

    if (!req.isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only Circle Admin can remove members.', code: 'FORBIDDEN' },
      });
    }

    if (id === req.memberId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Admin cannot remove themselves from the circle.', code: 'BAD_REQUEST' },
      });
    }

    const memberRef = db.collection('members').doc(id);
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists || memberDoc.data().profileId !== req.profileId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found', code: 'NOT_FOUND' },
      });
    }

    const removedName = memberDoc.data().displayName;
    await memberRef.delete();

    // Log activity
    await db.collection('activity').add({
      profileId: req.profileId,
      actorId: req.memberId,
      action: 'removed_member',
      entityType: 'member',
      entityId: id,
      details: { memberName: removedName },
      createdAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      data: { message: `Member ${removedName} removed successfully.` },
    });
  } catch (err) {
    next(err);
  }
};

export const rotatePasscode = async (req, res, next) => {
  try {
    const validated = rotatePasscodeSchema.parse(req.body);
    const db = getDb();

    if (!req.isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only Circle Admin can rotate the passcode.', code: 'FORBIDDEN' },
      });
    }

    const strength = checkPasscodeStrength(validated.newPasscode);
    if (!strength.isValid) {
      return res.status(400).json({
        success: false,
        error: { message: 'New passcode must be at least 6 characters long.', code: 'WEAK_PASSCODE' },
      });
    }

    const passcodeHash = await hashPasscode(validated.newPasscode);
    const now = new Date().toISOString();

    const profileRef = db.collection('profiles').doc(req.profileId);
    await profileRef.update({
      passcodeHash,
      passcodeRotatedAt: now,
    });

    // Notify circle members
    const membersSnap = await db.collection('members').where('profileId', '==', req.profileId).get();
    membersSnap.forEach(async (doc) => {
      await db.collection('notifications').add({
        profileId: req.profileId,
        memberId: doc.id,
        type: 'passcode_rotated',
        title: 'Security Alert: Circle Passcode Rotated',
        body: 'The circle admin has updated the passcode. Please use the new passcode to log in.',
        readAt: null,
        createdAt: now,
      });
    });

    // Log activity
    await db.collection('activity').add({
      profileId: req.profileId,
      actorId: req.memberId,
      action: 'rotated_passcode',
      entityType: 'profile',
      entityId: req.profileId,
      details: {},
      createdAt: now,
    });

    return res.status(200).json({
      success: true,
      data: { message: 'Passcode rotated successfully. All existing sessions have been revoked.' },
    });
  } catch (err) {
    next(err);
  }
};
