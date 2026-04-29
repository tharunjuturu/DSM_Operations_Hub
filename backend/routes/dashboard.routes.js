import { Router } from 'express';
import { handleCreateDashboard, handleGetDashboard, handleGetDashboardData, handleGetDashboardsByUser, handleUpdateDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

router.post('/', handleCreateDashboard);
router.put('/:id', handleUpdateDashboard);
router.get('/user/:userId', handleGetDashboardsByUser);
router.get('/:id', handleGetDashboard);
router.get('/:id/data', handleGetDashboardData);

export default router;
