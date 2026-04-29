export const validateDashboardSchema = (dashboard) => {
  if (!dashboard || typeof dashboard !== 'object') {
    throw new Error('Invalid Dashboard Payload: Expected Object');
  }
  
  if (!dashboard.dashboardId) {
    dashboard.dashboardId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  if (!dashboard.userId) throw new Error('Missing userId');
  if (!dashboard.name) throw new Error('Missing name');
  
  // Point 10: Save Dashboard Validation (important)
  if (!dashboard.layout || !Array.isArray(dashboard.layout) || dashboard.layout.length === 0) {
    throw new Error("Dashboard must have at least one widget");
  }

  // Ensure timestamps exist
  if (!dashboard.createdAt) dashboard.createdAt = new Date().toISOString();
  dashboard.updatedAt = new Date().toISOString();

  return dashboard;
};
