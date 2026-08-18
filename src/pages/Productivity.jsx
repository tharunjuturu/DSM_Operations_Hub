import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, isSameDay, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { ChevronLeft, ChevronRight, X, Search, FilterX, Sparkles, Download, Activity, BarChart2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Helper for Leave and Attendance data from the store
const getLeaveData = (leaveData, teamModes, memberName, dateStr) => {
  const leave = leaveData?.find(l => l.name === memberName && l.date === dateStr);
  if (leave) return { onLeave: true, type: leave.type || 'Leave' };

  const modeObj = teamModes?.find(tm => tm.name === memberName && tm.date === dateStr);
  if (modeObj?.mode === 'LEAVE') return { onLeave: true, type: modeObj.leaveType || 'Leave' };
  if (modeObj?.mode === 'HALF_DAY') return { onLeave: true, type: 'Half Day Leave', isHalfDay: true };

  return { onLeave: false };
};

// Calculate working days in task period (excluding weekends if showWeekends is false)
const getWorkingDays = (startStr, endStr, showWeekends = false) => {
  try {
    if (!startStr || !endStr) return 1;
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    if (isAfter(start, end)) return 1;
    const days = eachDayOfInterval({ start, end });
    if (showWeekends) return days.length;
    const workDays = days.filter(d => !isWeekend(d)).length;
    return workDays || 1;
  } catch (e) {
    return 1;
  }
};

// Check if a task is active on a given date (using string comparison to avoid timezone offset bugs)
const isTaskActive = (startStr, endStr, date) => {
  try {
    if (!startStr || !endStr) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    return dateStr >= startStr && dateStr <= endStr;
  } catch (err) {
    return false;
  }
};

// Calculate daily target and actual statistics
const calculateDailyStats = (member, date, showWeekends, showHolidays, holidays, leaveData, teamModes, tasks) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const isWknd = isWeekend(date);

  const leave = getLeaveData(leaveData, teamModes, member.name, dateStr);

  let isHol = false;
  let holidayName = '';
  if (showHolidays) {
    const hol = holidays?.find(h =>
      h.date === dateStr && (h.scope === 'ALL' || (h.scope === 'MULTI' && h.locations?.includes(member.location)))
    );
    if (hol) {
      isHol = true;
      holidayName = hol.name;
    }
  }

  const activeTasksDetails = [];
  let totalTarget = 0;
  let totalActual = 0;

  tasks.forEach(t => {
    const owner = t.owners?.find(o => o.name === member.name);
    if (!owner) return;

    const isActive = isTaskActive(owner.startDate || t.startDate, owner.endDate || t.endDate, date);
    const taskActual = owner.todayFTs?.[dateStr] !== undefined && owner.todayFTs[dateStr] !== '' ? Number(owner.todayFTs[dateStr]) : 0;
    const remark = owner.dailyRemarks?.[dateStr] || '';

    // Task is active if it's planned for this date OR if progress/remarks are logged in DSR
    if (isActive || taskActual > 0 || remark) {
      const totalFT = Number(owner.totalFT) || 0;
      let taskTarget = 0;

      // Only calculate a target if the task is planned for this day (isActive) and person is not on leave/holiday
      if (isActive && totalFT > 0 && !(isWknd && !showWeekends) && !isHol && !leave.onLeave) {
        const duration = getWorkingDays(owner.startDate || t.startDate, owner.endDate || t.endDate, showWeekends);
        // Prioritize plannedFTPerDay from the database, falling back to auto-calculating totalFT/duration
        const rawTarget = Number(owner.plannedFTPerDay) || (totalFT / duration);
        taskTarget = Math.max(1, rawTarget || 1);
        if (leave.isHalfDay) {
          taskTarget *= 0.5;
        }
      }

      activeTasksDetails.push({
        sno: t.sno,
        taskIds: t.taskIds || [],
        function: t.function || '--',
        taskType: t.taskType || '--',
        status: t.status || '--',
        target: taskTarget,
        actual: taskActual,
        remark
      });

      totalTarget += taskTarget;
      totalActual += taskActual;
    }
  });

  let pct = null;
  if (totalTarget > 0) {
    pct = Math.round((totalActual / totalTarget) * 100);
  } else if (totalActual > 0) {
    pct = 100;
  }

  return {
    dateStr,
    isWknd,
    isHol,
    holidayName,
    leave,
    activeTasksDetails,
    totalTarget,
    totalActual,
    pct
  };
};

