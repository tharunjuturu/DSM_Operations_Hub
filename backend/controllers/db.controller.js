import { getEntireDatabase, updateEntireDatabase } from '../services/db.service.js';
import { handleError } from '../utils/errorHandler.js';

/**
 * Handles HTTP GET requests to fetch data
 */
export const fetchDb = async (req, res) => {
  try {
    const data = await getEntireDatabase();
    
    // Prevent client-side caching of the database completely
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    res.json(data);
  } catch (err) {
    handleError(res, err, 'Failed to read database from server');
  }
};

/**
 * Handles HTTP POST requests to save data
 */
export const saveDb = async (req, res) => {
  try {
    const result = await updateEntireDatabase(req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err, 'Failed to update database on server');
  }
};
