import { Router } from 'express';
import { fetchDb, saveDb } from '../controllers/db.controller.js';
import { validateDbPayload } from '../validators/db.validator.js';

const router = Router();

// Define HTTP mapping for DB resources
router.get('/', fetchDb);
router.post('/', validateDbPayload, saveDb);

export default router;
