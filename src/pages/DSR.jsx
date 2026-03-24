import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Sparkles } from 'lucide-react';
import { improveComment } from '../utils/mockAI';

const DSR = () => {
  const { updateTask, teamModes, getDSRTasks } = useStore();
  const dsrTasks = getDSRTasks();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveTypes, setLeaveTypes] = useState({});

  const [isEditMode, setIsEditMode] = useState(false);
  const [localEdits, setLocalEdits] = useState({});
  const [isImprovingRemark, setIsImprovingRemark] = useState(null);

  const handleImproveDailyRemark = async (t_sno, o_id, currentText) => {
    const key = `${t_sno}-${o_id}`;
    setIsImprovingRemark(key);
    const newText = await improveComment(currentText || '');
    handleLocalUpdate(t_sno, o_id, 'dailyRemark', newText);
    setIsImprovingRemark(null);
  };

  useEffect(() => {
    setLocalEdits({});
    setIsEditMode(false);
  }, [selectedDate]);

  const handleUpdate = (task_id, field, value) => {
    updateTask(task_id, { [field]: value });
  };

  const handleLocalUpdate = (task_id, owner_id, field, value) => {
    const key = `${task_id}-${owner_id}`;
    setLocalEdits(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value
      }
    }));
  };

  const currentLocalVal = (t, o, field) => {
    const key = `${t.sno}-${o.id}`;

    if (localEdits[key] && localEdits[key][field] !== undefined) {
      if (field === 'todayFT' || field === 'completedFT') {
        if (localEdits[key][field] === '') return '';
      }
      return localEdits[key][field];
    }

    if (field === 'completedFT') {
      const baseCompleted = o.completedFT !== undefined ? o.completedFT : 0;
      if (localEdits[key] && localEdits[key]['todayFT'] !== undefined) {
        const oldTodayRaw = (o.todayFTs && o.todayFTs[selectedDate]);
        const oldTodayVal = (oldTodayRaw === undefined || oldTodayRaw === '') ? 0 : parseInt(oldTodayRaw, 10);
        const newTodayRaw = localEdits[key]['todayFT'];
        const newTodayVal = newTodayRaw === '' ? 0 : parseInt(newTodayRaw, 10);
        const delta = newTodayVal - oldTodayVal;
        return baseCompleted + delta;
      }
      return baseCompleted;
    }

    // Fallback to saved DB state
    if (field === 'todayFT') return (o.todayFTs && o.todayFTs[selectedDate]) !== undefined ? o.todayFTs[selectedDate] : '';
    if (field === 'dailyRemark') return (o.dailyRemarks && o.dailyRemarks[selectedDate]) !== undefined ? o.dailyRemarks[selectedDate] : '';
    if (field === 'status') return o.status || 'Yet To Start';
    return '';
  };

  const handleSave = () => {
    if (Object.keys(localEdits).length === 0) {
      setIsEditMode(false);
      return;
    }

    const tasksToUpdate = {};
    Object.keys(localEdits).forEach(key => {
      const [t_sno_str, o_id] = key.split('-');
      const t_sno = Number(t_sno_str);
      if (!tasksToUpdate[t_sno]) tasksToUpdate[t_sno] = [];
      tasksToUpdate[t_sno].push({ ownerId: o_id, edits: localEdits[key] });
    });

    Object.keys(tasksToUpdate).forEach(t_sno_str => {
      const t_sno = Number(t_sno_str);
      const taskObj = dsrTasks.find(t => t.sno === t_sno);
      if (!taskObj) return;

      let newOwners = [...taskObj.owners];
      tasksToUpdate[t_sno].forEach(updateReq => {
        newOwners = newOwners.map(o => {
          if (o.id !== updateReq.ownerId) return o;

          let updateTarget = { ...o };
          const e = updateReq.edits;

          if (e.completedFT !== undefined) {
            const num = parseInt(e.completedFT, 10);
            updateTarget.completedFT = isNaN(num) ? 0 : num;
          } else if (e.todayFT !== undefined) {
            const baseCompleted = o.completedFT || 0;
            const oldTodayRaw = (o.todayFTs && o.todayFTs[selectedDate]);
            const oldTodayVal = (oldTodayRaw === undefined || oldTodayRaw === '') ? 0 : parseInt(oldTodayRaw, 10);
            const newTodayRaw = e.todayFT;
            const newTodayVal = newTodayRaw === '' ? 0 : parseInt(newTodayRaw, 10);
            const delta = newTodayVal - oldTodayVal;
            updateTarget.completedFT = baseCompleted + delta;
          }

          if (e.todayFT !== undefined) {
            const num = parseInt(e.todayFT, 10);
            updateTarget.todayFTs = { ...(updateTarget.todayFTs || {}), [selectedDate]: isNaN(num) ? '' : num };
          }
          if (e.dailyRemark !== undefined) {
            updateTarget.dailyRemarks = { ...(updateTarget.dailyRemarks || {}), [selectedDate]: e.dailyRemark };
          }
          if (e.status !== undefined) {
            updateTarget.status = e.status;
          }
          return updateTarget;
        });
      });

      updateTask(t_sno, { owners: newOwners });
    });

    setLocalEdits({});
    setIsEditMode(false);
    alert(`Success: DSR Data safely committed to the database!`);
  };

  const handleRestore = () => {
    if (Object.keys(localEdits).length > 0) {
      if (window.confirm("Are you sure you want to discard your unsaved changes and restore from the database?")) {
        setLocalEdits({});
        setIsEditMode(false);
      }
    } else {
      setIsEditMode(false);
    }
  };

  const getStatusBg = (status) => {
    if (status === 'In Progress') return '#ffff00';
    if (status === 'QG' || status === 'FR' || status === 'Delivered') return '#4ade80';
    if (status === 'Blocked') return '#fca5a5';
    if (status === 'Stand-by') return '#fbbf24';
    return 'transparent';
  };

  const handleCopyEmail = async () => {
    if (isEditMode) {
      alert("Please Save or Discard your edits before exporting the Email MOM.");
      return;
    }

    let html = `
      <div style="font-family: Calibri, Arial, sans-serif; font-size: 14px; color: black;">
        <p>Hello Team,</p>
        <p>Please Find Today's DSM-MOM</p>
        <p><b>IN PROGRESS ACTIVITY</b></p>
        <hr style="border: 0; border-top: 1px solid #ccc; margin-bottom: 20px;" />
        <p style="text-align: center; font-weight: bold; font-family: Calibri, Arial, sans-serif;">
          Please find the DSM MOM for ${selectedDate.split('-').reverse().join('-')}
        </p>

        <table style="border-collapse: collapse; width: 100%; border: 1px solid black; font-family: Calibri, Arial, sans-serif; font-size: 13px;">
          <thead>
            <tr>
              <th style="border: 1px solid black; background: #93c5fd; padding: 6px;">S.no</th>
              <th style="border: 1px solid black; background: #93c5fd; padding: 6px;">Task ID</th>
              <th style="border: 1px solid black; background: #93c5fd; padding: 6px;">Function Name</th>
              <th style="border: 1px solid black; background: #93c5fd; padding: 6px;">Task Type</th>
              <th style="border: 1px solid black; background: #93c5fd; padding: 6px;">Collab Responsible</th>
              <th style="border: 1px solid black; background: #93c5fd; padding: 6px;">Total No of FT's</th>
              <th style="border: 1px solid black; background: #93c5fd; padding: 6px;">No of FT's Completed</th>
              <th style="border: 1px solid black; background: #93c5fd; padding: 6px;">Today FT's Count</th>
              <th style="border: 1px solid black; background: #93c5fd; padding: 6px;">Task Status</th>
              <th style="border: 1px solid black; background: #93c5fd; padding: 6px;">Start Date</th>
              <th style="border: 1px solid black; background: #93c5fd; padding: 6px;">Delivery Date</th>
              <th style="border: 1px solid black; background: #93c5fd; padding: 6px;">Remarks/Comments</th>
            </tr>
          </thead>
          <tbody>
    `;

    let emailSerial = 1;

    dsrTasks.forEach(t => {
      const ownersCount = t.owners?.length || 1;

      if (!t.owners || t.owners.length === 0) {
        html += `<tr>
               <td style="border: 1px solid black; padding: 6px; text-align: center;">${emailSerial++}</td>
               <td style="border: 1px solid black; padding: 6px; text-align: center;">${(t.taskIds || []).join('<br/>')}</td>
               <td style="border: 1px solid black; padding: 6px;">${t.function || '--'}</td>
               <td style="border: 1px solid black; padding: 6px; text-align: center;">${t.taskType || '--'}</td>
               <td style="border: 1px solid black; padding: 6px; color: red;">Unassigned</td>
               <td style="border: 1px solid black; padding: 6px; text-align: center;">${t.totalFT || 0}</td>
               <td style="border: 1px solid black; padding: 6px; text-align: center;">${t.completedFT || 0}</td>
               <td style="border: 1px solid black; padding: 6px; text-align: center;">--</td>
               <td style="border: 1px solid black; padding: 6px; text-align: center; background: ${getStatusBg(t.status)};">${t.status}</td>
               <td style="border: 1px solid black; padding: 6px; text-align: center;">${t.startDate ? t.startDate.split('-').reverse().join('-') : 'TBD'}</td>
               <td style="border: 1px solid black; padding: 6px; text-align: center;">${t.endDate ? t.endDate.split('-').reverse().join('-') : 'TBD'}</td>
               <td style="border: 1px solid black; padding: 6px;">${t.remarks || ''}</td>
             </tr>`;
        return;
      }

      const sNoValue = emailSerial++;

      t.owners.forEach((o, oIndex) => {
        const isFirst = oIndex === 0;
        const todayVal = currentLocalVal(t, o, 'todayFT');
        const compVal = currentLocalVal(t, o, 'completedFT');
        const statVal = currentLocalVal(t, o, 'status');
        const dailyRemark = currentLocalVal(t, o, 'dailyRemark');

        html += `<tr>`;

        if (isFirst) {
          html += `
               <td rowspan="${ownersCount}" style="border: 1px solid black; padding: 6px; text-align: center; vertical-align: middle;">${sNoValue}</td>
               <td rowspan="${ownersCount}" style="border: 1px solid black; padding: 6px; text-align: center; vertical-align: middle;">${(t.taskIds || []).join('<br/>')}</td>
               <td rowspan="${ownersCount}" style="border: 1px solid black; padding: 6px; vertical-align: middle;">${t.function || '--'}</td>
               <td rowspan="${ownersCount}" style="border: 1px solid black; padding: 6px; text-align: center; vertical-align: middle;">${t.taskType || '--'}</td>
             `;
        }

        html += `<td style="border: 1px solid black; padding: 6px;">${o.name}</td>`;

        if (isFirst) {
          html += `<td rowspan="${ownersCount}" style="border: 1px solid black; padding: 6px; text-align: center; vertical-align: middle;">${t.totalFT || 0}</td>`;
        }

        html += `
             <td style="border: 1px solid black; padding: 6px; text-align: center; background: #e6ffed;">${compVal}</td>
             <td style="border: 1px solid black; padding: 6px; text-align: center; background: #e6f7ff;">${todayVal}</td>
          `;

        if (isFirst) {
          html += `<td rowspan="${ownersCount}" style="border: 1px solid black; padding: 6px; text-align: center; vertical-align: middle; background: ${getStatusBg(t.status)}; font-weight: bold;">${t.status}</td>`;
        }

        html += `
             <td style="border: 1px solid black; padding: 6px; text-align: center;">${o.startDate ? o.startDate.split('-').reverse().join('-') : 'TBD'}</td>
             <td style="border: 1px solid black; padding: 6px; text-align: center;">${o.endDate ? o.endDate.split('-').reverse().join('-') : 'TBD'}</td>
             <td style="border: 1px solid black; padding: 6px;">${dailyRemark}</td>
          </tr>`;
      });
    });

    html += `
          </tbody>
        </table>
        <br/>
    `;

    const WFH_DOM = wfhList.map(m => `<tr><td style="border: 1px solid black; padding: 6px; text-align: center;">${m.name}</td></tr>`).join('') || `<tr><td style="border: 1px solid black; padding: 6px; height: 24px;"></td></tr>`;
    const LEAVE_DOM = totalLeaveList.map(m => {
      const lType = leaveTypes[`${selectedDate}-${m.name}`] || '';
      return `<tr><td style="border: 1px solid black; padding: 6px; text-align: center;">${m.name}</td><td style="border: 1px solid black; padding: 6px; text-align: center; background: #0ea5e9; color: black;">${lType}</td></tr>`;
    }).join('') || `<tr><td style="border: 1px solid black; padding: 6px; height: 24px;"></td><td style="border: 1px solid black; padding: 6px; background: #0ea5e9;"></td></tr>`;

    html += `
      <div style="width: 800px; display: table;">
        <div style="display: table-cell; width: 300px; padding-right: 40px;">
          <table style="border-collapse: collapse; width: 100%; border: 1px solid black; font-family: Calibri, Arial, sans-serif; font-size: 13px;">
            <thead>
              <tr><th style="border: 1px solid black; padding: 6px; background: white; text-align: center; font-weight: bold;">Work from Home:</th></tr>
              <tr><th style="border: 1px solid black; padding: 6px; background: #93c5fd; text-align: center; font-weight: bold;">Name</th></tr>
            </thead>
            <tbody>${WFH_DOM}</tbody>
          </table>
        </div>
        <div style="display: table-cell; width: 500px;">
          <table style="border-collapse: collapse; width: 100%; border: 1px solid black; font-family: Calibri, Arial, sans-serif; font-size: 13px;">
            <thead>
              <tr><th colspan="2" style="border: 1px solid black; padding: 6px; background: white; text-align: center; font-weight: bold;">Leave plans:</th></tr>
              <tr>
                <th style="border: 1px solid black; padding: 6px; background: #93c5fd; text-align: center; width: 50%; font-weight: bold;">Name</th>
                <th style="border: 1px solid black; padding: 6px; background: #93c5fd; text-align: center; width: 50%; font-weight: bold;">Leave Type</th>
              </tr>
            </thead>
            <tbody>${LEAVE_DOM}</tbody>
          </table>
        </div>
      </div>
    </div>`;

    try {
      const type = 'text/html';
      const blob = new Blob([html], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
      alert('Email MOM successfully formatted and copied to your clipboard!\\n\\Open Outlook and press Ctrl+V to paste the styled table exactly as requested!');
    } catch (err) {
      console.error('Failed to copy html: ', err);
      alert('Clipboard Access Denied. Make sure you are accessing the site over localhost or HTTPS.');
    }
  };

  const cellStyle = {
    border: '1px solid black',
    padding: '6px',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontSize: '0.8rem',
    background: 'white',
    color: 'black'
  };

  const headerStyle = {
    ...cellStyle,
    background: '#93c5fd',
    fontWeight: 'bold'
  };

  const teamMembers = useStore(state => state.teamMembers) || [];
  const activeNames = teamMembers.map(m => m.name);

  const wfhList = teamModes.filter(m => m.mode === 'WFH' && m.date === selectedDate && activeNames.includes(m.name));
  const leaveList = teamModes.filter(m => m.mode === 'LEAVE' && m.date === selectedDate && activeNames.includes(m.name));
  const hdList = teamModes.filter(m => m.mode === 'HALF_DAY' && m.date === selectedDate && activeNames.includes(m.name));
  const totalLeaveList = [...leaveList, ...hdList];

  let serial = 1;

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            Daily Status Report
            {isEditMode && <span className="badge badge-warning" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>EDIT MODE ACTIVE</span>}
          </h1>
          <p className="subtitle" style={{ marginBottom: '12px' }}>Export or email the current DSR sheet.</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: 'fit-content' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Select DSR Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (Object.keys(localEdits).length > 0) {
                  if (!window.confirm("You have unsaved changes. Discard and switch dates?")) return;
                }
                setSelectedDate(e.target.value);
              }}
              style={{ border: 'none', outline: 'none', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
              disabled={isEditMode}
            />

            <div style={{ borderLeft: '1px solid #ccc', height: '24px', margin: '0 8px' }}></div>

            {!isEditMode ? (
              <button className="btn btn-secondary" onClick={() => setIsEditMode(true)} style={{ border: '1px solid currentColor' }}>Edit Data</button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={handleSave} style={{ background: '#16a34a', borderColor: '#16a34a', color: 'white' }}>Store Saved Data</button>
                <button className="btn btn-secondary" onClick={handleRestore} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Restore Data</button>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary">Export Excel</button>
          <button className="btn btn-primary" onClick={handleCopyEmail}>Copy DSM-MOM to Outlook</button>
        </div>
      </div>



      {/* DSR TABLE (EXCEL LAYOUT) */}
      <div style={{ textAlign: 'center', padding: '12px 0', fontSize: '1.1rem', fontWeight: 'bold' }}>
        Please find the DSM MOM for {selectedDate.split('-').reverse().join('-')}
      </div>
      <div style={{ width: '100%', overflowX: 'auto', background: 'white', border: '2px solid black' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1300px' }}>
          <thead>
            <tr>
              <th style={{ ...headerStyle, width: '40px' }}>S.no</th>
              <th style={{ ...headerStyle, width: '80px' }}>Task ID</th>
              <th style={{ ...headerStyle, width: '120px' }}>Function Name</th>
              <th style={{ ...headerStyle, width: '150px' }}>Task Type</th>
              <th style={{ ...headerStyle, width: '180px' }}>Collab Responsible</th>
              <th style={{ ...headerStyle, width: '80px' }}>Total No of FT's</th>
              <th style={{ ...headerStyle, width: '80px', color: '#166534', background: '#bbf7d0' }}>No of FT's Completed</th>
              <th style={{ ...headerStyle, width: '80px', color: '#075985', background: '#bae6fd' }}>Today FT's Count</th>
              <th style={{ ...headerStyle, width: '120px' }}>Task Status</th>
              <th style={{ ...headerStyle, width: '100px' }}>Start Date</th>
              <th style={{ ...headerStyle, width: '100px' }}>Delivery Date</th>
              <th style={{ ...headerStyle, width: '350px' }}>Remarks/Comments</th>
            </tr>
          </thead>
          <tbody>
            {dsrTasks.length === 0 ? (
              <tr>
                <td colSpan="12" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No tasks selected for DSR. Go to the Task Info tab and check the 'DSR' box on a task.
                </td>
              </tr>
            ) : (
              dsrTasks.flatMap((t) => {
                const sNoValue = serial++;

                // Empty / Unassigned task
                if (!t.owners || t.owners.length === 0) {
                  return (
                    <tr key={`t-${t.sno}-no-owner`}>
                      <td style={{ ...cellStyle }}>{sNoValue}</td>
                      <td style={{ ...cellStyle }}>
                        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: '1.2' }}>{t.taskIds?.join('\n')}</div>
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'left', paddingLeft: '8px' }}>{t.function || '--'}</td>
                      <td style={{ ...cellStyle }}>{t.taskType || '--'}</td>

                      <td style={{ ...cellStyle, textAlign: 'left', paddingLeft: '8px', color: 'var(--danger)', fontWeight: 600 }}>Unassigned</td>

                      <td style={{ ...cellStyle, fontWeight: 'bold' }}>{t.totalFT || 0}</td>
                      <td style={{ ...cellStyle }}>{t.completedFT || 0}</td>
                      <td style={{ ...cellStyle }}>--</td>

                      <td style={{ ...cellStyle, background: getStatusBg(t.status), fontWeight: 'bold' }}>
                        <select
                          value={t.status}
                          onChange={(e) => isEditMode && handleUpdate(t.sno, 'status', e.target.value)}
                          style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', textAlign: 'center', fontWeight: 'inherit', color: 'inherit', appearance: 'none', cursor: isEditMode ? 'pointer' : 'default' }}
                          disabled={!isEditMode}
                        >
                          <option>In Progress</option>
                          <option>Yet To Start</option>
                          <option>Training</option>
                          <option>Stand-by</option>
                          <option>FR</option>
                          <option>QG</option>
                          <option>Blocked</option>
                          <option>Delivered</option>
                          <option>Initial</option>
                        </select>
                      </td>

                      <td style={{ ...cellStyle }}>{t.startDate ? t.startDate.split('-').reverse().join('-') : 'TBD'}</td>
                      <td style={{ ...cellStyle }}>{t.endDate ? t.endDate.split('-').reverse().join('-') : 'TBD'}</td>
                      <td style={{ ...cellStyle, padding: 0 }}>
                        <textarea
                          value={t.remarks}
                          onChange={(e) => handleUpdate(t.sno, 'remarks', e.target.value)}
                          placeholder="General Task Remarks..."
                          style={{ width: '100%', height: '100%', minHeight: '35px', border: 'none', padding: '4px', resize: 'vertical', background: 'transparent', outline: 'none', fontSize: '0.75rem', fontFamily: 'inherit' }}
                          disabled={!isEditMode}
                        />
                      </td>
                    </tr>
                  );
                }

                const ownersCount = t.owners.length;

                return t.owners.map((o, oIndex) => {
                  const isFirst = oIndex === 0;
                  const todayVal = currentLocalVal(t, o, 'todayFT');
                  const compVal = currentLocalVal(t, o, 'completedFT');
                  const statVal = currentLocalVal(t, o, 'status');
                  const dailyRemark = currentLocalVal(t, o, 'dailyRemark');

                  return (
                    <tr key={`t-${t.sno}-o-${o.id}`}>

                      {/* --- MERGED TASK-LEVEL COLUMNS --- */}
                      {isFirst && (
                        <>
                          <td rowSpan={ownersCount} style={{ ...cellStyle }}>{sNoValue}</td>
                          <td rowSpan={ownersCount} style={{ ...cellStyle }}>
                            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: '1.2' }}>{t.taskIds?.join('\n')}</div>
                          </td>
                          <td rowSpan={ownersCount} style={{ ...cellStyle, textAlign: 'left', paddingLeft: '8px' }}>{t.function || '--'}</td>
                          <td rowSpan={ownersCount} style={{ ...cellStyle }}>{t.taskType || '--'}</td>
                        </>
                      )}

                      {/* --- INDIVIDUAL OWNER COLUMNS --- */}
                      <td style={{ ...cellStyle, textAlign: 'left', paddingLeft: '8px', fontWeight: 600 }}>
                        {o.name}
                      </td>

                      {/* --- MERGED TOTAL FT COLUMN --- */}
                      {isFirst && (
                        <td rowSpan={ownersCount} style={{ ...cellStyle, fontWeight: 'bold' }}>{t.totalFT || 0}</td>
                      )}

                      {/* --- INDIVIDUAL OWNER METRIC COLUMNS --- */}
                      <td style={{ ...cellStyle, padding: 0, background: '#f0fdf4' }}>
                        {isEditMode ? (
                          <input
                            type="number"
                            value={compVal}
                            onChange={(e) => handleLocalUpdate(t.sno, o.id, 'completedFT', e.target.value)}
                            style={{ width: '100%', height: '100%', minHeight: '35px', border: 'none', textAlign: 'center', background: 'transparent', outline: 'none', fontWeight: 600, color: '#166534' }}
                          />
                        ) : (
                          <div style={{ width: '100%', minHeight: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#166534' }}>{compVal || 0}</div>
                        )}
                      </td>
                      <td style={{ ...cellStyle, padding: 0, background: '#f0f9ff' }}>
                        {isEditMode ? (
                          <input
                            type="number"
                            value={todayVal}
                            onChange={(e) => handleLocalUpdate(t.sno, o.id, 'todayFT', e.target.value)}
                            style={{ width: '100%', height: '100%', minHeight: '35px', border: 'none', textAlign: 'center', background: 'transparent', outline: 'none', fontWeight: 600, color: '#075985' }}
                          />
                        ) : (
                          <div style={{ width: '100%', minHeight: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#075985' }}>{todayVal !== '' ? todayVal : '--'}</div>
                        )}
                      </td>

                      {/* --- MERGED TASK STATUS --- */}
                      {isFirst && (
                        <td rowSpan={ownersCount} style={{ ...cellStyle, background: getStatusBg(t.status), fontWeight: 'bold' }}>
                          <select
                            value={t.status}
                            onChange={(e) => isEditMode && handleUpdate(t.sno, 'status', e.target.value)}
                            style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', outline: 'none', textAlign: 'center', fontWeight: 'inherit', color: 'inherit', appearance: 'none', cursor: isEditMode ? 'pointer' : 'default' }}
                            disabled={!isEditMode}
                          >
                            <option>In Progress</option>
                            <option>Yet To Start</option>
                            <option>Training</option>
                            <option>Stand-by</option>
                            <option>FR</option>
                            <option>QG</option>
                            <option>Blocked</option>
                            <option>Delivered</option>
                            <option>Initial</option>
                          </select>
                        </td>
                      )}

                      {/* --- INDIVIDUAL OWNER DATES AND COMMENTS --- */}
                      <td style={{ ...cellStyle }}>{o.startDate ? o.startDate.split('-').reverse().join('-') : 'TBD'}</td>
                      <td style={{ ...cellStyle }}>{o.endDate ? o.endDate.split('-').reverse().join('-') : 'TBD'}</td>
                      <td style={{ ...cellStyle, padding: 0 }}>
                        {isEditMode ? (
                          <div style={{ position: 'relative', height: '100%' }}>
                            <textarea
                              value={dailyRemark}
                              onChange={(e) => handleLocalUpdate(t.sno, o.id, 'dailyRemark', e.target.value)}
                              placeholder={`Add comment for ${o.name}...`}
                              style={{ width: '100%', height: '100%', minHeight: '35px', border: 'none', padding: '4px', resize: 'vertical', background: 'transparent', outline: 'none', fontSize: '0.75rem', fontFamily: 'inherit', paddingRight: '28px' }}
                            />
                            <button
                               onClick={() => handleImproveDailyRemark(t.sno, o.id, dailyRemark)}
                               disabled={isImprovingRemark === `${t.sno}-${o.id}`}
                               title="AI Improve Comment"
                               style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--purple-bg)', color: 'var(--purple)', border: 'none', borderRadius: '4px', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                               {isImprovingRemark === `${t.sno}-${o.id}` ? <span style={{fontSize:'8px', fontWeight:'bold'}}>...</span> : <Sparkles size={12} />}
                            </button>
                          </div>
                        ) : (
                          <div style={{ width: '100%', minHeight: '35px', padding: '6px', textAlign: 'left', fontSize: '0.75rem' }}>{dailyRemark || '--'}</div>
                        )}
                      </td>
                    </tr>
                  );
                });

              })
            )}
          </tbody>
        </table>
      </div>

      {/* SUMMARY TABLES (EXCEL LAYOUT) - MOVED TO BOTTOM */}
      <div style={{ display: 'flex', gap: '32px', marginTop: 'var(--space-lg)', alignItems: 'flex-start' }}>
        <div>
          <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '300px', border: '2px solid black', background: 'white' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px', borderBottom: '2px solid black', background: 'white', fontWeight: 'bold', textAlign: 'center', color: 'black', fontSize: '1rem' }}>Work from Home:</th>
              </tr>
              <tr>
                <th style={{ padding: '6px', border: '2px solid black', background: '#93c5fd', fontWeight: 'bold', textAlign: 'center', color: 'black', fontSize: '1rem' }}>Name</th>
              </tr>
            </thead>
            <tbody>
              {wfhList.map(m => (
                <tr key={m.name}>
                  <td style={{ padding: '6px 12px', border: '2px solid black', background: 'white', textAlign: 'center' }}>{m.name}</td>
                </tr>
              ))}
              {wfhList.length === 0 && (
                <tr><td style={{ padding: '6px 12px', border: '2px solid black', background: 'white', height: '30px' }}></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '400px', border: '2px solid black', background: 'white' }}>
            <thead>
              <tr>
                <th colSpan="2" style={{ padding: '12px', borderBottom: '1px solid black', background: 'white', fontWeight: 'bold', textAlign: 'center', color: 'black', fontSize: '1rem' }}>Leave plans:</th>
              </tr>
              <tr>
                <th style={{ padding: '6px', border: '2px solid black', background: '#93c5fd', width: '50%', fontWeight: 'bold', textAlign: 'center', color: 'black', fontSize: '1rem' }}>Name</th>
                <th style={{ padding: '6px', border: '2px solid black', background: '#93c5fd', width: '50%', fontWeight: 'bold', textAlign: 'center', color: 'black', fontSize: '1rem' }}>Leave Type</th>
              </tr>
            </thead>
            <tbody>
              {totalLeaveList.map(m => {
                const key = `${selectedDate}-${m.name}`;
                return (
                  <tr key={key}>
                    <td style={{ padding: '6px 12px', border: '1px solid black', background: 'white', textAlign: 'center' }}>{m.name}</td>
                    <td style={{ padding: 0, border: '1px solid black', background: '#0ea5e9' }}>
                      {isEditMode ? (
                        <select
                          value={leaveTypes[key] || ''}
                          onChange={e => setLeaveTypes({ ...leaveTypes, [key]: e.target.value })}
                          style={{ width: '100%', height: '100%', minHeight: '30px', border: 'none', background: 'transparent', outline: 'none', textAlign: 'center', color: 'black', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                          <option value="" disabled>Select Leave Type</option>
                          <option value="Planned leave">Planned leave</option>
                          <option value="Unplanned leave">Unplanned leave</option>
                          <option value="Sick leave">Sick leave</option>
                          <option value="Half day leave">Half day leave</option>
                        </select>
                      ) : (
                        <div style={{ width: '100%', minHeight: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontSize: '0.875rem' }}>
                          {leaveTypes[key] || '--'}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {totalLeaveList.length === 0 && (
                <tr>
                  <td style={{ padding: '6px 12px', border: '1px solid black', background: 'white', height: '30px' }}></td>
                  <td style={{ padding: 0, border: '1px solid black', background: '#0ea5e9' }}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DSR;
