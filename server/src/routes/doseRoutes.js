import { Router } from 'express';
import {
  getDoses,
  updateDoseStatus,
  handleMissedDose,
} from '../controllers/doseController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/doses', requireAuth, getDoses);
router.patch('/doses/:id', requireAuth, updateDoseStatus);
router.post('/doses/:id/handle', requireAuth, handleMissedDose);

export default router;
