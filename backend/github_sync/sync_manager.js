import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { requestContext } from '../utils/context.js';
import { getDbPath, readDatabase, writeDatabase } from '../database/connection.js';
import * as gitClient from './github_client.js';
import { validateSyncDatabase } from './validator.js';
import { createBackup } from './backup_manager.js';
import { logSyncOperation } from './sync_history.js';

/**
 * Returns dynamic configuration and metadata file paths based on request context variant
 */
const getPaths = () => {
  const store = requestContext.getStore();
  const variant = store?.variant || 'vsm_pt';
  const cleanVariant = variant.toLowerCase().replace(/\s+/g, '_');
  return {
    config: path.resolve(`.github_sync_config_${cleanVariant}.json`),
    metadata: path.resolve(`.github_sync_metadata_${cleanVariant}.json`),
    variant: cleanVariant
  };
};

/**
 * Resolves the dynamic system / Windows username.
 */
export const getSystemUsername = () => {
  let username = process.env.USERNAME || process.env.USER || process.env.LOGNAME;
  if (!username) {
    try {
      username = os.userInfo().username;
    } catch (e) {
      username = 'System User';
    }
  }
  return username || 'System User';
};

/**
 * Computes canonical MD5 hash of JSON database content to ignore layout/formatting.
 */
export const getDatabaseHash = (contentString) => {
  try {
    const parsed = JSON.parse(contentString);
    const canonical = JSON.stringify(parsed);
    return crypto.createHash('md5').update(canonical).digest('hex');
  } catch (e) {
    return crypto.createHash('md5').update(contentString || '').digest('hex');
  }
};

/**
 * Masks the GitHub Personal Access Token.
 */
export const maskToken = (token) => {
  if (!token) return '';
  if (token.length <= 4) return '••••';
  return '••••••••' + token.slice(-4);
};

/**
 * Loads current local GitHub Sync configuration.
 */
export const loadConfig = async () => {
  const paths = getPaths();
  try {
    const raw = await fs.readFile(paths.config, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // Try to inherit default Repository Owner, Name, and PAT securely from the git-ignored base config
    try {
      const baseRaw = await fs.readFile(path.resolve('.github_sync_config.json'), 'utf8');
      const baseConfig = JSON.parse(baseRaw);
      return {
        owner: baseConfig.owner || '',
        repo: baseConfig.repo || '',
        branch: baseConfig.branch || 'main',
        filePath: `data/${paths.variant.toUpperCase()}/database_${paths.variant}.json`,
        token: baseConfig.token || ''
      };
    } catch (e) {
      // Fallback defaults if no base config is found
      return {
        owner: '',
        repo: '',
        branch: 'main',
        filePath: `data/${paths.variant.toUpperCase()}/database_${paths.variant}.json`,
        token: ''
      };
    }
  }
};

/**
 * Saves GitHub Sync configuration. Resets metadata on configuration change.
 */
export const saveConfig = async (newConfig) => {
  const oldConfig = await loadConfig();
  const paths = getPaths();
  
  // Save credentials to git-ignored config file
  await fs.writeFile(paths.config, JSON.stringify(newConfig, null, 2), 'utf8');
  
  // Reset metadata if path, repo, or branch changes to avoid stale SHA checks
  const isChanged = 
    oldConfig.owner !== newConfig.owner ||
    oldConfig.repo !== newConfig.repo ||
    oldConfig.branch !== newConfig.branch ||
    oldConfig.filePath !== newConfig.filePath;
    
  if (isChanged) {
    await saveMetadata({
      repository: `${newConfig.owner}/${newConfig.repo}`,
      branch: newConfig.branch,
      filePath: newConfig.filePath,
      lastSyncedSha: null,
      lastSyncedLocalHash: null,
      lastSyncTime: null,
      lastSyncUser: null,
      lastOperation: null
    });
  }
};

/**
 * Loads metadata tracking file.
 */
export const loadMetadata = async () => {
  const paths = getPaths();
  try {
    const raw = await fs.readFile(paths.metadata, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    const config = await loadConfig();
    return {
      repository: config.owner ? `${config.owner}/${config.repo}` : '',
      branch: config.branch || 'main',
      filePath: config.filePath || `data/${paths.variant.toUpperCase()}/database_${paths.variant}.json`,
      lastSyncedSha: null,
      lastSyncedLocalHash: null,
      lastSyncTime: null,
      lastSyncUser: null,
      lastOperation: null
    };
  }
};

/**
 * Saves metadata tracking file.
 */
export const saveMetadata = async (metadata) => {
  const paths = getPaths();
  await fs.writeFile(paths.metadata, JSON.stringify(metadata, null, 2), 'utf8');
};

/**
 * Checks database size before syncing to prevent sending corrupted/massive files.
 * Returns { warn: boolean, sizeMB: number }
 */
export const checkDatabaseSize = async (dbFilePath) => {
  try {
    const stat = await fs.stat(dbFilePath);
    const sizeMB = stat.size / (1024 * 1024);
    // Warn if file size is larger than 5 MB
    return {
      warn: sizeMB > 5.0,
      sizeMB: parseFloat(sizeMB.toFixed(2))
    };
  } catch (e) {
    return { warn: false, sizeMB: 0 };
  }
};

/**
 * Computes connection & sync status against GitHub.
 * Returns: 'Disconnected' | 'Synced' | 'Local Changes' | 'GitHub Changes Available' | 'Conflict' | 'Error'
 */
export const computeSyncStatus = async (variant) => {
  const config = await loadConfig();
  if (!config.token || !config.owner || !config.repo) {
    return 'Disconnected';
  }

  try {
    const localDbPath = getDbPath();
    let localContent = '';
    try {
      localContent = await fs.readFile(localDbPath, 'utf8');
    } catch (e) {
      // Local database file doesn't exist yet
      localContent = JSON.stringify(await readDatabase(variant));
    }

    const localHash = getDatabaseHash(localContent);
    const metadata = await loadMetadata();
    
    // Check if remote file exists
    const remote = await gitClient.getFileContent(
      config.owner,
      config.repo,
      config.filePath,
      config.branch,
      config.token
    ).catch(() => null);

    if (!remote || !remote.exists) {
      // Remote file doesn't exist yet on GitHub
      if (metadata.lastSyncedLocalHash !== localHash) {
        return 'Local Changes';
      }
      return 'Synced';
    }

    const remoteHash = getDatabaseHash(remote.content);
    const remoteSha = remote.sha;

    const isLocalModified = localHash !== metadata.lastSyncedLocalHash;
    const isRemoteModified = remoteSha !== metadata.lastSyncedSha;

    if (isLocalModified && isRemoteModified) {
      // If hashes match despite SHA mismatch (e.g. someone committed identical data)
      if (localHash === remoteHash) {
        return 'Synced';
      }
      return 'Conflict';
    }
    
    if (isLocalModified) {
      return 'Local Changes';
    }
    
    if (isRemoteModified) {
      return 'GitHub Changes Available';
    }

    return 'Synced';
  } catch (err) {
    return 'Error';
  }
};
