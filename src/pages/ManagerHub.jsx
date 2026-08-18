import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ShieldCheck, RefreshCw, AlertTriangle, CheckCircle, 
  FileSpreadsheet, ArrowRight, Database, AlertCircle, 
  Clock, HardDrive, Layers, Search, Maximize2, Minimize2, Filter
} from 'lucide-react';
import { useStore } from '../store/useStore';

export default function ManagerHub() {
  const { variant } = useParams();
  const loadDatabase = useStore(state => state.loadDatabase);
  
  // Read strictly from isolated excelTasks cache
  const tasks = useStore(state => state.excelTasks || []);

  // Component States
  const [scanning, setScanning] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [scanError, setScanError] = useState(null);
  
  // Import process states
  const [importStatus, setImportStatus] = useState('idle'); // 'idle' | 'importing' | 'success' | 'error'
  const [importError, setImportError] = useState('');
  const [progressStep, setProgressStep] = useState(0);
  const [importSummary, setImportSummary] = useState(null);

  // Spreadsheet preview states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fullscreen layout toggle
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Advanced dropdown filter states
  const [selectedFunction, setSelectedFunction] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState('');
  const [selectedSw, setSelectedSw] = useState('');
  const [selectedRequestor, setSelectedRequestor] = useState('');

  // Extract unique values from live tasks list for the dropdowns
  const uniqueFunctions = useMemo(() => {
    return [...new Set(tasks.map(t => t.function))].filter(Boolean).sort();
  }, [tasks]);

  const uniqueStatuses = useMemo(() => {
    return [...new Set(tasks.map(t => t.status))].filter(Boolean).sort();
  }, [tasks]);

  const uniqueTaskTypes = useMemo(() => {
    return [...new Set(tasks.map(t => t.taskType))].filter(Boolean).sort();
  }, [tasks]);

  const uniqueSws = useMemo(() => {
    return [...new Set(tasks.map(t => t.destinationSw))].filter(Boolean).sort();
  }, [tasks]);

  const uniqueRequestors = useMemo(() => {
    return [...new Set(tasks.map(t => t.requestBy))].filter(Boolean).sort();
  }, [tasks]);

  // Scan for the Excel file on load or variant change
  const scanExcelFile = async () => {
    setScanning(true);
    setScanError(null);
    setFileInfo(null);
    try {
      const res = await fetch('/api/manager/scan-excel', {
        headers: { 'x-variant': variant }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFileInfo(data);
        } else {
          setScanError(data.error || 'No matching file found.');
        }
      } else {
        setScanError('Failed to communicate with the scanner service.');
      }
    } catch (err) {
      setScanError('Scanner error: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    scanExcelFile();
    setImportStatus('idle');
    setImportSummary(null);
  }, [variant]);

  // Reset page when search or dropdown filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFunction, selectedStatus, selectedTaskType, selectedSw, selectedRequestor]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedFunction('');
    setSelectedStatus('');
    setSelectedTaskType('');
    setSelectedSw('');
    setSelectedRequestor('');
    setSearchQuery('');
  };

  // Filter tasks based on all active options
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Apply dropdown filters
    if (selectedFunction) {
      result = result.filter(t => t.function === selectedFunction);
    }
    if (selectedStatus) {
      result = result.filter(t => t.status === selectedStatus);
    }
    if (selectedTaskType) {
      result = result.filter(t => t.taskType === selectedTaskType);
    }
    if (selectedSw) {
      result = result.filter(t => t.destinationSw === selectedSw);
    }
    if (selectedRequestor) {
      result = result.filter(t => t.requestBy === selectedRequestor);
    }

    // Apply text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => {
        const idStr = Array.isArray(t.taskIds) ? t.taskIds[0] : (t.taskId || '');
        return (
          String(idStr).toLowerCase().includes(q) ||
          String(t.function).toLowerCase().includes(q) ||
          String(t.taskType).toLowerCase().includes(q) ||
          String(t.destinationSw).toLowerCase().includes(q) ||
          String(t.requestBy).toLowerCase().includes(q) ||
          String(t.status).toLowerCase().includes(q)
        );
      });
    }
    
    return result;
  }, [tasks, searchQuery, selectedFunction, selectedStatus, selectedTaskType, selectedSw, selectedRequestor]);

  // Paginated tasks
  const totalPages = Math.ceil(filteredTasks.length / pageSize);
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTasks.slice(startIndex, startIndex + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  // Execute import process
  const handleImport = async () => {
    setImportStatus('importing');
    setProgressStep(1);
    setImportError('');
    setImportSummary(null);

    // Step-by-step progress micro-animations
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    try {
      await delay(600);
      setProgressStep(2);
      await delay(850);
      setProgressStep(3);
      await delay(700);
      setProgressStep(4);

      const res = await fetch('/api/manager/import-excel-full', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-variant': variant
        },
        body: JSON.stringify({ mode: 'sync' })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProgressStep(5);
          setImportSummary(data);
          
          // Reload local Zustand store state
          await loadDatabase();
          
          await delay(500);
          setImportStatus('success');
        } else {
          throw new Error(data.error || 'Import failed.');
        }
      } else {
        throw new Error('Server returned an error status.');
      }
    } catch (err) {
      setImportError(err.message);
      setImportStatus('error');
    }
  };

  // Helper to format bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Check if any filter is active
  const isFilterActive = searchQuery || selectedFunction || selectedStatus || selectedTaskType || selectedSw || selectedRequestor;

  // Custom Full Screen Style Definition
  const fullscreenStyle = isFullScreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 9999,
    background: '#f1f5f9',
    padding: '24px 32px',
    overflowY: 'auto',
    borderRadius: 0,
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  } : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Normal view elements (hidden during Full Screen Mode to optimize workspace) */}
      {!isFullScreen && (
        <>
          {/* Premium Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            padding: '24px 32px',
            borderRadius: '16px',
            color: 'white',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                <ShieldCheck size={32} color="#60a5fa" /> Manager Control Hub
              </h1>
              <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.95rem' }}>
                Sync and refresh task monitoring records directly from Expleo delivery workbook.
              </p>
            </div>
            
            <button 
              className="btn btn-secondary smoothTransition"
              onClick={scanExcelFile}
              disabled={scanning || importStatus === 'importing'}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                borderRadius: '10px'
              }}
            >
              <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Scanning...' : 'Scan Folder'}
            </button>
          </div>

          {/* Main Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            
            {/* Left Column - Workbook Scan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* File Status Card */}
              <div className="card glass" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                  <FileSpreadsheet size={20} color="var(--primary)" /> Excel Workbook Scanner
                </h2>

                {scanning ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                    <RefreshCw className="animate-spin" size={28} color="var(--primary)" />
                    <span style={{ marginTop: '12px', fontSize: '0.88rem' }}>Scanning Import_Files directory...</span>
                  </div>
                ) : scanError ? (
                  <div style={{ 
                    background: 'rgba(239, 68, 68, 0.05)', 
                    border: '1px solid rgba(239, 68, 68, 0.15)', 
                    borderRadius: '12px', 
                    padding: '16px',
                    display: 'flex',
                    gap: '12px'
                  }}>
                    <AlertCircle size={22} color="var(--danger)" style={{ flexShrink: 0 }} />
                    <div>
                      <h4 style={{ margin: 0, color: 'var(--danger)', fontWeight: 700 }}>Workbook Not Detected</h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#7f1d1d' }}>
                        {scanError}
                      </p>
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: '#7f1d1d', opacity: 0.8 }}>
                        Make sure the delivery sheet starting with <code style={{ background: 'rgba(239,68,68,0.1)', padding: '2px 4px', borderRadius: '4px' }}>SVBL_VSM_delivery_management</code> is inside the <code style={{ background: 'rgba(239,68,68,0.1)', padding: '2px 4px', borderRadius: '4px' }}>Import_Files</code> directory.
                      </p>
                    </div>
                  </div>
                ) : fileInfo ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ 
                      background: 'rgba(16, 185, 129, 0.05)', 
                      border: '1px solid rgba(16, 185, 129, 0.15)',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <CheckCircle size={18} color="var(--success)" />
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#065f46' }}>Target Workbook Located</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                        <HardDrive size={18} color="var(--text-muted)" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>File Size</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatBytes(fileInfo.sizeBytes)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                        <Clock size={18} color="var(--text-muted)" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Modified</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }} title={new Date(fileInfo.lastModified).toLocaleString()}>
                            {new Date(fileInfo.lastModified).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ border: '1px dashed var(--border)', borderRadius: '10px', padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Target Worksheet:</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>Task_monitoring</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Task Rows Found:</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>{fileInfo.taskCount}</span>
                      </div>
                    </div>

                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      File Location: <code style={{ fontSize: '0.78rem' }}>Import_Files/{fileInfo.filename}</code>
                    </span>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    No scan run yet. Click Refresh to locate workbook.
                  </div>
                )}
              </div>

            </div>

            {/* Right Column - Action Center & Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Action Hub Card */}
              <div className="card glass hover-lift" style={{ 
                padding: '32px 24px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center',
                minHeight: '280px'
              }}>
                {importStatus === 'idle' && (
                  <>
                    <Database size={48} color="var(--primary)" style={{ marginBottom: '16px' }} />
                    <h3 style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Excel Workbook Integration</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 24px 0', maxWidth: '320px', lineHeight: '1.4' }}>
                      Import all workbook rows safely into the isolated spreadsheet database. This will <strong>not</strong> affect developer timesheet tasks.
                    </p>
                    <button 
                      className="btn btn-primary smoothTransition"
                      onClick={handleImport}
                      disabled={!fileInfo || scanning}
                      style={{ 
                        padding: '12px 28px',
                        fontSize: '0.95rem',
                        borderRadius: '12px',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        opacity: (!fileInfo || scanning) ? 0.5 : 1,
                        cursor: (!fileInfo || scanning) ? 'not-allowed' : 'pointer',
                        boxShadow: 'var(--shadow-md)'
                      }}
                    >
                      Start Workbook Import <ArrowRight size={18} />
                    </button>
                  </>
                )}

                {importStatus === 'importing' && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <RefreshCw size={40} className="animate-spin" color="var(--primary)" style={{ marginBottom: '20px' }} />
                    <h3 style={{ margin: '0 0 16px 0', fontWeight: 700 }}>Import in Progress</h3>
                    
                    {/* Progress Steps Logs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', textAlign: 'left', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: progressStep >= 1 ? 'var(--text)' : 'var(--text-muted)' }}>
                        <span style={{ color: progressStep > 1 ? 'var(--success)' : 'var(--primary)', fontWeight: 'bold' }}>{progressStep > 1 ? '✓' : '●'}</span>
                        <span>Scanning workbook folder...</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: progressStep >= 2 ? 'var(--text)' : 'var(--text-muted)' }}>
                        <span style={{ color: progressStep > 2 ? 'var(--success)' : progressStep === 2 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                          {progressStep > 2 ? '✓' : progressStep === 2 ? '●' : '○'}
                        </span>
                        <span>Parsing Task_monitoring sheet...</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: progressStep >= 3 ? 'var(--text)' : 'var(--text-muted)' }}>
                        <span style={{ color: progressStep > 3 ? 'var(--success)' : progressStep === 3 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                          {progressStep > 3 ? '✓' : progressStep === 3 ? '●' : '○'}
                        </span>
                        <span>Validating variant and matching column headers...</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: progressStep >= 4 ? 'var(--text)' : 'var(--text-muted)' }}>
                        <span style={{ color: progressStep > 4 ? 'var(--success)' : progressStep === 4 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                          {progressStep > 4 ? '✓' : progressStep === 4 ? '●' : '○'}
                        </span>
                        <span>Writing records safely to database...</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: progressStep >= 5 ? 'var(--text)' : 'var(--text-muted)' }}>
                        <span style={{ color: progressStep > 5 ? 'var(--success)' : progressStep === 5 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                          {progressStep > 5 ? '✓' : progressStep === 5 ? '●' : '○'}
                        </span>
                        <span>Reloading local application state...</span>
                      </div>
                    </div>
                  </div>
                )}

                {importStatus === 'success' && importSummary && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ 
                      background: 'var(--success-bg)', 
                      color: 'var(--success)', 
                      width: '60px', 
                      height: '60px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginBottom: '16px',
                      boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                    }}>
                      <CheckCircle size={32} />
                    </div>
                    <h3 style={{ margin: '0 0 6px 0', fontWeight: 800, color: 'var(--text)' }}>Import Successful!</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
                      Workbook data successfully refreshed.
                    </p>

                    <div style={{ width: '100%', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#166534', margin: '4px 0' }}>
                        <span>Imported Workbook Tasks:</span>
                        <strong style={{ fontSize: '0.9rem' }}>{importSummary.totalCount}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#166534', margin: '4px 0' }}>
                        <span>Integration Mode:</span>
                        <strong style={{ textTransform: 'uppercase', fontSize: '0.78rem' }}>Isolated Cache</strong>
                      </div>
                    </div>

                    <button 
                      className="btn btn-secondary"
                      onClick={() => setImportStatus('idle')}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px' }}
                    >
                      Done
                    </button>
                  </div>
                )}

                {importStatus === 'error' && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ 
                      background: 'var(--danger-bg)', 
                      color: 'var(--danger)', 
                      width: '60px', 
                      height: '60px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginBottom: '16px'
                    }}>
                      <AlertTriangle size={32} />
                    </div>
                    <h3 style={{ margin: '0 0 6px 0', fontWeight: 800, color: 'var(--danger)', fontSize: '1.1rem' }}>Import Aborted</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 20px 0', padding: '0 12px', lineHeight: '1.4' }}>
                      {importError || 'An unexpected error occurred during database migration.'}
                    </p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setImportStatus('idle')}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'var(--danger)' }}
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>

              {/* Safe Mode Guarantee */}
              <div className="card glass" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
                  <ShieldCheck size={20} color="var(--success)" /> Safe Database Isolation
                </h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  The workbook importer has been updated with active **Variant Protection**. VSM sheets cannot be imported into BSI, and vice versa. All data is saved in an isolated workbook database, keeping timesheets and developer assignments 100% safe.
                </p>
              </div>

            </div>

          </div>
        </>
      )}

      {/* Excel Spreadsheet Preview Container */}
      <div className="card glass" style={{ 
        padding: '24px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px',
        ...fullscreenStyle
      }}>
        {/* Header Controls Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
              <FileSpreadsheet size={22} color="var(--success)" /> Live Spreadsheet Database View
            </h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Format-aligned grid representing live tracker records. Active Variant: <strong style={{ color: 'var(--primary)' }}>{variant.toUpperCase()}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Global Filters Reset */}
            {isFilterActive && (
              <button 
                className="btn btn-secondary"
                onClick={handleResetFilters}
                style={{ padding: '8px 14px', borderRadius: '8px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                Clear Filters
              </button>
            )}

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search Excel data..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  padding: '8px 12px 8px 36px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border)',
                  width: '240px',
                  background: 'white'
                }}
              />
            </div>

            {/* Page Size Selector */}
            <select 
              value={pageSize} 
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white' }}
            >
              <option value={10}>10 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>

            {/* Fullscreen Mode Toggle */}
            <button 
              className="btn btn-secondary"
              onClick={() => setIsFullScreen(!isFullScreen)}
              style={{ padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 size={16} /> Exit Full View
                </>
              ) : (
                <>
                  <Maximize2 size={16} /> Full View
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dedicated Advanced Select Dropdowns Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
          gap: '12px', 
          padding: '16px', 
          background: '#f8fafc', 
          borderRadius: '10px', 
          border: '1px solid var(--border)' 
        }}>
          {/* Function Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={10} /> Function (Col D)
            </span>
            <select 
              value={selectedFunction} 
              onChange={(e) => setSelectedFunction(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', fontSize: '0.8rem' }}
            >
              <option value="">All Functions ({uniqueFunctions.length})</option>
              {uniqueFunctions.map(fn => <option key={fn} value={fn}>{fn}</option>)}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={10} /> Delivery Status (Col K)
            </span>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', fontSize: '0.8rem' }}
            >
              <option value="">All Statuses ({uniqueStatuses.length})</option>
              {uniqueStatuses.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

          {/* Task Type Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={10} /> Task Type (Col C)
            </span>
            <select 
              value={selectedTaskType} 
              onChange={(e) => setSelectedTaskType(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', fontSize: '0.8rem' }}
            >
              <option value="">All Task Types ({uniqueTaskTypes.length})</option>
              {uniqueTaskTypes.map(tt => <option key={tt} value={tt}>{tt}</option>)}
            </select>
          </div>

          {/* Destination SW Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={10} /> Destination SW (Col F)
            </span>
            <select 
              value={selectedSw} 
              onChange={(e) => setSelectedSw(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', fontSize: '0.8rem' }}
            >
              <option value="">All SW Versions ({uniqueSws.length})</option>
              {uniqueSws.map(sw => <option key={sw} value={sw}>{sw}</option>)}
            </select>
          </div>

          {/* Requestor Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={10} /> Request By (Col A)
            </span>
            <select 
              value={selectedRequestor} 
              onChange={(e) => setSelectedRequestor(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', fontSize: '0.8rem' }}
            >
              <option value="">All Requestors ({uniqueRequestors.length})</option>
              {uniqueRequestors.map(rq => <option key={rq} value={rq}>{rq}</option>)}
            </select>
          </div>
        </div>

        {/* Database Tasks Count Summary */}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {filteredTasks.length === 0 ? 'No tasks matched filters.' : `Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, filteredTasks.length)} of ${filteredTasks.length} tasks`}
          </span>
          {isFilterActive && (
            <span style={{ background: 'var(--info-bg)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
              Active Filters: {filteredTasks.length} matches out of {tasks.length} total tasks
            </span>
          )}
        </div>

        {/* Grid Table Wrapper with Sticky Excel Borders */}
        <div style={{ 
          overflowX: 'auto', 
          border: '1px solid #cbd5e1', 
          borderRadius: '10px', 
          maxHeight: isFullScreen ? 'calc(100vh - 260px)' : '450px', 
          overflowY: 'auto',
          background: 'white'
        }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.82rem', background: 'white' }}>
            <thead>
              {/* Excel Column Letters Row */}
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center', width: '40px' }}></th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col A</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col B</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col C</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col D</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col E</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col F</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col H</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col J</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col K</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col O</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col P</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col T</th>
                <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col Y</th>
                <th style={{ padding: '6px 8px', background: '#f8fafc', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Col AI</th>
              </tr>
              {/* Header Label Names Row */}
              <tr style={{ background: '#e2e8f0', borderBottom: '2px solid #cbd5e1', position: 'sticky', top: '29px', zIndex: 10 }}>
                <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'center', color: '#334155', fontWeight: 800 }}>#</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'left', color: '#334155', fontWeight: 800 }}>REQUEST BY</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'center', color: '#334155', fontWeight: 800 }}>ENTRY DATE</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'left', color: '#334155', fontWeight: 800 }}>TASK TYPE</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'left', color: '#334155', fontWeight: 800 }}>FUNCTION NAME</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'left', color: '#334155', fontWeight: 800 }}>REFERENTIAL</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'left', color: '#334155', fontWeight: 800 }}>DESTINATION SW</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'left', color: '#334155', fontWeight: 800 }}>INPUT DOCUMENTS</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'left', color: '#334155', fontWeight: 800 }}>EXPLEO TASK ID</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'center', color: '#334155', fontWeight: 800 }}>DELIVERY STATUS</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'center', color: '#334155', fontWeight: 800 }}>START DATE</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'center', color: '#334155', fontWeight: 800 }}>NEED DATE</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'center', color: '#334155', fontWeight: 800 }}>PROGRESS</th>
                <th style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', background: '#e2e8f0', textAlign: 'left', color: '#334155', fontWeight: 800 }}>REMARKS</th>
                <th style={{ padding: '8px 12px', background: '#e2e8f0', textAlign: 'center', color: '#334155', fontWeight: 800 }}>WORKLOAD</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.map((t, idx) => {
                const globalIndex = ((currentPage - 1) * pageSize) + idx + 1;
                const taskIdStr = Array.isArray(t.taskIds) ? t.taskIds[0] : (t.taskId || '--');
                return (
                  <tr key={`${t.sno}-${idx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', background: '#f8fafc', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>
                      {globalIndex}
                    </td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', color: 'var(--text)' }}>{t.requestBy || '--'}</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>{t.entryDate || '--'}</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', color: 'var(--text)' }}>{t.taskType || '--'}</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', fontWeight: 600, color: '#1e293b' }}>{t.function || '--'}</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1' }}>{t.referential || '--'}</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1' }}>{t.destinationSw || '--'}</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.inputsDoc}>
                      {t.inputsDoc || '--'}
                    </td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', fontWeight: 'bold', color: 'var(--primary)' }}>
                      {taskIdStr}
                    </td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                      <span className={`badge ${
                        String(t.status).toLowerCase() === 'delivered' ? 'badge-success' : 
                        String(t.status).toLowerCase() === 'in progress' ? 'badge-info' : 
                        (String(t.status).toLowerCase() === 'blocked' || String(t.status).toLowerCase() === 'blocked pbo') ? 'badge-danger' : 'badge-neutral'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>{t.startDate || '--'}</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>{t.endDate || '--'}</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }}>
                      {t.progress !== undefined ? `${Math.round(t.progress * 100)}%` : '--'}
                    </td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.remarks}>
                      {t.remarks || '--'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', color: 'var(--purple)' }}>
                      {t.workload !== undefined ? `${t.workload} d` : '--'}
                    </td>
                  </tr>
                );
              })}

              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={15} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No database tasks match your criteria. Import Excel workbook or clear active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Panel */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentPage(1)} 
              disabled={currentPage === 1}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}
            >
              First
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
              disabled={currentPage === 1}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}
            >
              Prev
            </button>

            {/* Sliding window pagination links */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pNum = i + 1;
              if (currentPage > 3) {
                pNum = currentPage - 3 + i;
              }
              if (pNum + (4 - i) > totalPages) {
                pNum = Math.max(1, totalPages - 4 + i);
              }
              if (pNum > totalPages) return null;
              
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    border: '1px solid var(--border)',
                    background: currentPage === pNum ? 'var(--primary)' : 'white',
                    color: currentPage === pNum ? 'white' : 'var(--text)',
                    fontWeight: currentPage === pNum ? 'bold' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  {pNum}
                </button>
              );
            })}

            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
              disabled={currentPage === totalPages}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}
            >
              Next
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentPage(totalPages)} 
              disabled={currentPage === totalPages}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}
            >
              Last
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
