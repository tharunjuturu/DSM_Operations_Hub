import { create } from 'zustand'
import { differenceInDays, parseISO } from 'date-fns'

const getToday = () => new Date().toISOString().split('T')[0];

const storeConfig = (set, get) => ({
  // Initialization Models
  tasks: [],
  logs: [],
  teamModes: [],
  teamMembers: [
    { sno: 1, name: 'Divya', location: 'Bangalore', perimeter: 'VSM' },
    { sno: 2, name: 'Srivijay', location: 'Bangalore', perimeter: 'VSM' },
    { sno: 3, name: 'Rahul', location: 'Pune', perimeter: 'FSEE' },
    { sno: 4, name: 'Anita', location: 'Pune', perimeter: 'FSEE' },
    { sno: 5, name: 'Kimaya Patil', location: 'Pune', perimeter: 'FSEE' },
    { sno: 6, name: 'Tharun Kumar Juturu', location: 'Bangalore', perimeter: 'VSM' }
  ],
  leaveData: [],
  holidays: [
    { date: "2026-03-25", name: "Ugadi", scope: "ALL", locations: [] },
    { date: "2026-05-01", name: "Labour Day", scope: "ALL", locations: [] },
  ],
  reviews: [],

  // Actions
  addTeamMember: (member) => set((state) => {
    const nextSno = state.teamMembers.length > 0 ? Math.max(...state.teamMembers.map(m => m.sno)) + 1 : 1;
    return { teamMembers: [...state.teamMembers, { sno: nextSno, ...member }] };
  }),
  updateTeamMember: (sno, updates) => set((state) => ({
    teamMembers: state.teamMembers.map(m => m.sno === sno ? { ...m, ...updates } : m)
  })),
  deleteTeamMember: (sno) => set((state) => ({
    teamMembers: state.teamMembers.filter(m => m.sno !== sno)
  })),

  addTask: (taskGroup) => set((state) => ({ tasks: [...state.tasks, taskGroup] })),

  deleteTask: (sno) => set((state) => ({
    tasks: state.tasks.filter(t => t.sno !== sno)
  })),

  updateTask: (sno, updates) => set((state) => {
    const today = getToday();
    return {
      tasks: state.tasks.map(t => {
        if (t.sno !== sno) return t;
        
        const merged = { ...t, ...updates };
        
        if (updates.owners) {
           merged.totalFT = merged.owners.reduce((sum, o) => sum + Number(o.totalFT || 0), 0);
           merged.completedFT = merged.owners.reduce((sum, o) => sum + Number(o.completedFT || 0), 0);
           merged.progress = merged.totalFT > 0 ? (merged.completedFT / merged.totalFT) : 0;
           
           const allDone = merged.owners.length > 0 && merged.owners.every(o => Number(o.totalFT) > 0 && Number(o.completedFT) >= Number(o.totalFT));
           if (allDone && merged.status !== 'Archive') {
              merged.deliveredDate = today;
           }
        }

        return { ...merged, last_updated: today };
      })
    };
  }),

  appendTaskLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  assignReviewer: (review) => set((state) => ({ reviews: [...state.reviews, review] })),
  updateReviewStatus: (sno, review_status) => set((state) => ({
    reviews: state.reviews.map(r => r.sno === sno ? { ...r, review_status } : r)
  })),

  setTeamMode: (name, date, data) => set((state) => {
    const existing = state.teamModes.find(m => m.name === name && m.date === date);
    const payload = typeof data === 'string' ? { mode: data } : data;
    
    if (existing) {
      if (payload.mode === 'EMPTY') return { teamModes: state.teamModes.filter(m => !(m.name === name && m.date === date)) };
      return { teamModes: state.teamModes.map(m => (m.name === name && m.date === date) ? { ...m, ...payload } : m) };
    }
    if (payload.mode === 'EMPTY') return state;
    return { teamModes: [...state.teamModes, { name, date, ...payload }] };
  }),

  addLeave: (leave) => set((state) => ({ leaveData: [...state.leaveData, leave] })),
  removeLeave: (name, date) => set((state) => ({ leaveData: state.leaveData.filter(l => !(l.name === name && l.date === date)) })),
  
  addHoliday: (holiday) => set((state) => {
    const isDup = state.holidays.some(h => h.date === holiday.date && h.scope === holiday.scope);
    if (isDup) return state;
    return { holidays: [...state.holidays, holiday] };
  }),
  updateHoliday: (oldDate, oldName, updated) => set((state) => ({ 
    holidays: state.holidays.map(h => (h.date === oldDate && h.name === oldName) ? updated : h) 
  })),
  removeHoliday: (date, name) => set((state) => ({ 
    holidays: state.holidays.filter(h => !(h.date === date && h.name === name)) 
  })),

  archiveTask: (sno) => set((state) => ({
     tasks: state.tasks.map(t => t.sno === sno ? { ...t, status: 'Archive', last_updated: getToday() } : t)
  })),

  // Smart Selectors
  getActiveTasks: () => get().tasks.filter(t => t.status !== 'Delivered' && t.status !== 'Archive'),
  getReviewTasks: () => get().tasks.filter(t => t.status === 'FR' || t.status === 'QG'),
  getDSRTasks: () => get().tasks.filter(t => t.include_in_dsr),
  getRiskTasks: () => {
     const active = get().getActiveTasks();
     return active.filter(t => {
        try {
           return differenceInDays(parseISO(t.endDate), new Date()) < 3 && t.progress < 0.7;
        } catch(e) { return false; }
     });
  }
});

// Build Store Appended with Intercept-Save API Server logic
export const useStore = create((set, get) => {
  let isHydrating = false;

  const interceptSet = (...args) => {
    set(...args);
    if (isHydrating) return; // Prevent loop during initial download

    fetch(`/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(get())
    }).catch(err => console.error("Database Save Failed - Is the Node Server Running?", err));
  };

  return {
    ...storeConfig(interceptSet, get),
    loadDatabase: async () => {
      try {
        isHydrating = true;
        const res = await fetch(`/db`);
        if (res.ok) {
           const dbState = await res.json();
           if (Object.keys(dbState).length > 0) {
             set(dbState);
           } else {
             // Create db.json for the first time with base structure
             interceptSet(get());
           }
        }
        isHydrating = false;
      } catch (e) {
        console.error('Failed to connect to backend DB. Make sure node server.js is running!', e);
        isHydrating = false;
      }
    }
  };
});
