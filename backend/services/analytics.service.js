import { getEntireDatabase } from './db.service.js';

export const getFilteredUserTasks = async (userId, filters = {}) => {
  const db = await getEntireDatabase();
  const allTasks = db.tasks || [];

  const trimmedUserId = userId.trim().toLowerCase();

  // 1. Initial User Filter
  let userTasks = allTasks.filter(t => {
    const isAssigned = t.assignedTo && t.assignedTo.trim().toLowerCase() === trimmedUserId;
    const isOwner = t.owners && Array.isArray(t.owners) && t.owners.some(o => 
      (o.name && o.name.trim().toLowerCase() === trimmedUserId) || 
      (o.id && o.id.trim().toLowerCase() === trimmedUserId)
    );
    return isAssigned || isOwner;
  });

  // 2. Date Filter Logic
  const { startDate, endDate } = filters;
  
  if (startDate || endDate) {
    userTasks = userTasks.filter(task => {
      const isCompleted = task.status === 'Delivered' || task.status === 'Completed';
      
      const dateString = isCompleted 
        ? (task.completedAt || task.deliveredDate)
        : (task.createdAt || task.startDate);
        
      if (!dateString) return true; 
      
      const taskDate = new Date(dateString);
      if (isNaN(taskDate.getTime())) return true; 
      
      if (startDate && endDate) {
        return taskDate >= new Date(startDate) && taskDate <= new Date(endDate);
      } else if (startDate) {
        return taskDate >= new Date(startDate);
      } else if (endDate) {
        return taskDate <= new Date(endDate);
      }
      return true;
    });
  }

  return userTasks;
};

export const getUserStats = async (userId, filters = {}) => {
  const userTasks = await getFilteredUserTasks(userId, filters);

  let total = userTasks.length;
  let completed = 0;
  let pending = 0;
  let monthly = {}; // format: "YYYY-MM": count

  userTasks.forEach(task => {
    const isCompleted = task.status === 'Delivered' || task.status === 'Completed' || task.completedAt;
    
    if (isCompleted) {
      completed++;
      
      const dateString = task.completedAt || task.deliveredDate;
      if (dateString) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthly[monthKey] = (monthly[monthKey] || 0) + 1;
        }
      }
    } else {
      pending++;
    }
  });

  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(2) : "0.00";

  return {
    total,
    completed,
    pending,
    completionRate: parseFloat(completionRate),
    monthly 
  };
};

export const getUserTasks = async (userId, filters = {}) => {
  return await getFilteredUserTasks(userId, filters);
};
