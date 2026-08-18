import { create } from 'zustand'
import { differenceInDays, parseISO } from 'date-fns'

const getToday = () => new Date().toISOString().split('T')[0];

const storeConfig = (set, get) => ({
  // Initialization Models
  tasks: [],
  taskDailyLogs: [],
  logs: [],
  teamModes: [],
  teamMembers: [
    { sno: 1, name: 'Divya', location: 'Bangalore', perimeter: 'VSM PT' },
    { sno: 2, name: 'Srivijay', location: 'Bangalore', perimeter: 'VSM PT' },
    { sno: 3, name: 'Rahul', location: 'Pune', perimeter: 'VSM PT' },
    { sno: 4, name: 'Anita', location: 'Pune', perimeter: 'VSM PT' },
    { sno: 5, name: 'Kimaya Patil', location: 'Pune', perimeter: 'VSM PT' },
    { sno: 6, name: 'Tharun Kumar Juturu', location: 'Bangalore', perimeter: 'VSM PT' }
  ],
  leaveData: [],
  holidays: [
    { date: "2026-03-25", name: "Ugadi", scope: "ALL", locations: [] },
    { date: "2026-05-01", name: "Labour Day", scope: "ALL", locations: [] },
  ],
  reviews: [],
  excelTasks: [],
  layouts: [],

  // Personal Tracker Models
  currentVariant: 'vsm_pt',
  setCurrentVariant: (variant) => set({ currentVariant: variant }),
  systemInfo: null,
  loadSystemInfo: async () => {
    try {
      const res = await fetch('/api/system-info');
      if (res.ok) {
        const data = await res.json();
        set({ systemInfo: data });
      }
    } catch (e) {
      console.error('Failed to load system info', e);
    }
  },

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
    tasks: state.tasks.filter(t => Number(t.sno) !== Number(sno))
  })),

  updateTask: (sno, updates) => set((state) => {
    const today = getToday();
    return {
      tasks: state.tasks.map(t => {
        if (Number(t.sno) !== Number(sno)) return t;

        const merged = { ...t, ...updates };

        if (updates.owners) {
          merged.totalFT = merged.owners.reduce((sum, o) => sum + Number(o.totalFT || 0), 0);
          merged.completedFT = merged.owners.reduce((sum, o) => sum + Number(o.completedFT || 0), 0);
          merged.progress = merged.totalFT > 0 ? (merged.completedFT / merged.totalFT) : 0;

          const allDone = merged.owners.length > 0 && merged.owners.every(o => Number(o.totalFT) > 0 && Number(o.completedFT) >= Number(o.totalFT));
        }

        return { ...merged, last_updated: today };
      })
    };
  }),

  appendTaskLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  upsertTaskDailyLog: (taskSno, ownerName, date, updates) => set((state) => {
    const existingIdx = (state.taskDailyLogs || []).findIndex(l => l.taskSno === taskSno && l.ownerName === ownerName && l.date === date);
    if (existingIdx >= 0) {
      const newLogs = [...(state.taskDailyLogs || [])];
      newLogs[existingIdx] = { ...newLogs[existingIdx], ...updates };
      return { taskDailyLogs: newLogs };
    }
    return { taskDailyLogs: [...(state.taskDailyLogs || []), { taskSno, ownerName, date, ...updates }] };
  }),
  assignReviewer: (review) => set((state) => ({ reviews: [...state.reviews, review] })),
  updateReviewStatus: (sno, review_status) => set((state) => ({
    reviews: state.reviews.map(r => r.sno === sno ? { ...r, review_status } : r)
  })),
  updateReviewer: (sno, reviewer) => set((state) => ({
    reviews: state.reviews.map(r => r.sno === sno ? { ...r, reviewer } : r)
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

  addLayout: (layout) => set((state) => {
    const nextId = 'lay_' + Date.now();
    return { layouts: [...(state.layouts || []), { id: nextId, ...layout }] };
  }),
  updateLayout: (id, updates) => set((state) => ({
    layouts: (state.layouts || []).map(l => l.id === id ? { ...l, ...updates } : l)
  })),
  deleteLayout: (id) => set((state) => ({
    layouts: (state.layouts || []).filter(l => l.id !== id)
  })),

  // Smart Selectors
  getActiveTasks: () => (get().tasks || []).filter(t => t.status !== 'Delivered' && t.status !== 'Archive'),
  getReviewTasks: () => (get().tasks || []).filter(t => t.status === 'FR' || t.status === 'QG'),
  getDSRTasks: () => (get().tasks || []).filter(t => t.include_in_dsr),
  getRiskTasks: () => {
    const active = get().getActiveTasks();
    return active.filter(t => {
      try {
        return differenceInDays(parseISO(t.endDate), new Date()) < 3 && t.progress < 0.7;
      } catch (e) { return false; }
    });
  }
});

// Build Store Appended with Intercept-Save API Server logic
export const useStore = create((set, get) => {
  let isHydrating = false;
  let saveQueue = Promise.resolve();

  const interceptSet = (...args) => {
    const updateFnOrObj = args[0];
    const replace = args[1];

    // 1. Optimistic UI update
    set(...args);
    if (isHydrating) return; // Prevent loop during initial download

    // Check if this update is purely transient UI state (e.g., currentVariant, systemInfo)
    const partialState = typeof updateFnOrObj === 'function' ? updateFnOrObj(get()) : updateFnOrObj;
    const isTransient = partialState && Object.keys(partialState).every(k => k === 'currentVariant' || k === 'systemInfo');
    if (isTransient) return;

    // 2. Queue the save operations to prevent concurrent race conditions
    saveQueue = saveQueue.then(async () => {
      try {
        const res = await fetch(`/db?t=${new Date().getTime()}`, {
          headers: { 'x-variant': get().currentVariant || 'vsm_pt' },
          cache: 'no-store'
        });
        if (!res.ok) throw new Error("Failed to fetch latest DB");
        
        let serverState = await res.json();
        if (Object.keys(serverState).length === 0) serverState = get(); // fallback if DB empty
        
        // 3. Re-apply the same update on the server state
        let updatedServerState;
        if (typeof updateFnOrObj === 'function') {
          const partialUpdate = updateFnOrObj(serverState);
          updatedServerState = replace ? partialUpdate : { ...serverState, ...partialUpdate };
        } else {
          updatedServerState = replace ? updateFnOrObj : { ...serverState, ...updateFnOrObj };
        }

        // 4. Save the merged state back to server
        await fetch(`/db`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-variant': get().currentVariant || 'vsm_pt'
          },
          body: JSON.stringify(updatedServerState)
        });
        
        // 5. Sync local state with the newly merged server state silently
        isHydrating = true;
        set(updatedServerState);
        isHydrating = false;
      } catch (err) {
        console.error("Database Save Failed - Is the Node Server Running?", err);
      }
    });
  };

  return {
    ...storeConfig(interceptSet, get),
    loadDatabase: async () => {
      try {
        isHydrating = true;
        const res = await fetch(`/db?t=${new Date().getTime()}`, {
          headers: { 'x-variant': get().currentVariant || 'vsm_pt' },
          cache: 'no-store'
        });
        if (res.ok) {
          const dbState = await res.json();
          if (Object.keys(dbState).length > 0) {
            // Automatically calculate plannedFTPerDay for any old task owners if missing
            if (dbState.tasks) {
              dbState.tasks = dbState.tasks.map(t => {
                let updated = false;
                const newOwners = t.owners?.map(o => {
                  if (o.plannedFTPerDay === undefined || o.plannedFTPerDay === null || Number(o.plannedFTPerDay) === 0) {
                    const tFT = Number(o.totalFT) || 0;
                    if (tFT > 0) {
                      const start = o.startDate || t.startDate;
                      const end = o.endDate || t.endDate;
                      if (start && end) {
                        try {
                          const s = new Date(start);
                          const e = new Date(end);
                          if (s <= e) {
                            let count = 0;
                            let cur = new Date(s);
                            while (cur <= e) {
                              const day = cur.getDay();
                              if (day !== 0 && day !== 6) count++;
                              cur.setDate(cur.getDate() + 1);
                            }
                            const duration = count || 1;
                            o.plannedFTPerDay = parseFloat(Math.max(1, tFT / duration).toFixed(2));
                            updated = true;
                          }
                        } catch (err) {}
                      }
                    }
                  }
                  return o;
                });
                return updated ? { ...t, owners: newOwners } : t;
              });
            }
            set(dbState);
          } else {
            // Create db.json for the first time with base structure
            isHydrating = false;
            interceptSet(get());
            isHydrating = true;
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