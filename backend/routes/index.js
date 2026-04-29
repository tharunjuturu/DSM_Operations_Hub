import { Router } from 'express';
import dbRoutes from './db.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import analyticsRoutes from './analytics.routes.js';

const router = Router();

// Mount modules here to keep server.js clean
router.use('/db', dbRoutes);
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/analytics', analyticsRoutes);

export default router;
