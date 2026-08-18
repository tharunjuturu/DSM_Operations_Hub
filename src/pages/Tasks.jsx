import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, Edit2, Trash2, Plus, ChevronRight, ChevronDown, Sparkles, AlertTriangle, Clock, Filter, RefreshCw } from 'lucide-react';
import TaskModal from '../components/TaskModal';
import { differenceInDays, parseISO, format } from 'date-fns';

// --- Reusable MultiSelect Component (Copied from Burndown for consistency) ---
const MultiSelect = ({ options, selected, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter(o => o !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', minWidth: '160px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '36px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', fontWeight: 500, color: selected.length > 0 ? '#0f172a' : '#64748b' }}>
          {selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>▼</span>
      </div>
      
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '1px solid var(--border)', borderRadius: '6px', zIndex: 100, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {options.map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid #f1f5f9' }}>
              <input 
                type="checkbox" 
                checked={selected.includes(opt)} 
                onChange={() => toggleOption(opt)} 
                style={{ marginRight: '8px', cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// --- CSS Progress Bar Helper ---
const ProgressBar = ({ pct, status }) => {
  let color = '#3b82f6'; // default info
  if (status === 'Blocked') color = '#ef4444'; // danger
  else if (pct === 100 || status === 'Delivered') color = '#22c55e'; // success
  else if (status === 'Review' || status === 'FR' || status === 'QG') color = '#eab308'; // warning

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: color, transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', minWidth: '35px', textAlign: 'right' }}>{pct}%</span>
    </div>
  );
};

// --- Main Component ---
const Tasks = () => {
  const allTasks = useStore(state => state.tasks);
  const activeTasks = allTasks.filter(t => t.status !== 'Delivered' && t.status !== 'Archive');
  const teamMembers = useStore(state => state.teamMembers) || [];
  const reviews = useStore(state => state.reviews) || [];
  const assignReviewer = useStore(state => state.assignReviewer);
  const updateReviewer = useStore(state => state.updateReviewer);
  const updateTask = useStore(state => state.updateTask);
  const deleteTask = useStore(state => state.deleteTask);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isCompact, setIsCompact] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  
  // Smart Filters
  const [filterFunction, setFilterFunction] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterReviewer, setFilterReviewer] = useState([]);
  const [quickFilter, setQuickFilter] = useState(null); // 'Overdue', 'Blocked'

  // Expandable Rows
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // Hover Actions
  const [hoveredRow, setHoveredRow] = useState(null);

  // AI Summary Modal
  const [aiModal, setAiModal] = useState({ isOpen: false, task: null, loading: false, summary: '' });

  // Computed Filter Options
  const uniqueFunctions = useMemo(() => Array.from(new Set(activeTasks.map(t => t.function).filter(Boolean))).sort(), [activeTasks]);
  const uniqueStatuses = useMemo(() => Array.from(new Set(activeTasks.map(t => t.status).filter(Boolean))).sort(), [activeTasks]);
  const uniqueReviewers = useMemo(() => {
    const revs = new Set(reviews.map(r => r.reviewer).filter(Boolean));
    revs.add('Unassigned');
    return Array.from(revs).sort();
  }, [reviews]);

  // Apply Filters
  const filteredTasks = useMemo(() => {
    return activeTasks.filter(t => {
      if (filterFunction.length > 0 && !filterFunction.includes(t.function)) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(t.status)) return false;
      
      const rev = reviews.find(r => r.sno === t.sno)?.reviewer || 'Unassigned';
      if (filterReviewer.length > 0 && !filterReviewer.includes(rev)) return false;
      
      if (quickFilter === 'Blocked' && t.status !== 'Blocked') return false;
      if (quickFilter === 'Overdue') {
        let isOverdue = false;
        if (t.endDate) {
          try {
            if (differenceInDays(new Date(), parseISO(t.endDate)) > 0 && t.status !== 'Delivered') isOverdue = true;
          } catch(e){}
        }
        if (!isOverdue) return false;
      }
      return true;
    });
  }, [activeTasks, filterFunction, filterStatus, filterReviewer, quickFilter, reviews]);

  const handleCreate = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete);
      setTaskToDelete(null);
    }
  };

  const toggleRowExpand = (sno) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(sno)) newExpanded.delete(sno);
    else newExpanded.add(sno);
    setExpandedRows(newExpanded);
  };

  const generateAISummary = (task) => {
    setAiModal({ isOpen: true, task, loading: true, summary: '' });
    // Simulate AI generation
    setTimeout(() => {
      const ftTotal = task.owners?.reduce((a, b) => a + (Number(b.totalFT) || 0), 0) || 0;
      const ftComp = task.owners?.reduce((a, b) => a + (Number(b.completedFT) || 0), 0) || 0;
      const pct = ftTotal > 0 ? Math.round((ftComp / ftTotal) * 100) : 0;
      
      let analysis = `Task group ${task.sno} is currently ${task.status} at ${pct}% completion. `;
      if (task.status === 'Blocked') analysis += `Immediate intervention required to unblock progress. `;
      else if (pct < 50 && task.endDate) analysis += `Trailing behind schedule. `;
      else analysis += `Pacing nominally. `;
      
      if (task.owners?.length > 1) analysis += `Work is distributed across ${task.owners.length} engineers.`;
      
      setAiModal({ isOpen: true, task, loading: false, summary: analysis });
    }, 1500);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'In Progress': return 'badge-success';
      case 'Delivered': return 'badge-info';
      case 'Yet To Start': return 'badge-neutral';
      case 'Blocked': return 'badge-danger';
      case 'FR': case 'QG': case 'Stand-by': return 'badge-warning';
      case 'Training': return 'badge-info';
      case 'Initial': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  // Sticky Column CSS definitions
  const stickyCol1 = { position: 'sticky', left: 0, zIndex: 11, background: 'inherit', borderRight: '1px solid var(--border)' };
  const stickyCol2 = { position: 'sticky', left: '40px', zIndex: 11, background: 'inherit', borderRight: '1px solid var(--border)' };
  const stickyCol3 = { position: 'sticky', left: '100px', zIndex: 11, background: 'inherit', borderRight: '1px solid var(--border)', boxShadow: '2px 0 5px rgba(0,0,0,0.05)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* HEADER & FILTERS */}
      <div style={{ marginBottom: 'var(--space-md)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 className="title" style={{ margin: 0 }}>Task Info</h1>
            <p className="subtitle">Core operating hub for active tasks ({filteredTasks.length} visible)</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={isCompact} onChange={e => setIsCompact(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--primary)' }} />
              Compact Density
            </label>
            <button className="btn btn-primary" onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}>
              <Plus size={18} /> New Task Group
            </button>
          </div>
        </div>

        {/* Smart Filters Bar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginRight: '8px' }}>
            <Filter size={16} /> <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Filters:</span>
          </div>
          <MultiSelect options={uniqueFunctions} selected={filterFunction} onChange={setFilterFunction} placeholder="Functions" />
          <MultiSelect options={uniqueStatuses} selected={filterStatus} onChange={setFilterStatus} placeholder="Statuses" />
          <MultiSelect options={uniqueReviewers} selected={filterReviewer} onChange={setFilterReviewer} placeholder="Reviewers" />
          
          <div style={{ height: '24px', width: '1px', background: 'var(--border)', margin: '0 8px' }}></div>
          
          {/* Quick Chips */}
          <button 
            onClick={() => setQuickFilter(quickFilter === 'Blocked' ? null : 'Blocked')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: quickFilter === 'Blocked' ? '1px solid #ef4444' : '1px solid var(--border)', background: quickFilter === 'Blocked' ? '#fee2e2' : 'var(--bg)', color: quickFilter === 'Blocked' ? '#dc2626' : '#64748b', transition: 'all 0.2s' }}
          >
            <AlertTriangle size={14} /> Blocked
          </button>
          <button 
            onClick={() => setQuickFilter(quickFilter === 'Overdue' ? null : 'Overdue')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: quickFilter === 'Overdue' ? '1px solid #f59e0b' : '1px solid var(--border)', background: quickFilter === 'Overdue' ? '#fef3c7' : 'var(--bg)', color: quickFilter === 'Overdue' ? '#d97706' : '#64748b', transition: 'all 0.2s' }}
          >
            <Clock size={14} /> Overdue
          </button>
        </div>
      </div>

      {/* CORE TABLE */}
      <div className="card" style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="table-container" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <table className={isCompact ? 'table-compact' : ''} style={{ minWidth: '1400px', borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
            
            {/* STICKY HEADER */}
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <tr>
                <th style={{ ...stickyCol1, width: '40px', zIndex: 21 }}>#</th>
                <th style={{ ...stickyCol2, width: '60px', textAlign: 'center', zIndex: 21 }}>DSR</th>
                <th style={{ ...stickyCol3, width: '250px', zIndex: 21 }}>Function & Group ID</th>
                <th style={{ width: '150px' }}>Progress</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '140px' }}>Engineers</th>
                <th style={{ width: '110px' }}>Deadlines</th>
                <th style={{ width: '150px' }}>Reviewer</th>
                <th>Remarks</th>
                <th style={{ width: '100px', textAlign: 'right', paddingRight: '20px' }}>Actions</th>
              </tr>
            </thead>
            
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No tasks found matching current filters.</td></tr>
              ) : (
                filteredTasks.map((t) => {
                  const isExpanded = expandedRows.has(t.sno);
                  const isHovered = hoveredRow === t.sno;
                  
                  // Roll-up Calculations
                  const totalFT = t.owners?.reduce((a, b) => a + (Number(b.totalFT) || 0), 0) || 0;
                  const completedFT = t.owners?.reduce((a, b) => a + (Number(b.completedFT) || 0), 0) || 0;
                  const pct = totalFT > 0 ? Math.round((completedFT / totalFT) * 100) : 0;
                  const engineeNames = t.owners?.map(o => o.name).join(', ') || 'Unassigned';
                  
                  const r = reviews.find(rev => rev.sno === t.sno);
                  const currentReviewer = r?.reviewer || '';

                  // Parent Row styling
                  const rowBg = isHovered ? '#f8fafc' : 'white';
                  
                  return (
                    <React.Fragment key={t.sno}>
                      {/* PARENT ROW */}
                      <tr 
                        onMouseEnter={() => setHoveredRow(t.sno)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{ background: rowBg, cursor: 'pointer', transition: 'background 0.2s', borderBottom: '1px solid #f1f5f9' }}
                        onClick={() => toggleRowExpand(t.sno)}
                      >
                        <td style={{ ...stickyCol1, background: rowBg, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                        <td style={{ ...stickyCol2, background: rowBg, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={t.include_in_dsr !== false}
                            onChange={(e) => updateTask(t.sno, { include_in_dsr: e.target.checked })}
                            onClick={e => e.stopPropagation()}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                          />
                        </td>
                        <td style={{ ...stickyCol3, background: rowBg }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>{t.function}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>Group {t.sno} • {t.taskIds?.[0]} {t.taskIds?.length > 1 ? `+${t.taskIds.length - 1}` : ''}</div>
                        </td>
                        <td>
                          <ProgressBar pct={pct} status={t.status} />
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px', textAlign: 'right' }}>{completedFT} / {totalFT} FT</div>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(t.status)}`}>{t.status}</span>
                        </td>
                        <td>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px', fontSize: '0.85rem' }} title={engineeNames}>
                            {t.owners?.length > 1 ? <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{t.owners.length} Engineers</span> : engineeNames}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', color: '#475569' }}>{t.endDate || '-'}</div>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <select
                            value={currentReviewer}
                            onChange={(e) => {
                              const sel = e.target.value;
                              if (r) updateReviewer(t.sno, sel);
                              else assignReviewer({ sno: t.sno, reviewer: sel, review_status: 'Pending', assigned_date: new Date().toISOString() });
                            }}
                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', width: '100%', fontSize: '0.85rem', outline: 'none' }}
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map(m => <option key={m.sno} value={m.name}>{m.name}</option>)}
                          </select>
                        </td>
                        <td>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', fontSize: '0.85rem', color: '#64748b' }}>
                            {t.remarks || '-'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                          {/* HOVER QUICK ACTIONS */}
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s' }}>
                            <button onClick={(e) => { e.stopPropagation(); generateAISummary(t); }} className="btn-icon-sm" style={{ background: '#f3e8ff', color: '#8b5cf6', padding: '6px' }} title="AI Summarize">
                              <Sparkles size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleEdit(t); }} className="btn-icon-sm" style={{ background: '#e0f2fe', color: '#0ea5e9', padding: '6px' }} title="Edit Group">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setTaskToDelete(t.sno); }} className="btn-icon-sm" style={{ background: '#fee2e2', color: '#ef4444', padding: '6px' }} title="Delete Group">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED SUB-ROWS (OWNERS) */}
                      {isExpanded && t.owners?.map((o, idx) => {
                        const ownerPct = o.totalFT > 0 ? Math.round((o.completedFT / o.totalFT) * 100) : 0;
                        return (
                          <tr key={`${t.sno}-sub-${idx}`} style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ ...stickyCol1, background: '#fafafa' }}></td>
                            <td style={{ ...stickyCol2, background: '#fafafa' }}></td>
                            <td style={{ ...stickyCol3, background: '#fafafa', paddingLeft: '24px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '4px', height: '4px', background: '#94a3b8', borderRadius: '50%' }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Sub-task {idx + 1}</span>
                              </div>
                            </td>
                            <td style={{ paddingLeft: '24px' }}>
                              <ProgressBar pct={ownerPct} status={t.status} />
                            </td>
                            <td></td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{o.name[0]}</div>
                                {o.name}
                              </div>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {o.startDate && o.endDate ? `${format(parseISO(o.startDate), 'MMM dd')} - ${format(parseISO(o.endDate), 'MMM dd')}` : '-'}
                            </td>
                            <td></td>
                            <td colSpan={2} style={{ fontSize: '0.8rem', color: '#64748b' }}>{o.remarks || ''}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} existingTask={editingTask} />

      {/* Delete Confirmation */}
      {taskToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div className="card glass" style={{ width: '400px', padding: '24px', textAlign: 'center', animation: 'slideIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: '50%' }}><Trash2 size={24} /></div></div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 'bold' }}>Confirm Deletion</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.875rem' }}>Delete Task Group <b>S.No: {taskToDelete}</b>?<br />This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setTaskToDelete(null)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--danger)', color: 'white' }} onClick={handleConfirmDelete}>Delete Group</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Summary Modal */}
      {aiModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '450px', padding: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', borderTop: '4px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#4c1d95', fontSize: '1.2rem' }}><Sparkles size={20}/> AI Task Brief</h3>
              <button className="btn-icon-sm" onClick={() => setAiModal({ isOpen: false, task: null, loading: false, summary: '' })}><X size={18}/></button>
            </div>
            
            {aiModal.loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', color: '#8b5cf6' }}>
                <RefreshCw size={24} className="spin-anim" style={{ marginBottom: '16px' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Synthesizing task data...</span>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#334155', margin: 0 }}>{aiModal.summary}</p>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                   <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                     <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Function</div>
                     <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{aiModal.task?.function}</div>
                   </div>
                   <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                     <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Engineers</div>
                     <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{aiModal.task?.owners?.length || 0} assigned</div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
export default Tasks;
