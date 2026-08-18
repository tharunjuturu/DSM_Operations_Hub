import fs from 'fs/promises';
import path from 'path';
import { requestContext } from '../utils/context.js';
import { getDefaultSchema } from '../models/db.model.js';

/**
 * Resolves the dynamic database path based on the current request context variant
 */
export const getDbPath = () => {
  const store = requestContext.getStore();
  const variant = store?.variant || 'vsm_pt';
  const filename = `database_${variant.toLowerCase().replace(/\s+/g, '_')}.json`;
  return path.resolve(filename);
};

/**
 * Seeds a new variant database file by copying the base database.json structure
 * and isolating team members based on the variant family.
 */
const seedNewVariantDb = async (variant) => {
  const targetPath = getDbPath();
  const baseDbPath = path.resolve('database.json');
  
  let baseData;
  try {
    const raw = await fs.readFile(baseDbPath, 'utf8');
    baseData = JSON.parse(raw);
  } catch (e) {
    baseData = getDefaultSchema();
  }

  if (variant === 'vsm_pt') {
    // Exact copy of database.json to preserve original VSM PT data
    await fs.writeFile(targetPath, JSON.stringify(baseData, null, 2), 'utf8');
    return baseData;
  }

  // For other variants, we clone structure but start with an empty team roster.
  // Team members can be added manually or imported using the transfer tool.
  const seededDb = {
    ...getDefaultSchema(),
    holidays: baseData.holidays || [],
    teamMembers: []
  };

  await fs.writeFile(targetPath, JSON.stringify(seededDb, null, 2), 'utf8');
  return seededDb;
};

/**
 * Simulates a database connection by reading the flat JSON file
 */
export const readDatabase = async (variantOverride) => {
  const store = requestContext.getStore();
  const variant = variantOverride || store?.variant || 'vsm_pt';
  const filename = `database_${variant.toLowerCase().replace(/\s+/g, '_')}.json`;
  const dbPath = path.resolve(filename);
  
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Normalize team member perimeters to matching standard values
    if (parsed.teamMembers) {
      let changed = false;
      parsed.teamMembers = parsed.teamMembers.map(member => {
        const p = (member.perimeter || '').trim().toUpperCase();
        if (p === 'VSM' || p === 'VSM LT' || p === 'VSM QG' || p === 'VSM IA' || p === 'FSEE' || !p) {
          member.perimeter = 'VSM PT';
          changed = true;
        } else if (p === 'VSM_PT') {
          member.perimeter = 'VSM PT';
          changed = true;
        } else if (p === 'VSM_PC') {
          member.perimeter = 'VSM PC';
          changed = true;
        } else if (p === 'BSI_PT') {
          member.perimeter = 'BSI PT';
          changed = true;
        } else if (p === 'BSI_PC') {
          member.perimeter = 'BSI PC';
          changed = true;
        } else if (p === 'BSI_AUTO') {
          member.perimeter = 'BSI AUTO';
          changed = true;
        }
        return member;
      });
      
      if (changed) {
        await fs.writeFile(dbPath, JSON.stringify(parsed, null, 2), 'utf8');
      }
    }
    
    return parsed;
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Database file doesn't exist, seed it
      return await seedNewVariantDb(variant);
    }
    throw err;
  }
};

/**
 * Simulates writing to the flat JSON database
 */
export const writeDatabase = async (data, variantOverride) => {
  const store = requestContext.getStore();
  const variant = variantOverride || store?.variant || 'vsm_pt';
  const filename = `database_${variant.toLowerCase().replace(/\s+/g, '_')}.json`;
  const dbPath = path.resolve(filename);
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
};
