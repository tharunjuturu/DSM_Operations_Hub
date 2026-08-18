import { validateDatabaseSchema } from '../models/db.model.js';

/**
 * Validates database JSON payload using application logic.
 */
export const validateSyncDatabase = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    
    // Reuse existing model schema validator if present
    if (typeof validateDatabaseSchema === 'function') {
      validateDatabaseSchema(data);
    } else {
      // Minimum validation fallback: must be a non-null JSON object
      if (!data || typeof data !== 'object') {
        throw new Error('Database payload must be a non-null object');
      }
    }
    return data;
  } catch (err) {
    throw new Error('Database Validation Failed: ' + err.message);
  }
};
