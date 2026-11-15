import { Router } from 'express';
import {
  getMembers,
  updateMember,
  removeMember,
  rotatePasscode,
} from '../controllers/memberController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/members', requireAuth, getMembers);
router.patch('/members/:id', requireAuth, updateMember);
router.delete('/members/:id', requireAuth, requireAdmin, removeMember);
router.post('/passcode/rotate', requireAuth, requireAdmin, rotatePasscode);

export default router;
