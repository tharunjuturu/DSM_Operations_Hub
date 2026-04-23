import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from './useStore';

// Mock global fetch for Zustand's async logic to prevent real API calls
global.fetch = vi.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

describe('Zustand Global Store (useStore)', () => {
  beforeEach(() => {
    // Reset state before each test
    useStore.setState({ tasks: [], teamMembers: [], holidays: [] });
    vi.clearAllMocks();
  });

  it('adds a new team member and auto-assigns sno', () => {
    useStore.getState().addTeamMember({ name: 'Turing', location: 'Remote', perimeter: 'AI' });
    const members = useStore.getState().teamMembers;
    
    expect(members.length).toBe(1);
    expect(members[0].name).toBe('Turing');
    expect(members[0].sno).toBe(1); // Auto generated sno based on max

    useStore.getState().addTeamMember({ name: 'Lovelace', location: 'London', perimeter: 'Engine' });
    expect(useStore.getState().teamMembers[1].sno).toBe(2);
  });

  it('adds a task configuration to the state', () => {
    const taskData = { sno: 99, function: 'Testing Unit' };
    useStore.getState().addTask(taskData);
    
    const tasks = useStore.getState().tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].sno).toBe(99);
    expect(tasks[0].function).toBe('Testing Unit');
  });

  it('updates task progress intelligently based on owners ft variables', () => {
    const taskData = { 
      sno: 101, 
      function: 'Calculation Test', 
      status: 'In Progress',
      owners: [{ sno: 1, name: 'Alice', totalFT: 20, completedFT: 0 }]
    };
    useStore.getState().addTask(taskData);
    
    // Dispatch an update to trigger the progress reduction logic
    useStore.getState().updateTask(101, { 
      owners: [{ sno: 1, name: 'Alice', totalFT: 20, completedFT: 10 }] 
    });
    
    const refreshedTasks = useStore.getState().tasks;
    const targetTask = refreshedTasks[0];
    
    expect(targetTask.totalFT).toBe(20);
    expect(targetTask.completedFT).toBe(10);
    expect(targetTask.progress).toBe(0.5); // (10 / 20)
  });

  it('deletes a task accurately by sno', () => {
    const task1 = { sno: 1, name: 'Delete target' };
    const task2 = { sno: 2, name: 'Keep target' };
    useStore.getState().addTask(task1);
    useStore.getState().addTask(task2);

    expect(useStore.getState().tasks).toHaveLength(2);
    
    useStore.getState().deleteTask(1);
    
    const remainingTasks = useStore.getState().tasks;
    expect(remainingTasks).toHaveLength(1);
    expect(remainingTasks[0].sno).toBe(2);
  });
});
