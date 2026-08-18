import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, isSameDay, parseISO, isAfter, isBefore, isEqual, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Custom MultiSelect Component
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
    <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '34px' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
          {selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>▼</span>
      </div>
      
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '1px solid var(--border)', borderRadius: '4px', zIndex: 100, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {options.map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid #f1f5f9' }}>
              <input 
                type="checkbox" 
                checked={selected.includes(opt)} 
                onChange={() => toggleOption(opt)} 
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const Burndown = () => {
  const { tasks, taskDailyLogs, upsertTaskDailyLog } = useStore();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showWeekends, setShowWeekends] = useState(false);

  const [filterTaskId, setFilterTaskId] = useState('');
  const [filterEngineer, setFilterEngineer] = useState([]);
  const [filterFunction, setFilterFunction] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [isCompact, setIsCompact] = useState(false);

  const baseTasks = tasks ? tasks.filter(t => t.status !== 'Archive') : [];

  const uniqueEngineers = useMemo(() => {
    const engs = new Set(filterEngineer);
    const tasksToConsider = baseTasks.filter(t => {
      if (filterFunction.length > 0 && !filterFunction.includes(t.function)) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(t.status)) return false;
      return true;
    });
    tasksToConsider.forEach(t => t.owners?.forEach(o => engs.add(o.name)));
    return Array.from(engs).sort();
  }, [baseTasks, filterFunction, filterStatus, filterEngineer]);

  const uniqueFunctions = useMemo(() => {
    const funcs = new Set(filterFunction);
    const tasksToConsider = baseTasks.filter(t => {
      if (filterEngineer.length > 0 && !t.owners?.some(o => filterEngineer.includes(o.name))) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(t.status)) return false;
      return true;
    });
    tasksToConsider.forEach(t => { if (t.function) funcs.add(t.function); });
    return Array.from(funcs).sort();
  }, [baseTasks, filterEngineer, filterStatus, filterFunction]);

  const uniqueStatuses = useMemo(() => {
    const stats = new Set(filterStatus);
    const tasksToConsider = baseTasks.filter(t => {
      if (filterEngineer.length > 0 && !t.owners?.some(o => filterEngineer.includes(o.name))) return false;
      if (filterFunction.length > 0 && !filterFunction.includes(t.function)) return false;
      return true;
    });
    tasksToConsider.forEach(t => { if (t.status) stats.add(t.status); });
    return Array.from(stats).sort();
  }, [baseTasks, filterEngineer, filterFunction, filterStatus]);

  const filteredTasks = useMemo(() => {
    return baseTasks.filter(t => {
      const searchTxt = filterTaskId.toLowerCase();
      const matchSno = t.sno?.toString().includes(searchTxt);
      const matchTaskId = t.taskIds?.some(id => id.toLowerCase().includes(searchTxt));
      
      if (filterTaskId && !matchSno && !matchTaskId) return false;
      if (filterFunction.length > 0 && !filterFunction.includes(t.function)) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(t.status)) return false;
      if (filterEngineer.length > 0 && !t.owners?.some(o => filterEngineer.includes(o.name))) return false;
      
      return true;
    });
  }, [baseTasks, filterTaskId, filterFunction, filterStatus, filterEngineer]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const matrixDaysRaw = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const matrixDays = showWeekends ? matrixDaysRaw : matrixDaysRaw.filter(d => !isWeekend(d));

  const handleCellChange = (taskSno, ownerName, dateStr, field, value) => {
    let numVal = parseFloat(value);
    if (isNaN(numVal)) numVal = 0;
    
    // Find existing log
    const existingLog = taskDailyLogs?.find(l => l.taskSno === taskSno && l.ownerName === ownerName && l.date === dateStr) || {};
    
    upsertTaskDailyLog(taskSno, ownerName, dateStr, {
      actualFT: field === 'actualFT' ? numVal : (existingLog.actualFT || 0),
      treatedFT: field === 'treatedFT' ? numVal : (existingLog.treatedFT || 0)
    });
  };

  const getLogValue = (taskSno, ownerName, dateStr, field) => {
    const log = taskDailyLogs?.find(l => l.taskSno === taskSno && l.ownerName === ownerName && l.date === dateStr);
    return log ? log[field] : 0;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', position: 'relative' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <div>
          <h1 className="title">Burndown Matrix</h1>
          <p className="subtitle">Daily FT tracking and progress burndown</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
            <input type="checkbox" checked={isCompact} onChange={e => setIsCompact(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--primary)' }} />
            Compact Density
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 500 }}>
              <input type="checkbox" checked={showWeekends} onChange={e => setShowWeekends(e.target.checked)} /> Weekends
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
            <button className="btn-icon-sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={16} /></button>
            <h3 style={{ width: '130px', textAlign: 'center', margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{format(currentMonth, 'MMMM yyyy')}</h3>
            <button className="btn-icon-sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: 'var(--space-md)', flexWrap: 'wrap', background: 'white', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <input 
          type="text" 
          placeholder="Search Task ID..." 
          value={filterTaskId} 
          onChange={e => setFilterTaskId(e.target.value)} 
          style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none', flex: 1, minWidth: '150px', height: '34px', fontSize: '0.875rem' }}
        />
        <MultiSelect 
          options={uniqueEngineers} 
          selected={filterEngineer} 
          onChange={setFilterEngineer} 
          placeholder="All Engineers" 
        />
        <MultiSelect 
          options={uniqueFunctions} 
          selected={filterFunction} 
          onChange={setFilterFunction} 
          placeholder="All Functions" 
        />
        <MultiSelect 
          options={uniqueStatuses} 
          selected={filterStatus} 
          onChange={setFilterStatus} 
          placeholder="All Statuses" 
        />
      </div>

      {/* MATRIX TABLE */}
      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="table-container" style={{ flex: 1, paddingBottom: '20px' }}>
          <table className={isCompact ? 'table-compact' : ''} style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 'max-content', fontSize: '0.75rem', width: '100%', border: '1px solid var(--border)' }}>
            
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <tr>
                <th className="col-fixed" colSpan={2} style={{ left: 0, width: '270px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', padding: '4px 8px', textAlign: 'center', background: 'white' }}></th>
                <th className="col-fixed freeze-shadow" style={{ left: '270px', width: '180px', borderBottom: '1px solid var(--border)', borderRight: '2px solid var(--border)', padding: '4px 8px', textAlign: 'center', background: 'white' }}>Date</th>
                
                {matrixDays.map(d => {
                   const isToday = isSameDay(d, new Date());
                   const isWknd = isWeekend(d);
                   const bgCol = isWknd ? '#ffedd5' : 'white'; // orange tint for weekends as in image
                   return (
                     <th key={`day-${format(d, 'd')}`} style={{ textAlign: 'center', padding: '2px', borderBottom: isToday ? '2px solid var(--primary)' : '1px solid var(--border)', borderRight: '1px solid var(--border)', minWidth: '40px', maxWidth: '40px', background: bgCol, height: '60px', verticalAlign: 'bottom' }}>
                       <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '4px', fontSize: '0.7rem', color: isToday ? 'var(--primary)' : 'inherit', height: '100%', margin: '0 auto' }}>
                         {format(d, 'd-MMM').toLowerCase()}
                       </div>
                     </th>
                   );
                })}
              </tr>
            </thead>
            
            <tbody>
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={matrixDays.length + 3} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No tasks found matching the selected filters.</td>
                </tr>
              )}
              {filteredTasks.map((t) => {
                 if (!t.owners || t.owners.length === 0) return null;
                 
                 return t.owners.filter(o => filterEngineer.length === 0 || filterEngineer.includes(o.name)).map((owner, idx) => {
                    const totalFT = Number(owner.totalFT) || 0;
                    const completedFT = Number(owner.completedFT) || 0;
                    const remainingFT = totalFT - completedFT;
                    const progress = totalFT > 0 ? (completedFT / totalFT * 100).toFixed(0) + '%' : '0%';
                    
                    const plannedPerDay = Number(owner.plannedFTPerDay) || 0;
                    
                    let currentRemPlanned = totalFT;
                    let currentRemActual = totalFT;

                    const rowData = matrixDays.map(d => {
                       const dateStr = format(d, 'yyyy-MM-dd');
                       const isWknd = isWeekend(d);
                       
                       let isWithinPlan = false;
                       try {
                         if (owner.startDate && owner.endDate) {
                           const s = parseISO(owner.startDate);
                           const e = parseISO(owner.endDate);
                           isWithinPlan = (isEqual(d, s) || isAfter(d, s)) && (isEqual(d, e) || isBefore(d, e));
                         }
                       } catch(err) {}

                       const planned = (isWithinPlan && (!isWknd || showWeekends)) ? plannedPerDay : 0;
                       const actual = getLogValue(t.sno, owner.name, dateStr, 'actualFT');
                       
                       const dsrVal = owner.todayFTs?.[dateStr];
                       const treated = (dsrVal !== undefined && dsrVal !== '') ? Number(dsrVal) : getLogValue(t.sno, owner.name, dateStr, 'treatedFT');
                       const dailyRemark = owner.dailyRemarks?.[dateStr] || '';
                       
                       currentRemPlanned -= planned;
                       currentRemActual -= treated;

                       return { dateStr, planned, actual, treated, remPlanned: currentRemPlanned, remActual: currentRemActual, isWknd, dailyRemark };
                    });

                    const baseStyle = { padding: '4px 8px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' };
                    const fixedCol1 = { ...baseStyle, position: 'sticky', left: 0, width: '120px', minWidth: '120px', zIndex: 2 };
                    const fixedCol2 = { ...baseStyle, position: 'sticky', left: '120px', width: '150px', minWidth: '150px', zIndex: 2 };
                    const fixedCol3 = { ...baseStyle, position: 'sticky', left: '270px', width: '180px', minWidth: '180px', zIndex: 2, borderRight: '2px solid var(--border)', boxShadow: '2px 0 4px -2px rgba(0,0,0,0.1)' };
                    
                    const grayBg = '#e5e7eb';
                    const darkGrayBg = '#d1d5db';
                    const yellowBg = '#fef08a';
                    const brightYellowBg = '#fde047';
                    const whiteBg = '#ffffff';
                    
                    const taskEndBorderStyle = '2px dashed #16a34a';

                    return (
                      <React.Fragment key={`${t.sno}-${owner.name}`}>
                         {/* Row 1: Planned */}
                         <tr>
                           <td style={{ ...fixedCol1, background: grayBg, fontWeight: 600 }}>Task ID</td>
                           <td style={{ ...fixedCol2, background: whiteBg, wordBreak: 'break-all' }}>{t.taskIds?.join(', ') || t.sno}</td>
                           <td style={{ ...fixedCol3, background: yellowBg }}>Planned</td>
                           {rowData.map((col, i) => (
                              <td key={`p-${i}`} style={{ ...baseStyle, background: yellowBg, textAlign: 'center' }}>{col.planned > 0 ? col.planned : ''}</td>
                           ))}
                         </tr>
                         
                         {/* Row 2: Remaining FT (Planned) */}
                         <tr>
                           <td style={{ ...fixedCol1, background: grayBg, fontWeight: 600 }}>Engineer</td>
                           <td style={{ ...fixedCol2, background: grayBg }}>{owner.name}</td>
                           <td style={{ ...fixedCol3, background: darkGrayBg }}>Remaining FT (Planned)</td>
                           {rowData.map((col, i) => (
                              <td key={`rp-${i}`} style={{ ...baseStyle, background: darkGrayBg, textAlign: 'center' }}>{col.remPlanned.toFixed(0)}</td>
                           ))}
                         </tr>
                         
                         {/* Row 3: Remaining FT (Actual) */}
                         <tr>
                           <td style={{ ...fixedCol1, background: grayBg, fontWeight: 600 }}>Function</td>
                           <td style={{ ...fixedCol2, background: grayBg }}>{t.function}</td>
                           <td style={{ ...fixedCol3, background: darkGrayBg }}>Remaining FT (Actual)</td>
                           {rowData.map((col, i) => (
                              <td key={`ra-${i}`} style={{ ...baseStyle, background: darkGrayBg, textAlign: 'center' }}>{col.remActual.toFixed(0)}</td>
                           ))}
                         </tr>
                         
                         {/* Row 4: Actual */}
                         <tr>
                           <td style={{ ...fixedCol1, background: grayBg, fontWeight: 600 }}>Total FT</td>
                           <td style={{ ...fixedCol2, background: grayBg }}>{totalFT}</td>
                           <td style={{ ...fixedCol3, background: grayBg }}>Actual</td>
                           {rowData.map((col, i) => (
                              <td key={`a-${i}`} style={{ ...baseStyle, background: whiteBg, padding: 0 }}>
                                 <input 
                                    type="number" 
                                    value={col.actual || ''} 
                                    onChange={(e) => handleCellChange(t.sno, owner.name, col.dateStr, 'actualFT', e.target.value)}
                                    style={{ width: '100%', height: '24px', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.75rem', outline: 'none' }}
                                 />
                              </td>
                           ))}
                         </tr>

                         {/* Row 5: Treated FTs */}
                         <tr>
                           <td style={{ ...fixedCol1, background: grayBg, fontWeight: 600 }}>Remaining</td>
                           <td style={{ ...fixedCol2, background: grayBg }}>{remainingFT}</td>
                           <td style={{ ...fixedCol3, background: whiteBg }}>Treated FTs</td>
                           {rowData.map((col, i) => (
                              <td 
                                key={`t-${i}`} 
                                style={{ ...baseStyle, background: col.treated ? '#f0f9ff' : whiteBg, padding: 0, cursor: col.dailyRemark ? 'help' : 'default' }}
                                title={col.dailyRemark ? `DSR Comment:\n${col.dailyRemark}` : undefined}
                              >
                                 <div style={{ width: '100%', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: col.treated ? 600 : 'normal', color: col.treated ? '#0369a1' : 'transparent' }}>
                                    {col.treated || ''}
                                 </div>
                              </td>
                           ))}
                         </tr>

                         {/* Row 6: Progress % */}
                         <tr>
                           <td style={{ ...fixedCol1, background: brightYellowBg, fontWeight: 600 }}>Progress %</td>
                           <td style={{ ...fixedCol2, background: brightYellowBg, fontWeight: 600 }}>{progress}</td>
                           <td style={{ ...fixedCol3, background: whiteBg }}></td>
                           {rowData.map((col, i) => <td key={`e1-${i}`} style={{ ...baseStyle, background: whiteBg }}></td>)}
                         </tr>

                         {/* Row 7: Start Date */}
                         <tr>
                           <td style={{ ...fixedCol1, background: grayBg, fontWeight: 600 }}>Start Date</td>
                           <td style={{ ...fixedCol2, background: grayBg }}>{owner.startDate ? format(parseISO(owner.startDate), 'dd-MMM-yy') : ''}</td>
                           <td style={{ ...fixedCol3, background: whiteBg }}></td>
                           {rowData.map((col, i) => <td key={`e2-${i}`} style={{ ...baseStyle, background: whiteBg }}></td>)}
                         </tr>

                         {/* Row 8: Planned FT / Day */}
                         <tr>
                           <td style={{ ...fixedCol1, background: grayBg, fontWeight: 600 }}>Planned FT / Day</td>
                           <td style={{ ...fixedCol2, background: grayBg }}>{plannedPerDay}</td>
                           <td style={{ ...fixedCol3, background: whiteBg }}></td>
                           {rowData.map((col, i) => <td key={`e3-${i}`} style={{ ...baseStyle, background: whiteBg }}></td>)}
                         </tr>

                         {/* Row 9: Status */}
                         <tr>
                           <td style={{ ...fixedCol1, background: whiteBg, fontWeight: 600, borderBottom: taskEndBorderStyle }}>Status</td>
                           <td style={{ ...fixedCol2, background: whiteBg, borderBottom: taskEndBorderStyle }}>{t.status}</td>
                           <td style={{ ...fixedCol3, background: whiteBg, borderBottom: taskEndBorderStyle }}></td>
                           {rowData.map((col, i) => <td key={`e4-${i}`} style={{ ...baseStyle, background: whiteBg, borderBottom: taskEndBorderStyle }}></td>)}
                         </tr>
                      </React.Fragment>
                    );
                 });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Burndown;
