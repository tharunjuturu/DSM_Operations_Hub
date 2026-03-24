window.DSR = () => {
  const useStore = window.useStore;
  const updateTask = useStore(state => state.updateTask);
  const dsrTasks = useStore(state => state.getDSRTasks());
  
  return (
    <div>
      <h1 className="title">Daily Status Report</h1>
      <p className="subtitle" style={{ marginBottom: 'var(--space-lg)' }}>Tasks marked for DSR.</p>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container freeze-col-2" style={{ maxHeight: '600px' }}>
          <table>
             <thead>
              <tr>
                <th style={{ width: '50px' }}>S.No</th>
                <th>Task ID</th>
                <th>Function</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {dsrTasks.map((t, idx) => (
                <tr key={t.task_id}>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ fontWeight: '500' }}>{t.task_id}</td>
                  <td>{t.function}</td>
                  <td>
                    <select value={t.status} onChange={(e) => updateTask(t.task_id, { status: e.target.value })} style={{ padding: '4px' }}>
                      <option>In Progress</option>
                      <option>FR</option>
                      <option>Blocked</option>
                      <option>Delivered</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" value={t.remarks} onChange={(e) => updateTask(t.task_id, { remarks: e.target.value })} style={{ width: '100%' }} />
                  </td>
                </tr>
              ))}
              {dsrTasks.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>No tasks selected.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

window.Team = () => {
  const teamModes = window.useStore(state => state.teamModes);
  const setTeamMode = window.useStore(state => state.setTeamMode);
  const teamMembers = ['Divya', 'Srivijay', 'Rahul', 'Anita'];
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <div>
       <h1 className="title">Team Hub</h1>
       <div className="card" style={{ padding: 0, marginTop: '20px' }}>
          <table style={{ width: '100%' }}>
             <thead><tr><th>Name</th><th>Work Mode (Today)</th></tr></thead>
             <tbody>
                {teamMembers.map(name => {
                  const currentMode = teamModes.find(m => m.name === name && m.date === today)?.mode || 'WFO';
                  return (
                    <tr key={name}>
                      <td style={{ padding: '16px' }}>{name}</td>
                      <td>
                        <select value={currentMode} onChange={(e) => setTeamMode(name, today, e.target.value)} style={{ padding: '6px', maxWidth: '200px' }}>
                          <option value="WFO">WFO</option><option value="WFH">WFH</option><option value="Leave">Leave</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
             </tbody>
          </table>
       </div>
    </div>
  );
};

window.Archive = () => {
   const archiveTasks = window.useStore(state => state.tasks.filter(t => t.status === 'Archive' || t.status === 'Delivered'));
   return (
      <div>
         <h1 className="title">Archive</h1>
         <p>Showing {archiveTasks.length} delivered tasks.</p>
         <ul style={{ marginTop: '20px', paddingLeft: '20px' }}>
            {archiveTasks.map(t => <li key={t.task_id}>{t.task_id} - {t.function}</li>)}
         </ul>
      </div>
   );
};
