import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Save, LayoutDashboard, AlertCircle, BarChart2, Hash, CheckCircle, Percent, Table, X, GripHorizontal, Maximize2, RefreshCw, Layers, ShieldCheck, Activity, Users } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { differenceInDays, parseISO, format, subDays } from 'date-fns';

const TEMPLATES = {
  delivery: [
    { type: 'chart', config: { metric: 'status_donut', title: 'Task Status Distribution' }, position: { w: 1, h: 1 } },
    { type: 'chart', config: { metric: 'upcoming_deadlines', title: 'Upcoming Deadlines' }, position: { w: 2, h: 1 } },
    { type: 'table', config: { metric: 'data_table', columns: ['task_id', 'status', 'owner', 'delivery_date'] }, position: { w: 3, h: 1 } }
  ],
  health: [
    { type: 'chart', config: { metric: 'workload_heatmap', title: 'Workload Heatmap' }, position: { w: 3, h: 1 } },
    { type: 'card', config: { metric: 'total_leave', title: 'Total Leave Days' }, position: { w: 1, h: 1 } },
    { type: 'card', config: { metric: 'team_wfo', title: 'WFO Headcount' }, position: { w: 1, h: 1 } },
    { type: 'card', config: { metric: 'team_wfh', title: 'WFH Headcount' }, position: { w: 1, h: 1 } }
  ],
  productivity: [
    { type: 'chart', config: { metric: 'velocity', title: 'Velocity Trend' }, position: { w: 2, h: 1 } },
    { type: 'chart', config: { metric: 'ft_burn', title: 'FT Burn Trend' }, position: { w: 2, h: 1 } },
    { type: 'card', config: { metric: 'completion_rate', title: 'Completion Rate' }, position: { w: 1, h: 1 } }
  ],
  risk: [
    { type: 'chart', config: { metric: 'risk_donut', title: 'Risk Breakdown' }, position: { w: 1, h: 1 } },
    { type: 'chart', config: { metric: 'blocked_timeline', title: 'Blocked Tasks Timeline' }, position: { w: 2, h: 1 } }
  ]
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("ErrorBoundary caught an error", error, errorInfo); }
  render() {
    if (this.state.hasError) return (<div style={{ padding: '20px', color: 'red', background: '#fee' }}><h2>Something went wrong in AnalyticsDashboard.</h2></div>);
    return this.props.children;
  }
}

export default function AnalyticsDashboardErrorBoundary(props) {
  return <ErrorBoundary><AnalyticsDashboard {...props} /></ErrorBoundary>;
}

