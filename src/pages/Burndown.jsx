import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, isSameDay, parseISO, isAfter, isBefore, isEqual, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const Burndown = () => {
  const { tasks, taskDailyLogs, upsertTaskDailyLog } = useStore();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showWeekends, setShowWeekends] = useState(false);

  const activeTasks = tasks ? tasks.filter(t => t.status !== 'Archive') : [];

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

      {/* MATRIX TABLE */}
      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="table-container" style={{ flex: 1, paddingBottom: '20px' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 'max-content', fontSize: '0.75rem', width: '100%', border: '1px solid var(--border)' }}>
            
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
              {activeTasks.length === 0 && (
                <tr>
                  <td colSpan={matrixDays.length + 3} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No active tasks found.</td>
                </tr>
              )}
              {activeTasks.map((t) => {
                 if (!t.owners || t.owners.length === 0) return null;
                 
                 return t.owners.map((owner, idx) => {
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
                       const treated = getLogValue(t.sno, owner.name, dateStr, 'treatedFT');
                       
                       currentRemPlanned -= planned;
                       currentRemActual -= treated;

                       return { dateStr, planned, actual, treated, remPlanned: currentRemPlanned, remActual: currentRemActual, isWknd };
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
                              <td key={`t-${i}`} style={{ ...baseStyle, background: whiteBg, padding: 0 }}>
                                 <input 
                                    type="number" 
                                    value={col.treated || ''} 
                                    onChange={(e) => handleCellChange(t.sno, owner.name, col.dateStr, 'treatedFT', e.target.value)}
                                    style={{ width: '100%', height: '24px', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.75rem', outline: 'none' }}
                                 />
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
