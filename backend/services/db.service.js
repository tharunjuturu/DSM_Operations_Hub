import { readDatabase, writeDatabase } from '../database/connection.js';
import { getDefaultSchema, validateDatabaseSchema } from '../models/db.model.js';

/**
 * Service to fetch the full database, supplying defaults if it doesn't exist
 */
export const getEntireDatabase = async (variantOverride) => {
  const data = await readDatabase(variantOverride);
  if (!data) {
    return getDefaultSchema();
  }
  return data;
};

/**
 * Service to overwrite the flat database safely with schema validation
 */
export const updateEntireDatabase = async (payload, variantOverride) => {
  // Pass through model layer validation
  validateDatabaseSchema(payload);
  
  // Write to DB layer
  await writeDatabase(payload, variantOverride);
  
  return { success: true };
};
