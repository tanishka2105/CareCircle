import { Router } from 'express';
import {
  createProfile,
  joinCircle,
  login,
  logout,
  getMe,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/profiles', authLimiter, createProfile);
router.post('/auth/join', authLimiter, joinCircle);
router.post('/auth/login', authLimiter, login);
router.post('/auth/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;