function AnalyticsDashboard() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  
  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [layout, setLayout] = useState([]);
  const [renderedData, setRenderedData] = useState([]);
  const [dashboardScope, setDashboardScope] = useState('Personal');
  
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingDashboardId, setEditingDashboardId] = useState(null);
  const [renameText, setRenameText] = useState('');

  const [showTableModal, setShowTableModal] = useState(false);
  const [tableColumns, setTableColumns] = useState(['name', 'status', 'owner', 'delivery_date']);

  const teamMembers = useStore(state => state.teamMembers) || [];
  const tasks = useStore(state => state.tasks) || [];
  const teamModes = useStore(state => state.teamModes) || [];
  const leaveData = useStore(state => state.leaveData) || [];
  const currentVariant = useStore(state => state.currentVariant || 'vsm_pt');

  // Drag and drop refs
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  useEffect(() => {
    if (teamMembers.length > 0) {
      setUsers(teamMembers);
      if (!selectedUserId) setSelectedUserId(teamMembers[0].name);
    }
  }, [teamMembers]);

  const fetchUserDashboards = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/user/${selectedUserId}`, {
        headers: { 'x-variant': currentVariant }
      });
      const data = await res.json();
      const dashboardsList = data.data || data || [];
      setDashboards(dashboardsList);
      
      if (dashboardsList.length > 0 && !selectedDashboard) {
        handleSelectDashboard(dashboardsList[0].dashboardId, dashboardsList);
      }
    } catch (err) {
      console.warn("Failed to load dashboards, running local mode.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedUserId) return;
    fetchUserDashboards();
  }, [selectedUserId]);

  // Auto Refresh Interval
  useEffect(() => {
    let interval = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        // Force re-render of layout to grab fresh data from Zustand store
        setRenderedData([...layout]);
      }, 30000); // 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, layout]);

  const handleSelectDashboard = async (dashId, currentDashboards = dashboards) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/${dashId}`, {
        headers: { 'x-variant': currentVariant }
      });
      const resJson = await res.json();
      const dashData = resJson.data || resJson; 
      
      const targetDash = currentDashboards.find(d => d.dashboardId === dashId);
      
      setSelectedDashboard(targetDash || dashData);
      setDashboardScope(targetDash?.scope || dashData.scope || 'Personal');
      setLayout(targetDash ? targetDash.layout : (dashData.layout || []));
      setRenderedData(targetDash ? targetDash.layout : (dashData.layout || []));
    } catch (err) {
      console.warn("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    const newName = prompt("Enter a name for your new dashboard:", "My New Dashboard");
    if (!newName) return;
    setSelectedDashboard({ name: newName, userId: selectedUserId });
    setLayout([]);
    setRenderedData([]);
  };

  const handleLoadTemplate = (templateKey) => {
    const template = TEMPLATES[templateKey];
    if (!template) return;
    const newLayout = template.map(t => ({
      ...t,
      widgetId: `wid_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      position: t.position || { w: 1, h: 1 }
    }));
    setLayout(prev => [...prev, ...newLayout]);
    setRenderedData(prev => [...prev, ...newLayout]);
  };

  const handleAddWidget = (type, metric) => {
    const newWidget = {
      widgetId: `wid_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      config: { metric, title: metric.replace(/_/g, ' ') },
      position: { w: type === 'chart' ? 2 : 1, h: 1 }
    };
    setLayout(prev => [...prev, newWidget]);
    setRenderedData(prev => [...prev, newWidget]);
  };

  const handleResize = (widgetId, newSpan) => {
    const _layout = layout.map(item => {
      if (item.widgetId === widgetId) return { ...item, position: { ...item.position, w: newSpan } };
      return item;
    });
    setLayout(_layout);
    setRenderedData(_layout);
  };

  const handleDragStart = (e, index) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const _layout = [...layout];
      const draggedItemContent = _layout[dragItem.current];
      _layout.splice(dragItem.current, 1);
      _layout.splice(dragOverItem.current, 0, draggedItemContent);
      setLayout(_layout);
      setRenderedData(_layout);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSaveDashboard = async () => {
    if (layout.length === 0) return alert("Dashboard must have at least one widget");
    const payload = {
      dashboardId: selectedDashboard?.dashboardId || `dash_${Date.now()}`,
      userId: selectedUserId,
      name: selectedDashboard?.name || "My Custom Dashboard",
      scope: dashboardScope,
      layout: layout.map(({ data, ...rest }) => rest)
    };

    try {
      const isUpdate = !!selectedDashboard?.dashboardId;
      const res = await fetch(isUpdate ? `/api/dashboard/${payload.dashboardId}` : '/api/dashboard', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-variant': currentVariant
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Save failed");
      fetchUserDashboards();
      alert("Dashboard saved successfully!");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteDashboard = async (dashId) => {
    if (!window.confirm("Delete this dashboard?")) return;
    try {
      await fetch(`/api/dashboard/${dashId}`, { 
        method: 'DELETE',
        headers: { 'x-variant': currentVariant }
      });
      fetchUserDashboards();
    } catch (err) { alert(err.message); }
  };

  const handleRenameDashboard = async (dashId) => {
    if (!renameText.trim()) return setEditingDashboardId(null);
    try {
      const existingDash = dashboards.find(d => d.dashboardId === dashId);
      await fetch(`/api/dashboard/${dashId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-variant': currentVariant
        },
        body: JSON.stringify({ ...existingDash, name: renameText })
      });
      setEditingDashboardId(null);
      fetchUserDashboards();
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#fff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#1a1a1a' }}>Analytics Studio</h2>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: autoRefresh ? 'var(--success)' : '#64748b', cursor: 'pointer', background: autoRefresh ? 'var(--success-bg)' : '#f1f5f9', padding: '6px 12px', borderRadius: '20px' }}>
            <RefreshCw size={14} className={autoRefresh ? 'spin-anim' : ''} /> 
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ display: 'none' }} />
            Live Auto-Refresh {autoRefresh ? '(On)' : '(Off)'}
          </label>
          
          <select value={dashboardScope} onChange={e => setDashboardScope(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none', fontWeight: 500 }}>
            <option value="Personal">Personal Scope</option>
            <option value="Team">Team Scope</option>
          </select>
          
          <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', outline: 'none', cursor: 'pointer', fontWeight: 500 }}>
            {users.map(u => <option key={u.id || u.name} value={u.name}>{u.name}</option>)}
          </select>

          <button style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0ea5e9', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(14,165,233,0.3)' }} onClick={handleSaveDashboard}>
            <Save size={16} /> Save Layout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Sidebar */}
        <div style={{ width: isSidebarOpen ? '280px' : '60px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'width 0.3s', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
            {isSidebarOpen && <h4 style={{ margin: 0, fontWeight: 600, color: '#374151' }}>Dashboards</h4>}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
              <X size={20} style={{ transform: isSidebarOpen ? 'none' : 'rotate(45deg)' }} />
            </button>
          </div>

          <div style={{ padding: '16px', flex: 1, overflowY: 'auto', display: isSidebarOpen ? 'block' : 'none' }}>
            <button onClick={handleCreateNew} style={{ width: '100%', padding: '10px', background: '#f0f9ff', border: '1px dashed #7dd3fc', borderRadius: '8px', color: '#0369a1', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <Plus size={16} /> Create Blank
            </button>

            {dashboards.map(d => {
              const isActive = selectedDashboard?.dashboardId === d.dashboardId;
              const isEditing = editingDashboardId === d.dashboardId;
              return (
                <div key={d.dashboardId} style={{ padding: '10px', background: isActive ? '#f0f9ff' : '#fff', border: isActive ? '1px solid #bae6fd' : '1px solid #f3f4f6', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }} onClick={() => !isEditing && handleSelectDashboard(d.dashboardId)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <LayoutDashboard size={16} color={isActive ? '#0284c7' : '#9ca3af'} />
                    {isEditing ? (
                      <input autoFocus value={renameText} onChange={(e) => setRenameText(e.target.value)} onBlur={() => handleRenameDashboard(d.dashboardId)} onKeyDown={(e) => e.key === 'Enter' && handleRenameDashboard(d.dashboardId)} style={{ flex: 1, border: 'none', background: 'transparent' }} onClick={(e) => e.stopPropagation()} />
                    ) : (
                      <span style={{ fontWeight: isActive ? 600 : 400, color: isActive ? '#0369a1' : '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name} <span style={{fontSize: '0.65rem', color: '#94a3b8'}}>({d.scope || 'Personal'})</span></span>
                    )}
                  </div>
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={(e) => { e.stopPropagation(); setEditingDashboardId(d.dashboardId); setRenameText(d.name); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={14} style={{transform: 'rotate(45deg)'}}/></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteDashboard(d.dashboardId); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={14} /></button>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: '24px' }}>
              <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '12px' }}>Templates</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button style={{ padding: '8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }} onClick={() => handleLoadTemplate('delivery')}><Layers size={14} color="#3b82f6"/> Delivery Dashboard</button>
                <button style={{ padding: '8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }} onClick={() => handleLoadTemplate('health')}><Users size={14} color="#10b981"/> Team Health</button>
                <button style={{ padding: '8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }} onClick={() => handleLoadTemplate('productivity')}><Activity size={14} color="#8b5cf6"/> Productivity Trends</button>
                <button style={{ padding: '8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }} onClick={() => handleLoadTemplate('risk')}><ShieldCheck size={14} color="#ef4444"/> Risk Analysis</button>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '12px' }}>Add Widget</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button style={{ padding: '8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => handleAddWidget('card', 'total_tasks')}>KPI: Total Tasks</button>
                <button style={{ padding: '8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => handleAddWidget('chart', 'velocity')}>Chart: Velocity</button>
                <button style={{ padding: '8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => handleAddWidget('chart', 'status_donut')}>Chart: Donut</button>
                <button style={{ padding: '8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => handleAddWidget('chart', 'ft_burn')}>Chart: FT Burn</button>
                <button style={{ padding: '8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => handleAddWidget('chart', 'workload_heatmap')}>Chart: Heatmap</button>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, minHeight: '600px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignContent: 'start' }}>
          {layout.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', background: '#fff', borderRadius: '12px', border: '2px dashed #d1d5db' }}>
              <LayoutDashboard size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Empty Canvas</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Use a template or add widgets from the sidebar.</p>
            </div>
          ) : (
            renderedData.map((widget, index) => (
              <div 
                key={widget.widgetId} 
                draggable 
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                style={{ gridColumn: `span ${widget.position?.w || 1}`, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', cursor: 'grab', transition: 'transform 0.2s' }}
              >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GripHorizontal size={16} color="#94a3b8" style={{ cursor: 'grab' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>{widget.config?.title || 'Widget'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleResize(widget.widgetId, widget.position.w === 3 ? 1 : widget.position.w + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }} title="Change Size"><Maximize2 size={14}/></button>
                    <button onClick={() => {
                      setLayout(prev => prev.filter(w => w.widgetId !== widget.widgetId));
                      setRenderedData(prev => prev.filter(w => w.widgetId !== widget.widgetId));
                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={14}/></button>
                  </div>
                </div>
                <div style={{ padding: '16px', flex: 1, minHeight: '150px' }}>
                   <WidgetContent widget={widget} tasks={tasks} teamMembers={teamMembers} teamModes={teamModes} leaveData={leaveData} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function WidgetContent({ widget, tasks, teamMembers, teamModes, leaveData }) {
  const { type, config } = widget;
  const activeTasks = tasks.filter(t => t.status !== 'Delivered' && t.status !== 'Archive');

  if (type === 'card') {
    let value = 0;
    if (config.metric === 'total_tasks') value = activeTasks.length;
    if (config.metric === 'completed_tasks') value = tasks.filter(t => t.status === 'Delivered').length;
    if (config.metric === 'completion_rate') value = Math.round((tasks.filter(t => t.status === 'Delivered').length / (tasks.length || 1)) * 100) + '%';
    if (config.metric === 'total_leave' || config.metric === 'team_wfo' || config.metric === 'team_wfh') {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      teamMembers.forEach(m => {
        const leave = leaveData.find(l => l.name === m.name && l.date === todayStr);
        const modeObj = teamModes.find(tm => tm.name === m.name && tm.date === todayStr);
        if (config.metric === 'total_leave' && leave) value++;
        if (config.metric === 'team_wfo' && modeObj?.mode === 'WFO') value++;
        if (config.metric === 'team_wfh' && modeObj?.mode === 'WFH') value++;
      });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
        <div style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a' }}>{value}</div>
        <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase' }}>{config.title}</div>
      </div>
    );
  }

  if (type === 'chart') {
    if (config.metric === 'status_donut' || config.metric === 'risk_donut') {
      const data = config.metric === 'status_donut' 
        ? [
            { name: 'In Progress', value: activeTasks.filter(t => t.status === 'In Progress').length, color: '#3b82f6' },
            { name: 'Review', value: activeTasks.filter(t => t.status === 'FR' || t.status === 'QG').length, color: '#eab308' },
            { name: 'Blocked', value: activeTasks.filter(t => t.status === 'Blocked').length, color: '#ef4444' }
          ].filter(d => d.value > 0)
        : [
            { name: 'Critical Risk', value: activeTasks.filter(t => t.status === 'Blocked').length, color: '#ef4444' },
            { name: 'On Track', value: activeTasks.filter(t => t.status !== 'Blocked').length, color: '#22c55e' }
          ];

      return (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
              {data.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (config.metric === 'upcoming_deadlines' || config.metric === 'blocked_timeline') {
      const days = [];
      for(let i=0; i<7; i++) {
        const dStr = format(subDays(new Date(), i - 3), 'yyyy-MM-dd'); // Range -3 to +4 days
        days.push({ name: format(subDays(new Date(), i - 3), 'dd MMM'), Tasks: activeTasks.filter(t => t.endDate === dStr).length });
      }
      return (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={days}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Area type="monotone" dataKey="Tasks" stroke="#8b5cf6" fill="#c4b5fd" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (config.metric === 'velocity' || config.metric === 'ft_burn') {
      const isVelocity = config.metric === 'velocity';
      const chartData = [
        { name: 'W1', FT: 24, Expected: 25 },
        { name: 'W2', FT: 35, Expected: 30 },
        { name: 'W3', FT: 20, Expected: 35 },
        { name: 'W4', FT: 42, Expected: 40 }
      ]; // Mocked trend
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="FT" stroke="#0ea5e9" strokeWidth={3} />
            {!isVelocity && <Line type="dashed" dataKey="Expected" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (config.metric === 'workload_heatmap') {
      const heatData = teamMembers.slice(0, 5).map(m => ({
        name: m.name.split(' ')[0],
        pendingFT: activeTasks.reduce((acc, t) => acc + (t.owners?.find(o => o.name === m.name)?.totalFT || 0), 0)
      }));
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={heatData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="name" type="category" width={80} fontSize={12} fontWeight={600} />
            <Tooltip />
            <Bar dataKey="pendingFT" fill="#f59e0b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
  }

  if (type === 'table') {
    return (
      <div style={{ overflowX: 'auto', maxHeight: '250px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>Task ID</th>
              <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>Status</th>
              <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>Function</th>
            </tr>
          </thead>
          <tbody>
            {activeTasks.slice(0, 5).map(t => (
              <tr key={t.sno} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px', color: '#334155' }}>{t.taskIds?.[0] || t.sno}</td>
                <td style={{ padding: '8px' }}><span className={`badge badge-${t.status === 'Blocked' ? 'danger' : 'info'}`}>{t.status}</span></td>
                <td style={{ padding: '8px', color: '#64748b' }}>{t.function}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Unsupported Widget</div>;
}
