import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { X, Trash2, Plus, ChevronRight, ChevronDown, Sparkles, Filter as FilterIcon, RotateCcw, CheckCircle2, Archive as ArchiveIcon, RefreshCw, Columns } from 'lucide-react';
import TaskModal from '../components/TaskModal';
import { differenceInDays, parseISO, format } from 'date-fns';

const COLUMNS = [
  { id: 'sno', label: '#', isSticky: true, width: '40px', filterable: true },
  { id: 'dsr', label: 'DSR', isSticky: true, width: '60px', align: 'center', filterable: false },
  { id: 'function', label: 'Function & Group ID', isSticky: true, width: '250px', filterable: true },
  { id: 'progress', label: 'Progress', width: '150px', filterable: false },
  { id: 'status', label: 'Status', width: '120px', filterable: true },
  { id: 'engineers', label: 'Engineers', width: '140px', filterable: true },
  { id: 'deliveredDate', label: 'Delivered Date', width: '120px', filterable: true, type: 'date' },
  { id: 'ftrOtd', label: 'FTR / OTD', width: '100px', filterable: true },
  { id: 'reviewer', label: 'Reviewer', width: '200px', filterable: true },
  { id: 'remarks', label: 'Remarks', width: '100px', filterable: false },
  { id: 'nbInternal', label: 'NB Internal', width: '120px', align: 'center', filterable: false },
  { id: 'nbQuality', label: 'NB Quality', width: '120px', align: 'center', filterable: false },
  { id: 'nbReceived', label: 'NB Received', width: '120px', align: 'center', filterable: false },
  { id: 'nbAccepted', label: 'NB Accepted', width: '120px', align: 'center', filterable: false },
  { id: 'testsImpacted', label: 'Tests Impacted', width: '120px', align: 'center', filterable: false },
  { id: 'testsMod', label: 'Tests Mod After FTR', width: '150px', align: 'center', filterable: false },
  { id: 'actions', label: 'Actions', width: '120px', align: 'right', filterable: false }
];

