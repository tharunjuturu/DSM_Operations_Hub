import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Reviews from './pages/Reviews';
import DSR from './pages/DSR';
import Team from './pages/Team';
import Archive from './pages/Archive';
import { useStore } from './store/useStore';

function App() {
  const navigate = useNavigate();
  const loadDatabase = useStore(state => state.loadDatabase);

  useEffect(() => {
    loadDatabase();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key.toLowerCase() === 'n') navigate('/tasks'); 
      if (e.key.toLowerCase() === 'd') navigate('/dsr');
      if (e.key.toLowerCase() === 'r') navigate('/reviews');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="dsr" element={<DSR />} />
        <Route path="team" element={<Team />} />
        <Route path="archive" element={<Archive />} />
      </Route>
    </Routes>
  );
}

export default App;
