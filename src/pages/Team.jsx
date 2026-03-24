import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Settings, Edit2, Trash2, X, Calendar as CalendarIcon, Users, Globe, MapPin, Search, FilterX, Sparkles } from 'lucide-react';
import { analyzeWorkload } from '../utils/mockAI';

const Team = () => {
  const { 
    tasks, teamMembers, addTeamMember, updateTeamMember, deleteTeamMember,
    teamModes, setTeamMode, leaveData, holidays, addHoliday, updateHoliday, removeHoliday 
  } = useStore();
  
  const activeTasks = tasks ? tasks.filter(t => t.status !== 'Delivered' && t.status !== 'Archive') : [];
  const [isAnalyzingWorkload, setIsAnalyzingWorkload] = useState(false);
  const [workloadReport, setWorkloadReport] = useState(null);

  const handleAnalyzeWorkload = async () => {
    setIsAnalyzingWorkload(true);
    const report = await analyzeWorkload(teamMembers, activeTasks);
    setWorkloadReport(report);
    setIsAnalyzingWorkload(false);
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('team');
  const [holiForm, setHoliForm] = useState({ oldDate: null, oldName: null, date: '', name: '', scope: 'ALL', locations: [] });
  const [teamForm, setTeamForm] = useState({ sno: null, name: '', location: '', perimeter: '' });
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showWeekends, setShowWeekends] = useState(true);
  const [showHolidays, setShowHolidays] = useState(true);

  const [selectedRow, setSelectedRow] = useState(null);
  const [filters, setFilters] = useState({ location: '', perimeter: '', employee: '' });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const matrixDaysRaw = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const matrixDays = showWeekends ? matrixDaysRaw : matrixDaysRaw.filter(d => !isWeekend(d));

  const prevMonthStart = startOfMonth(subMonths(currentMonth, 1));
  const prevMonthEnd = endOfMonth(subMonths(currentMonth, 1));
  const prevMatrixDaysRaw = eachDayOfInterval({ start: prevMonthStart, end: prevMonthEnd });
  const prevMatrixDays = showWeekends ? prevMatrixDaysRaw : prevMatrixDaysRaw.filter(d => !isWeekend(d));

  const uniqueLocations = useMemo(() => [...new Set(teamMembers?.map(m => m.location))].filter(Boolean), [teamMembers]);
  const uniquePerimeters = useMemo(() => [...new Set(teamMembers?.map(m => m.perimeter))].filter(Boolean), [teamMembers]);

  const filteredMembers = useMemo(() => {
    return teamMembers?.filter(m => {
      const matchLoc = filters.location ? m.location === filters.location : true;
      const matchPer = filters.perimeter ? m.perimeter === filters.perimeter : true;
      const matchEmp = filters.employee ? m.name.toLowerCase().includes(filters.employee.toLowerCase()) : true;
      return matchLoc && matchPer && matchEmp;
    });
  }, [teamMembers, filters]);

  const getEffectiveData = (member, dateStr, ignoreHolidays = false) => {
    const leave = leaveData?.find(l => l.name === member.name && l.date === dateStr);
    if (leave) return { mode: 'LEAVE', type: leave.type };
    
    const modeObj = teamModes?.find(m => m.name === member.name && m.date === dateStr);
    if (modeObj && modeObj.mode !== 'EMPTY') return modeObj;

    if (showHolidays && !ignoreHolidays) {
      const hol = holidays?.find(h => 
        h.date === dateStr && (h.scope === 'ALL' || (h.scope === 'MULTI' && h.locations.includes(member.location)))
      );
      if (hol) return { mode: 'HOLIDAY', name: hol.name };
    }
    
    return { mode: 'EMPTY' };
  };

  const getPillStyles = (modeData) => {
    const mode = typeof modeData === 'string' ? modeData : (modeData.mode || 'EMPTY');
    switch (mode) {
      case 'WFO': return { bg: '#dcfce7', text: 'WFO', color: '#166534', border: '1px solid #bbf7d0' };
      case 'WFH': return { bg: '#e0f2fe', text: 'WFH', color: '#075985', border: '1px solid #bae6fd' };
      case 'LEAVE': return { bg: '#fee2e2', text: 'Leave', color: '#991b1b', border: '1px solid #fca5a5' };
      case 'HALF_DAY': return { bg: '#fef3c7', text: 'HD', color: '#92400e', border: '1px solid #fde68a' };
      case 'HOLIDAY': return { bg: '#fef08a', text: '', color: 'inherit', border: 'none' };
      default: return { bg: 'transparent', text: '', color: 'inherit', border: 'none' };
    }
  };

  const calculateUserTotals = (member, daysArray) => {
     let wfo = 0, wfh = 0, leave = 0;
     daysArray.forEach(d => {
        const dateStr = format(d, 'yyyy-MM-dd');
        const data = getEffectiveData(member, dateStr);
        if (data.mode === 'WFO') wfo++;
        else if (data.mode === 'WFH') wfh++;
        else if (data.mode === 'LEAVE') leave += 1;
        else if (data.mode === 'HALF_DAY') leave += 0.5;
     });
     return { wfo, wfh, leave };
  };

  const globalTotals = useMemo(() => {
     let tWFO = 0, tWFH = 0, tLEAVE = 0;
     filteredMembers?.forEach(m => {
        const t = calculateUserTotals(m, matrixDays);
        tWFO += t.wfo;
        tWFH += t.wfh;
        tLEAVE += t.leave;
     });
     return { tWFO, tWFH, tLEAVE };
  }, [matrixDays, filteredMembers, teamModes, leaveData, holidays, showHolidays]);

  const prevGlobalTotals = useMemo(() => {
     let tWFO = 0, tWFH = 0, tLEAVE = 0;
     filteredMembers?.forEach(m => {
        const t = calculateUserTotals(m, prevMatrixDays);
        tWFO += t.wfo;
        tWFH += t.wfh;
        tLEAVE += t.leave;
     });
     return { tWFO, tWFH, tLEAVE };
  }, [prevMatrixDays, filteredMembers, teamModes, leaveData, holidays, showHolidays]);

  const handleCellClick = (member, dateStr) => {
    const modeObj = teamModes?.find(m => m.name === member.name && m.date === dateStr);
    const currentMode = (modeObj && modeObj.mode !== 'EMPTY') ? modeObj.mode : 'EMPTY';
    
    let nextMode = 'WFO';
    if (currentMode === 'WFO') nextMode = 'WFH';
    else if (currentMode === 'WFH') nextMode = 'LEAVE';
    else if (currentMode === 'LEAVE') nextMode = 'HALF_DAY';
    else if (currentMode === 'HALF_DAY') nextMode = 'EMPTY';
    
    setTeamMode(member.name, dateStr, { mode: nextMode, half: nextMode === 'HALF_DAY' ? 'AM' : null });
  };

  const handleSaveTeamMember = () => {
    if (!teamForm.name) return;
    if (teamForm.sno) updateTeamMember(teamForm.sno, { name: teamForm.name, location: teamForm.location, perimeter: teamForm.perimeter });
    else addTeamMember({ name: teamForm.name, location: teamForm.location, perimeter: teamForm.perimeter });
    setTeamForm({ sno: null, name: '', location: '', perimeter: '' });
  };

  const handleEditMember = (m) => {
    setTeamForm({ sno: m.sno, name: m.name, location: m.location, perimeter: m.perimeter });
  };

  const handleSaveHoliday = () => {
    if (!holiForm.date || !holiForm.name) return;
    const scopesToSave = holiForm.scope === 'MULTI' && holiForm.locations.length === 0 ? 'ALL' : holiForm.scope;
    const newHol = { date: holiForm.date, name: holiForm.name, scope: scopesToSave, locations: scopesToSave === 'ALL' ? [] : holiForm.locations };
    if (holiForm.oldDate && holiForm.oldName) updateHoliday(holiForm.oldDate, holiForm.oldName, newHol);
    else addHoliday(newHol);
    setHoliForm({ oldDate: null, oldName: null, date: '', name: '', scope: 'ALL', locations: [] });
  };

  const handleEditHoliday = (h) => {
    setHoliForm({ oldDate: h.date, oldName: h.name, date: h.date, name: h.name, scope: h.scope, locations: h.locations || [] });
  };

  const toggleHolidayLoc = (loc) => {
    setHoliForm(prev => {
      const locs = prev.locations.includes(loc) ? prev.locations.filter(l => l !== loc) : [...prev.locations, loc];
      return { ...prev, locations: locs };
    });
  };

  const renderTrend = (curr, prev, inverted = false) => {
    const diff = curr - prev;
    if (diff === 0) return <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Even with last month</span>;
    
    let color = diff > 0 ? (inverted ? 'var(--warning)' : 'var(--success)') : (inverted ? 'var(--success)' : 'var(--text-muted)');
    let textInfo = inverted ? (diff > 0 ? 'Slightly High' : 'Improved') : (diff > 0 ? 'Up vs Last' : 'Down vs Last');

    return (
      <span style={{ fontSize: '0.8rem', color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
        {diff > 0 ? '↑' : '↓'} {Math.abs(diff)} from last month <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({textInfo})</span>
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', position: 'relative' }}>
      
      {/* HEADER & FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <div>
          <h1 className="title">Team Data Hub</h1>
          <p className="subtitle">Modern dashboard for accurate attendance tracking.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button 
            className="btn btn-primary"
            onClick={handleAnalyzeWorkload}
            disabled={isAnalyzingWorkload}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--purple-bg)', color: 'var(--purple)', border: '1px solid var(--purple)' }}
          >
            {isAnalyzingWorkload ? '✨ Analyzing...' : <><Sparkles size={18} /> Analyze Workload</>}
          </button>
          <button 
            onClick={() => setIsDrawerOpen(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '50%', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {workloadReport && (
        <div className="card" style={{ marginBottom: 'var(--space-md)', background: 'var(--purple-bg)', borderLeft: '4px solid var(--purple)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
             <h3 style={{ margin: 0, color: '#4c1d95', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Sparkles size={16} /> AI Workload Analysis
             </h3>
             <button className="btn-icon-sm" onClick={() => setWorkloadReport(null)}><X size={16} color="#4c1d95" /></button>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#4c1d95', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
            {workloadReport.message}
          </p>
          {workloadReport.distribution && (
             <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                {workloadReport.distribution.map(d => (
                   <div key={d.name} style={{ background: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                      {d.name}: <span style={{ color: d.pendingFT > 20 ? 'var(--danger)' : 'var(--success)' }}>{d.pendingFT} pending FT</span>
                   </div>
                ))}
             </div>
          )}
        </div>
      )}

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 'var(--space-md)', padding: '12px 16px', background: 'white' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '250px' }}>
               <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
               <input 
                  type="text" placeholder="Search Employee..." 
                  value={filters.employee} onChange={e => setFilters({...filters, employee: e.target.value})}
                  style={{ paddingLeft: '32px' }} 
               />
            </div>
            <select value={filters.location} onChange={e => setFilters({...filters, location: e.target.value})} style={{ maxWidth: '180px' }}>
               <option value="">All Locations</option>
               {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={filters.perimeter} onChange={e => setFilters({...filters, perimeter: e.target.value})} style={{ maxWidth: '180px' }}>
               <option value="">All Perimeters</option>
               {uniquePerimeters.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="btn-icon-sm" onClick={() => setFilters({ location: '', perimeter: '', employee: '' })} title="Reset Filters" style={{ background: 'var(--bg)', padding: '8px' }}>
               <FilterX size={16} />
            </button>
         </div>
         
         <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 500 }}><input type="checkbox" checked={showWeekends} onChange={e => setShowWeekends(e.target.checked)} /> Weekends</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 500 }}><input type="checkbox" checked={showHolidays} onChange={e => setShowHolidays(e.target.checked)} /> Holidays</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
              <button className="btn-icon-sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={16} /></button>
              <h3 style={{ width: '130px', textAlign: 'center', margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{format(currentMonth, 'MMMM yyyy')}</h3>
              <button className="btn-icon-sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={16} /></button>
            </div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: 'var(--space-lg)' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', borderLeft: '4px solid var(--success)' }}>
           <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total WFO Days</span>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '4px' }}>
             <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{globalTotals.tWFO}</span>
             {renderTrend(globalTotals.tWFO, prevGlobalTotals.tWFO)}
           </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', borderLeft: '4px solid var(--info)' }}>
           <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total WFH Days</span>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '4px' }}>
             <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info)' }}>{globalTotals.tWFH}</span>
             {renderTrend(globalTotals.tWFH, prevGlobalTotals.tWFH)}
           </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', borderLeft: '4px solid var(--danger)' }}>
           <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Leave</span>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '4px' }}>
             <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>{globalTotals.tLEAVE.toFixed(1).replace('.0', '')}</span>
             {renderTrend(globalTotals.tLEAVE, prevGlobalTotals.tLEAVE, true)}
           </div>
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="table-container" style={{ flex: 1, paddingBottom: '20px' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 'max-content', fontSize: '0.75rem', width: '100%' }}>
            
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <tr>
                <th className="col-fixed" style={{ left: 0, width: '40px', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', padding: '12px 8px', textAlign: 'center' }}>S.No</th>
                <th className="col-fixed" style={{ left: '40px', width: '180px', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', padding: '12px 16px', textAlign: 'left' }}>Resource Name</th>
                <th className="col-fixed" style={{ left: '220px', width: '110px', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', padding: '12px', textAlign: 'left' }}>Location</th>
                <th className="col-fixed freeze-shadow" style={{ left: '330px', width: '100px', borderBottom: '2px solid var(--border)', borderRight: '2px solid var(--border)', padding: '12px', textAlign: 'left' }}>Perimeter</th>
                
                {matrixDays.map(d => {
                   const dateStr = format(d, 'yyyy-MM-dd');
                   const isWknd = isWeekend(d);
                   const isToday = isSameDay(d, new Date());
                   const globalHol = showHolidays && holidays?.find(h => h.date === dateStr && h.scope === 'ALL');
                   const bgCol = (isWknd || globalHol) ? '#e5e7eb' : (isToday ? '#e0f2fe' : 'var(--bg)');
                   
                   return (
                     <th key={`day-${format(d, 'd')}`} style={{ textAlign: 'center', padding: '6px 4px', borderBottom: isToday ? '2px solid var(--primary)' : '2px solid var(--border)', borderRight: '1px solid var(--border)', minWidth: '42px', background: bgCol }}>
                       <div style={{ fontSize: '0.65rem', color: isToday ? 'var(--primary)' : 'var(--text-muted)', textTransform: 'uppercase' }}>{format(d, 'E')}</div>
                       <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isToday ? 'var(--primary)' : 'inherit' }}>{format(d, 'd')}</div>
                     </th>
                   );
                })}

                <th style={{ width: '70px', borderBottom: '2px solid var(--border)', borderLeft: '2px solid var(--border)', padding: '12px', textAlign: 'center' }}>Total L</th>
                <th style={{ width: '70px', borderBottom: '2px solid var(--border)', borderLeft: '1px solid var(--border)', padding: '12px', textAlign: 'center' }}>Total WFH</th>
                <th style={{ width: '70px', borderBottom: '2px solid var(--border)', borderLeft: '1px solid var(--border)', padding: '12px', textAlign: 'center' }}>Total WFO</th>
              </tr>
            </thead>
            
            <tbody>
              {filteredMembers && filteredMembers.map((member) => {
                 const totals = calculateUserTotals(member, matrixDays);
                 const isSelected = selectedRow === member.sno;
                 
                 return (
                   <tr key={member.sno || member.name} className={isSelected ? 'row-selected' : ''} onClick={() => setSelectedRow(member.sno)} style={{ cursor: 'pointer' }}>
                     <td className="col-fixed" style={{ left: 0, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 4px', textAlign: 'center', fontWeight: 600 }}>{member.sno}</td>
                     <td className="col-fixed" style={{ left: '40px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{member.name}</span>
                     </td>
                     <td className="col-fixed" style={{ left: '220px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{member.location}</td>
                     <td className="col-fixed freeze-shadow" style={{ left: '330px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{member.perimeter}</td>
                     
                     {matrixDays.map(d => {
                        const dateStr = format(d, 'yyyy-MM-dd');
                        const data = getEffectiveData(member, dateStr);
                        const isWknd = isWeekend(d);
                        
                        const bgLocHol = showHolidays && holidays?.find(h => h.date === dateStr && (h.scope === 'ALL' || (h.scope === 'MULTI' && h.locations?.includes(member.location))));
                        
                        let cellBg = isWknd ? '#f1f5f9' : 'transparent';
                        if (bgLocHol) cellBg = '#fef08a'; // Holiday yellow background logic
                        
                        const st = getPillStyles(data);
                        const hasPill = data.mode !== 'EMPTY' && data.mode !== 'HOLIDAY';

                        let tooltipTxt = `${dateStr} - ${member.name}`;
                        if (data.mode !== 'EMPTY') tooltipTxt += ` (${data.mode === 'HOLIDAY' ? bgLocHol?.name : data.mode})`;

                        return (
                          <td 
                             key={dateStr}
                             title={tooltipTxt}
                             style={{
                                padding: '4px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', 
                                background: cellBg, textAlign: 'center', cursor: 'pointer', position: 'relative'
                             }}
                          >
                             <div 
                                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRow(member.sno);
                                  handleCellClick(member, dateStr);
                                }}
                             >
                                {hasPill && (
                                  <div className="attendance-pill" style={{ background: st.bg, color: st.color, border: st.border }}>
                                    {st.text} 
                                  </div>
                                )}
                             </div>
                          </td>
                        )
                     })}

                     <td style={{ borderLeft: '2px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '12px', textAlign: 'center', fontWeight: 700, color: 'var(--danger)', fontSize: '0.9rem' }}>{totals.leave.toFixed(1).replace('.0', '')}</td>
                     <td style={{ borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '12px', textAlign: 'center', fontWeight: 700, color: 'var(--info)', fontSize: '0.9rem' }}>{totals.wfh}</td>
                     <td style={{ borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '12px', textAlign: 'center', fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>{totals.wfo}</td>
                   </tr>
                 );
              })}
              {(!filteredMembers || filteredMembers.length === 0) && (
                <tr>
                  <td colSpan={matrixDays.length + 7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No members match the active filters.</td>
                </tr>
              )}
            </tbody>
            
            <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10, background: 'var(--bg)', boxShadow: '0 -2px 4px rgba(0,0,0,0.05)' }}>
              <tr>
                <td colSpan={4} className="col-fixed freeze-shadow" style={{ left: 0, borderTop: '2px solid var(--border)', borderRight: '2px solid var(--border)', padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                   Filtered Summary
                </td>
                <td colSpan={matrixDays.length} style={{ borderTop: '2px solid var(--border)', padding: '12px', background: 'var(--bg)' }}>
                </td>
                <td style={{ borderTop: '2px solid var(--border)', borderLeft: '2px solid var(--border)', padding: '12px 8px', textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: 'var(--danger)' }}>{globalTotals.tLEAVE.toFixed(1).replace('.0', '')}</td>
                <td style={{ borderTop: '2px solid var(--border)', borderLeft: '1px solid var(--border)', padding: '12px 8px', textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: 'var(--info)' }}>{globalTotals.tWFH}</td>
                <td style={{ borderTop: '2px solid var(--border)', borderLeft: '1px solid var(--border)', padding: '12px 8px', textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: 'var(--success)' }}>{globalTotals.tWFO}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* LEGEND BOTTOM BAR */}
      <div style={{ display: 'flex', gap: '24px', padding: '16px', marginTop: '8px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', justifyContent: 'center' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600 }}><span className="attendance-pill" style={getPillStyles('WFO')}>WFO</span> Working from Office</div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600 }}><span className="attendance-pill" style={getPillStyles('WFH')}>WFH</span> Working from Home</div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600 }}><span className="attendance-pill" style={getPillStyles('LEAVE')}>Leave</span> Full Day Leave</div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600 }}><span className="attendance-pill" style={getPillStyles('HALF_DAY')}>HD</span> Half Day Leave</div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600 }}><div style={{ width: '20px', height: '20px', background: '#fef08a', borderRadius: '4px' }}></div> Holiday</div>
      </div>

      {/* RIGHT SIDE DRAWER */}
      {isDrawerOpen && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }}
            onClick={() => setIsDrawerOpen(false)}
          />
          <div style={{ position: 'fixed', top: 0, right: 0, width: '400px', height: '100%', background: 'var(--bg)', zIndex: 50, boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s forwards' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Management Hub</h2>
              <button className="btn-icon-sm" onClick={() => setIsDrawerOpen(false)}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              <button 
                style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', borderBottom: drawerTab === 'team' ? '2px solid var(--primary)' : '2px solid transparent', color: drawerTab === 'team' ? 'var(--primary)' : 'var(--text)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => setDrawerTab('team')}
              >
                <Users size={16} /> Manage Team
              </button>
              <button 
                style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', borderBottom: drawerTab === 'holidays' ? '2px solid var(--primary)' : '2px solid transparent', color: drawerTab === 'holidays' ? 'var(--primary)' : 'var(--text)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => setDrawerTab('holidays')}
              >
                <CalendarIcon size={16} /> Holidays
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {drawerTab === 'team' && (
                <div>
                  <div style={{ background: 'white', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>{teamForm.sno ? 'Edit Member' : 'Add New Member'}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input type="text" placeholder="Name" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                      <input type="text" placeholder="Location" value={teamForm.location} onChange={e => setTeamForm({...teamForm, location: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                      <input type="text" placeholder="Perimeter" value={teamForm.perimeter} onChange={e => setTeamForm({...teamForm, perimeter: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {teamForm.sno && (
                          <button className="btn btn-secondary" onClick={() => setTeamForm({ sno: null, name: '', location: '', perimeter: '' })}>Cancel</button>
                        )}
                        <button className="btn btn-primary" onClick={handleSaveTeamMember}>{teamForm.sno ? 'Update' : 'Add User'}</button>
                      </div>
                    </div>
                  </div>

                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Current Team Roster</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {teamMembers?.map(m => (
                      <div key={m.sno} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{m.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.location} • {m.perimeter}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn-icon-sm" onClick={() => handleEditMember(m)}><Edit2 size={16} /></button>
                          <button className="btn-icon-sm" onClick={() => deleteTeamMember(m.sno)} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {drawerTab === 'holidays' && (
                <div>
                  <div style={{ background: 'white', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>{holiForm.oldDate ? 'Edit Holiday' : 'Add Holiday'}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input type="date" value={holiForm.date} onChange={e => setHoliForm({...holiForm, date: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                      <input type="text" placeholder="Holiday Name (e.g. Diwali)" value={holiForm.name} onChange={e => setHoliForm({...holiForm, name: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Location Scope</span>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', cursor: 'pointer' }}>
                            <input type="radio" name="scope" value="ALL" checked={holiForm.scope === 'ALL'} onChange={() => setHoliForm({...holiForm, scope: 'ALL', locations: []})} />
                            🌍 All Locations
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', cursor: 'pointer' }}>
                            <input type="radio" name="scope" value="MULTI" checked={holiForm.scope === 'MULTI'} onChange={() => setHoliForm({...holiForm, scope: 'MULTI'})} />
                            📍 Select Locations
                          </label>
                        </div>
                        
                        {holiForm.scope === 'MULTI' && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            {uniqueLocations.map(loc => (
                              <label key={loc} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={holiForm.locations.includes(loc)} onChange={() => toggleHolidayLoc(loc)} />
                                {loc}
                              </label>
                            ))}
                            {uniqueLocations.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No locations available from team data.</span>}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        {holiForm.oldDate && (
                           <button className="btn btn-secondary" onClick={() => setHoliForm({ oldDate: null, oldName: null, date: '', name: '', scope: 'ALL', locations: [] })}>Cancel</button>
                        )}
                        <button className="btn btn-primary" onClick={handleSaveHoliday}>{holiForm.oldDate ? 'Update' : 'Add to Calendar'}</button>
                      </div>
                    </div>
                  </div>

                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Upcoming Holidays</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {holidays?.length > 0 ? holidays.map((h, i) => (
                      <div key={`${h.date}-${h.name}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <div>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {h.name} 
                            {h.scope === 'ALL' ? <Globe size={14} color="var(--info)" /> : <MapPin size={14} color="var(--warning)" />}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {h.date} • <span style={{fontWeight:500}}>{h.scope === 'ALL' ? 'Global' : (h.locations?.length > 0 ? h.locations.join(', ') : 'None')}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn-icon-sm" onClick={() => handleEditHoliday(h)}><Edit2 size={16} /></button>
                          <button className="btn-icon-sm" onClick={() => removeHoliday(h.date, h.name)} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    )) : (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No holidays added yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
    </div>
  );
};
export default Team;
