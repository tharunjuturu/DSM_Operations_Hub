import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { improveComment } from '../utils/mockAI';

const TaskModal = ({ isOpen, onClose, existingTask = null }) => {
  const tasks = useStore(state => state.tasks);
  const teamMembers = useStore(state => state.teamMembers);
  const addTask = useStore(state => state.addTask);
  const updateTask = useStore(state => state.updateTask);
  
  const [formData, setFormData] = useState({
    sno: 1,
    function: '',
    taskType: '',
    taskIds: '',
    startDate: '',
    endDate: '',
    status: 'Initial',
    remarks: '',
    deliveredDate: '',
    ftrOtd: '',
    owners: []
  });

  const [error, setError] = useState('');
  const [isImprovingGroup, setIsImprovingGroup] = useState(false);
  const [improvingOwnerIdx, setImprovingOwnerIdx] = useState(null);

  const handleImproveGroupRemarks = async () => {
    setIsImprovingGroup(true);
    const newText = await improveComment(formData.remarks);
    setFormData(prev => ({ ...prev, remarks: newText }));
    setIsImprovingGroup(false);
  };

  const handleImproveOwnerRemarks = async (idx, text) => {
    setImprovingOwnerIdx(idx);
    const newText = await improveComment(text);
    const newOwners = [...formData.owners];
    newOwners[idx].remarks = newText;
    setFormData(prev => ({ ...prev, owners: newOwners }));
    setImprovingOwnerIdx(null);
  };

  useEffect(() => {
    if (existingTask) {
      setFormData({
         ...existingTask,
         taskIds: existingTask.taskIds ? existingTask.taskIds.join(', ') : '',
         deliveredDate: existingTask.deliveredDate || '',
         ftrOtd: existingTask.ftrOtd || ''
      });
    } else {
      const nextSno = tasks.length > 0 ? Math.max(...tasks.map(t => t.sno)) + 1 : 1;
      setFormData({
        sno: nextSno,
        function: '',
        taskType: '',
        taskIds: '',
        startDate: '',
        endDate: '',
        status: 'Initial',
        remarks: '',
        deliveredDate: '',
        ftrOtd: '',
        owners: []
      });
    }
  }, [existingTask, isOpen, tasks]);

  if (!isOpen) return null;

  const handleAddOwner = () => {
    setFormData(prev => ({
      ...prev,
      owners: [...prev.owners, { 
         id: `usr_${Math.floor(Math.random() * 1000)}`, 
         name: '', 
         totalFT: 0, 
         completedFT: 0,
         plannedFTPerDay: 0, 
         startDate: prev.startDate, 
         endDate: prev.endDate, 
         remarks: '' 
      }]
    }));
  };

  const handleRemoveOwner = (index) => {
    const newOwners = [...formData.owners];
    newOwners.splice(index, 1);
    setFormData(prev => ({ ...prev, owners: newOwners }));
  };

  const handleOwnerChange = (index, field, value) => {
    const newOwners = [...formData.owners];
    newOwners[index][field] = value;
    setFormData(prev => ({ ...prev, owners: newOwners }));
  };

  const validate = () => {
    if (!formData.function.trim()) return "Function is required.";
    if (!formData.taskIds.trim()) return "At least one Task ID is required.";
    if (!formData.startDate || !formData.endDate) return "Both Start and End dates are required.";
    if (new Date(formData.startDate) > new Date(formData.endDate)) return "Task End date must be strictly after or equal to Start date.";
    if (formData.owners.length === 0) return "At least one owner is required.";
    
    for (const owner of formData.owners) {
      if (!owner.name.trim()) return "All owners must have a name selected.";
      const tFT = Number(owner.totalFT);
      const cFT = Number(owner.completedFT);
      if (tFT <= 0) return `Owner ${owner.name} must have Total FT > 0.`;
      if (cFT > tFT) return `Owner ${owner.name}'s completed FT (${cFT}) cannot exceed Total FT (${tFT}).`;
      
      const tStart = new Date(formData.startDate);
      const tEnd = new Date(formData.endDate);
      const oStart = new Date(owner.startDate);
      const oEnd = new Date(owner.endDate);
      
      if (oStart < tStart || oEnd > tEnd) {
         return `Owner ${owner.name}'s dates must fall strictly within the Task's Date Range (${formData.startDate} to ${formData.endDate}).`;
      }
    }
    
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');

    const processedTaskIds = formData.taskIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
    const calculatedTotalFT = formData.owners.reduce((s, o) => s + Number(o.totalFT || 0), 0);
    const calculatedCompletedFT = formData.owners.reduce((s, o) => s + Number(o.completedFT || 0), 0);
    const calculatedProgress = calculatedTotalFT > 0 ? (calculatedCompletedFT / calculatedTotalFT) : 0;
    
    if ((formData.status === 'Delivered' || formData.status === 'Archive') && !formData.deliveredDate) {
      setError("Delivered Date is required when status is Delivered or Archive.");
      return;
    }

    const finalTaskGroup = { 
       ...formData,
       taskIds: processedTaskIds,
       totalFT: calculatedTotalFT,
       completedFT: calculatedCompletedFT,
       progress: calculatedProgress,
       status: formData.status,
       deliveredDate: formData.deliveredDate,
       ftrOtd: formData.ftrOtd,
       include_in_dsr: existingTask ? existingTask.include_in_dsr : true,
       last_updated: new Date().toISOString().split('T')[0]
    };

    if (existingTask) {
      updateTask(formData.sno, finalTaskGroup);
    } else {
      addTask(finalTaskGroup);
    }
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card" style={{ width: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{existingTask ? `Edit Task Group (S.No: ${existingTask.sno})` : 'Create New Task Group'}</h2>
          <button className="btn-icon-sm" onClick={onClose}><X size={20} /></button>
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '6px', marginBottom: '16px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>S.No</label>
              <input type="number" value={formData.sno} disabled style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Function *</label>
              <input type="text" value={formData.function} onChange={e => setFormData({...formData, function: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Task Type *</label>
              <input type="text" value={formData.taskType} onChange={e => setFormData({...formData, taskType: e.target.value})} placeholder="e.g. Update_BRANCH_PT" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
            </div>
          </div>

          <div>
             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Task IDs * (comma-separated)</label>
             <input type="text" value={formData.taskIds} onChange={e => setFormData({...formData, taskIds: e.target.value})} placeholder="SPA_00122, SPA_00341" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: (formData.status === 'Delivered' || formData.status === 'Archive' || formData.deliveredDate) ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Task Group Start Date *</label>
              <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Task Group End Date *</label>
              <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Global Task Status *</label>
              <select value={formData.status} onChange={e => {
                  const newStatus = e.target.value;
                  setFormData(prev => {
                     const updates = { status: newStatus };
                     if ((newStatus === 'Delivered' || newStatus === 'Archive') && prev.status !== 'Delivered' && prev.status !== 'Archive' && !prev.deliveredDate) {
                        updates.deliveredDate = new Date().toISOString().split('T')[0];
                     }
                     return { ...prev, ...updates };
                  });
              }} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                 <option>In Progress</option>
                 <option>Yet To Start</option>
                 <option>Training</option>
                 <option>Stand-by</option>
                 <option>FR</option>
                 <option>QG</option>
                 <option>Blocked</option>
                 <option>Delivered</option>
                 <option>Archive</option>
                 <option>Initial</option>
              </select>
            </div>
            
            {(formData.status === 'Delivered' || formData.status === 'Archive' || formData.deliveredDate) && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Delivered Date *</label>
                  <input type="date" value={formData.deliveredDate || ''} onChange={e => setFormData({...formData, deliveredDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>FTR/OTD</label>
                  <select value={formData.ftrOtd || ''} onChange={e => setFormData({...formData, ftrOtd: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <option value="">- Select -</option>
                    <option value="OK FTR">OK FTR</option>
                    <option value="NOK FTR">NOK FTR</option>
                    <option value="NOK OTD">NOK OTD</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Assigned Owners *</label>
              <button type="button" onClick={handleAddOwner} className="btn-icon-sm" style={{ color: 'var(--primary)', gap: '4px', padding: '4px 8px', width: 'auto' }}>
                <Plus size={16} /> Add Owner
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {formData.owners.map((owner, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <select value={owner.name} onChange={e => handleOwnerChange(idx, 'name', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', flex: 1, marginRight: '16px' }}>
                       <option value="">Select Name...</option>
                       {teamMembers && teamMembers.filter(m => (m.status || 'Active') !== 'Inactive' || m.name === owner.name).map(m => (
                         <option key={m.sno || m.name} value={m.name}>{m.name}</option>
                       ))}
                     </select>
                     <button type="button" onClick={() => handleRemoveOwner(idx)} className="btn-icon-sm" style={{ color: 'var(--danger)' }}>
                       <Trash2 size={16} />
                     </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                    <div>
                       <span style={{ fontSize: '10px', color: 'gray', display: 'block' }}>Total FT</span>
                       <input type="number" value={owner.totalFT} onChange={e => handleOwnerChange(idx, 'totalFT', Number(e.target.value))} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                       <span style={{ fontSize: '10px', color: 'gray', display: 'block' }}>Done FT</span>
                       <input type="number" value={owner.completedFT} onChange={e => handleOwnerChange(idx, 'completedFT', Number(e.target.value))} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                       <span style={{ fontSize: '10px', color: 'gray', display: 'block' }}>Plan FT/Day</span>
                       <input type="number" step="0.1" value={owner.plannedFTPerDay || 0} onChange={e => handleOwnerChange(idx, 'plannedFTPerDay', Number(e.target.value))} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                       <span style={{ fontSize: '10px', color: 'gray', display: 'block' }}>Owner Start</span>
                       <input type="date" value={owner.startDate} onChange={e => handleOwnerChange(idx, 'startDate', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                       <span style={{ fontSize: '10px', color: 'gray', display: 'block' }}>Owner End</span>
                       <input type="date" value={owner.endDate} onChange={e => handleOwnerChange(idx, 'endDate', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                    </div>
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                     <span style={{ fontSize: '10px', color: 'gray', display: 'block' }}>Owner Remarks</span>
                     <div style={{ display: 'flex', gap: '8px' }}>
                       <input type="text" value={owner.remarks} placeholder="Specific notes..." onChange={e => handleOwnerChange(idx, 'remarks', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                       <button 
                         type="button" 
                         onClick={() => handleImproveOwnerRemarks(idx, owner.remarks)}
                         disabled={improvingOwnerIdx === idx}
                         title="AI Improve Comment"
                         style={{ 
                           background: 'var(--purple-bg)', color: 'var(--purple)', border: '1px solid var(--purple)', 
                           borderRadius: '4px', padding: '0 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                         }}
                       >
                         {improvingOwnerIdx === idx ? <span style={{ fontSize: '12px', fontWeight: 'bold' }}>...</span> : <Sparkles size={14} />}
                       </button>
                     </div>
                  </div>
                </div>
              ))}
              {formData.owners.length === 0 && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No owners assigned yet. Task Group requires at least 1 owner.</p>
              )}
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500 }}>Task Group Remarks</label>
              <button 
                type="button" 
                onClick={handleImproveGroupRemarks}
                disabled={isImprovingGroup}
                style={{ 
                  background: 'var(--purple-bg)', color: 'var(--purple)', border: '1px solid var(--purple)', borderRadius: '4px', 
                  padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' 
                }}
              >
                {isImprovingGroup ? '✨ Enhancing...' : <><Sparkles size={12} /> AI Rewrite</>}
              </button>
            </div>
            <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} rows={2} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Task Group</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
