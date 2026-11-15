import { Router } from 'express';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  accompanyAppointment,
} from '../controllers/appointmentController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/appointments', requireAuth, getAppointments);
router.post('/appointments', requireAuth, createAppointment);
router.patch('/appointments/:id', requireAuth, updateAppointment);
router.delete('/appointments/:id', requireAuth, deleteAppointment);
router.post('/appointments/:id/accompany', requireAuth, accompanyAppointment);

export default router;
