import { verifySessionToken, COOKIE_NAME } from '../utils/token.js';
import { getDb } from '../config/db.js';

export const requireAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.[COOKIE_NAME];
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required. Please log in.',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const decoded = verifySessionToken(token);
    if (!decoded || !decoded.profileId || !decoded.memberId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired session. Please log in again.',
          code: 'INVALID_TOKEN',
        },
      });
    }

    const db = getDb();

    // Fetch profile
    const profileDoc = await db.collection('profiles').doc(decoded.profileId).get();
    if (!profileDoc.exists) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Care profile no longer exists.',
          code: 'PROFILE_NOT_FOUND',
        },
      });
    }
    const profile = profileDoc.data();

    // Check passcode rotation invalidation
    if (profile.passcodeRotatedAt && decoded.iat) {
      const rotatedTime = new Date(profile.passcodeRotatedAt).getTime() / 1000;
      if (decoded.iat < rotatedTime) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Passcode was rotated. Please log in with the new passcode.',
            code: 'SESSION_REVOKED',
          },
        });
      }
    }

    // Fetch member
    const memberDoc = await db.collection('members').doc(decoded.memberId).get();
    if (!memberDoc.exists) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Member record not found or was removed from circle.',
          code: 'MEMBER_NOT_FOUND',
        },
      });
    }
    const member = memberDoc.data();

    if (member.profileId !== decoded.profileId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Cross-profile access violation.',
          code: 'FORBIDDEN',
        },
      });
    }

    // Attach verified context
    req.profileId = decoded.profileId;
    req.memberId = decoded.memberId;
    req.isAdmin = Boolean(member.isAdmin);
    req.member = member;
    req.profile = profile;

    // Unified identity object used by notes / activity controllers
    req.user = {
      profileId: decoded.profileId,
      memberId: decoded.memberId,
      memberName: member.displayName || member.name || 'Member',
      isAdmin: Boolean(member.isAdmin),
    };

    // Asynchronously update last active time without blocking
    db.collection('members').doc(decoded.memberId).update({
      lastActiveAt: new Date().toISOString(),
    }).catch(() => {});

    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Action restricted to Circle Admin.',
        code: 'ADMIN_REQUIRED',
      },
    });
  }
  next();
};