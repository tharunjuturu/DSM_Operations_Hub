import { Router } from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import dbRoutes from './db.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import analyticsRoutes from './analytics.routes.js';
import teamRoutes from './team.routes.js';
import managerRoutes from './manager.routes.js';
import syncRoutes from './sync.routes.js';

const router = Router();

// Mount modules here to keep server.js clean
router.use('/db', dbRoutes);
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/analytics', analyticsRoutes);
router.use('/api/team', teamRoutes);
router.use('/api/manager', managerRoutes);
router.use('/api/sync', syncRoutes);

// Endpoint for dynamic system and build metadata
router.get('/api/system-info', (req, res) => {
  try {
    let username = process.env.USERNAME || process.env.USER || process.env.LOGNAME;
    if (!username) {
      try {
        username = os.userInfo().username;
      } catch (e) {
        username = 'System User';
      }
    }
    const hostname = os.hostname();
    
    // Read package.json version
    let version = '2.0.0';
    try {
      const pkgPath = path.resolve('package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      version = pkg.version || '2.0.0';
    } catch (e) {
      // ignore
    }

    res.json({
      username,
      hostname,
      version,
      builtBy: 'Tharun Kumar Juturu'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
