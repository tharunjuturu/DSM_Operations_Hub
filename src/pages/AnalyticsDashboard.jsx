import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Save, LayoutDashboard, AlertCircle, BarChart2, Hash, CheckCircle, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsDashboard() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  
  // Custom Dashboard states
  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [layout, setLayout] = useState([]);
  const [renderedData, setRenderedData] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const teamMembers = useStore(state => state.teamMembers) || [];

  // 1. Initial Load: Fetch users safely (Fallback to API if store empty)
  useEffect(() => {
    const loadUsers = async () => {
      if (teamMembers.length > 0) {
        setUsers(teamMembers);
        setSelectedUserId(teamMembers[0].name);
      } else {
        try {
          const res = await fetch('/db');
          const db = await res.json();
          setUsers(db.users || []);
          if (db.users && db.users.length > 0) {
            setSelectedUserId(db.users[0].name);
          }
        } catch (err) {
          setError("Failed to fetch users");
        }
      }
    };
    loadUsers();
  }, [teamMembers]);

  // 2. Load Dashboards when User changes
  useEffect(() => {
    if (!selectedUserId) return;
    
    const fetchUserDashboards = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/dashboard/user/${selectedUserId}`);
        const data = await res.json();
        setDashboards(data || []);
        
        if (data.length > 0) {
          handleSelectDashboard(data[0].dashboardId);
        } else {
          // Reset if no dashboard
          setSelectedDashboard(null);
          setLayout([]);
          setRenderedData([]);
        }
      } catch (err) {
        setError("Failed to load dashboards");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserDashboards();
  }, [selectedUserId]);

  const handleSelectDashboard = async (dashId) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const url = `/api/dashboard/${dashId}/data${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const res = await fetch(url);
      const resJson = await res.json();
      
      const dashData = resJson.data || resJson; // Fallback if format differs
      setSelectedDashboard(dashData);
      setLayout(dashData.layout || []);
      setRenderedData(dashData.layout || []);
    } catch (err) {
      setError("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddWidget = (type, metric) => {
    const newWidget = {
      widgetId: `wid_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      config: { metric },
      position: { x: 0, y: 0, w: 1, h: 1 }
    };
    setLayout(prev => [...prev, newWidget]);
    setRenderedData(prev => [...prev, newWidget]);
  };

  const handleSaveDashboard = async () => {
    // Save Dashboard Validation
    if (layout.length === 0) {
      alert("Dashboard must have at least one widget");
      return;
    }

    const payload = {
      dashboardId: selectedDashboard?.dashboardId || `dash_${Date.now()}`,
      userId: selectedUserId,
      name: selectedDashboard?.name || "My Custom Dashboard",
      layout: layout.map(({ data, ...rest }) => rest)
    };

    try {
      const isUpdate = selectedDashboard?.dashboardId;
      const url = isUpdate ? `/api/dashboard/${payload.dashboardId}` : '/api/dashboard';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Save failed");
      
      const resJson = await res.json();
      const saved = resJson.data || resJson;
      
      // Refresh
      const listRes = await fetch(`/api/dashboard/user/${selectedUserId}`);
      const listData = await listRes.json();
      setDashboards(listData.data || listData);
      handleSelectDashboard(saved.dashboardId);
      
      alert("Dashboard saved successfully!");
    } catch (err) {
      alert(err.message);
    }
  };

  if (users.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>No users found in database.</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Analytics Dashboard Builder</h2>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <select 
            value={selectedUserId} 
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            {users.map(u => (
              <option key={u.id || u.name} value={u.name}>{u.name}</option>
            ))}
          </select>
          
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
            title="Start Date"
          />
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
            title="End Date"
          />
          
          <button className="btn btn-secondary" onClick={() => handleSelectDashboard(selectedDashboard?.dashboardId)} disabled={!selectedDashboard || loading}>
            Apply Filters
          </button>

          <button className="btn btn-primary" onClick={handleSaveDashboard}>
            <Save size={16} /> Save Layout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Sidebar Controls */}
        <div style={{ width: '250px', background: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h4>My Dashboards</h4>
          {dashboards.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: '#6c757d' }}>No dashboards yet. Add widgets and save to create one.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
              {dashboards.map(d => (
                <li key={d.dashboardId} style={{ marginBottom: '8px' }}>
                  <button 
                    onClick={() => handleSelectDashboard(d.dashboardId)}
                    style={{ 
                      width: '100%', textAlign: 'left', padding: '8px', 
                      background: selectedDashboard?.dashboardId === d.dashboardId ? '#e9ecef' : 'transparent',
                      border: 'none', borderRadius: '4px', cursor: 'pointer',
                      fontWeight: selectedDashboard?.dashboardId === d.dashboardId ? 'bold' : 'normal'
                    }}
                  >
                    <LayoutDashboard size={14} style={{ marginRight: '8px' }} />
                    {d.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <hr style={{ margin: '20px 0', borderColor: '#dee2e6' }} />

          <h4>Add Widgets</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => handleAddWidget('card', 'total_tasks')}>
              <Plus size={14} /> Card: Total Tasks
            </button>
            <button className="btn btn-secondary" onClick={() => handleAddWidget('card', 'completed_tasks')}>
              <Plus size={14} /> Card: Completed Tasks
            </button>
            <button className="btn btn-secondary" onClick={() => handleAddWidget('card', 'completion_rate')}>
              <Plus size={14} /> Card: Completion Rate
            </button>
            <button className="btn btn-secondary" onClick={() => handleAddWidget('chart', 'monthly_tasks')}>
              <Plus size={14} /> Chart: Monthly Tasks
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, minHeight: '600px', background: '#ffffff', borderRadius: '8px', border: '1px solid #dee2e6', padding: '20px' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ background: '#e9ecef', borderRadius: '8px', height: '120px', animation: 'pulse 1.5s infinite ease-in-out' }} />
              ))}
              <div style={{ gridColumn: '1 / -1', background: '#e9ecef', borderRadius: '8px', height: '340px', animation: 'pulse 1.5s infinite ease-in-out' }} />
            </div>
          ) : layout.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6c757d' }}>
              <LayoutDashboard size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
              <h3>Empty Canvas</h3>
              <p>Add widgets from the sidebar to build your dashboard.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
              {renderedData.map(widget => (
                <WidgetRenderer 
                  key={widget.widgetId} 
                  widget={widget} 
                  onRemove={() => {
                    setLayout(prev => prev.filter(w => w.widgetId !== widget.widgetId));
                    setRenderedData(prev => prev.filter(w => w.widgetId !== widget.widgetId));
                  }} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WidgetRenderer({ widget, onRemove }) {
  const { type, config, data } = widget;

  // Error handling from backend (Fallback Handler)
  if (data?.error) {
    return (
      <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', padding: '20px', borderRadius: '8px', position: 'relative' }}>
        <button onClick={onRemove} style={{ position: 'absolute', top: 5, right: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#856404' }}>×</button>
        <AlertCircle size={24} color="#856404" />
        <h4 style={{ color: '#856404', margin: '8px 0' }}>Widget Error</h4>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#856404' }}>{data.error}</p>
      </div>
    );
  }

  // Graceful handling for no data
  if (data === null && widget.message) {
    return (
      <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', padding: '20px', borderRadius: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px', gridColumn: type === 'chart' ? '1 / -1' : 'auto' }}>
        <button onClick={onRemove} style={{ position: 'absolute', top: 5, right: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d' }}>×</button>
        <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>{widget.message}</span>
      </div>
    );
  }

  // Pre-save mode (data hasn't been fetched yet)
  const isPreview = data === undefined;
  const displayValue = isPreview ? "..." : data;

  if (type === 'card') {
    const icons = {
      total_tasks: <Hash size={24} color="#0d6efd" />,
      completed_tasks: <CheckCircle size={24} color="#198754" />,
      completion_rate: <Percent size={24} color="#6f42c1" />
    };
    
    const titles = {
      total_tasks: "Total Tasks",
      completed_tasks: "Completed Tasks",
      completion_rate: "Completion Rate (%)"
    };

    return (
      <div style={{ background: '#fff', border: '1px solid #dee2e6', padding: '20px', borderRadius: '8px', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <button onClick={onRemove} style={{ position: 'absolute', top: 5, right: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}>×</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '50%' }}>
            {icons[config.metric] || <LayoutDashboard size={24} />}
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: 'bold' }}>{titles[config.metric] || config.metric}</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#212529' }}>{displayValue}</div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'chart') {
    const chartData = data && typeof data === 'object' && !Array.isArray(data) 
      ? Object.entries(data).map(([key, value]) => ({ month: key, tasks: value })).sort((a, b) => new Date(a.month) - new Date(b.month))
      : (Array.isArray(data) ? data : []);

    return (
      <div style={{ gridColumn: '1 / -1', background: '#fff', border: '1px solid #dee2e6', padding: '20px', borderRadius: '8px', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <button onClick={onRemove} style={{ position: 'absolute', top: 5, right: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', zIndex: 10 }}>×</button>
        <h4 style={{ margin: '0 0 16px 0', color: '#495057' }}>Monthly Progress</h4>
        
        {isPreview ? (
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', color: '#6c757d' }}>Save dashboard to render chart</div>
        ) : chartData.length === 0 ? (
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', color: '#6c757d' }}>No historical task completion data found.</div>
        ) : (
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tasks" fill="#0d6efd" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: '#fff3cd', padding: '20px' }}>Unsupported Widget Type: {type}</div>
  );
}
