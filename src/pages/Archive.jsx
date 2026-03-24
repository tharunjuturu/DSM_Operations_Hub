import React from 'react';
import { useStore } from '../store/useStore';

const Archive = () => {
  const { tasks } = useStore();
  const archivedTasks = tasks.filter(t => t.status === 'Delivered' || t.status === 'Archive');

  return (
    <div>
      <h1 className="title">Archive</h1>
      <p className="subtitle" style={{ marginBottom: '24px' }}>Historically completed and delivered tasks.</p>

      {archivedTasks.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No tasks have been completed and archived yet.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: '500', color: 'var(--text-muted)' }}>Task IDs</th>
                <th style={{ padding: '12px 16px', fontWeight: '500', color: 'var(--text-muted)' }}>Feature</th>
                <th style={{ padding: '12px 16px', fontWeight: '500', color: 'var(--text-muted)' }}>Owner</th>
                <th style={{ padding: '12px 16px', fontWeight: '500', color: 'var(--text-muted)' }}>Delivered Date</th>
              </tr>
            </thead>
            <tbody>
              {archivedTasks.map(t => (
                 <tr key={t.sno} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                     <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem' }}>{t.taskIds?.join('\n')}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{t.function}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{t.owners?.map(o => o.name).join(', ')}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {t.deliveredDate || t.last_updated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default Archive;
