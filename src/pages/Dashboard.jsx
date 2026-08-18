import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { differenceInDays, parseISO, format, addDays } from 'date-fns';
import { LayoutDashboard, ClipboardCheck, AlertTriangle, Sparkles, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { analyzeRisks, analyzeWorkload } from '../utils/mockAI';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const Dashboard = () => {
  // Store data
  const tasks = useStore(state => state.tasks);
  const teamMembers = useStore(state => state.teamMembers) || [];

  // State
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [riskReport, setRiskReport] = useState(null);
  const [workloadReport, setWorkloadReport] = useState(null);

  const activeTasks = tasks.filter(t => t.status !== 'Delivered' && t.status !== 'Archive');
  const reviewPending = tasks.filter(t => t.status === 'FR' || t.status === 'QG');
  const blockedTasks = tasks.filter(t => t.status === 'Blocked');
  const deliveredTasks = tasks.filter(t => t.status === 'Delivered');

  // Run AI on Mount
  useEffect(() => {
    let isMounted = true;
    const runAI = async () => {
      setIsAnalyzing(true);
      const [rReport, wReport] = await Promise.all([
        analyzeRisks(activeTasks),
        analyzeWorkload(teamMembers, activeTasks)
      ]);
      if (isMounted) {
        setRiskReport(rReport);
        setWorkloadReport(wReport);
        setIsAnalyzing(false);
      }
    };
    runAI();
    return () => { isMounted = false; };
  }, [tasks, teamMembers]);

  // Chart 1: Task Status Donut
  const statusCounts = {
    'In Progress': activeTasks.filter(t => t.status === 'In Progress' || t.status === 'Initial').length,
    'Blocked': blockedTasks.length,
    'Review': reviewPending.length,
    'Delivered': deliveredTasks.length
  };

  const donutData = [
    { name: 'In Progress', value: statusCounts['In Progress'], color: '#facc15' },
    { name: 'Blocked', value: statusCounts['Blocked'], color: '#ef4444' },
    { name: 'Review', value: statusCounts['Review'], color: '#3b82f6' },
    { name: 'Delivered', value: statusCounts['Delivered'], color: '#22c55e' }
  ].filter(d => d.value > 0);

  // Chart 2: Team Workload (Bar Chart)
  const workloadData = useMemo(() => {
    if (workloadReport?.distribution) return workloadReport.distribution.slice(0, 7);
    // Fallback computation
    const wl = {};
    teamMembers.forEach(m => wl[m.name] = 0);
    activeTasks.forEach(t => {
      t.owners?.forEach(o => {
        if (wl[o.name] !== undefined) wl[o.name] += Math.max(0, (o.totalFT || 0) - (o.completedFT || 0));
      });
    });
    return Object.entries(wl).map(([name, pendingFT]) => ({ name: name.split(' ')[0], pendingFT })).sort((a, b) => b.pendingFT - a.pendingFT).slice(0, 7);
  }, [workloadReport, teamMembers, activeTasks]);

  // Chart 3: Upcoming Deadlines (LineChart)
  const timelineData = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(new Date(), i);
      const dStr = format(d, 'yyyy-MM-dd');
      const label = format(d, 'dd MMM');
      let due = 0;
      activeTasks.forEach(t => {
        if (t.endDate && t.endDate === dStr) due++;
      });
      days.push({ name: label, Due: due });
    }
    return days;
  }, [activeTasks]);

  // AI Command Center Computations
  const riskScore = riskReport ? Math.min(100, Math.round((riskReport.length / (activeTasks.length || 1)) * 100)) : 0;
  const criticalCount = riskReport ? riskReport.filter(r => r.riskLevel.includes('Critical')).length : 0;
  const highCount = riskReport ? riskReport.filter(r => r.riskLevel.includes('High')).length : 0;

  return (
    <div style={{ paddingBottom: '40px' }}>
      <h1 className="title">Overview</h1>
      <p className="subtitle" style={{ marginBottom: 'var(--space-xl)' }}>Welcome back to DSM Ops Hub.</p>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <StatCard
          title="Active Tasks"
          value={activeTasks.length}
          icon={<LayoutDashboard size={24} />}
          trendText="↑ +2 from yesterday"
          trendType="bad"
          colorHex="#2563eb"
          bgHex="#dbeafe"
        />
        <StatCard
          title="Review Pending"
          value={reviewPending.length}
          icon={<ClipboardCheck size={24} />}
          trendText="↓ -1 from yesterday"
          trendType="good"
          colorHex="#f59e0b"
          bgHex="#fef3c7"
        />
        <StatCard
          title="Blocked Tasks"
          value={blockedTasks.length}
          icon={<AlertTriangle size={24} />}
          trendText="↑ +1 from yesterday"
          trendType="bad"
          colorHex="#ef4444"
          bgHex="#fee2e2"
        />
        <StatCard
          title="Total Delivered"
          value={deliveredTasks.length}
          icon={<CheckCircle size={24} />}
          trendText="↑ +4 from yesterday"
          trendType="good"
          colorHex="#10b981"
          bgHex="#d1fae5"
        />
      </div>

      {/* COMMAND CENTER AI */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', color: 'white', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-5%', top: '-20%', opacity: 0.05, transform: 'scale(3)' }}><Sparkles size={100} /></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={24} color="#a5b4fc" /> AI Analysis
            </h2>
            <p style={{ color: '#c7d2fe', margin: 0, fontSize: '0.9rem' }}>Real-time strategic insights and risk analysis.</p>
          </div>
          {isAnalyzing && <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>Analyzing...</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', position: 'relative', zIndex: 1 }}>

          {/* Risk Score */}
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ color: '#a5b4fc', fontSize: '0.8rem', textTransform: 'uppercase', margin: '0 0 12px 0', letterSpacing: '0.05em' }}>Overall Risk Level</h4>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: riskScore > 20 ? '#fca5a5' : '#86efac' }}>{riskScore}%</span>
              <span style={{ color: '#c7d2fe', fontSize: '0.875rem' }}>Tasks at risk</span>
            </div>
            <p style={{ margin: '12px 0 0 0', fontSize: '0.85rem', color: '#e0e7ff' }}>
              {criticalCount} critical bottlenecks • {highCount} high risk delays
            </p>
          </div>

          {/* Workload / Burnout */}
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ color: '#a5b4fc', fontSize: '0.8rem', textTransform: 'uppercase', margin: '0 0 12px 0', letterSpacing: '0.05em' }}>Resource Balance</h4>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.5, margin: 0, color: '#e0e7ff', fontWeight: 500 }}>
              {workloadReport ? workloadReport.message : 'Analyzing team bandwidth...'}
            </p>
          </div>

          {/* Suggested Actions */}
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ color: '#a5b4fc', fontSize: '0.8rem', textTransform: 'uppercase', margin: '0 0 12px 0', letterSpacing: '0.05em' }}>AI Action Items</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#e0e7ff', fontSize: '0.875rem', lineHeight: 1.6 }}>
              {criticalCount > 0 ? <li>Immediately unblock the {criticalCount} critical tasks.</li> : <li>All systems nominal. No immediate unblocks needed.</li>}
              {workloadReport && workloadReport.status === 'overloaded' ? <li>Reassign tasks from {workloadReport.distribution[0].name} to prevent burnout.</li> : <li>Workload distribution looks sustainable.</li>}
              {reviewPending.length > 0 && <li>Clear the {reviewPending.length} pending QG/FR reviews to maintain velocity.</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* VISUAL ANALYTICS GRID */}
      <h2 className="title" style={{ fontSize: '1.25rem', marginBottom: 'var(--space-md)' }}>Visual Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>

        {/* Status Donut */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>Task Distribution</h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                  {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workload Bar */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>Team Pending FTs (Top 7)</h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="name" type="category" width={60} fontSize={12} fontWeight={600} tick={{ fill: '#475569' }} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="pendingFT" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deadline Timeline */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>Upcoming Deadlines (7 Days)</h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: '#475569' }} tickMargin={10} />
                <YAxis fontSize={12} tick={{ fill: '#475569' }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="Due" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trendText, trendType, colorHex, bgHex }) => {
  const isGood = trendType === 'good';
  return (
    <div className="card hover-lift" style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden', borderBottom: `4px solid ${colorHex}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '10px', background: bgHex, borderRadius: '10px', color: colorHex }}>
          {icon}
        </div>
        <p style={{ color: '#475569', fontSize: '0.8rem', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, color: '#0f172a', lineHeight: 1 }}>{value}</h3>
        {trendText && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: isGood ? '#16a34a' : '#dc2626', background: isGood ? '#dcfce7' : '#fee2e2', padding: '4px 8px', borderRadius: '20px' }}>
            {trendText.includes('+') ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trendText}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
