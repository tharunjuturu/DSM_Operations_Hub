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

  // Point 8: Widget Type Handling
  const widgetHandlers = {
    total_tasks: () => stats.total,
    completed_tasks: () => stats.completed,
    completion_rate: () => stats.completionRate,
    monthly_tasks: () => stats.monthly
  };

  const renderedLayout = dashboard.layout.map(widget => {
    // Widget Config Validation
    if (!widget.config || !widget.config.metric) {
      return { ...widget, data: null, message: "Invalid widget config" };
    }

    const handler = widgetHandlers[widget.config.metric];
    
    // Fallback handler
    if (!handler) {
      return { ...widget, data: null, message: "Unsupported widget type" };
    }

    return {
      ...widget,
      data: handler()
    };
  });

  return {
    ...dashboard,
    layout: renderedLayout
  };
};
