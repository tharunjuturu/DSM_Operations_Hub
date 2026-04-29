import { readDatabase, writeDatabase } from '../database/connection.js';
import { getDefaultSchema, validateDatabaseSchema } from '../models/db.model.js';

/**
 * Service to fetch the full database, supplying defaults if it doesn't exist
 */
export const getEntireDatabase = async () => {
  const data = await readDatabase();
  if (!data) {
    return getDefaultSchema();
  }
  return data;
};

/**
 * Service to overwrite the flat database safely with schema validation
 */
export const updateEntireDatabase = async (payload) => {
  // Pass through model layer validation
  validateDatabaseSchema(payload);
  
  // Write to DB layer
  await writeDatabase(payload);
  
  return { success: true };
};
