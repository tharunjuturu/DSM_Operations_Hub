import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { differenceInDays, parseISO } from 'date-fns';
import {
  LayoutDashboard, CheckSquare, ClipboardCheck, FileText,
  Users, Archive, Bot, X, Sparkles, AlertTriangle, ArrowLeft, BarChart2, Settings, Activity, BookOpen, ShieldCheck, Sliders, RefreshCw
} from 'lucide-react';

const Layout = () => {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const { variant } = useParams();
  const currentVariant = useStore(state => state.currentVariant || 'vsm_pt');
  const setCurrentVariant = useStore(state => state.setCurrentVariant);
  const loadDatabase = useStore(state => state.loadDatabase);
  const systemInfo = useStore(state => state.systemInfo);

  useEffect(() => {
    if (variant && variant !== currentVariant) {
      setCurrentVariant(variant);
      loadDatabase();
    }
  }, [variant, currentVariant, setCurrentVariant, loadDatabase]);

  const tasks = useStore(state => state.tasks);
  const navigate = useNavigate();

  const handleTestRiskDetector = () => {
    setAiLoading(true);
    setAiResult(null);
    setTimeout(() => {
      const activeTasks = tasks.filter(t => t.status !== 'Delivered' && t.status !== 'Archive');
      const overloaded = {};
      activeTasks.forEach(t => { overloaded[t.owner] = (overloaded[t.owner] || 0) + 1; });
      const overloadedUsers = Object.keys(overloaded).filter(u => overloaded[u] > 3);

      const riskyTasks = activeTasks.filter(t => {
        try {
          return differenceInDays(parseISO(t.delivery_date), new Date()) < 3 && (t.completed_ft / t.total_ft) < 0.7;
        } catch (e) { return false; }
      });

      setAiResult({ type: 'risk', overloadedUsers, riskyTasks, staleTasks: [] });
      setAiLoading(false);
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', minHeight: '100vh', position: 'relative' }}>
      <aside className="glass" style={{ width: 'var(--sidebar-w)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: 'var(--space-lg) 0', zIndex: 10 }}>
        <div style={{ padding: '0 var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', background: 'var(--primary)', borderRadius: '6px' }} />
            DSM Ops Hub
          </h1>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 var(--space-md)' }}>
          <NavItem to={`/hub/${variant}/dashboard`} icon={<LayoutDashboard size={20} />} label="Overview" />
          <NavItem to={`/hub/${variant}/analytics-dashboard`} icon={<BarChart2 size={20} />} label="Analytics Dashboard" />
          <NavItem to={`/hub/${variant}/tasks`} icon={<CheckSquare size={20} />} label="Task Info" />
          <NavItem to={`/hub/${variant}/reviews`} icon={<ClipboardCheck size={20} />} label="Task Review" />
          <NavItem to={`/hub/${variant}/dsr`} icon={<FileText size={20} />} label="DSR Generator" />
          <NavItem to={`/hub/${variant}/layouts`} icon={<Sliders size={20} />} label="Custom Layouts" />
          <NavItem to={`/hub/${variant}/sync`} icon={<RefreshCw size={20} />} label="GitHub Sync" />
          <NavItem to={`/hub/${variant}/team`} icon={<Users size={20} />} label="Team Data Hub" />
          <NavItem to={`/hub/${variant}/manager-hub`} icon={<ShieldCheck size={20} />} label="Manager Hub" />
          <NavItem to={`/hub/${variant}/archive`} icon={<Archive size={20} />} label="Archive" />
          <NavItem to={`/hub/${variant}/burndown`} icon={<CheckSquare size={20} />} label="Burndown Matrix" />
          <NavItem to={`/hub/${variant}/productivity`} icon={<Activity size={20} />} label="Daily Productivity" />
          
          <div style={{ marginTop: 'auto', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <a 
              href="/demo_guide.html" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="nav-item" 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: '8px', color: 'var(--text-muted)', fontWeight: '500', textDecoration: 'none' }}
            >
               <BookOpen size={20} /> <span>Tool Guide</span>
               <style>{` .nav-item:hover { background: var(--bg); color: var(--text); } `}</style>
            </a>
            <NavLink to="/" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: '8px', color: 'var(--text-muted)', fontWeight: '500' }}>
               <ArrowLeft size={20} /> Back to Portal
            </NavLink>
            <div style={{ 
              marginTop: '16px', 
              padding: '0 16px', 
              fontSize: '0.7rem', 
              color: 'var(--text-muted)',
              opacity: 0.7,
              borderTop: '1px solid var(--border)',
              paddingTop: '12px',
              textAlign: 'center'
            }}>
              <div>Main Portal v{systemInfo?.version || '2.0.0'}</div>
              <div style={{ marginTop: '2px' }}>Built by {systemInfo?.builtBy || 'Tharun Kumar Juturu'}</div>
            </div>
          </div>
        </nav>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <header className="glass" style={{ height: '30px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-xl)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-muted)' }}> {systemInfo?.username || 'System User'} </h2>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--primary)', background: 'var(--purple-bg)', padding: '2px 8px', borderRadius: '4px' }}>
            {variant ? variant.toUpperCase().replace('_', ' ') : ''}
          </span>
        </header>

        <div style={{ padding: 'var(--space-xl)', flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>

      <button
        style={{ position: 'fixed', bottom: 'var(--space-xl)', right: 'var(--space-xl)', width: '56px', height: '56px', borderRadius: '28px', background: 'var(--primary)', color: 'white', border: 'none', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 50, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        onClick={() => setAiOpen(true)} className="fab"
      >
        <Sparkles size={24} />
      </button>

      {aiOpen && (
        <div className="glass" style={{ position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', zIndex: 100, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)' }}>
          <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot color="var(--primary)" size={24} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Ops Assistant AI</h3>
            </div>
            <button onClick={() => setAiOpen(false)} className="btn-icon-sm" style={{ background: 'white' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ padding: 'var(--space-xl)', flex: 1, overflowY: 'auto' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', fontSize: '0.875rem' }}>I can analyze the operations data across the hub to detect risks and compile the MOM.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <button className="btn btn-secondary" style={{ justifyContent: 'center', padding: '12px' }} onClick={() => { setAiOpen(false); navigate(`/hub/${variant}/dsr`); }}>
                <FileText size={18} /> Parse Notes to DSM MOM
              </button>
              <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px' }} onClick={handleTestRiskDetector} disabled={aiLoading}>
                <AlertTriangle size={18} />
                {aiLoading ? 'Analyzing Workloads & Risks...' : 'Detect Workloads & Risks'}
              </button>
            </div>
            {aiResult?.type === 'risk' && (
              <div style={{ marginTop: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Analysis Results</h4>
                <div style={{ padding: '12px', borderRadius: '8px', background: aiResult.overloadedUsers.length > 0 ? 'var(--danger-bg)' : 'var(--success-bg)', border: `1px solid ${aiResult.overloadedUsers.length > 0 ? 'var(--danger)' : 'var(--success)'}` }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: aiResult.overloadedUsers.length > 0 ? 'var(--danger)' : '#065F46' }}>Workload Analyzer</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    {aiResult.overloadedUsers.length > 0 ? `Overloaded users detected: ${aiResult.overloadedUsers.join(', ')} (>3 tasks)` : "All team workloads are balanced."}
                  </p>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', background: aiResult.riskyTasks.length > 0 ? 'var(--warning-bg)' : 'var(--success-bg)', border: `1px solid ${aiResult.riskyTasks.length > 0 ? 'var(--warning)' : 'var(--success)'}` }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: aiResult.riskyTasks.length > 0 ? 'var(--warning)' : '#065F46' }}>Delivery Risk Detector</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    {aiResult.riskyTasks.length > 0 ? `${aiResult.riskyTasks.length} tasks are nearing deadline with low progress (e.g. ${aiResult.riskyTasks[0].task_id})` : "No tasks are at risk of missing delivery."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: '8px',
        background: isActive ? 'var(--purple-bg)' : 'transparent',
        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
        fontWeight: isActive ? '600' : '500', transition: 'all 0.2s ease'
      })}
    >
      {icon}<span>{label}</span>
      <style>{` .nav-item:hover:not(.active) { background: var(--bg); color: var(--text); } `}</style>
    </NavLink>
  );
};

export default Layout;
