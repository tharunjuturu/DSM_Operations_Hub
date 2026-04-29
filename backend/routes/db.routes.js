import { Router } from 'express';
import { fetchDb, saveDb } from '../controllers/db.controller.js';

const router = Router();

// Define HTTP mapping for DB resources
router.get('/', fetchDb);
router.post('/', saveDb);

export default router;
