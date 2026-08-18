import fs from 'fs/promises';
import path from 'path';

const historyFilePath = path.resolve('backups/sync_history.json');

// Sequential Promise chain lock to prevent concurrent write corruption
let writeQueue = Promise.resolve();

/**
 * Appends a new synchronization log entry inside sync_history.json safely.
 */
export const logSyncOperation = async (operation, user, commitSha, result, repo, branch) => {
  // Enqueue the execution to prevent race conditions on the file
  writeQueue = writeQueue.then(async () => {
    try {
      // Ensure backups folder exists
      await fs.mkdir(path.dirname(historyFilePath), { recursive: true });
      
      let history = [];
      try {
        const raw = await fs.readFile(historyFilePath, 'utf8');
        history = JSON.parse(raw);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error('Failed to read sync history:', err.message);
        }
      }
      
      const newEntry = {
        timestamp: new Date().toISOString(),
        operation, // 'upload' | 'download' | 'merge' | 'connection_test'
        user,
        commitSha: commitSha || '--',
        result, // 'success' | 'failed'
        repository: repo,
        branch
      };
      
      history.unshift(newEntry); // Newest entries first
      
      // Retention policy: limit to last 100 entries to prevent infinite growth
      if (history.length > 100) {
        history = history.slice(0, 100);
      }
      
      await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
    } catch (err) {
      console.error('Error logging sync operation:', err.message);
    }
  });
  
  return writeQueue;
};

/**
 * Reads and returns the complete sync history log.
 */
export const getSyncHistory = async () => {
  try {
    const raw = await fs.readFile(historyFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
};