export default function Productivity() {
  const { tasks, teamMembers, teamModes, leaveData, holidays } = useStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showWeekends, setShowWeekends] = useState(true);
  const [showHolidays, setShowHolidays] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null); // { member, date, stats }

  const [filters, setFilters] = useState({ location: '', perimeter: '', employee: '' });
  const [selectedTrendUser, setSelectedTrendUser] = useState('');

  // Date lists
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const matrixDaysRaw = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const matrixDays = showWeekends ? matrixDaysRaw : matrixDaysRaw.filter(d => !isWeekend(d));

  const uniqueLocations = useMemo(() => [...new Set(teamMembers?.map(m => m.location))].filter(Boolean), [teamMembers]);
  const uniquePerimeters = useMemo(() => [...new Set(teamMembers?.map(m => m.perimeter))].filter(Boolean), [teamMembers]);

  const filteredMembers = useMemo(() => {
    return teamMembers?.filter(m => {
      const matchLoc = filters.location ? m.location === filters.location : true;
      const matchPer = filters.perimeter ? m.perimeter === filters.perimeter : true;
      const matchEmp = filters.employee ? m.name.toLowerCase().includes(filters.employee.toLowerCase()) : true;
      const matchStatus = (m.status || 'Active') === 'Active'; // only show active team roster
      return matchLoc && matchPer && matchEmp && matchStatus;
    });
  }, [teamMembers, filters]);

  // Set default trend user
  useMemo(() => {
    if (filteredMembers?.length > 0 && !selectedTrendUser) {
      setSelectedTrendUser(filteredMembers[0].name);
    }
  }, [filteredMembers, selectedTrendUser]);

  // Matrix stats computed
  const matrixGridData = useMemo(() => {
    if (!filteredMembers) return [];
    return filteredMembers.map(member => {
      const dailyStatsList = matrixDays.map(date => {
        return calculateDailyStats(member, date, showWeekends, showHolidays, holidays, leaveData, teamModes, tasks);
      });

      const totalPeriodActual = dailyStatsList.reduce((sum, s) => sum + s.totalActual, 0);
      const totalPeriodTarget = dailyStatsList.reduce((sum, s) => sum + s.totalTarget, 0);
      const periodPct = totalPeriodTarget > 0 ? Math.round((totalPeriodActual / totalPeriodTarget) * 100) : (totalPeriodActual > 0 ? 100 : 0);

      return {
        member,
        dailyStatsList,
        totalPeriodActual,
        totalPeriodTarget,
        periodPct
      };
    });
  }, [filteredMembers, matrixDays, showWeekends, showHolidays, holidays, leaveData, teamModes, tasks]);

  // Visual Styling of Productivity cells
  const getCellStyles = (stats) => {
    const { leave, isWknd, isHol, totalTarget, totalActual, pct } = stats;

    if (leave.onLeave) {
      return {
        bg: 'var(--danger-bg)',
        color: 'var(--danger)',
        text: leave.isHalfDay ? 'HD' : 'L',
        border: '1px solid #fca5a5',
        fontWeight: 'bold'
      };
    }

    if (isHol) {
      return {
        bg: '#fef08a', // Holiday yellow
        color: '#854d0e',
        text: 'H',
        border: '1px solid #fde047',
        fontWeight: 'bold'
      };
    }

    if (isWknd && !showWeekends) {
      return { bg: '#f1f5f9', color: '#94a3b8', text: '', border: 'none' };
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isFutureDay = stats.dateStr > todayStr;
    if (isFutureDay && totalActual === 0) {
      return { bg: 'transparent', color: 'var(--text-muted)', text: '-', border: 'none', opacity: 0.5 };
    }

    if (totalTarget === 0 && totalActual === 0) {
      return { bg: '#f8fafc', color: '#94a3b8', text: '-', border: 'none' };
    }

    // Color code based on percentage productivity
    if (pct === 0) {
      return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', text: '0%', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: '600' };
    } else if (pct < 50) {
      return { bg: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', text: `${pct}%`, border: '1px solid rgba(245, 158, 11, 0.2)', fontWeight: '600' };
    } else if (pct < 90) {
      return { bg: 'rgba(59, 130, 246, 0.12)', color: 'var(--info)', text: `${pct}%`, border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: '600' };
    } else {
      return { bg: 'var(--success-bg)', color: 'var(--success)', text: `${pct}%`, border: '1px solid #bbf7d0', fontWeight: 'bold' };
    }
  };

  // Recharts Chart Data 1: Stacked Team Daily Output
  const teamDailyChartData = useMemo(() => {
    return matrixDays.map(date => {
      const dateStr = format(date, 'd MMM');
      const dataObj = { dateStr };

      matrixGridData.forEach(row => {
        const stats = row.dailyStatsList.find(s => isSameDay(parseISO(s.dateStr), date));
        dataObj[row.member.name] = stats ? stats.totalActual : 0;
      });

      return dataObj;
    });
  }, [matrixDays, matrixGridData]);

  // Recharts Chart Data 2: Individual Trend vs Target
  const individualTrendData = useMemo(() => {
    const userRow = matrixGridData.find(row => row.member.name === selectedTrendUser);
    if (!userRow) return [];

    return userRow.dailyStatsList.map(s => ({
      day: format(parseISO(s.dateStr), 'dd-MMM'),
      Target: s.totalTarget,
      Actual: s.totalActual,
      ProductivityPct: s.pct || 0
    }));
  }, [matrixGridData, selectedTrendUser]);

  // Recharts Chart Data 3: Focus Distribution by Function
  const functionDistributionData = useMemo(() => {
    const fnMap = {};
    matrixGridData.forEach(row => {
      row.dailyStatsList.forEach(s => {
        s.activeTasksDetails.forEach(task => {
          if (task.actual > 0) {
            fnMap[task.function] = (fnMap[task.function] || 0) + task.actual;
          }
        });
      });
    });

    return Object.keys(fnMap).map(fn => ({
      name: fn,
      value: fnMap[fn]
    })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [matrixGridData]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let grandActual = 0;
    let grandTarget = 0;
    let totalCellCount = 0;
    let activeCellCount = 0;

    matrixGridData.forEach(row => {
      row.dailyStatsList.forEach(s => {
        grandActual += s.totalActual;
        grandTarget += s.totalTarget;
        if (!s.isWknd && !s.isHol && !s.leave.onLeave) {
          totalCellCount++;
          if (s.totalActual > 0) activeCellCount++;
        }
      });
    });

    const averageProductivity = grandTarget > 0 ? Math.round((grandActual / grandTarget) * 100) : 0;
    const activeUtilization = totalCellCount > 0 ? Math.round((activeCellCount / totalCellCount) * 100) : 0;

    return {
      grandActual,
      grandTarget,
      averageProductivity,
      activeUtilization
    };
  }, [matrixGridData]);

  // Excel Export logic via ExcelJS
  const handleExportExcel = async () => {
    const wb = new ExcelJS.Workbook();

    // Tab 1: Productivity Summary Matrix
    const ws1 = wb.addWorksheet("Productivity Summary");
    ws1.views = [{ showGridLines: true }];

    const cols = [
      { width: 6 },  // S.no
      { width: 22 }, // Resource Name
      { width: 14 }, // Location
      { width: 14 }  // Perimeter
    ];
    matrixDays.forEach(() => cols.push({ width: 8 }));
    cols.push({ width: 12 }, { width: 12 }, { width: 12 });
    ws1.columns = cols;

    // Build headers
    const headers = ['S.No', 'Resource Name', 'Location', 'Perimeter'];
    matrixDays.forEach(d => headers.push(format(d, 'dd-MMM')));
    headers.push('Total Target', 'Total Actual', 'Overall Prod %');

    const headerRow = ws1.addRow(headers);
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: cell.col >= 5 && cell.col <= 4 + matrixDays.length ? 45 : 0 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 40;

    // Fill data row by row
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    matrixGridData.forEach((rowObj, sIdx) => {
      const rowData = [
        sIdx + 1,
        rowObj.member.name,
        rowObj.member.location,
        rowObj.member.perimeter
      ];

      rowObj.dailyStatsList.forEach(s => {
        const isFutureDay = s.dateStr > todayStr;
        if (s.leave.onLeave) {
          rowData.push(s.leave.isHalfDay ? 'HD' : 'L');
        } else if (s.isHol) {
          rowData.push('H');
        } else if (isFutureDay && s.totalActual === 0) {
          rowData.push('-');
        } else if (s.totalTarget === 0 && s.totalActual === 0) {
          rowData.push('-');
        } else {
          rowData.push(`${s.pct}%`);
        }
      });

      rowData.push(rowObj.totalPeriodTarget, rowObj.totalPeriodActual, `${rowObj.periodPct}%`);
      const r = ws1.addRow(rowData);

      // Styles
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).font = { bold: true };
      [1, 2, 3, 4].forEach(c => {
        r.getCell(c).border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
      });

      rowObj.dailyStatsList.forEach((s, dIdx) => {
        const cell = r.getCell(5 + dIdx);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };

        const isFutureDay = s.dateStr > todayStr;
        if (s.leave.onLeave) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          cell.font = { color: { argb: 'FF991B1B' }, bold: true };
        } else if (s.isHol) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } };
          cell.font = { color: { argb: 'FF854D0E' }, bold: true };
        } else if (isFutureDay && s.totalActual === 0) {
          // No styling or color coding for future days with no progress
        } else if (s.totalTarget > 0 || s.totalActual > 0) {
          if (s.pct === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFECEC' } };
            cell.font = { color: { argb: 'FFDC2626' } };
          } else if (s.pct < 50) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
            cell.font = { color: { argb: 'FFD97706' } };
          } else if (s.pct < 90) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
            cell.font = { color: { argb: 'FF1A73E8' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
            cell.font = { color: { argb: 'FF059669' }, bold: true };
          }
        }
      });

      // Style summary totals columns
      const totalColIdx = 5 + matrixDays.length;
      [0, 1, 2].forEach(oIdx => {
        const cell = r.getCell(totalColIdx + oIdx);
        cell.alignment = { horizontal: 'center' };
        cell.font = { bold: true };
        cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
      });
    });

    // Tab 2: Detailed Day-by-Day Logs
    const ws2 = wb.addWorksheet("Detailed Activity Logs");
    ws2.views = [{ showGridLines: true }];
    ws2.columns = [
      { width: 12 }, // Date
      { width: 22 }, // Resource Name
      { width: 14 }, // Perimeter
      { width: 12 }, // Task ID
      { width: 18 }, // Function Name
      { width: 18 }, // Task Type
      { width: 12 }, // Target FT
      { width: 12 }, // Actual FT
      { width: 12 }, // Task Status
      { width: 45 }  // Daily Comments/Remarks
    ];

    const hRow2 = ws2.addRow(['Date', 'Resource Name', 'Perimeter', 'Task ID', 'Function Name', 'Task Type', 'Target FT', 'Actual FT', 'Task Status', 'Daily Comments/Remarks']);
    hRow2.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0EA5E9' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    matrixGridData.forEach(rowObj => {
      rowObj.dailyStatsList.forEach(s => {
        if (s.activeTasksDetails.length > 0) {
          s.activeTasksDetails.forEach(task => {
            const r = ws2.addRow([
              s.dateStr,
              rowObj.member.name,
              rowObj.member.perimeter,
              task.taskIds.join(', '),
              task.function,
              task.taskType,
              task.target,
              task.actual,
              task.status,
              task.remark
            ]);
            r.eachCell((cell, colNum) => {
              cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
              cell.alignment = { vertical: 'middle', wrapText: true };
              if ([1, 4, 7, 8, 9].includes(colNum)) cell.alignment.horizontal = 'center';
            });
          });
        }
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Team_Daily_Productivity_${format(monthStart, 'yyyy-MM-dd')}_to_${format(monthEnd, 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', position: 'relative' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <div>
          <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity color="var(--primary)" size={28} /> Team Daily Productivity
          </h1>
          <p className="subtitle">Daily performance audit relative to plans (aggregated from DSR and logs).</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
            <input type="checkbox" checked={isCompact} onChange={e => setIsCompact(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--primary)' }} />
            Compact Density
          </label>
          <button 
            className="btn btn-primary"
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--success)', color: 'white', border: '1px solid var(--success)' }}
          >
            <Download size={18} /> Export Report
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: 'var(--space-lg)' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', borderLeft: '4px solid var(--primary)' }}>
           <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Average Team Productivity</span>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '4px' }}>
             <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{summaryMetrics.averageProductivity}%</span>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>over period</span>
           </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', borderLeft: '4px solid var(--success)' }}>
           <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Treated sheets (FTs)</span>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '4px' }}>
             <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{summaryMetrics.grandActual}</span>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {summaryMetrics.grandTarget.toFixed(1).replace('.0', '')} target</span>
           </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', borderLeft: '4px solid var(--info)' }}>
           <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Team Active Utilization</span>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '4px' }}>
             <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info)' }}>{summaryMetrics.activeUtilization}%</span>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>days with progress</span>
           </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', borderLeft: '4px solid var(--purple)' }}>
           <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Roster Size</span>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '4px' }}>
             <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--purple)' }}>{filteredMembers?.length || 0}</span>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active resources</span>
           </div>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 'var(--space-md)', padding: '12px 16px', background: 'white' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '250px' }}>
               <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
               <input 
                  type="text" placeholder="Search Resource..." 
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

      {/* MATRIX TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginBottom: 'var(--space-lg)' }}>
        <div className="table-container" style={{ maxHeight: '450px' }}>
          <table className={isCompact ? 'table-compact' : ''} style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 'max-content', fontSize: '0.75rem', width: '100%' }}>
            
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <tr>
                <th className="col-fixed" style={{ left: 0, width: '40px', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', padding: '12px 8px', textAlign: 'center', zIndex: 12 }}>S.No</th>
                <th className="col-fixed" style={{ left: '40px', width: '180px', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', padding: '12px 16px', textAlign: 'left', zIndex: 12 }}>Resource Name</th>
                <th className="col-fixed" style={{ left: '220px', width: '110px', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', padding: '12px', textAlign: 'left', zIndex: 12 }}>Location</th>
                <th className="col-fixed freeze-shadow" style={{ left: '330px', width: '100px', borderBottom: '2px solid var(--border)', borderRight: '2px solid var(--border)', padding: '12px', textAlign: 'left', zIndex: 12 }}>Perimeter</th>
                
                {matrixDays.map(d => {
                   const isToday = isSameDay(d, new Date());
                   const isWknd = isWeekend(d);
                   const globalHol = showHolidays && holidays?.find(h => h.date === d && h.scope === 'ALL');
                   const bgCol = (isWknd || globalHol) ? '#f1f5f9' : (isToday ? '#e0f2fe' : 'var(--bg)');
                   
                   return (
                     <th key={`day-${format(d, 'd')}`} style={{ textAlign: 'center', padding: '6px 4px', borderBottom: isToday ? '2px solid var(--primary)' : '2px solid var(--border)', borderRight: '1px solid var(--border)', minWidth: '50px', background: bgCol }}>
                       <div style={{ fontSize: '0.65rem', color: isToday ? 'var(--primary)' : 'var(--text-muted)', textTransform: 'uppercase' }}>{format(d, 'E')}</div>
                       <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isToday ? 'var(--primary)' : 'inherit' }}>{format(d, 'd')}</div>
                     </th>
                   );
                })}

                <th style={{ width: '80px', borderBottom: '2px solid var(--border)', borderLeft: '2px solid var(--border)', padding: '12px', textAlign: 'center' }}>Target</th>
                <th style={{ width: '80px', borderBottom: '2px solid var(--border)', borderLeft: '1px solid var(--border)', padding: '12px', textAlign: 'center' }}>Actual</th>
                <th style={{ width: '90px', borderBottom: '2px solid var(--border)', borderLeft: '1px solid var(--border)', padding: '12px', textAlign: 'center' }}>Avg Prod</th>
              </tr>
            </thead>
            
            <tbody>
              {matrixGridData.map((row, idx) => {
                 return (
                   <tr key={row.member.sno || row.member.name}>
                     <td className="col-fixed" style={{ left: 0, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 4px', textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                     <td className="col-fixed" style={{ left: '40px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.member.name}</span>
                     </td>
                     <td className="col-fixed" style={{ left: '220px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.member.location}</td>
                     <td className="col-fixed freeze-shadow" style={{ left: '330px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.member.perimeter}</td>
                     
                     {row.dailyStatsList.map(stats => {
                        const cellSt = getCellStyles(stats);
                        
                        // Tooltip Text Assembly (explanations of low/zero productivity)
                        let tooltipText = `${format(parseISO(stats.dateStr), 'dd-MMM-yyyy')} • ${row.member.name}`;
                        if (stats.leave.onLeave) {
                          tooltipText += `\nStatus: On Leave (${stats.leave.type})`;
                        } else if (stats.isHol) {
                          tooltipText += `\nStatus: Public Holiday (${stats.holidayName})`;
                        } else if (stats.isWknd && !showWeekends) {
                          tooltipText += `\nStatus: Weekend`;
                        } else if (stats.totalTarget === 0 && stats.totalActual === 0) {
                          tooltipText += `\nStatus: No Scheduled Tasks`;
                        } else {
                          tooltipText += `\nOutput: ${stats.totalActual} / ${stats.totalTarget.toFixed(1).replace('.0', '')} FT (${stats.pct}%)`;
                          if (stats.pct < 100) {
                            tooltipText += `\n⚠️ Low/partial productivity detected. Details:`;
                          }
                          stats.activeTasksDetails.forEach(task => {
                            tooltipText += `\n- Task ${task.taskIds.join(', ')}: ${task.actual} actual FT vs ${task.target.toFixed(1).replace('.0', '')} planned.`;
                            if (task.remark) {
                              tooltipText += ` Comments: "${task.remark}"`;
                            }
                          });
                        }

                        return (
                          <td 
                             key={stats.dateStr}
                             title={tooltipText}
                             onClick={() => setSelectedCell({ member: row.member, date: parseISO(stats.dateStr), stats })}
                             style={{
                                padding: '4px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', 
                                textAlign: 'center', cursor: 'pointer', position: 'relative'
                             }}
                          >
                             <div 
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  minHeight: '30px',
                                  background: cellSt.bg,
                                  color: cellSt.color,
                                  borderRadius: 'var(--radius-sm)',
                                  border: cellSt.border,
                                  fontWeight: cellSt.fontWeight || 'normal',
                                  fontSize: '0.75rem',
                                  opacity: cellSt.opacity !== undefined ? cellSt.opacity : 1,
                                  transition: 'all 0.15s ease'
                                }}
                                className="attendance-pill"
                             >
                                {cellSt.text}
                             </div>
                          </td>
                        )
                     })}

                     <td style={{ borderLeft: '2px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>{row.totalPeriodTarget.toFixed(0)}</td>
                     <td style={{ borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{row.totalPeriodActual}</td>
                     <td style={{ borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '12px', textAlign: 'center', fontWeight: 700, color: row.periodPct >= 90 ? 'var(--success)' : (row.periodPct < 50 ? 'var(--danger)' : 'var(--warning)'), fontSize: '0.9rem' }}>{row.periodPct}%</td>
                   </tr>
                 );
              })}
              {matrixGridData.length === 0 && (
                <tr>
                  <td colSpan={matrixDays.length + 7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No members match the active filters.</td>
                </tr>
              )}
            </tbody>
            
          </table>
        </div>
      </div>

      {/* LEGEND BOTTOM BAR */}
      <div style={{ display: 'flex', gap: '20px', padding: '12px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-lg)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}><div style={{ width: '24px', height: '24px', background: 'var(--success-bg)', border: '1px solid #bbf7d0', borderRadius: '4px' }}></div> High Prod (≥90%)</div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}><div style={{ width: '24px', height: '24px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '4px' }}></div> Normal Prod (50-89%)</div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}><div style={{ width: '24px', height: '24px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '4px' }}></div> Low Prod (1-49%)</div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}><div style={{ width: '24px', height: '24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px' }}></div> Zero Prod (0%)</div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}><div style={{ width: '24px', height: '24px', background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', fontSize: '9px', fontWeight: 'bold' }}>L</div> Leave (Sick/Casual)</div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}><div style={{ width: '24px', height: '24px', background: '#fef08a', border: '1px solid #fde047', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#854d0e', fontSize: '9px', fontWeight: 'bold' }}>H</div> Public Holiday</div>
      </div>

      {/* CHARTS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: 'var(--space-lg)' }}>
        
        {/* Stacked Daily Team Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="var(--primary)" /> Daily Team Output (Treated FTs)
          </h3>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamDailyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dateStr" fontSize={11} />
                <YAxis fontSize={11} label={{ value: 'Treated FTs', angle: -90, position: 'insideLeft' }} />
                <ChartTooltip />
                <Legend />
                {filteredMembers?.map((m, idx) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];
                  return (
                    <Bar 
                      key={m.name} 
                      dataKey={m.name} 
                      stackId="a" 
                      fill={colors[idx % colors.length]} 
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Individual Trend Selector & Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--primary)" /> Individual Trend Timeline
            </h3>
            <select 
              value={selectedTrendUser} 
              onChange={e => setSelectedTrendUser(e.target.value)} 
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontWeight: 500, outline: 'none' }}
            >
              {filteredMembers?.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minHeight: '300px' }}>
            {individualTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={individualTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={10} />
                  <YAxis fontSize={10} />
                  <ChartTooltip />
                  <Legend iconSize={10} />
                  <Line type="monotone" dataKey="Target" stroke="#64748b" strokeWidth={2} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Actual" stroke="var(--primary)" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>No trend data available</div>
            )}
          </div>
        </div>

      </div>

      {/* Focus Split by Function Card */}
      <div className="card" style={{ padding: '20px', marginBottom: 'var(--space-lg)' }}>
         <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600, color: '#334155' }}>Top Functions by FT Volume</h3>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
           {functionDistributionData.map((fn, idx) => {
             const maxVal = Math.max(...functionDistributionData.map(f => f.value)) || 1;
             const percentage = (fn.value / maxVal) * 100;
             return (
               <div key={fn.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fn.name}>{idx+1}. {fn.name}</span>
                   <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>{fn.value} FTs</span>
                 </div>
                 <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                   <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--info), var(--primary))', borderRadius: '4px' }} />
                 </div>
               </div>
             );
           })}
           {functionDistributionData.length === 0 && (
             <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No activity logs found.</div>
           )}
         </div>
      </div>

      {/* SIDE DRAWER DETAILS PANEL FOR CLICKED CELL */}
      {selectedCell && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }}
            onClick={() => setSelectedCell(null)}
          />
          <div className="glass" style={{ position: 'fixed', top: 0, right: 0, width: '460px', height: '100%', zIndex: 50, boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)' }}>
            
            {/* Header */}
            <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)' }} />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Daily Breakdown</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{format(selectedCell.date, 'eeee, dd MMMM yyyy')}</p>
                </div>
              </div>
              <button className="btn-icon-sm" onClick={() => setSelectedCell(null)}><X size={20} /></button>
            </div>

            {/* Content Body */}
            <div style={{ padding: 'var(--space-lg)', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Member metadata card */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESOURCE</p>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{selectedCell.member.name}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Location: {selectedCell.member.location} | Perimeter: {selectedCell.member.perimeter}</p>
              </div>

              {/* Status Indicator */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="card" style={{ flex: 1, padding: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTUAL SHEET/FT</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{selectedCell.stats.totalActual}</p>
                </div>
                <div className="card" style={{ flex: 1, padding: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>PLANNED TARGET</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 800 }}>{selectedCell.stats.totalTarget.toFixed(1).replace('.0', '')}</p>
                </div>
                <div className="card" style={{ flex: 1, padding: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>PRODUCTIVITY</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: selectedCell.stats.pct >= 90 ? 'var(--success)' : (selectedCell.stats.pct < 50 ? 'var(--danger)' : 'var(--warning)') }}>
                    {selectedCell.stats.pct !== null ? `${selectedCell.stats.pct}%` : '--'}
                  </p>
                </div>
              </div>

              {/* Leave or Holiday Info */}
              {selectedCell.stats.leave.onLeave && (
                <div style={{ background: 'var(--danger-bg)', padding: '12px', borderRadius: '8px', border: '1px solid #fca5a5', color: 'var(--danger)' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>Status: On Leave</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem' }}>This employee is marked as **{selectedCell.stats.leave.type}** on this date. Target plans have been adjusted to 0.</p>
                </div>
              )}

              {selectedCell.stats.isHol && (
                <div style={{ background: '#fef08a', padding: '12px', borderRadius: '8px', border: '1px solid #fde047', color: '#854d0e' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>Status: Public Holiday</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem' }}>Public holiday **{selectedCell.stats.holidayName}** observed at this location. Target plans adjusted to 0.</p>
                </div>
              )}

              {/* Tasks List */}
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>TASK BREAKDOWN</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedCell.stats.activeTasksDetails.map(t => (
                    <div key={t.sno} className="card" style={{ padding: '12px', borderLeft: '3px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>{t.taskIds.join(', ')}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '8px' }}>({t.function} • {t.taskType})</span>
                        </div>
                        <span className={`badge badge-${t.status === 'Blocked' ? 'danger' : 'info'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>{t.status}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginTop: '2px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Progress on day:</span>
                        <span style={{ fontWeight: 600 }}>Treated {t.actual} FT vs Target {t.target.toFixed(1).replace('.0', '')} FT</span>
                      </div>

                      {/* Comment section */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>REMARKS/COMMENTS:</span>
                        <span style={{ fontSize: '0.75rem', fontStyle: t.remark ? 'normal' : 'italic', color: t.remark ? 'var(--text)' : 'var(--text-muted)', marginTop: '2px', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>
                          {t.remark || 'No specific task remarks entered for this date.'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {selectedCell.stats.activeTasksDetails.length === 0 && !selectedCell.stats.leave.onLeave && !selectedCell.stats.isHol && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                      No tasks were active or assigned for this working date.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: '#f8fafc', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedCell(null)}>Close panel</button>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
