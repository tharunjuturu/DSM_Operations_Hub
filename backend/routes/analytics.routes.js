import { Router } from 'express';
import { getUserAnalytics } from '../controllers/analytics.controller.js';

const router = Router();

// GET /api/analytics/user/:id
router.get('/user/:id', getUserAnalytics);

export default router;
