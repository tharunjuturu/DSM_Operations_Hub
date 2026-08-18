import { getEntireDatabase, updateEntireDatabase } from './db.service.js';
import { validateDashboardSchema } from '../models/dashboard.model.js';
import { getUserStats } from './analytics.service.js';

export const createDashboard = async (payload) => {
  const validated = validateDashboardSchema(payload);
  const db = await getEntireDatabase();
  
  if (!db.customDashboards) {
    db.customDashboards = [];
  }

  db.customDashboards.push(validated);
  await updateEntireDatabase(db);
  
  return validated;
};

export const updateDashboard = async (dashboardId, payload) => {
  const db = await getEntireDatabase();
  
  if (!db.customDashboards) {
    db.customDashboards = [];
  }

  const existingIndex = db.customDashboards.findIndex(d => d.dashboardId === dashboardId);
  if (existingIndex === -1) {
    throw new Error('Dashboard not found');
  }

  // Force payload to match the ID and preserve createdAt
  payload.dashboardId = dashboardId;
  const validated = validateDashboardSchema(payload);
  validated.createdAt = db.customDashboards[existingIndex].createdAt;
  
  db.customDashboards[existingIndex] = validated;
  await updateEntireDatabase(db);
  
  return validated;
};

export const getDashboardById = async (dashboardId) => {
  const db = await getEntireDatabase();
  const dashboards = db.customDashboards || [];
  const dashboard = dashboards.find(d => d.dashboardId === dashboardId);
  if (!dashboard) throw new Error('Dashboard not found');
  return dashboard;
};

export const deleteDashboard = async (dashboardId) => {
  const db = await getEntireDatabase();
  
  if (!db.customDashboards) {
    throw new Error('Dashboard not found');
  }

  const existingIndex = db.customDashboards.findIndex(d => d.dashboardId === dashboardId);
  if (existingIndex === -1) {
    throw new Error('Dashboard not found');
  }

  db.customDashboards.splice(existingIndex, 1);
  await updateEntireDatabase(db);
  
  return { success: true };
};

export const getDashboardsByUser = async (userId) => {
  const db = await getEntireDatabase();
  const dashboards = db.customDashboards || [];
  return dashboards.filter(d => d.userId === userId);
};

export const getDashboardData = async (dashboardId, filters = {}) => {
  const dashboard = await getDashboardById(dashboardId);
  const userId = dashboard.userId;

  // Point 5: Dashboard Engine Optimization - Cache it
  const stats = await getUserStats(userId, filters);
  const { getUserTasks } = await import('./analytics.service.js');
  let tasksCache = null;

  // Point 8: Widget Type Handling
  const widgetHandlers = {
    total_tasks: () => stats.total,
    completed_tasks: () => stats.completed,
    completion_rate: () => stats.completionRate,
    monthly_tasks: () => stats.monthly,
    data_table: async (config) => {
      if (!tasksCache) {
        tasksCache = await getUserTasks(userId, filters);
      }
      
      const requestedColumns = config.columns || ['task_id', 'name', 'status'];
      
      const rows = tasksCache.map(task => {
        const row = {};
        requestedColumns.forEach(col => {
          // Map internal task properties to standard column names
          if (col === 'task_id' || col === 'id') row[col] = task.sno || task.id;
          else if (col === 'name' || col === 'task_name') row[col] = task.taskName || task.name || 'Untitled';
          else if (col === 'status') row[col] = task.status || 'Pending';
          else if (col === 'owner') row[col] = task.owners ? task.owners.map(o => o.name).join(', ') : 'Unassigned';
          else if (col === 'project') row[col] = task.project || task.perimeter || 'N/A';
          else if (col === 'progress') row[col] = task.progress ? `${Math.round(task.progress * 100)}%` : '0%';
          else if (col === 'delivery_date' || col === 'deliveredDate') row[col] = task.deliveredDate || task.endDate || 'N/A';
          else row[col] = task[col] || '';
        });
        return row;
      });
      
      return { columns: requestedColumns, rows };
    }
  };

  const renderedLayoutPromises = dashboard.layout.map(async (widget) => {
    // Widget Config Validation
    if (!widget.config || !widget.config.metric) {
      return { ...widget, data: null, message: "Invalid widget config" };
    }

    const handler = widgetHandlers[widget.config.metric];
    
    // Fallback handler
    if (!handler) {
      return { ...widget, data: null, message: "Unsupported widget type" };
    }

    // Await handler because data_table is async
    const data = await handler(widget.config);

    return {
      ...widget,
      data
    };
  });

  const renderedLayout = await Promise.all(renderedLayoutPromises);

  return {
    ...dashboard,
    layout: renderedLayout
  };
};
