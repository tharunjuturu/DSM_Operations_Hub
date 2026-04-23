import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, getDay, addMonths, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { glLegacyData } from '../data/gl_legacy_data';

export default function PersonalTracker() {
  const navigate = useNavigate();
  const store = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const personalTasks = store.personalTasks || [];
  const personalLogs = store.personalLogs || [];
  const workDays = store.workDays || [];
  const personalNotes = store.personalNotes || [];

  const tabs = [
     { id: 'dashboard', label: 'Dashboard' },
     { id: 'schedule', label: 'Schedule' },
     { id: 'tasks', label: 'Tasks' },
     { id: 'dailyWork', label: 'Daily Work' },
     { id: 'notes', label: 'Notes' },
     { id: 'analytics', label: 'Analytics' },
     { id: 'export', label: 'Export/Backup' },
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
       <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button onClick={() => navigate('/')}>&larr; Back to Portal</button>
          <h2>Personal Tracker</h2>
       </div>

       <div style={{ display: 'flex', borderBottom: '1px solid #ccc', marginBottom: '20px' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} 
              style={{
                padding: '10px 20px', 
                background: activeTab === t.id ? '#eee' : 'transparent',
                border: '1px solid #ccc',
                borderBottom: 'none',
                cursor: 'pointer',
                marginRight: '4px'
              }}>
               {t.label}
            </button>
          ))}
       </div>

       <div>
          {activeTab === 'dashboard' && <TabDashboard tasks={personalTasks} workDays={workDays} logs={personalLogs} />}
          {activeTab === 'schedule' && <TabSchedule workDays={workDays} store={store} />}
          {activeTab === 'tasks' && <TabTasks tasks={personalTasks} store={store} />}
          {activeTab === 'dailyWork' && <TabDailyWork logs={personalLogs} tasks={personalTasks} store={store} />}
          {activeTab === 'notes' && <TabNotes notes={personalNotes} store={store} />}
          {activeTab === 'analytics' && <TabAnalytics tasks={personalTasks} />}
          {activeTab === 'export' && <TabExport store={store} />}
       </div>
    </div>
  );
}

function TabDashboard({ tasks, workDays, logs }) {
  const activeTasks = tasks.filter(t => !['Completed', 'Delivered'].includes(t.status)).length;
  
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDaysInt = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });
  
  const weeklyData = weekDaysInt.map(d => {
     const dateStr = format(d, 'yyyy-MM-dd');
     const wd = workDays.find(w => w.date === dateStr);
     return {
        name: format(d, 'EEE'),
        hours: wd && wd.work_hours ? parseFloat(wd.work_hours) : 0,
     };
  });

  return (
    <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
       <div style={{ display: 'flex', gap: '20px' }}>
          <DashboardCard title="Active Tasks" value={activeTasks} />
          <DashboardCard title="Total Work Days" value={workDays.length} />
          <DashboardCard title="Total Daily Logs" value={logs.length} />
       </div>
       
       <div style={{ display: 'flex', gap: '20px' }}>
         <div style={{ flex: 1, border: '1px solid #ccc', padding: '20px' }}>
            <h3>Calendar Widget</h3>
            <CalendarWidget workDays={workDays} />
         </div>
         <div style={{ flex: 1, border: '1px solid #ccc', padding: '20px' }}>
            <h3>Weekly Hours Breakdown</h3>
            <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                   <XAxis dataKey="name" />
                   <YAxis />
                   <Tooltip />
                   <Bar dataKey="hours" fill="#8884d8" />
                </BarChart>
            </ResponsiveContainer>
            </div>
         </div>
       </div>
    </div>
  );
}

function CalendarWidget({ workDays }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const daysInMonth = eachDayOfInterval({
     start: startOfMonth(currentMonth),
     end: endOfMonth(currentMonth)
  });
  
  const startDay = getDay(startOfMonth(currentMonth));
  const blanks = Array.from({ length: startDay }, (_, i) => i);

  return (
    <div>
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>Previous</button>
          <strong>{format(currentMonth, 'MMMM yyyy')}</strong>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>Next</button>
       </div>
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} style={{ fontWeight: 'bold', padding: '4px' }}>{d}</div>)}
          {blanks.map(b => <div key={`blank-${b}`} />)}
          {daysInMonth.map(d => {
             const dateStr = format(d, 'yyyy-MM-dd');
             const hasWork = workDays.some(w => w.date === dateStr && parseFloat(w.work_hours || 0) > 0);
             return (
               <div key={dateStr} style={{ 
                  border: '1px solid #eee', 
                  padding: '8px', 
                  background: hasWork ? '#a5d6a7' : '#f5f5f5' 
               }}>
                 {format(d, 'd')}
               </div>
             )
          })}
       </div>
    </div>
  )
}

