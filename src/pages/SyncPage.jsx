import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  RefreshCw, Github, CloudUpload, CloudDownload, GitCommit, GitBranch, 
  User, CheckCircle, AlertTriangle, AlertCircle, Clock, ShieldCheck, 
  Settings, History, ChevronRight, X, Layers, Play, Search
} from 'lucide-react';
import { useStore } from '../store/useStore';

export default function SyncPage() {
  const { variant } = useParams();
  const loadDatabase = useStore(state => state.loadDatabase);

  // Connection and Status State
  const [syncStatus, setSyncStatus] = useState('Disconnected');
  const [username, setUsername] = useState('System User');
  const [metadata, setMetadata] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Configuration Form State
  const [config, setConfig] = useState({
    owner: '',
    repo: '',
    branch: 'main',
    filePath: 'data/VSM/database_vsm_pt.json',
    token: ''
  });
  const [configLoading, setConfigLoading] = useState(true);
  const [configMessage, setConfigMessage] = useState(null);

  // Global loading states (prevents concurrent sync actions)
  const [actionRunning, setActionRunning] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  
  // Dry-run Diff viewer state
  const [diffReport, setDiffReport] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  
  // Conflict resolution states
  const [conflictOpen, setConflictOpen] = useState(false);
  const [mergeResolutions, setMergeResolutions] = useState({}); // { [conflict_key]: 'local' | 'remote' }

  // Size guard warning
  const [sizeWarning, setSizeWarning] = useState(null);

  // Load configuration and status on page load/variant change
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/sync/status', {
        headers: { 'x-variant': variant }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSyncStatus(data.status);
          setUsername(data.user);
          setMetadata(data.metadata);
          setHistoryList(data.history || []);
        }
      }
    } catch (e) {
      console.error('Failed to load sync status:', e);
    }
  };

  const fetchConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await fetch('/api/sync/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConfig({
            owner: data.owner || '',
            repo: data.repo || '',
            branch: data.branch || 'main',
            filePath: data.filePath || `data/VSM/database_${variant}.json`,
            token: data.token || ''
          });
        }
      }
    } catch (e) {
      console.error('Failed to load sync config:', e);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchConfig();
    setDiffReport(null);
    setConflictOpen(false);
    setSizeWarning(null);
  }, [variant]);

  // Save Configuration
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigMessage({ type: 'info', text: 'Saving configuration...' });
    
    try {
      const res = await fetch('/api/sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setConfigMessage({ type: 'success', text: 'Configuration saved. Metadata reset.' });
        fetchStatus();
        fetchConfig();
      } else {
        setConfigMessage({ type: 'error', text: data.error || 'Failed to save configuration.' });
      }
    } catch (err) {
      setConfigMessage({ type: 'error', text: err.message });
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    setActionRunning(true);
    setActionMessage('Testing connection to GitHub repository...');
    try {
      const res = await fetch('/api/sync/test-connection');
      const data = await res.json();
      if (data.success) {
        alert(`Connection successful! File exists on GitHub: ${data.fileExists ? 'Yes' : 'No'}`);
        fetchStatus();
      } else {
        alert(`Connection failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Connection failed: ${err.message}`);
    } finally {
      setActionRunning(false);
    }
  };

  // Upload (Push) to GitHub
  const handleUpload = async (forceSize = false) => {
    setActionRunning(true);
    setActionMessage('Uploading database to GitHub...');
    setSizeWarning(null);

    try {
      const res = await fetch('/api/sync/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-variant': variant
        },
        body: JSON.stringify({ forceSize })
      });

      const data = await res.json();
      
      if (data.sizeWarning) {
        setSizeWarning(data);
        setActionRunning(false);
        return;
      }

      if (data.success) {
        alert('Upload Successful! Remote repository updated.');
        setDiffReport(null);
        fetchStatus();
      } else {
        alert(`Upload Rejected: ${data.error || 'Conflict detected.'}`);
        if (data.conflict) {
          handleCompare(); // Auto-load diff if conflict rejected
        }
      }
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setActionRunning(false);
    }
  };

  // Get Latest (Pull) from GitHub
  const handleGetLatest = async (overwrite = false) => {
    setActionRunning(true);
    setActionMessage('Fetching latest database from GitHub...');
    try {
      const res = await fetch('/api/sync/get-latest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-variant': variant
        },
        body: JSON.stringify({ overwrite })
      });

      const data = await res.json();
      if (data.success) {
        alert('Get Latest Successful! Local database updated.');
        setDiffReport(null);
        await loadDatabase(); // Refresh local Zustand store state
        fetchStatus();
      } else {
        if (data.localChangesDetected) {
          if (confirm('Local database contains unsaved changes. Overwriting will discard them. Would you like to compare changes first?')) {
            handleCompare();
          }
        } else {
          alert(`Fetch failed: ${data.error}`);
        }
      }
    } catch (err) {
      alert(`Fetch failed: ${err.message}`);
    } finally {
      setActionRunning(false);
    }
  };

  // Read-only dry-run Compare
  const handleCompare = async () => {
    setDiffLoading(true);
    setDiffReport(null);
    setConflictOpen(false);

    try {
      const res = await fetch('/api/sync/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-variant': variant
        }
      });
      const data = await res.json();
      if (data.success) {
        setDiffReport(data);
        if (data.diff && data.diff.hasConflicts) {
          setConflictOpen(true);
          // Prepopulate resolutions as 'local'
          const initialRes = {};
          const updatedTasks = data.diff.tasks.updated || [];
          updatedTasks.forEach(task => {
            task.diffs.forEach(d => {
              initialRes[`task_${task.sno}_${d.field}`] = 'local';
            });
          });
          setMergeResolutions(initialRes);
        }
      } else {
        alert(`Comparison failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Comparison error: ${err.message}`);
    } finally {
      setDiffLoading(false);
    }
  };

  // One-click Smart Sync operation
  const handleSmartSync = async () => {
    setActionRunning(true);
    setActionMessage('Evaluating database sync states...');
    try {
      // 1. Fetch current status
      const resStatus = await fetch('/api/sync/status', { headers: { 'x-variant': variant } });
      const dataStatus = await resStatus.json();
      
      if (!dataStatus.success) {
        throw new Error(dataStatus.error || 'Failed to check status');
      }

      const activeStatus = dataStatus.status;

      if (activeStatus === 'Synced') {
        alert('Database is already synchronized with GitHub.');
      } else if (activeStatus === 'Local Changes') {
        setActionRunning(false);
        handleUpload();
        return;
      } else if (activeStatus === 'GitHub Changes Available') {
        setActionRunning(false);
        handleGetLatest();
        return;
      } else if (activeStatus === 'Conflict') {
        setActionRunning(false);
        alert('Sync Conflict Detected! Displaying differences panel for manual resolution.');
        handleCompare();
      } else if (activeStatus === 'Disconnected') {
        alert('Please connect your GitHub repository and token first.');
      } else {
        alert(`Cannot run Sync in current state: ${activeStatus}`);
      }
    } catch (err) {
      alert(`Smart Sync failed: ${err.message}`);
    } finally {
      setActionRunning(false);
    }
  };

  // Resolve conflict explicitly
  const handleResolveConflict = async (resolution) => {
    if (!confirm(`Are you sure you want to resolve the conflict by keeping the ${resolution.replace('_', ' ')} version? This will write a new version to GitHub and save locally.`)) {
      return;
    }

    setActionRunning(true);
    setActionMessage('Resolving conflict and applying commits...');
    
    try {
      const res = await fetch('/api/sync/resolve-conflict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-variant': variant
        },
        body: JSON.stringify({
          resolution,
          resolutions: resolution === 'merge' ? mergeResolutions : {},
          confirmation: true
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Conflict successfully resolved and synchronized!');
        setDiffReport(null);
        setConflictOpen(false);
        await loadDatabase(); // Refresh local application state
        fetchStatus();
      } else {
        alert(`Resolution failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Resolution error: ${err.message}`);
    } finally {
      setActionRunning(false);
    }
  };

  // Status indicators mapper
  const getStatusDetails = (status) => {
    switch (status) {
      case 'Synced':
        return { label: 'Synced', color: 'var(--success)', icon: <CheckCircle size={20} color="var(--success)" />, bg: 'var(--success-bg)' };
      case 'Local Changes':
        return { label: 'Local Changes', color: '#d97706', icon: <AlertTriangle size={20} color="#d97706" />, bg: '#fef3c7' };
      case 'GitHub Changes Available':
        return { label: 'Remote Changes Available', color: 'var(--primary)', icon: <CloudDownload size={20} color="var(--primary)" />, bg: 'var(--purple-bg)' };
      case 'Conflict':
        return { label: 'Sync Conflict', color: 'var(--danger)', icon: <AlertCircle size={20} color="var(--danger)" />, bg: 'var(--danger-bg)' };
      case 'Disconnected':
        return { label: 'Disconnected', color: 'var(--text-muted)', icon: <X size={20} color="var(--text-muted)" />, bg: '#f1f5f9' };
      case 'Error':
      default:
        return { label: 'Connection Error', color: 'var(--danger)', icon: <AlertCircle size={20} color="var(--danger)" />, bg: 'var(--danger-bg)' };
    }
  };

  const activeStatusDetails = getStatusDetails(syncStatus);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Page Title */}
      <div>
        <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Github size={28} color="var(--primary)" /> GitHub Synchronization Hub
        </h1>
        <p className="subtitle">Securely version control, backup, and pull database files directly from private repositories.</p>
      </div>

      {/* Action running loader block */}
      {actionRunning && (
        <div className="card glass" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--primary)', background: 'var(--purple-bg)' }}>
          <RefreshCw className="animate-spin" size={20} color="var(--primary)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)' }}>{actionMessage}</span>
        </div>
      )}

      {/* Size warning guard warning box */}
      {sizeWarning && (
        <div className="card" style={{ padding: '24px', background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <AlertCircle size={24} color="var(--danger)" />
            <div>
              <h3 style={{ margin: 0, color: 'var(--danger)', fontWeight: 700 }}>Unusually Large Database Warning</h3>
              <p style={{ margin: '6px 0 16px 0', fontSize: '0.88rem' }}>{sizeWarning.message}</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" style={{ background: 'var(--danger)' }} onClick={() => handleUpload(true)}>
                  Yes, Continue Upload
                </button>
                <button className="btn btn-secondary" onClick={() => setSizeWarning(null)}>
                  Abort Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
        
        {/* Left Column: Sync Controls & Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Status Panel Card */}
          <div className="card glass" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CloudUpload size={20} color="var(--primary)" /> Connection Status & Sync Actions
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Dynamic Status Bar */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                background: activeStatusDetails.bg, 
                padding: '16px 20px', 
                borderRadius: '12px',
                border: `1px solid ${activeStatusDetails.color}33`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {activeStatusDetails.icon}
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>GitHub Status</span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: activeStatusDetails.color }}>
                      {activeStatusDetails.label}
                    </h3>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Active User</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--text)' }}>
                    <User size={14} /> {username}
                  </div>
                </div>
              </div>

              {/* Action Buttons Matrix */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button 
                  className="btn btn-secondary smoothTransition"
                  onClick={() => handleUpload(false)}
                  disabled={actionRunning || syncStatus === 'Disconnected'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}
                >
                  <CloudUpload size={16} /> Upload to GitHub
                </button>
                <button 
                  className="btn btn-secondary smoothTransition"
                  onClick={() => handleGetLatest(false)}
                  disabled={actionRunning || syncStatus === 'Disconnected'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}
                >
                  <CloudDownload size={16} /> Get Latest
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                <button 
                  className="btn btn-primary smoothTransition"
                  onClick={handleSmartSync}
                  disabled={actionRunning || syncStatus === 'Disconnected'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}
                >
                  <RefreshCw size={16} /> Run Smart Sync
                </button>
                <button 
                  className="btn btn-secondary smoothTransition"
                  onClick={handleCompare}
                  disabled={actionRunning || syncStatus === 'Disconnected' || diffLoading}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}
                >
                  <Search size={16} /> {diffLoading ? 'Analyzing...' : 'Compare Dry-Run'}
                </button>
              </div>

              <button 
                className="btn btn-secondary"
                onClick={() => setShowHistory(!showHistory)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', borderRadius: '8px', borderStyle: 'dashed' }}
              >
                <History size={14} /> {showHistory ? 'Hide Sync History' : 'Show Sync History'}
              </button>

            </div>
          </div>

          {/* Sync History Logs Card */}
          {showHistory && (
            <div className="card glass" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="var(--primary)" /> Sync History Logs
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                {historyList.map((log, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '10px 14px', 
                    background: '#f8fafc', 
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '0.82rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          fontSize: '0.72rem', 
                          textTransform: 'uppercase', 
                          fontWeight: 700, 
                          color: log.result === 'success' ? 'var(--success)' : 'var(--danger)',
                          background: log.result === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {log.operation}
                        </span>
                        <strong style={{ color: 'var(--text)' }}>User: {log.user}</strong>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                        Commit SHA: <code style={{ fontSize: '0.72rem' }}>{log.commitSha}</code>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
                
                {historyList.length === 0 && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                    No sync operations logged yet.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Sync Meta details summary */}
          {metadata && metadata.lastSyncTime && (
            <div className="card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-muted)' }}>Last Synced Metadata</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Last Sync Timestamp</span>
                  <span style={{ fontWeight: 700 }}>{new Date(metadata.lastSyncTime).toLocaleString()}</span>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Last Remote Commit SHA</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {metadata.lastSyncedSha ? metadata.lastSyncedSha.substring(0, 8) : '--'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Configurations Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          <div className="card glass" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} color="var(--primary)" /> GitHub Config Settings
            </h2>

            {configLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
                <RefreshCw className="animate-spin" size={24} color="var(--primary)" />
              </div>
            ) : (
              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Repository Owner</span>
                    <input 
                      type="text" 
                      placeholder="e.g. tharunjuturu"
                      value={config.owner}
                      onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                      required
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Repository Name</span>
                    <input 
                      type="text" 
                      placeholder="e.g. DSR_Operations_Hub"
                      value={config.repo}
                      onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                      required
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Repository Branch</span>
                    <input 
                      type="text" 
                      placeholder="main"
                      value={config.branch}
                      onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                      required
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Database File Path</span>
                    <input 
                      type="text" 
                      placeholder="data/VSM/database_vsm_pt.json"
                      value={config.filePath}
                      onChange={(e) => setConfig({ ...config, filePath: e.target.value })}
                      required
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </label>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Personal Access Token (PAT)</span>
                  <input 
                    type="password" 
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={config.token}
                    onChange={(e) => setConfig({ ...config, token: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    PAT token is securely stored locally in a git-ignored file and never exposed.
                  </span>
                </label>

                {configMessage && (
                  <div style={{ 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    fontSize: '0.8rem',
                    background: configMessage.type === 'success' ? 'var(--success-bg)' : configMessage.type === 'error' ? 'var(--danger-bg)' : '#eff6ff',
                    color: configMessage.type === 'success' ? 'var(--success)' : configMessage.type === 'error' ? 'var(--danger)' : 'var(--primary)',
                    border: `1px solid ${configMessage.type === 'success' ? 'var(--success)' : configMessage.type === 'error' ? 'var(--danger)' : 'var(--primary)'}22`
                  }}>
                    {configMessage.text}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1.5, borderRadius: '8px', padding: '10px' }}>
                    Save Configuration
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleTestConnection}
                    disabled={!config.owner || !config.repo}
                    style={{ flex: 1, borderRadius: '8px', padding: '10px' }}
                  >
                    Test Connection
                  </button>
                </div>

              </form>
            )}

          </div>

        </div>

      </div>

      {/* -------------------- DIFF COMPARISON VIEWER -------------------- */}
      {diffReport && (
        <div className="card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="var(--primary)" /> Database Comparison Diff (Dry-Run)
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Comparing active local database against remote file on GitHub.
              </p>
            </div>
            <button className="btn btn-icon-sm" onClick={() => setDiffReport(null)}>
              <X size={18} />
            </button>
          </div>

          {/* Conflict Warning Drawer */}
          {conflictOpen && (
            <div style={{ 
              padding: '16px 20px', 
              background: 'var(--danger-bg)', 
              border: '1px solid var(--danger)', 
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <AlertCircle size={20} color="var(--danger)" />
                <h3 style={{ margin: 0, color: 'var(--danger)', fontSize: '0.95rem', fontWeight: 800 }}>Sync Conflict Detected!</h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Both local and remote versions contain updates. Please select resolutions in the grid below, then click **Merge** or choose a full version overwrite.
              </p>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleResolveConflict('keep_local')}>
                  Keep Local (Force Push)
                </button>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleResolveConflict('keep_remote')}>
                  Keep GitHub (Force Pull)
                </button>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleResolveConflict('merge')}>
                  Apply Merged Choice
                </button>
              </div>
            </div>
          )}

          {/* Diffs Lists */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. Added / Deleted summary */}
            {(diffReport.diff.tasks.added.length > 0 || diffReport.diff.tasks.deleted.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* Added Tasks */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--success)' }}>
                    + New on GitHub ({diffReport.diff.tasks.added.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                    {diffReport.diff.tasks.added.map((t, idx) => (
                      <div key={idx} style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#f0fdf4', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span><strong>{t.function}</strong> (ID: {t.taskIds?.join(', ')})</span>
                        <span className="badge badge-success">{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deleted Tasks */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--danger)' }}>
                    - Deleted on GitHub ({diffReport.diff.tasks.deleted.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                    {diffReport.diff.tasks.deleted.map((t, idx) => (
                      <div key={idx} style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#fef2f2', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span><strong>{t.function}</strong> (ID: {t.taskIds?.join(', ')})</span>
                        <span className="badge badge-danger">{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* 2. Modified Tasks Comparison Grid */}
            {diffReport.diff.tasks.updated.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Modified Task Property Conflicts</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose resolution values for each field</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', divideY: '1px solid var(--border)' }}>
                  {diffReport.diff.tasks.updated.map((task, uIdx) => (
                    <div key={uIdx} style={{ padding: '16px', borderBottom: uIdx === diffReport.diff.tasks.updated.length - 1 ? 'none' : '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.85rem', marginBottom: '10px' }}>
                        Task SNo: {task.sno} | Function: {task.function} | Task IDs: {task.taskIds?.join(', ')}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {task.diffs.map((d, dIdx) => {
                          const resKey = `task_${task.sno}_${d.field}`;
                          const currentRes = mergeResolutions[resKey] || 'local';
                          
                          return (
                            <div key={dIdx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 2fr 1fr', gap: '12px', alignItems: 'center', fontSize: '0.8rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{d.field}</span>
                              
                              {/* Local Choice option */}
                              <button 
                                className={`btn smoothTransition ${currentRes === 'local' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setMergeResolutions({ ...mergeResolutions, [resKey]: 'local' })}
                                style={{ padding: '6px', fontSize: '0.78rem', justifyContent: 'center', background: currentRes === 'local' ? 'var(--primary)' : 'transparent', color: currentRes === 'local' ? 'white' : 'var(--text)' }}
                              >
                                Local: {String(d.local)}
                              </button>

                              {/* Remote Choice option */}
                              <button 
                                className={`btn smoothTransition ${currentRes === 'remote' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setMergeResolutions({ ...mergeResolutions, [resKey]: 'remote' })}
                                style={{ padding: '6px', fontSize: '0.78rem', justifyContent: 'center', background: currentRes === 'remote' ? 'var(--primary)' : 'transparent', color: currentRes === 'remote' ? 'white' : 'var(--text)' }}
                              >
                                GitHub: {String(d.remote)}
                              </button>

                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 'bold' }}>
                                Choice: {currentRes.toUpperCase()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Other collections count summary differences */}
            {diffReport.diff.collections.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 10px 0' }}>Configuration Collections Count Diffs</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {diffReport.diff.collections.map((col, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                      <span>Collection: <strong>{col.collection}</strong></span>
                      <span>Local size: <strong>{col.localCount}</strong> vs GitHub size: <strong>{col.remoteCount}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diffReport.diff.tasks.added.length === 0 && 
             diffReport.diff.tasks.deleted.length === 0 && 
             diffReport.diff.tasks.updated.length === 0 && 
             diffReport.diff.collections.length === 0 && (
              <div style={{ padding: '20px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem' }}>
                No differences detected. Both databases are completely synchronized.
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
