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
import PersonalTracker from './pages/PersonalTracker';
import HomePortal from './pages/HomePortal';
import Burndown from './pages/Burndown';
import { useStore } from './store/useStore';

function App() {
  const navigate = useNavigate();
  const loadDatabase = useStore(state => state.loadDatabase);

  useEffect(() => {
    loadDatabase();

    // Auto-sync other tabs when they regain focus
    const handleFocus = () => loadDatabase();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadDatabase]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key.toLowerCase() === 'h') navigate('/');
      if (e.key.toLowerCase() === 'n') navigate('/hub/tasks'); 
      if (e.key.toLowerCase() === 'd') navigate('/hub/dsr');
      if (e.key.toLowerCase() === 'r') navigate('/hub/reviews');
      if (e.key.toLowerCase() === 'p') navigate('/tracker');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<HomePortal />} />
      <Route path="/hub" element={<Layout />}>
        <Route index element={<Navigate to="/hub/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="analytics-dashboard" element={<AnalyticsDashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="dsr" element={<DSR />} />
        <Route path="team" element={<Team />} />
        <Route path="archive" element={<Archive />} />
        <Route path="burndown" element={<Burndown />} />
      </Route>
      <Route path="/tracker" element={<PersonalTracker />} />
    </Routes>
  );
}

export default App;