function DashboardCard({ title, value }) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', flex: 1 }}>
       <div style={{ fontSize: '14px', marginBottom: '8px' }}>{title}</div>
       <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{value}</div>
    </div>
  );
}

function TabSchedule({ workDays, store }) {
   const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
   const [mode, setMode] = useState('WFO');
   const [login, setLogin] = useState('');
   const [logout, setLogout] = useState('');
   const [notes, setNotes] = useState('');

   const handleSave = () => {
      let hours = 0;
      if (login && logout) {
         const [h1, m1] = login.split(':').map(Number);
         const [h2, m2] = logout.split(':').map(Number);
         hours = Math.max(0, (h2 + m2/60) - (h1 + m1/60)).toFixed(2);
      }
      store.upsertWorkDay(date, { work_mode: mode, login_time: login, logout_time: logout, work_hours: hours, notes });
      setLogin(''); setLogout(''); setNotes('');
   };

   return (
     <div>
        <div style={{ border: '1px solid #ccc', padding: '16px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
           <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
           <select value={mode} onChange={e=>setMode(e.target.value)}>
              <option value="WFO">WFO</option><option value="WFH">WFH</option><option value="Leave">Leave</option>
           </select>
           <input type="time" value={login} onChange={e=>setLogin(e.target.value)} />
           <input type="time" value={logout} onChange={e=>setLogout(e.target.value)} />
           <input type="text" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes..." />
           <button onClick={handleSave}>Save</button>
        </div>
        
        <Table columns={['Date', 'Mode', 'Login', 'Logout', 'Hours', 'Notes']}>
           {workDays.map(w => (
             <tr key={w.date}>
               <td>{w.date}</td>
               <td>{w.work_mode}</td>
               <td>{w.login_time || '-'}</td>
               <td>{w.logout_time || '-'}</td>
               <td>{w.work_hours || '0.00'}</td>
               <td>{w.notes || '-'}</td>
             </tr>
           ))}
        </Table>
     </div>
   );
}

function TabTasks({ tasks, store }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
       <div style={{ marginBottom: '10px' }}>
          <button onClick={() => setModalOpen(true)}>+ Add Task</button>
       </div>
       
       <Table columns={['Task ID', 'Function Name', 'Type', 'Owner', 'Total Work', 'Completed', 'Status', 'Priority', 'Start Date', 'Del. Date', 'Progress %']}>
          {tasks.map(t => (
            <tr key={t.task_id}>
              <td>{t.task_id}</td>
              <td>{t.function_name}</td>
              <td>{t.task_type || '-'}</td>
              <td>{t.collab_responsible || 'Me'}</td>
              <td>{t.total_work || 0}</td>
              <td>{t.completed_work || 0}</td>
              <td>{t.status || t.task_status_id || '-'}</td>
              <td>{t.priority || 'Medium'}</td>
              <td>{t.start_date || '-'}</td>
              <td>{t.delivery_date || '-'}</td>
              <td>
                 {t.total_work > 0 ? ((t.completed_work / t.total_work) * 100).toFixed(1) : 0}%
              </td>
            </tr>
          ))}
       </Table>

       {modalOpen && <TaskModal store={store} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function TaskModal({ store, onClose }) {
   const [formData, setFormData] = useState({
     task_id: `TASK-${Date.now().toString().slice(-4)}`,
     function_name: '', task_type: 'Development', collab_responsible: 'Me',
     total_work: 0, completed_work: 0, status: 'In Progress', priority: 'Medium',
     start_date: format(new Date(), 'yyyy-MM-dd'), delivery_date: '', remarks: ''
   });

   const save = () => {
     store.addPersonalTask(formData);
     onClose();
   };

   return (
     <div style={{ border: '1px solid #000', padding: '20px', background: '#fff', position: 'absolute', top: '100px', left: '100px', zIndex: 10 }}>
        <h3>Task Dialog</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label>Task ID: <input value={formData.task_id} onChange={e=>setFormData({...formData, task_id: e.target.value})} /></label>
            <label>Function: <input value={formData.function_name} onChange={e=>setFormData({...formData, function_name: e.target.value})} /></label>
            <label>Type: <select value={formData.task_type} onChange={e=>setFormData({...formData, task_type: e.target.value})}><option>Development</option><option>Testing</option></select></label>
            <label>Owner: <input value={formData.collab_responsible} onChange={e=>setFormData({...formData, collab_responsible: e.target.value})} /></label>
            <label>Total Work: <input type="number" value={formData.total_work} onChange={e=>setFormData({...formData, total_work: e.target.value})} /></label>
            <label>Status: <select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}><option>In Progress</option><option>Delivered</option></select></label>
            <label>Priority: <select value={formData.priority} onChange={e=>setFormData({...formData, priority: e.target.value})}><option>Low</option><option>High</option></select></label>
            <label>Start: <input type="date" value={formData.start_date} onChange={e=>setFormData({...formData, start_date: e.target.value})} /></label>
            <label>Delivery: <input type="date" value={formData.delivery_date} onChange={e=>setFormData({...formData, delivery_date: e.target.value})} /></label>
            <label>Remarks: <input value={formData.remarks} onChange={e=>setFormData({...formData, remarks: e.target.value})} /></label>
        </div>
        <div style={{ marginTop: '20px' }}>
          <button onClick={save}>Save</button>
          <button onClick={onClose} style={{ marginLeft: '10px' }}>Cancel</button>
        </div>
     </div>
   );
}

function TabDailyWork({ logs, tasks, store }) {
   const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
   const [taskId, setTaskId] = useState('');
   const [workDone, setWorkDone] = useState('');
   const [timeSpent, setTimeSpent] = useState('');
   const [notes, setNotes] = useState('');

   return (
      <div>
         <div style={{ border: '1px solid #ccc', padding: '16px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
             <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
             <select value={taskId} onChange={e=>setTaskId(e.target.value)}>
               <option value="">Select Task...</option>
               {tasks.map(t => <option key={t.task_id} value={t.task_id}>{t.task_id}</option>)}
             </select>
             <input type="number" placeholder="Work Done" value={workDone} onChange={e=>setWorkDone(e.target.value)} />
             <input type="number" placeholder="Time Spent" value={timeSpent} onChange={e=>setTimeSpent(e.target.value)} />
             <input type="text" placeholder="Notes" value={notes} onChange={e=>setNotes(e.target.value)} />
             <button onClick={() => {
                store.addPersonalLog({ date, task_id: taskId, work_done: workDone, time_spent: timeSpent, notes });
                setWorkDone(''); setTimeSpent(''); setNotes('');
             }}>Log</button>
         </div>
         <Table columns={['Date', 'Task ID', 'Work Done', 'Time Spent', 'Notes', 'Action']}>
            {logs.map(l => (
               <tr key={l.id}>
                 <td>{l.date}</td>
                 <td>{l.task_id}</td>
                 <td>{l.work_done || 0}</td>
                 <td>{l.time_spent} h</td>
                 <td>{l.notes}</td>
                 <td><button onClick={() => store.deletePersonalLog(l.id)}>Del</button></td>
               </tr>
            ))}
         </Table>
      </div>
   );
}

function TabNotes({ notes, store }) {
   const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
   const [status, setStatus] = useState('Start');
   const [comment, setComment] = useState('');

   return (
      <div>
         <div style={{ border: '1px solid #ccc', padding: '16px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
             <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
             <select value={status} onChange={e=>setStatus(e.target.value)}><option>Start</option><option>Completed</option></select>
             <input type="text" placeholder="Comment" value={comment} onChange={e=>setComment(e.target.value)} />
             <button onClick={() => { store.addPersonalNote({ date, status, comment }); setComment(''); }}>Save</button>
         </div>
         <Table columns={['Date', 'Status', 'Comment', 'Action']}>
            {notes.map(n => (
               <tr key={n.id}>
                 <td>{n.date}</td>
                 <td>{n.status}</td>
                 <td>{n.comment}</td>
                 <td><button onClick={() => store.deletePersonalNote(n.id)}>Del</button></td>
               </tr>
            ))}
         </Table>
      </div>
   );
}

function TabAnalytics({ tasks }) {
   const data = tasks.map(t => ({
      name: t.task_id, completed: parseInt(t.completed_work) || 0, total: parseInt(t.total_work) || 0
   })).filter(t => t.total > 0);

   return (
     <div style={{ border: '1px solid #ccc', padding: '20px' }}>
        <h3>Analytics</h3>
        <div style={{ height: '400px' }}>
           <ResponsiveContainer width="100%" height="100%">
               <BarChart data={data}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#eee" />
                  <Bar dataKey="completed" fill="#8884d8" />
               </BarChart>
           </ResponsiveContainer>
        </div>
     </div>
   );
}

function TabExport({ store }) {
   return (
     <div style={{ border: '1px solid #ccc', padding: '20px' }}>
        <h3>Export/Backup</h3>
        <button onClick={() => alert('Exporting as JSON')}>Download Backup</button>
        <button style={{ marginLeft: '10px' }} onClick={() => {
           if(window.confirm('Load legacy data?')) {
               if(glLegacyData.tasks) glLegacyData.tasks.forEach(t => store.addPersonalTask({...t, task_id: t.task_id || `GL-${Date.now()}` }));
               if(glLegacyData.daily_work) glLegacyData.daily_work.forEach(l => store.addPersonalLog(l));
               if(glLegacyData.notes) glLegacyData.notes.forEach(n => store.addPersonalNote(n));
               alert('Loaded');
           }
        }}>Hydrate from Legacy SQlite</button>
     </div>
   );
}

function Table({ columns, children }) {
  return (
    <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ background: '#eee' }}>
        <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
