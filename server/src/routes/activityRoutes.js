import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getActivity } from '../controllers/activityController.js';

const router = Router();

router.use(requireAuth);

// GET /api/activity?limit=50   -> shared activity feed for the whole circle
router.get('/', getActivity);

export default router;