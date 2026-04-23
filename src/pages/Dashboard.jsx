import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { differenceInDays, parseISO } from 'date-fns';
import { LayoutDashboard, ClipboardCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { analyzeRisks } from '../utils/mockAI';

const Dashboard = () => {
  const tasks = useStore(state => state.tasks);
  const teamModes = useStore(state => state.teamModes);
  const teamMembers = useStore(state => state.teamMembers) || [];
  const leaveData = useStore(state => state.leaveData) || [];
  
  const today = new Date().toISOString().split('T')[0];
  const activeTasks = tasks.filter(t => t.status !== 'Delivered' && t.status !== 'Archive');
  const reviewPending = tasks.filter(t => t.status === 'FR' || t.status === 'QG');
  const blockedTasks = tasks.filter(t => t.status === 'Blocked');
  
  const riskyTasks = activeTasks.filter(t => {
     try {
       const daysLeft = differenceInDays(parseISO(t.endDate), new Date());
       const progressPct = (t.progress || 0) * 100;
       return daysLeft < 3 && progressPct < 70;
     } catch(e) { return false; }
  });

  const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);
  const [riskReport, setRiskReport] = useState(null);

  const handleAnalyzeRisks = async () => {
    setIsAnalyzingRisk(true);
    const report = await analyzeRisks(activeTasks);
    setRiskReport(report);
    setIsAnalyzingRisk(false);
  };

  const activeNames = teamMembers.map(m => m.name);
  let wfoCount = 0, wfhCount = 0, leaveCount = 0;

  activeNames.forEach(name => {
    const leave = leaveData.find(l => l.name === name && l.date === today);
    if (leave) {
      leaveCount++;
      return;
    }
    const modeObj = teamModes.find(m => m.name === name && m.date === today);
    if (modeObj && modeObj.mode !== 'EMPTY') {
      if (modeObj.mode === 'WFO') wfoCount++;
      else if (modeObj.mode === 'WFH') wfhCount++;
      else if (modeObj.mode === 'LEAVE' || modeObj.mode === 'HALF_DAY') leaveCount++;
    }
  });

  return (
    <div>
      <h1 className="title">Overview</h1>
      <p className="subtitle" style={{ marginBottom: 'var(--space-lg)' }}>Welcome back to DSM Ops Hub.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <StatCard title="Active Tasks" value={activeTasks.length} icon={<LayoutDashboard size={24} color="var(--primary)" />} />
        <StatCard title="Review Pending" value={reviewPending.length} icon={<ClipboardCheck size={24} color="var(--warning)" />} />
        <StatCard title="Blocked Tasks" value={blockedTasks.length} icon={<AlertTriangle size={24} color="var(--danger)" />} />
        <StatCard title="High Risk" value={riskyTasks.length} icon={<AlertTriangle size={24} color="var(--purple)" />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
        <div className="card hover-lift">
          <h3 style={{ marginBottom: 'var(--space-md)', fontWeight: '600' }}>Team Availability</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
               <span style={{ fontWeight: 500 }}>Work From Office</span>
               <span className="badge badge-success" style={{ fontSize: '1rem' }}>{wfoCount}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
               <span style={{ fontWeight: 500 }}>Work From Home</span>
               <span className="badge badge-info" style={{ fontSize: '1rem' }}>{wfhCount}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
               <span style={{ fontWeight: 500 }}>Leave</span>
               <span className="badge badge-danger" style={{ fontSize: '1rem' }}>{leaveCount}</span>
             </div>
          </div>
        </div>

        <div className="card hover-lift">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ margin: 0, fontWeight: '600' }}>AI Summary & Risks</h3>
            <button 
              className="btn-icon-sm" 
              onClick={handleAnalyzeRisks}
              disabled={isAnalyzingRisk}
              style={{ background: 'var(--purple-bg)', color: 'var(--purple)', border: '1px solid var(--purple)', padding: '4px 12px', width: 'auto', gap: '6px', borderRadius: '16px' }}
            >
              {isAnalyzingRisk ? '✨ Crunching...' : <><Sparkles size={16} /> Deep Analyze</>}
            </button>
          </div>
          <div style={{ padding: 'var(--space-md)', background: 'var(--purple-bg)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--purple)' }}>
            <p style={{ fontSize: '0.875rem', color: '#4c1d95', marginBottom: '8px' }}>
              <strong>Project Status Update:</strong> You have {reviewPending.length} tasks waiting for review and {blockedTasks.length} blocked tasks.
            </p>
            
            {!riskReport ? (
              <>
                {riskyTasks.length > 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--danger)', fontWeight: 600 }}>
                    ⚠️ {riskyTasks.length} tasks are nearing deadline (&lt;3 days) with &lt;70% completion. Run AI Analysis for details.
                  </p>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 600 }}>
                    ✅ No immediate surface-level risks detected. Run AI deep scan to be sure.
                  </p>
                )}
              </>
            ) : (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(139, 92, 246, 0.2)', paddingTop: '12px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4c1d95', marginBottom: '4px' }}>AI Risk Assessment Report</h4>
                {riskReport.length === 0 ? (
                   <p style={{ fontSize: '0.875rem', color: 'var(--success)', margin: 0 }}>The AI found no hidden bottlenecks or trajectory risks in the active tasks. Excellent!</p>
                ) : (
                   riskReport.map((rt, i) => (
                     <div key={i} style={{ background: 'white', padding: '10px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>Group {rt.sno} - {rt.function}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: rt.riskLevel === '🔴 Critical' ? 'var(--danger)' : 'var(--warning)' }}>{rt.riskLevel}</span>
                       </div>
                       <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{rt.aiAnalysis}</p>
                     </div>
                   ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }) => (
  <div className="card hover-lift" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
    <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '12px' }}>
      {icon}
    </div>
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>{title}</p>
      <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{value}</h3>
    </div>
  </div>
);

export default Dashboard;
