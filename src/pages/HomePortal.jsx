import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, AppWindow, Plus, Activity } from 'lucide-react';

export default function HomePortal() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: 'white', padding: 'var(--space-xl)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity color="var(--primary)" size={32} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0, letterSpacing: '-0.5px' }}>OS Portal</h1>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <span style={{ color: 'var(--text-muted)' }}>Welcome back, Tharun</span>
             <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                 TJ
             </div>
         </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '16px', letterSpacing: '-1px' }}>
                  Choose Your Workspace
              </h2>
              <p style={{ fontSize: '1.125rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>
                  Select an application to launch. This portal is designed to seamlessly integrate all your data operations tools in one place.
              </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
             
             {/* DSM Hub Card */}
             <div 
               className="glass-dark hover-lift" 
               style={{ padding: '32px', borderRadius: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid rgba(255,255,255,0.1)' }}
               onClick={() => navigate('/hub/dashboard')}
             >
                 <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)' }}>
                    <AppWindow size={32} color="white" />
                 </div>
                 <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>DSM Operations Hub</h3>
                    <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>The centralized team workspace. Manage cross-functional tasks, auto-generate DSRs, and track the entire team's delivery matrix.</p>
                 </div>
                 <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', color: '#3b82f6', fontWeight: '600' }}>
                    Launch Hub &rarr;
                 </div>
             </div>

             {/* Personal Tracker Card */}
             <div 
               className="glass-dark hover-lift" 
               style={{ padding: '32px', borderRadius: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid rgba(255,255,255,0.1)' }}
               onClick={() => navigate('/tracker')}
             >
                 <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)' }}>
                    <Briefcase size={32} color="white" />
                 </div>
                 <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>My Tracker</h3>
                    <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>Your isolated personal workspace workspace. Punch in/out, log daily hours, manage separate tasks, and track your individual efficiency stats.</p>
                 </div>
                 <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', color: '#10b981', fontWeight: '600' }}>
                    Open Tracker &rarr;
                 </div>
             </div>

             {/* Placeholder App Card */}
             <div 
               style={{ padding: '32px', borderRadius: '24px', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', cursor: 'not-allowed', opacity: 0.6 }}
             >
                 <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={32} color="#94a3b8" />
                 </div>
                 <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#94a3b8' }}>Install New Tool</h3>
             </div>

          </div>
      </main>

      <footer style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', marginTop: '40px', fontSize: '0.875rem' }}>
         &copy; {new Date().getFullYear()} Golden Lion Engineering
      </footer>
    </div>
  );
}
