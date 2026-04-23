import React from 'react';
import { useStore } from '../store/useStore';
import { differenceInDays, parseISO } from 'date-fns';
import EmptyState from '../components/EmptyState';
import { ClipboardCheck } from 'lucide-react';

const Reviews = () => {
  const reviews = useStore(state => state.reviews);
  const tasks = useStore(state => state.tasks);
  const updateTask = useStore(state => state.updateTask);
  const updateReviewStatus = useStore(state => state.updateReviewStatus);

  const reviewTasks = tasks.filter(t => t.status === 'FR' || t.status === 'QG');

  const handleApprove = (sno) => {
    updateReviewStatus(sno, 'Approved');
    updateTask(sno, { status: 'Delivered' });
  };

  const handleReject = (sno) => {
    updateReviewStatus(sno, 'Rejected');
    updateTask(sno, { status: 'In Progress' });
  };

  return (
    <div>
      <h1 className="title">Task Reviews</h1>
      <p className="subtitle" style={{ marginBottom: 'var(--space-lg)' }}>Action pending FR and QG items.</p>
      
      {reviewTasks.length === 0 ? (
        <EmptyState 
          icon={ClipboardCheck} 
          title="All caught up!" 
          description="There are no tickets waiting for FR or QG reviews. Check back later." 
        />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Function Name</th>
                  <th>Task Type</th>
                  <th>Reviewer</th>
                  <th style={{ textAlign: 'center' }}>Total Sheets</th>
                  <th style={{ textAlign: 'center' }}>Completed Sheets</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviewTasks.map(t => {
                  const review = reviews.find(r => r.sno === t.sno);
                  
                  return (
                    <tr key={t.sno}>
                      <td style={{ verticalAlign: 'top' }}>
                        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: '1.4' }}>
                          {t.taskIds?.join('\n') || `S.No ${t.sno}`}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top', fontWeight: '500' }}>{t.function}</td>
                      <td style={{ verticalAlign: 'top' }}>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--border)', borderRadius: '12px' }}>
                           {t.taskType}
                        </span>
                      </td>
                      <td style={{ verticalAlign: 'top' }}>{review?.reviewer || 'Unassigned'}</td>
                      <td style={{ verticalAlign: 'top', textAlign: 'center' }}>{t.totalFT || 0}</td>
                      <td style={{ verticalAlign: 'top', textAlign: 'center' }}>{t.completedFT || 0}</td>
                      <td style={{ verticalAlign: 'top' }}>
                         <span className="badge badge-warning">{review?.review_status || 'Pending'}</span>
                      </td>
                      <td style={{ verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" onClick={() => handleApprove(t.sno)} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Approve</button>
                          <button className="btn btn-secondary" onClick={() => handleReject(t.sno)} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default Reviews;
