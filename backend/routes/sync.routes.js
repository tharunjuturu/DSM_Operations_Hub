import { Router } from 'express';
import fs from 'fs/promises';
import { requestContext } from '../utils/context.js';
import { getDbPath, readDatabase, writeDatabase } from '../database/connection.js';
import * as syncManager from '../github_sync/sync_manager.js';
import * as gitClient from '../github_sync/github_client.js';
import { validateSyncDatabase } from '../github_sync/validator.js';
import { createBackup } from '../github_sync/backup_manager.js';
import { logSyncOperation, getSyncHistory } from '../github_sync/sync_history.js';
import { compareDatabases, mergeDatabases } from '../github_sync/conflict_manager.js';

const router = Router();

// GET /api/sync/status
router.get('/status', async (req, res) => {
  try {
    const store = requestContext.getStore();
    const variant = store?.variant || 'vsm_pt';
    
    const status = await syncManager.computeSyncStatus(variant);
    const metadata = await syncManager.loadMetadata();
    const history = await getSyncHistory();
    const username = syncManager.getSystemUsername();

    res.json({
      success: true,
      status,
      user: username,
      metadata,
      history
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sync/config
router.get('/config', async (req, res) => {
  try {
    const config = await syncManager.loadConfig();
    res.json({
      success: true,
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
      filePath: config.filePath,
      token: syncManager.maskToken(config.token) // Mask token before sending
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sync/config
router.post('/config', async (req, res) => {
  try {
    const { owner, repo, branch, filePath, token } = req.body;
    
    const currentConfig = await syncManager.loadConfig();
    const updatedToken = token && !token.includes('••••') ? token : currentConfig.token;

    const newConfig = {
      owner: (owner || '').trim(),
      repo: (repo || '').trim(),
      branch: (branch || 'main').trim(),
      filePath: (filePath || 'data/VSM/database_vsm_pt.json').trim(),
      token: (updatedToken || '').trim()
    };

    await syncManager.saveConfig(newConfig);
    res.json({ success: true, message: 'Configuration saved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sync/test-connection
router.post('/test-connection', async (req, res) => {
  try {
    const config = await syncManager.loadConfig();
    const username = syncManager.getSystemUsername();
    
    if (!config.token || !config.owner || !config.repo) {
      return res.status(400).json({ success: false, error: 'Connection config is incomplete.' });
    }

    const remote = await gitClient.getFileContent(
      config.owner,
      config.repo,
      config.filePath,
      config.branch,
      config.token
    );

    await logSyncOperation('connection_test', username, null, 'success', config.repo, config.branch);
    res.json({
      success: true,
      message: 'Connection test passed.',
      fileExists: remote.exists,
      remoteSha: remote.sha
    });
  } catch (err) {
    const config = await syncManager.loadConfig();
    const username = syncManager.getSystemUsername();
    await logSyncOperation('connection_test', username, null, 'failed', config.repo, config.branch);
    res.status(400).json({ success: false, error: `Connection failed: ${err.message}` });
  }
});

// POST /api/sync/upload
router.post('/upload', async (req, res) => {
  try {
    const store = requestContext.getStore();
    const variant = store?.variant || 'vsm_pt';
    const username = syncManager.getSystemUsername();

    const config = await syncManager.loadConfig();
    if (!config.token || !config.owner || !config.repo) {
      return res.status(400).json({ success: false, error: 'Git credentials are not configured.' });
    }

    const localDbPath = getDbPath();
    let localContent = '';
    try {
      localContent = await fs.readFile(localDbPath, 'utf8');
    } catch (e) {
      console.error(`[Upload] Failed to read database at ${localDbPath}:`, e);
      return res.status(400).json({ 
        success: false, 
        error: `Local database file is missing or unreadable: ${e.message} (Path: ${localDbPath})` 
      });
    }

    // Parse and validate local content before upload
    let localData;
    try {
      localData = validateSyncDatabase(localContent);
    } catch (e) {
      return res.status(400).json({ success: false, error: `Upload Aborted: Local database JSON is invalid: ${e.message}` });
    }

    // Size Warning Guardrail
    const sizeGuard = await syncManager.checkDatabaseSize(localDbPath);
    if (sizeGuard.warn && !req.body.forceSize) {
      return res.status(400).json({
        success: false,
        sizeWarning: true,
        message: `Local database size is unusually large: ${sizeGuard.sizeMB} MB. Do you want to continue?`
      });
    }

    // Check remote SHA
    const remote = await gitClient.getFileContent(
      config.owner,
      config.repo,
      config.filePath,
      config.branch,
      config.token
    );

    const metadata = await syncManager.loadMetadata();

    // Push Protection: Block if remote has changed since last sync
    if (remote.exists && remote.sha !== metadata.lastSyncedSha) {
      return res.status(409).json({
        success: false,
        conflict: true,
        error: 'Upload Rejected: GitHub contains newer changes. Please pull or compare changes first.'
      });
    }

    // Formulate commit message
    const now = new Date();
    const timestampStr = now.toISOString().replace('T', ' ').substring(0, 16);
    const commitMessage = `DSR Update | ${username} | ${timestampStr}`;

    const newSha = await gitClient.uploadFileContent(
      config.owner,
      config.repo,
      config.filePath,
      config.branch,
      localContent,
      remote.sha, // Pass SHA (null if file doesn't exist)
      commitMessage,
      config.token
    );

    const localHash = syncManager.getDatabaseHash(localContent);

    // Save sync metadata
    await syncManager.saveMetadata({
      repository: `${config.owner}/${config.repo}`,
      branch: config.branch,
      filePath: config.filePath,
      lastSyncedSha: newSha,
      lastSyncedLocalHash: localHash,
      lastSyncTime: now.toISOString(),
      lastSyncUser: username,
      lastOperation: 'upload'
    });

    await logSyncOperation('upload', username, newSha, 'success', config.repo, config.branch);

    res.json({
      success: true,
      message: 'Upload Successful',
      commitSha: newSha,
      user: username,
      repo: config.repo,
      branch: config.branch,
      time: now.toISOString()
    });
  } catch (err) {
    const config = await syncManager.loadConfig();
    const username = syncManager.getSystemUsername();
    await logSyncOperation('upload', username, null, 'failed', config.repo, config.branch);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sync/get-latest
router.post('/get-latest', async (req, res) => {
  try {
    const store = requestContext.getStore();
    const variant = store?.variant || 'vsm_pt';
    const username = syncManager.getSystemUsername();

    const config = await syncManager.loadConfig();
    if (!config.token || !config.owner || !config.repo) {
      return res.status(400).json({ success: false, error: 'Git credentials are not configured.' });
    }

    // Fetch remote file
    const remote = await gitClient.getFileContent(
      config.owner,
      config.repo,
      config.filePath,
      config.branch,
      config.token
    );

    if (!remote.exists) {
      return res.status(404).json({ success: false, error: 'Target database file does not exist on GitHub.' });
    }

    // Validate remote content
    let remoteData;
    try {
      remoteData = validateSyncDatabase(remote.content);
    } catch (e) {
      return res.status(400).json({ success: false, error: `Pull Aborted: Remote database JSON is invalid: ${e.message}` });
    }

    const localDbPath = getDbPath();
    let localContent = '';
    let hasLocal = true;
    try {
      localContent = await fs.readFile(localDbPath, 'utf8');
    } catch (e) {
      hasLocal = false;
    }

    const metadata = await syncManager.loadMetadata();
    
    // Check for local modifications
    if (hasLocal) {
      const localHash = syncManager.getDatabaseHash(localContent);
      const isLocalModified = localHash !== metadata.lastSyncedLocalHash;

      // Pull Protection: Block overwrite if local contains unsaved changes
      if (isLocalModified && !req.body.overwrite) {
        return res.status(409).json({
          success: false,
          localChangesDetected: true,
          error: 'Pull Rejected: Local database contains unsaved changes. Choose Compare to resolve differences.'
        });
      }

      // Generate local safety backup before destructive pull
      await createBackup(localDbPath, variant);
    }

    // Overwrite local database
    await writeDatabase(remoteData, variant);

    const newLocalHash = syncManager.getDatabaseHash(remote.content);

    // Save sync metadata
    await syncManager.saveMetadata({
      repository: `${config.owner}/${config.repo}`,
      branch: config.branch,
      filePath: config.filePath,
      lastSyncedSha: remote.sha,
      lastSyncedLocalHash: newLocalHash,
      lastSyncTime: new Date().toISOString(),
      lastSyncUser: username,
      lastOperation: 'download'
    });

    await logSyncOperation('download', username, remote.sha, 'success', config.repo, config.branch);

    res.json({
      success: true,
      message: 'Download Successful',
      commitSha: remote.sha,
      user: username,
      repo: config.repo,
      branch: config.branch,
      time: new Date().toISOString()
    });
  } catch (err) {
    const config = await syncManager.loadConfig();
    const username = syncManager.getSystemUsername();
    await logSyncOperation('download', username, null, 'failed', config.repo, config.branch);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sync/compare
// Read-only dry-run differences comparison
router.post('/compare', async (req, res) => {
  try {
    const store = requestContext.getStore();
    const variant = store?.variant || 'vsm_pt';

    const config = await syncManager.loadConfig();
    if (!config.token || !config.owner || !config.repo) {
      return res.status(400).json({ success: false, error: 'Git credentials are not configured.' });
    }

    // Load local database content
    const localData = await readDatabase(variant);

    // Load remote database content
    const remote = await gitClient.getFileContent(
      config.owner,
      config.repo,
      config.filePath,
      config.branch,
      config.token
    );

    if (!remote.exists) {
      return res.json({
        success: true,
        fileExists: false,
        diff: { tasks: { added: [], deleted: [], updated: [] }, collections: [] }
      });
    }

    let remoteData;
    try {
      remoteData = validateSyncDatabase(remote.content);
    } catch (e) {
      return res.status(400).json({ success: false, error: `GitHub database file is corrupted: ${e.message}` });
    }

    // Generate read-only diff report
    const diff = compareDatabases(localData, remoteData);

    res.json({
      success: true,
      fileExists: true,
      diff
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sync/resolve-conflict
// Explicit, confirmation-guarded conflict resolution
router.post('/resolve-conflict', async (req, res) => {
  try {
    const { resolution, resolutions, confirmation } = req.body;
    
    if (!confirmation) {
      return res.status(400).json({ success: false, error: 'Explicit confirmation required.' });
    }

    const store = requestContext.getStore();
    const variant = store?.variant || 'vsm_pt';
    const username = syncManager.getSystemUsername();
    const config = await syncManager.loadConfig();

    const localDbPath = getDbPath();
    const localContent = await fs.readFile(localDbPath, 'utf8');
    const localData = JSON.parse(localContent);

    // Create a safety backup of local file first
    await createBackup(localDbPath, variant);

    const remote = await gitClient.getFileContent(
      config.owner,
      config.repo,
      config.filePath,
      config.branch,
      config.token
    );

    if (!remote.exists) {
      return res.status(404).json({ success: false, error: 'Remote database file is missing on GitHub.' });
    }

    const remoteData = validateSyncDatabase(remote.content);
    let finalData;

    if (resolution === 'keep_local') {
      finalData = localData;
    } else if (resolution === 'keep_remote') {
      finalData = remoteData;
    } else if (resolution === 'merge') {
      // Trigger identity-based merge using field resolutions
      finalData = mergeDatabases(localData, remoteData, resolutions);
    } else {
      return res.status(400).json({ success: false, error: `Invalid resolution strategy: ${resolution}` });
    }

    // Validate the merged database output
    const finalContent = JSON.stringify(finalData, null, 2);
    validateSyncDatabase(finalContent);

    // Push the finalized content to GitHub
    const now = new Date();
    const timestampStr = now.toISOString().replace('T', ' ').substring(0, 16);
    const commitMessage = `DSR Merge Resolution | ${username} | ${timestampStr}`;

    const newSha = await gitClient.uploadFileContent(
      config.owner,
      config.repo,
      config.filePath,
      config.branch,
      finalContent,
      remote.sha,
      commitMessage,
      config.token
    );

    // Save final content locally
    await writeDatabase(finalData, variant);

    const finalHash = syncManager.getDatabaseHash(finalContent);

    // Save sync metadata
    await syncManager.saveMetadata({
      repository: `${config.owner}/${config.repo}`,
      branch: config.branch,
      filePath: config.filePath,
      lastSyncedSha: newSha,
      lastSyncedLocalHash: finalHash,
      lastSyncTime: now.toISOString(),
      lastSyncUser: username,
      lastOperation: 'merge'
    });

    await logSyncOperation('merge', username, newSha, 'success', config.repo, config.branch);

    res.json({
      success: true,
      message: `Conflict resolved using: ${resolution}`,
      commitSha: newSha
    });
  } catch (err) {
    const config = await syncManager.loadConfig();
    const username = syncManager.getSystemUsername();
    await logSyncOperation('merge', username, null, 'failed', config.repo, config.branch);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