// --- Restored DateFilterTree Component ---
const DateFilterTree = ({ uniqueDates, selectedDates, onChange }) => {
  const tree = useMemo(() => {
    const t = {};
    uniqueDates.forEach(dateStr => {
      if (!dateStr || dateStr.trim() === '') return;
      const parts = dateStr.split('-');
      if (parts.length >= 3) {
        const [y, m] = parts;
        if (!t[y]) t[y] = {};
        if (!t[y][m]) t[y][m] = [];
        t[y][m].push(dateStr);
      } else {
        if (!t['Other']) t['Other'] = {};
        if (!t['Other']['-']) t['Other']['-'] = [];
        t['Other']['-'].push(dateStr);
      }
    });
    return t;
  }, [uniqueDates]);

  const [expanded, setExpanded] = useState({});

  const toggleExpand = (path) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const monthNames = { '01':'Jan', '02':'Feb', '03':'Mar', '04':'Apr', '05':'May', '06':'Jun', '07':'Jul', '08':'Aug', '09':'Sep', '10':'Oct', '11':'Nov', '12':'Dec' };

  const handleToggleNode = (nodeDates, isChecked) => {
    if (isChecked) {
      const newSelection = new Set([...selectedDates, ...nodeDates]);
      onChange(Array.from(newSelection));
    } else {
      const newSelection = selectedDates.filter(d => !nodeDates.includes(d));
      onChange(newSelection);
    }
  };

  const getSelectionState = (nodeDates) => {
    let selectedCount = 0;
    nodeDates.forEach(d => {
      if (selectedDates.includes(d)) selectedCount++;
    });
    if (selectedCount === 0) return 'none';
    if (selectedCount === nodeDates.length) return 'all';
    return 'partial';
  };

  const renderCheckbox = (state, onChange) => {
    return (
      <input 
        type="checkbox" 
        checked={state === 'all'}
        ref={input => { if (input) input.indeterminate = state === 'partial'; }}
        onChange={onChange}
        style={{ cursor: 'pointer', margin: 0, accentColor: 'var(--primary)' }}
      />
    );
  };

  if (Object.keys(tree).length === 0) {
    return <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '8px' }}>No dates available</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
      {Object.entries(tree).sort(([a],[b]) => b.localeCompare(a)).map(([year, months]) => {
        const yearDates = Object.values(months).flat();
        const yearState = getSelectionState(yearDates);
        const isYearExpanded = expanded[year];
        
        return (
          <div key={year}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px', cursor: 'pointer', borderRadius: '4px' }}>
              <span onClick={() => toggleExpand(year)} style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
                {isYearExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
              </span>
              {renderCheckbox(yearState, (e) => handleToggleNode(yearDates, e.target.checked))}
              <span onClick={() => toggleExpand(year)} style={{ flex: 1, fontSize: '0.8rem', userSelect: 'none', fontWeight: 600 }}>{year}</span>
            </div>

            {isYearExpanded && (
              <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {Object.entries(months).sort(([a],[b]) => a.localeCompare(b)).map(([month, days]) => {
                  const monthState = getSelectionState(days);
                  const monthKey = `${year}-${month}`;
                  const isMonthExpanded = expanded[monthKey];
                  const mName = monthNames[month] || month;

                  return (
                    <div key={monthKey}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px', cursor: 'pointer', borderRadius: '4px' }}>
                        <span onClick={() => toggleExpand(monthKey)} style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
                          {isMonthExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                        </span>
                        {renderCheckbox(monthState, (e) => handleToggleNode(days, e.target.checked))}
                        <span onClick={() => toggleExpand(monthKey)} style={{ flex: 1, fontSize: '0.8rem', userSelect: 'none', fontWeight: 500 }}>{mName}</span>
                      </div>

                      {isMonthExpanded && (
                        <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {days.sort().map(dateStr => {
                            const isChecked = selectedDates.includes(dateStr);
                            const dayNum = dateStr.split('-')[2] || dateStr;
                            return (
                              <div key={dateStr} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px', cursor: 'pointer', borderRadius: '4px' }}>
                                <span style={{ width: '16px' }}></span>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked} 
                                  onChange={(e) => handleToggleNode([dateStr], e.target.checked)} 
                                  style={{ cursor: 'pointer', margin: 0, accentColor: 'var(--primary)' }}
                                />
                                <span onClick={() => handleToggleNode([dateStr], !isChecked)} style={{ flex: 1, fontSize: '0.8rem', userSelect: 'none' }}>{dayNum}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// --- CSS Progress Bar Helper ---
const ProgressBar = ({ pct, status }) => {
  let color = '#3b82f6';
  if (status === 'Blocked') color = '#ef4444';
  else if (pct === 100 || status === 'Delivered' || status === 'Archive') color = '#22c55e';
  else if (status === 'Review' || status === 'FR' || status === 'QG') color = '#eab308';

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
const Archive = () => {
  const allTasks = useStore(state => state.tasks);
  const archivedTasks = allTasks.filter(t => t.status === 'Delivered' || t.status === 'Archive');
  const teamMembers = useStore(state => state.teamMembers) || [];
  const reviews = useStore(state => state.reviews) || [];
  const assignReviewer = useStore(state => state.assignReviewer);
  const updateReviewer = useStore(state => state.updateReviewer);
  const updateTask = useStore(state => state.updateTask);
  const deleteTask = useStore(state => state.deleteTask);

  const [isCompact, setIsCompact] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [quickFilter, setQuickFilter] = useState(null);

  // Expandable Rows
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [hoveredRow, setHoveredRow] = useState(null);
  const [aiModal, setAiModal] = useState({ isOpen: false, task: null, loading: false, summary: '' });

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState(
    COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {})
  );
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Column Filters State (Replaces Smart Filter Bar)
  const [columnFilters, setColumnFilters] = useState({});
  const [openFilterMenu, setOpenFilterMenu] = useState(null);

  const getUniqueValues = (colId) => {
    const values = new Set();
    archivedTasks.forEach(row => {
      if (colId === 'engineers') {
        row.owners?.forEach(o => values.add(o.name));
      } else if (colId === 'reviewer') {
        const rev = reviews.find(r => r.sno === row.sno)?.reviewer || 'Unassigned';
        values.add(rev);
      } else if (colId === 'taskIds' || colId === 'function') {
        // Group taskIds and functions properly
        if (colId === 'function') values.add(row.function);
        if (colId === 'taskIds') row.taskIds?.forEach(id => values.add(id));
      } else {
        const val = String(row[colId] || '');
        if (val.trim() !== '') values.add(val.trim());
      }
    });
    return Array.from(values).sort();
  };

  const handleFilterChange = (id, value) => {
    setColumnFilters(prev => {
      const current = prev[id] || [];
      if (current.includes(value)) return { ...prev, [id]: current.filter(v => v !== value) };
      return { ...prev, [id]: [...current, value] };
    });
  };

  const handleSetColumnFilter = (id, values) => setColumnFilters(prev => ({ ...prev, [id]: values }));
  const clearFilter = (id) => setColumnFilters(prev => ({ ...prev, [id]: [] }));

  // Apply Filters
  const filteredTasks = useMemo(() => {
    return archivedTasks.filter(t => {
      if (quickFilter === 'Delivered' && t.status !== 'Delivered') return false;
      if (quickFilter === 'Archive' && t.status !== 'Archive') return false;

      for (const [colId, selectedValues] of Object.entries(columnFilters)) {
        if (!selectedValues || selectedValues.length === 0) continue;
        
        if (colId === 'engineers') {
          const ownerNames = t.owners?.map(o => o.name) || [];
          if (!selectedValues.some(v => ownerNames.includes(v))) return false;
        } else if (colId === 'function') {
          if (!selectedValues.some(v => t.function === v)) return false;
        } else if (colId === 'sno') {
          if (!selectedValues.some(v => String(t.sno) === v)) return false;
        } else if (colId === 'reviewer') {
          const rev = reviews.find(r => r.sno === t.sno)?.reviewer || 'Unassigned';
          if (!selectedValues.includes(rev)) return false;
        } else {
          const cellValue = String(t[colId] || '').trim();
          if (!selectedValues.includes(cellValue)) return false;
        }
      }
      return true;
    });
  }, [archivedTasks, columnFilters, quickFilter, reviews]);

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete);
      setTaskToDelete(null);
    }
  };

  const handleRestore = (task) => {
    updateTask(task.sno, { status: 'In Progress' });
  };

  const toggleRowExpand = (sno) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(sno)) newExpanded.delete(sno);
    else newExpanded.add(sno);
    setExpandedRows(newExpanded);
  };

  const generateAISummary = (task) => {
    setAiModal({ isOpen: true, task, loading: true, summary: '' });
    setTimeout(() => {
      let analysis = `Historical task group ${task.sno} was officially ${task.status}. `;
      if (task.deliveredDate) analysis += `It was delivered on ${task.deliveredDate}. `;
      if (task.ftrOtd) analysis += `Quality mark: ${task.ftrOtd}. `;
      if (task.owners?.length > 1) analysis += `Work was distributed across ${task.owners.length} engineers.`;
      setAiModal({ isOpen: true, task, loading: false, summary: analysis });
    }, 1500);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'In Progress': return 'badge-success';
      case 'Delivered': return 'badge-info';
      case 'Archive': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  // Sticky Column CSS
  const stickyCol1 = { position: 'sticky', left: 0, zIndex: 11, background: 'inherit', borderRight: '1px solid var(--border)' };
  const stickyCol2 = { position: 'sticky', left: '40px', zIndex: 11, background: 'inherit', borderRight: '1px solid var(--border)' };
  const stickyCol3 = { position: 'sticky', left: '100px', zIndex: 11, background: 'inherit', borderRight: '1px solid var(--border)', boxShadow: '2px 0 5px rgba(0,0,0,0.05)' };

  const visibleColCount = COLUMNS.filter(c => visibleColumns[c.id]).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* HEADER & FILTERS */}
      <div style={{ marginBottom: 'var(--space-md)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 className="title" style={{ margin: 0 }}>Archive</h1>
            <p className="subtitle">Historical repository of delivered tasks ({filteredTasks.length} visible)</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={isCompact} onChange={e => setIsCompact(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--primary)' }} />
              Compact Density
            </label>
            
            <div style={{ position: 'relative' }}>
              <button className="btn btn-secondary" onClick={() => setShowColumnDropdown(!showColumnDropdown)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white' }}>
                <Columns size={16} /> Columns
              </button>
              {showColumnDropdown && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', zIndex: 100, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', minWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                  {COLUMNS.map(c => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: c.isSticky ? 'not-allowed' : 'pointer', opacity: c.isSticky ? 0.5 : 1 }}>
                      <input type="checkbox" checked={visibleColumns[c.id]} disabled={c.isSticky} onChange={() => setVisibleColumns(prev => ({...prev, [c.id]: !prev[c.id]}))} style={{ accentColor: 'var(--primary)' }} />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setQuickFilter(quickFilter === 'Delivered' ? null : 'Delivered')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: quickFilter === 'Delivered' ? '1px solid #10b981' : '1px solid var(--border)', background: quickFilter === 'Delivered' ? '#d1fae5' : 'white', color: quickFilter === 'Delivered' ? '#059669' : '#64748b', transition: 'all 0.2s' }}>
              <CheckCircle2 size={14} /> Delivered
            </button>
            <button onClick={() => setQuickFilter(quickFilter === 'Archive' ? null : 'Archive')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: quickFilter === 'Archive' ? '1px solid #64748b' : '1px solid var(--border)', background: quickFilter === 'Archive' ? '#f1f5f9' : 'white', color: quickFilter === 'Archive' ? '#334155' : '#64748b', transition: 'all 0.2s' }}>
              <ArchiveIcon size={14} /> Archived
            </button>

          </div>
        </div>
      </div>

      {/* CORE TABLE */}
      <div className="card" style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div className="table-container" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
          <table className={isCompact ? 'table-compact' : ''} style={{ minWidth: '1600px', borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
            
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 30, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <tr>
                {COLUMNS.map(col => {
                  if (!visibleColumns[col.id]) return null;
                  let style = { width: col.width, textAlign: col.align || 'left', paddingRight: col.align === 'right' ? '20px' : undefined };
                  if (col.id === 'sno') style = { ...stickyCol1, ...style, zIndex: 31 };
                  if (col.id === 'dsr') style = { ...stickyCol2, ...style, zIndex: 31 };
                  if (col.id === 'function') style = { ...stickyCol3, ...style, zIndex: 31 };
                  
                  return (
                    <th key={col.id} style={style}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'space-between' }}>
                        <span>{col.label}</span>
                        {col.filterable && (
                          <div 
                            style={{ cursor: 'pointer', marginLeft: '8px', color: columnFilters[col.id]?.length > 0 ? 'var(--primary)' : 'var(--text-muted)' }}
                            onClick={() => setOpenFilterMenu(openFilterMenu === col.id ? null : col.id)}
                          >
                            <FilterIcon size={12} />
                          </div>
                        )}
                      </div>
                      
                      {openFilterMenu === col.id && (
                        <div style={{ position: 'absolute', top: '100%', left: col.id === 'actions' ? 'auto' : 0, right: col.id === 'actions' ? 0 : 'auto', background: 'white', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', zIndex: 50, minWidth: '200px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'left', fontWeight: 'normal' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Filter {col.label}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }} onClick={() => clearFilter(col.id)}>Clear</span>
                          </div>
                          
                          {col.type === 'date' ? (
                             <DateFilterTree uniqueDates={getUniqueValues(col.id)} selectedDates={columnFilters[col.id] || []} onChange={(dates) => handleSetColumnFilter(col.id, dates)} />
                          ) : (
                            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {getUniqueValues(col.id).length === 0 ? <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>No options</span> : getUniqueValues(col.id).map(val => (
                                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                                  <input type="checkbox" checked={(columnFilters[col.id] || []).includes(val)} onChange={() => handleFilterChange(col.id, val)} style={{ accentColor: 'var(--primary)' }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }}>{val || '(Blank)'}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr><td colSpan={visibleColCount} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No archived tasks found matching current filters.</td></tr>
              ) : (
                filteredTasks.map((t) => {
                  const isExpanded = expandedRows.has(t.sno);
                  const isHovered = hoveredRow === t.sno;
                  const rowBg = isHovered ? '#f8fafc' : 'white';
                  
                  const totalFT = t.owners?.reduce((a, b) => a + (Number(b.totalFT) || 0), 0) || 0;
                  const completedFT = t.owners?.reduce((a, b) => a + (Number(b.completedFT) || 0), 0) || 0;
                  const pct = totalFT > 0 ? Math.round((completedFT / totalFT) * 100) : 100;
                  const engineeNames = t.owners?.map(o => o.name).join(', ') || 'Unassigned';
                  
                  const r = reviews.find(rev => rev.sno === t.sno);
                  const currentReviewer = r?.reviewer || '';

                  return (
                    <React.Fragment key={t.sno}>
                      {/* PARENT ROW */}
                      <tr 
                        onMouseEnter={() => setHoveredRow(t.sno)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{ background: rowBg, cursor: 'pointer', transition: 'background 0.2s', borderBottom: '1px solid #f1f5f9' }}
                        onClick={() => toggleRowExpand(t.sno)}
                      >
                        {visibleColumns.sno && (
                          <td style={{ ...stickyCol1, background: rowBg, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </td>
                        )}
                        {visibleColumns.dsr && (
                          <td style={{ ...stickyCol2, background: rowBg, textAlign: 'center' }}>
                            <input type="checkbox" checked={t.include_in_dsr !== false} onChange={(e) => updateTask(t.sno, { include_in_dsr: e.target.checked })} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                          </td>
                        )}
                        {visibleColumns.function && (
                          <td style={{ ...stickyCol3, background: rowBg }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>{t.function}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>Group {t.sno} • {t.taskIds?.[0]} {t.taskIds?.length > 1 ? `+${t.taskIds.length - 1}` : ''}</div>
                          </td>
                        )}
                        {visibleColumns.progress && (
                          <td>
                            <ProgressBar pct={pct} status={t.status} />
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px', textAlign: 'right' }}>{completedFT} / {totalFT} FT</div>
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td><span className={`badge ${getStatusBadgeClass(t.status)}`}>{t.status}</span></td>
                        )}
                        {visibleColumns.engineers && (
                          <td>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px', fontSize: '0.85rem' }} title={engineeNames}>
                              {t.owners?.length > 1 ? <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{t.owners.length} Engineers</span> : engineeNames}
                            </div>
                          </td>
                        )}
                        {visibleColumns.deliveredDate && (
                          <td onClick={e => e.stopPropagation()}>
                            <input
                              type="date"
                              defaultValue={t.deliveredDate || ''}
                              onBlur={(e) => updateTask(t.sno, { deliveredDate: e.target.value || null })}
                              style={{ width: '100%', padding: '4px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none', color: '#475569' }}
                            />
                          </td>
                        )}
                        {visibleColumns.ftrOtd && (
                          <td onClick={e => e.stopPropagation()}>
                            <select 
                              defaultValue={t.ftrOtd || ''} 
                              onChange={(e) => updateTask(t.sno, { ftrOtd: e.target.value })} 
                              style={{ 
                                width: '100%', 
                                padding: '4px', 
                                fontSize: '0.8rem', 
                                border: '1px solid var(--border)', 
                                borderRadius: '4px', 
                                outline: 'none', 
                                appearance: 'none', 
                                WebkitAppearance: 'none', 
                                cursor: 'pointer', 
                                textAlign: 'center', 
                                background: String(t.ftrOtd || '').includes('NOK') ? '#fee2e2' : String(t.ftrOtd || '').includes('OK') ? '#dcfce7' : 'transparent',
                                color: String(t.ftrOtd || '').includes('NOK') ? '#ef4444' : String(t.ftrOtd || '').includes('OK') ? '#16a34a' : 'inherit',
                                fontWeight: t.ftrOtd ? 600 : 'normal'
                              }}>
                              <option value="" style={{ background: 'white', color: 'black', fontWeight: 'normal' }}>-</option>
                              <option value="OK FTR" style={{ background: 'white', color: 'black', fontWeight: 'normal' }}>OK FTR</option>
                              <option value="NOK FTR" style={{ background: 'white', color: 'black', fontWeight: 'normal' }}>NOK FTR</option>
                              <option value="OK" style={{ background: 'white', color: 'black', fontWeight: 'normal' }}>OK</option>
                              <option value="NOK" style={{ background: 'white', color: 'black', fontWeight: 'normal' }}>NOK</option>
                            </select>
                          </td>
                        )}
                        {visibleColumns.reviewer && (
                          <td onClick={e => e.stopPropagation()}>
                            <select value={currentReviewer} onChange={(e) => { const sel = e.target.value; if (r) updateReviewer(t.sno, sel); else assignReviewer({ sno: t.sno, reviewer: sel, review_status: 'Pending', assigned_date: new Date().toISOString() }); }} style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', width: '100%', fontSize: '0.85rem', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', textAlign: 'center' }}>
                              <option value="">Unassigned</option>
                              {teamMembers.map(m => <option key={m.sno} value={m.name}>{m.name}</option>)}
                            </select>
                          </td>
                        )}
                        {visibleColumns.remarks && (
                          <td><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px', fontSize: '0.85rem', color: '#64748b' }}>{t.remarks || '-'}</div></td>
                        )}
                        {visibleColumns.nbInternal && (
                          <td onClick={e => e.stopPropagation()}><input type="number" defaultValue={t.nbRemarksInternal || ''} onBlur={(e) => updateTask(t.sno, { nbRemarksInternal: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: '100%', minWidth: '60px', padding: '4px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none' }} /></td>
                        )}
                        {visibleColumns.nbQuality && (
                          <td onClick={e => e.stopPropagation()}><input type="number" defaultValue={t.nbRemarksQualityIND || ''} onBlur={(e) => updateTask(t.sno, { nbRemarksQualityIND: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: '100%', minWidth: '60px', padding: '4px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none' }} /></td>
                        )}
                        {visibleColumns.nbReceived && (
                          <td onClick={e => e.stopPropagation()}><input type="number" defaultValue={t.nbRemarksReceived || ''} onBlur={(e) => updateTask(t.sno, { nbRemarksReceived: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: '100%', minWidth: '60px', padding: '4px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none' }} /></td>
                        )}
                        {visibleColumns.nbAccepted && (
                          <td onClick={e => e.stopPropagation()}><input type="number" defaultValue={t.nbRemarksAccepted || ''} onBlur={(e) => updateTask(t.sno, { nbRemarksAccepted: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: '100%', minWidth: '60px', padding: '4px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none' }} /></td>
                        )}
                        {visibleColumns.testsImpacted && (
                          <td onClick={e => e.stopPropagation()}><input type="number" defaultValue={t.nbTestsImpacted || ''} onBlur={(e) => updateTask(t.sno, { nbTestsImpacted: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: '100%', minWidth: '60px', padding: '4px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none' }} /></td>
                        )}
                        {visibleColumns.testsMod && (
                          <td onClick={e => e.stopPropagation()}><input type="number" defaultValue={t.nbTestsModifiedAfterFTR || ''} onBlur={(e) => updateTask(t.sno, { nbTestsModifiedAfterFTR: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: '100%', minWidth: '60px', padding: '4px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none' }} /></td>
                        )}
                        {visibleColumns.actions && (
                          <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s' }}>
                              <button onClick={(e) => { e.stopPropagation(); generateAISummary(t); }} className="btn-icon-sm" style={{ background: '#f3e8ff', color: '#8b5cf6', padding: '6px' }} title="AI Summarize"><Sparkles size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleRestore(t); }} className="btn-icon-sm" style={{ background: '#dcfce7', color: '#16a34a', padding: '6px' }} title="Restore to Active"><RotateCcw size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setTaskToDelete(t.sno); }} className="btn-icon-sm" style={{ background: '#fee2e2', color: '#ef4444', padding: '6px' }} title="Delete Archive"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        )}
                      </tr>

                      {/* EXPANDED SUB-ROWS */}
                      {isExpanded && t.owners?.map((o, idx) => {
                        const ownerPct = o.totalFT > 0 ? Math.round((o.completedFT / o.totalFT) * 100) : 100;
                        
                        return (
                          <tr key={`${t.sno}-sub-${idx}`} style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                            {visibleColumns.sno && <td style={{ ...stickyCol1, background: '#fafafa' }}></td>}
                            {visibleColumns.dsr && <td style={{ ...stickyCol2, background: '#fafafa' }}></td>}
                            {visibleColumns.function && (
                              <td style={{ ...stickyCol3, background: '#fafafa', paddingLeft: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '4px', height: '4px', background: '#94a3b8', borderRadius: '50%' }}></div>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Sub-task {idx + 1}</span>
                                </div>
                              </td>
                            )}
                            {visibleColumns.progress && <td style={{ paddingLeft: '24px' }}><ProgressBar pct={ownerPct} status={t.status} /></td>}
                            {visibleColumns.status && <td></td>}
                            {visibleColumns.engineers && (
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>
                                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{o.name[0]}</div>
                                  {o.name}
                                </div>
                              </td>
                            )}
                            {visibleColumns.deliveredDate && (
                              <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                {o.startDate && o.endDate ? `${format(parseISO(o.startDate), 'MMM dd')} - ${format(parseISO(o.endDate), 'MMM dd')}` : '-'}
                              </td>
                            )}
                            {visibleColumns.ftrOtd && <td></td>}
                            {visibleColumns.reviewer && <td></td>}
                            
                            {/* Empty td for the rest, except remarks which gets text */}
                            {visibleColumns.remarks && <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{o.remarks || ''}</td>}
                            {visibleColumns.nbInternal && <td></td>}
                            {visibleColumns.nbQuality && <td></td>}
                            {visibleColumns.nbReceived && <td></td>}
                            {visibleColumns.nbAccepted && <td></td>}
                            {visibleColumns.testsImpacted && <td></td>}
                            {visibleColumns.testsMod && <td></td>}
                            {visibleColumns.actions && <td></td>}
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

      {/* Delete Confirmation */}
      {taskToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div className="card glass" style={{ width: '400px', padding: '24px', textAlign: 'center', animation: 'slideIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: '50%' }}><Trash2 size={24} /></div></div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 'bold' }}>Confirm Permanent Deletion</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.875rem' }}>Delete archived Task Group <b>S.No: {taskToDelete}</b>?<br />This action cannot be undone.</p>
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
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#4c1d95', fontSize: '1.2rem' }}><Sparkles size={20}/> AI Archive Brief</h3>
              <button className="btn-icon-sm" onClick={() => setAiModal({ isOpen: false, task: null, loading: false, summary: '' })}><X size={18}/></button>
            </div>
            
            {aiModal.loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', color: '#8b5cf6' }}>
                <RefreshCw size={24} className="spin-anim" style={{ marginBottom: '16px' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Synthesizing historical data...</span>
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
                     <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Delivered</div>
                     <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{aiModal.task?.deliveredDate || 'Unknown'}</div>
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
export default Archive;
