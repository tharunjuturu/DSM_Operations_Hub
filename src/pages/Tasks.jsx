import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { X, Edit2, Trash2, Plus } from 'lucide-react';
import TaskModal from '../components/TaskModal';

const Tasks = () => {
  const allTasks = useStore(state => state.tasks);
  const activeTasks = allTasks.filter(t => t.status !== 'Delivered' && t.status !== 'Archive');
  const teamMembers = useStore(state => state.teamMembers);
  const reviews = useStore(state => state.reviews);
  const assignReviewer = useStore(state => state.assignReviewer);
  const updateReviewer = useStore(state => state.updateReviewer);
  const updateTask = useStore(state => state.updateTask);
  const deleteTask = useStore(state => state.deleteTask);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const handleCreate = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const [taskToDelete, setTaskToDelete] = useState(null);

  const handleDeleteClick = (sno) => {
    setTaskToDelete(sno);
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete);
      if (selectedTask && selectedTask.sno === taskToDelete) {
        setSelectedTask(null);
      }
      setTaskToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setTaskToDelete(null);
  };

  const [selectedTask, setSelectedTask] = useState(null);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'In Progress': return 'badge-success';
      case 'Delivered': return 'badge-info';
      case 'Yet To Start': return 'badge-neutral';
      case 'Blocked': return 'badge-danger';
      case 'FR': case 'QG': case 'Stand-by': return 'badge-warning';
      case 'Training': return 'badge-info';
      case 'Initial': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-lg)', height: '100%', position: 'relative' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexShrink: 0 }}>
          <div>
            <h1 className="title" style={{ margin: 0 }}>Task Info</h1>
            <p className="subtitle">Manage all active task groups ({activeTasks.length})</p>
          </div>
          <button className="btn btn-primary" onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> New Task Group
          </button>
        </div>

        <div className="card" style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="table-container freeze-col-1" style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ minWidth: '1200px', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10, boxShadow: '0 1px 0 var(--border)' }}>
                <tr>
                  <th style={{ width: '40px' }}>S.No</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>DSR</th>
                  <th style={{ width: '120px' }}>Task ID</th>
                  <th style={{ width: '140px' }}>Function</th>
                  <th style={{ width: '140px' }}>Task Type</th>
                  <th style={{ width: '140px' }}>Collab Responsible</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Total FT</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Completed FT</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '110px' }}>Start Date</th>
                  <th style={{ width: '110px' }}>End Date</th>
                  <th style={{ width: '150px' }}>Reviewer</th>
                  <th>Remarks</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = [];
                  activeTasks.forEach(t => {
                    if (!t.owners || t.owners.length === 0) {
                      rows.push({ ...t, owner: null, isFirstRow: true, rowSpan: 1, originalTask: t });
                    } else {
                      t.owners.forEach((owner, idx) => {
                        rows.push({
                          ...t,
                          owner: owner,
                          isFirstRow: idx === 0,
                          rowSpan: t.owners.length,
                          originalTask: t
                        });
                      });
                    }
                  });

                  return rows.map((row, index) => {
                    const t = row.originalTask;
                    return (
                      <tr
                        key={`${t.sno}-${index}`}
                        onClick={(e) => {
                          if (['BUTTON', 'SVG', 'PATH', 'INPUT'].includes(e.target.tagName)) return;
                          setSelectedTask(t);
                        }}
                        style={{ cursor: 'pointer', background: selectedTask?.sno === t.sno ? 'var(--bg)' : 'transparent' }}
                        className={row.owner?.status === 'Blocked' ? 'row-danger' : ''}
                      >
                        {row.isFirstRow && (
                          <>
                            <td rowSpan={row.rowSpan} style={{ fontWeight: '600', textAlign: 'center', verticalAlign: 'top' }}>{t.sno}</td>
                            <td rowSpan={row.rowSpan} style={{ textAlign: 'center', verticalAlign: 'top' }}>
                              <input
                                type="checkbox"
                                checked={t.include_in_dsr !== false}
                                onChange={(e) => updateTask(t.sno, { include_in_dsr: e.target.checked })}
                                onClick={e => e.stopPropagation()}
                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)', marginTop: '4px' }}
                                title="Include in Daily Status Report"
                              />
                            </td>
                            <td rowSpan={row.rowSpan} style={{ verticalAlign: 'top' }}>
                              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: '1.4' }}>
                                {t.taskIds?.join('\n')}
                              </div>
                            </td>
                            <td rowSpan={row.rowSpan} style={{ fontWeight: '500', verticalAlign: 'top' }}>{t.function}</td>
                            <td rowSpan={row.rowSpan} style={{ verticalAlign: 'top' }}>
                              <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--border)', borderRadius: '12px' }}>
                                {t.taskType}
                              </span>
                            </td>
                          </>
                        )}
                        <td style={{ verticalAlign: 'top' }}>
                          {row.owner ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                              <div style={{ width: '16px', height: '16px', borderRadius: '8px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>
                                {row.owner.name[0]}
                              </div>
                              {row.owner.name}
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                        </td>
                        <td style={{ verticalAlign: 'top', textAlign: 'center' }}>{row.owner?.totalFT || 0}</td>
                        <td style={{ verticalAlign: 'top', textAlign: 'center' }}>{row.owner?.completedFT || 0}</td>
                        {row.isFirstRow && (
                          <td rowSpan={row.rowSpan} style={{ verticalAlign: 'top', textAlign: 'center' }}>
                            <span className={`badge ${getStatusBadgeClass(t.status)}`}>{t.status}</span>
                          </td>
                        )}
                        <td style={{ verticalAlign: 'top', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.owner?.startDate}</td>
                        <td style={{ verticalAlign: 'top', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.owner?.endDate}</td>
                        {row.isFirstRow && (
                          <td rowSpan={row.rowSpan} style={{ verticalAlign: 'top' }}>
                            <select
                              value={(() => { const r = reviews.find(rev => rev.sno === t.sno); return r?.reviewer || ''; })()}
                              onChange={(e) => {
                                const sel = e.target.value;
                                const existingRev = reviews.find(rev => rev.sno === t.sno);
                                if (existingRev) {
                                  updateReviewer(t.sno, sel);
                                } else {
                                  assignReviewer({
                                    sno: t.sno,
                                    reviewer: sel,
                                    review_status: 'Pending',
                                    assigned_date: new Date().toISOString()
                                  });
                                }
                              }}
                              onClick={e => e.stopPropagation()}
                              style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border)', background: 'transparent', width: '100%', minWidth: '100px' }}
                            >
                              <option value="">Unassigned</option>
                              {teamMembers.map(m => (
                                <option key={m.sno} value={m.name}>{m.name}</option>
                              ))}
                            </select>
                          </td>
                        )}
                        <td style={{ verticalAlign: 'top', fontSize: '0.75rem', maxWidth: '150px' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.owner?.remarks}>
                            {row.owner?.remarks}
                          </div>
                        </td>
                        {row.isFirstRow && (
                          <td rowSpan={row.rowSpan} style={{ verticalAlign: 'top', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button onClick={(e) => { e.stopPropagation(); handleEdit(t); }} className="btn-icon-sm" style={{ color: 'var(--primary)', padding: '6px' }}>
                                <Edit2 size={16} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(t.sno); }} className="btn-icon-sm" style={{ color: 'var(--danger)', padding: '6px' }}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedTask && (
        <div className="card" style={{ width: '350px', flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ margin: 0 }}>Group {selectedTask.sno} Details</h3>
            <button className="btn-icon-sm" onClick={() => setSelectedTask(null)}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {selectedTask.taskIds?.map(id => <span key={id} className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>{id}</span>)}
          </div>

          <p style={{ fontSize: '0.875rem', marginBottom: '8px' }}><strong>Function:</strong> {selectedTask.function}</p>
          <span className={`badge ${getStatusBadgeClass(selectedTask.status)}`} style={{ alignSelf: 'flex-start', marginBottom: '16px' }}>
            {selectedTask.status}
          </span>

          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '8px', marginBottom: '8px' }}>Individual Owner Breakdown:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {selectedTask.owners?.map((o, i) => (
              <div key={i} style={{ padding: '8px', background: 'var(--bg)', borderRadius: '6px', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, marginBottom: '4px' }}>
                  <span>{o.name}</span>
                  <span>{o.completedFT} / {o.totalFT} FT</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <span>{o.startDate} to {o.endDate}</span>
                </div>
                {o.remarks && (
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                    {o.remarks}
                  </div>
                )}
              </div>
            ))}
          </div>

          <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Group Remarks:</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '12px', borderRadius: '6px', minHeight: '60px' }}>
            {selectedTask.remarks || "No remarks provided."}
          </p>
        </div>
      )}

      {/* The Central Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        existingTask={editingTask}
      />

      {/* Custom Deletion Confirmation Modal */}
      {taskToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div className="card glass" style={{ width: '400px', padding: '24px', textAlign: 'center', animation: 'slideIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: '50%' }}>
                <Trash2 size={24} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 'bold' }}>Confirm Deletion</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.875rem' }}>
              Are you sure you want to completely delete Task Group <b>S.No: {taskToDelete}</b>?<br />This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={handleCancelDelete} className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}>Cancel</button>
              <button onClick={handleConfirmDelete} className="btn btn-primary" style={{ flex: 1, padding: '10px', background: 'var(--danger)', borderColor: 'var(--danger)' }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
