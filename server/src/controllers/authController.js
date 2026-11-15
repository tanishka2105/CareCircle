import { z } from 'zod';
import { getDb } from '../config/db.js';
import {
  hashPasscode,
  verifyPasscode,
  generateProfileCode,
  checkPasscodeStrength,
} from '../utils/passcode.js';
import { generateSessionToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';

// Schemas
const createProfileSchema = z.object({
  elderly: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    age: z.number().int().min(1).max(130),
    language: z.enum(['en', 'hi']).default('en'),
    timezone: z.string().default('Asia/Kolkata'),
    emergencyNote: z.string().optional().default(''),
    photoUrl: z.string().optional().default(''),
  }),
  passcode: z.string().min(6, 'Passcode must be at least 6 characters'),
  creator: z.object({
    displayName: z.string().min(2, 'Your name must be at least 2 characters'),
    role: z.enum(['elderly', 'caretaker', 'family']),
    relationship: z.string().min(1, 'Relationship label is required'),
    email: z.string().email('Valid email address is required'),
    phone: z.string().min(6, 'Valid phone number is required'),
    photoUrl: z.string().optional().default(''),
  }),
});

const joinCircleSchema = z.object({
  profileCode: z.string().min(4, 'Profile Code is required'),
  passcode: z.string().min(6, 'Passcode is required'),
  displayName: z.string().min(2, 'Your name must be at least 2 characters'),
  role: z.enum(['elderly', 'caretaker', 'family']),
  relationship: z.string().min(1, 'Relationship label is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().min(6, 'Valid phone number is required'),
  photoUrl: z.string().optional().default(''),
});

const loginSchema = z.object({
  profileCode: z.string().min(4, 'Profile code is required'),
  passcode: z.string().min(6, 'Passcode is required'),
  memberId: z.string().optional(),
  email: z.string().email().optional(),
});

export const createProfile = async (req, res, next) => {
  try {
    const validated = createProfileSchema.parse(req.body);
    const db = getDb();

    // Check strength
    const strength = checkPasscodeStrength(validated.passcode);
    if (!strength.isValid) {
      return res.status(400).json({
        success: false,
        error: { message: 'Passcode must be at least 6 characters long', code: 'WEAK_PASSCODE' },
      });
    }

    // Generate unique profile code
    let profileCode = generateProfileCode();
    let existing = await db.collection('profiles').where('profileCode', '==', profileCode).get();
    while (!existing.empty) {
      profileCode = generateProfileCode();
      existing = await db.collection('profiles').where('profileCode', '==', profileCode).get();
    }

    const passcodeHash = await hashPasscode(validated.passcode);
    const now = new Date().toISOString();

    // 1. Create Profile
    const profileRef = await db.collection('profiles').add({
      name: validated.elderly.name,
      age: validated.elderly.age,
      language: validated.elderly.language,
      timezone: validated.elderly.timezone,
      emergencyNote: validated.elderly.emergencyNote,
      photoUrl: validated.elderly.photoUrl,
      passcodeHash,
      profileCode,
      plan: 'free',
      createdAt: now,
    });
    const profileId = profileRef.id;

    // Default notification preferences
    const defaultNotificationPrefs = {
      upcomingDoseEmail: validated.creator.role === 'elderly',
      missedDoseEmail: true,
      appointmentEmail: true,
      dailySummaryEmail: validated.creator.role !== 'elderly',
      sosEmail: true,
      inAppAlerts: true,
    };

    // 2. Create Admin Member
    const memberRef = await db.collection('members').add({
      profileId,
      displayName: validated.creator.displayName,
      role: validated.creator.role,
      relationship: validated.creator.relationship,
      email: validated.creator.email.toLowerCase().trim(),
      phone: validated.creator.phone.trim(),
      photoUrl: validated.creator.photoUrl,
      isAdmin: true,
      notificationPrefs: defaultNotificationPrefs,
      joinedAt: now,
      lastActiveAt: now,
    });
    const memberId = memberRef.id;

    // 3. Log initial activity
    await db.collection('activity').add({
      profileId,
      actorId: memberId,
      action: 'created_profile',
      entityType: 'profile',
      entityId: profileId,
      details: { elderlyName: validated.elderly.name, creator: validated.creator.displayName },
      createdAt: now,
    });

    // 4. Token & Cookie
    const token = generateSessionToken({ profileId, memberId, isAdmin: true });
    setAuthCookie(res, token);

    const profileSnap = await profileRef.get();
    const memberSnap = await memberRef.get();
    const profileData = profileSnap.data();
    delete profileData.passcodeHash;

    return res.status(201).json({
      success: true,
      data: {
        profile: profileData,
        member: memberSnap.data(),
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const joinCircle = async (req, res, next) => {
  try {
    const validated = joinCircleSchema.parse(req.body);
    const db = getDb();
    const code = validated.profileCode.toUpperCase().trim();

    // Find profile
    const profilesSnap = await db.collection('profiles').where('profileCode', '==', code).get();
    if (profilesSnap.empty) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid Profile Code or Passcode', code: 'INVALID_CREDENTIALS' },
      });
    }

    const profileDoc = profilesSnap.docs[0];
    const profile = profileDoc.data();

    // Verify passcode
    const isMatch = await verifyPasscode(validated.passcode, profile.passcodeHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid Profile Code or Passcode', code: 'INVALID_CREDENTIALS' },
      });
    }

    const now = new Date().toISOString();
    const defaultNotificationPrefs = {
      upcomingDoseEmail: validated.role === 'elderly',
      missedDoseEmail: true,
      appointmentEmail: true,
      dailySummaryEmail: validated.role !== 'elderly',
      sosEmail: true,
      inAppAlerts: true,
    };

    // Create new member
    const memberRef = await db.collection('members').add({
      profileId: profileDoc.id,
      displayName: validated.displayName,
      role: validated.role,
      relationship: validated.relationship,
      email: validated.email.toLowerCase().trim(),
      phone: validated.phone.trim(),
      photoUrl: validated.photoUrl,
      isAdmin: false,
      notificationPrefs: defaultNotificationPrefs,
      joinedAt: now,
      lastActiveAt: now,
    });
    const memberId = memberRef.id;

    // Log Activity
    await db.collection('activity').add({
      profileId: profileDoc.id,
      actorId: memberId,
      action: 'joined_circle',
      entityType: 'member',
      entityId: memberId,
      details: { displayName: validated.displayName, relationship: validated.relationship },
      createdAt: now,
    });

    // Notify other members
    const existingMembers = await db.collection('members').where('profileId', '==', profileDoc.id).get();
    existingMembers.forEach(async (doc) => {
      if (doc.id !== memberId) {
        await db.collection('notifications').add({
          profileId: profileDoc.id,
          memberId: doc.id,
          type: 'member_joined',
          title: 'New Circle Member',
          body: `${validated.displayName} (${validated.relationship}) joined the CareCircle.`,
          readAt: null,
          createdAt: now,
        });
      }
    });

    const token = generateSessionToken({
      profileId: profileDoc.id,
      memberId,
      isAdmin: false,
    });
    setAuthCookie(res, token);

    const safeProfile = { ...profile };
    delete safeProfile.passcodeHash;

    const memberSnap = await memberRef.get();

    return res.status(201).json({
      success: true,
      data: {
        profile: safeProfile,
        member: memberSnap.data(),
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);
    const db = getDb();
    const code = validated.profileCode.toUpperCase().trim();

    const profilesSnap = await db.collection('profiles').where('profileCode', '==', code).get();
    if (profilesSnap.empty) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid Profile Code or Passcode', code: 'INVALID_CREDENTIALS' },
      });
    }

    const profileDoc = profilesSnap.docs[0];
    const profile = profileDoc.data();

    const isMatch = await verifyPasscode(validated.passcode, profile.passcodeHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid Profile Code or Passcode', code: 'INVALID_CREDENTIALS' },
      });
    }

    // Identify member
    let memberDoc = null;
    if (validated.memberId) {
      const doc = await db.collection('members').doc(validated.memberId).get();
      if (doc.exists && doc.data().profileId === profileDoc.id) {
        memberDoc = doc;
      }
    } else if (validated.email) {
      const membersSnap = await db.collection('members')
        .where('profileId', '==', profileDoc.id)
        .where('email', '==', validated.email.toLowerCase().trim())
        .get();
      if (!membersSnap.empty) {
        memberDoc = membersSnap.docs[0];
      }
    }

    // If no member specified, fetch members list for selection
    if (!memberDoc) {
      const membersSnap = await db.collection('members').where('profileId', '==', profileDoc.id).get();
      const membersList = membersSnap.docs.map((d) => {
        const m = d.data();
        return {
          id: d.id,
          displayName: m.displayName,
          role: m.role,
          relationship: m.relationship,
          email: m.email,
        };
      });

      return res.status(200).json({
        success: true,
        requiresMemberSelection: true,
        data: {
          profileId: profileDoc.id,
          profileName: profile.name,
          members: membersList,
        },
      });
    }

    const member = memberDoc.data();
    const token = generateSessionToken({
      profileId: profileDoc.id,
      memberId: memberDoc.id,
      isAdmin: Boolean(member.isAdmin),
    });
    setAuthCookie(res, token);

    const safeProfile = { ...profile };
    delete safeProfile.passcodeHash;

    return res.status(200).json({
      success: true,
      data: {
        profile: safeProfile,
        member,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
};

export const getMe = async (req, res) => {
  const safeProfile = { ...req.profile };
  delete safeProfile.passcodeHash;
  return res.status(200).json({
    success: true,
    data: {
      profile: safeProfile,
      member: req.member,
    },
  });
};
