import fs from 'fs/promises';
import { config } from '../config/index.js';

/**
 * Simulates a database connection by reading the flat JSON file
 */
export const readDatabase = async () => {
  try {
    const data = await fs.readFile(config.dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null; // Database hasn't been created yet
    }
    throw err;
  }
};

/**
 * Simulates writing to the flat JSON database
 */
export const writeDatabase = async (data) => {
  await fs.writeFile(config.dbPath, JSON.stringify(data, null, 2), 'utf8');
};
