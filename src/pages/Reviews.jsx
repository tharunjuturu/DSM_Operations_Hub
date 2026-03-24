import React from 'react';
import { useStore } from '../store/useStore';
import { differenceInDays, parseISO } from 'date-fns';

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
      
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Type</th>
                <th>Reviewer</th>
                <th>Aging</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviewTasks.map(t => {
                const review = reviews.find(r => r.sno === t.sno);
                let aging = 0;
                try {
                  if(review) aging = differenceInDays(new Date(), parseISO(review.assigned_date));
                } catch(e) {}
                
                return (
                  <tr key={t.sno} className={aging > 2 ? 'row-danger' : ''}>
                    <td style={{ fontWeight: '500' }}>S.No {t.sno}</td>
                    <td>{t.function} ({t.taskType})</td>
                    <td>{review?.reviewer || 'Unassigned'}</td>
                    <td>
                      <span className={`badge ${aging > 2 ? 'badge-danger' : 'badge-neutral'}`}>
                        {aging} Days
                      </span>
                    </td>
                    <td><span className="badge badge-warning">{review?.review_status || 'Pending'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" onClick={() => handleApprove(t.sno)}>Approve</button>
                        <button className="btn btn-secondary" onClick={() => handleReject(t.sno)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {reviewTasks.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>No tasks pending review.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Reviews;
