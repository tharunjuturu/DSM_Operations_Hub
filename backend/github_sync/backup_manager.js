import fs from 'fs/promises';
import path from 'path';

/**
 * Creates a timestamped backup of the current database file.
 * Returns the path of the created backup file.
 */
export const createBackup = async (dbFilePath, variant) => {
  const backupsDir = path.resolve('backups');
  
  try {
    // 1. Create backups directory if it doesn't exist
    await fs.mkdir(backupsDir, { recursive: true });
    
    // 2. Read database content
    let content;
    try {
      content = await fs.readFile(dbFilePath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        // If file doesn't exist yet, there's nothing to back up
        return null;
      }
      throw err;
    }
    
    // 3. Format timestamp: YYYY-MM-DD_HH-mm-ss
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    
    const backupFileName = `database_${variant.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.json`;
    const backupPath = path.join(backupsDir, backupFileName);
    
    // 4. Write backup file
    await fs.writeFile(backupPath, content, 'utf8');
    
    return backupPath;
  } catch (err) {
    throw new Error(`Backup Generation Failed: ${err.message}`);
  }
};
