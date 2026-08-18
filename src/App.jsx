import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Reviews from './pages/Reviews';
import DSR from './pages/DSR';
import Team from './pages/Team';
import Archive from './pages/Archive';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import Productivity from './pages/Productivity';
import HomePortal from './pages/HomePortal';
import Burndown from './pages/Burndown';
import ManagerHub from './pages/ManagerHub';
import LayoutsPage from './pages/LayoutsPage';
import SyncPage from './pages/SyncPage';
import { useStore } from './store/useStore';

function App() {
  const navigate = useNavigate();
  const loadDatabase = useStore(state => state.loadDatabase);
  const loadSystemInfo = useStore(state => state.loadSystemInfo);
  const currentVariant = useStore(state => state.currentVariant || 'vsm_pt');

  useEffect(() => {
    loadDatabase();
    loadSystemInfo();

    // Auto-sync other tabs when they regain focus
    const handleFocus = () => {
      loadDatabase();
      loadSystemInfo();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadDatabase, loadSystemInfo]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key.toLowerCase() === 'h') navigate('/');
      if (e.key.toLowerCase() === 'n') navigate(`/hub/${currentVariant}/tasks`); 
      if (e.key.toLowerCase() === 'd') navigate(`/hub/${currentVariant}/dsr`);
      if (e.key.toLowerCase() === 'r') navigate(`/hub/${currentVariant}/reviews`);
      if (e.key.toLowerCase() === 'y') navigate(`/hub/${currentVariant}/productivity`);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, currentVariant]);

  return (
    <Routes>
      <Route path="/" element={<HomePortal />} />
      <Route path="/hub" element={<Navigate to="/hub/vsm_pt/dashboard" replace />} />
      <Route path="/hub/:variant" element={<Layout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="analytics-dashboard" element={<AnalyticsDashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="dsr" element={<DSR />} />
        <Route path="layouts" element={<LayoutsPage />} />
        <Route path="sync" element={<SyncPage />} />
        <Route path="team" element={<Team />} />
        <Route path="manager-hub" element={<ManagerHub />} />
        <Route path="archive" element={<Archive />} />
        <Route path="burndown" element={<Burndown />} />
        <Route path="productivity" element={<Productivity />} />
      </Route>
    </Routes>
  );
}

export default App;
