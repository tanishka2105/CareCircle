import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAdherenceReport } from '../controllers/reportsController.js';

const router = Router();

router.use(requireAuth);

// GET /api/reports/adherence?period=week|month
// -> summary, dailyBreakdown, perMedication, missedList (for charts)
router.get('/adherence', getAdherenceReport);

export default router;