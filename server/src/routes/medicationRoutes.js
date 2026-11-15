import { Router } from 'express';
import {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
} from '../controllers/medicationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/medications', requireAuth, getMedications);
router.post('/medications', requireAuth, createMedication);
router.patch('/medications/:id', requireAuth, updateMedication);
router.delete('/medications/:id', requireAuth, deleteMedication);

export default router;
