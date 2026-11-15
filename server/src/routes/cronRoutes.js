import { Router } from 'express';
import { handleCronTick } from '../controllers/cronController.js';

const router = Router();

// Endpoint GET /api/cron/tick
router.get('/tick', handleCronTick);

export default router;
