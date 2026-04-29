import { createDashboard, getDashboardById, getDashboardData, getDashboardsByUser } from '../services/dashboard.service.js';
import { handleError } from '../utils/errorHandler.js';

export const handleCreateDashboard = async (req, res) => {
  try {
    const payload = req.body;
    const result = await createDashboard(payload);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    handleError(res, err, 'Failed to create dashboard');
  }
};

export const handleGetDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getDashboardById(id);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err, 'Failed to fetch dashboard');
  }
};

// Point 6: Missing API (Get dashboards by user)
export const handleGetDashboardsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await getDashboardsByUser(userId);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err, 'Failed to fetch user dashboards');
  }
};

export const handleGetDashboardData = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const result = await getDashboardData(id, { startDate, endDate });
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err, 'Failed to fetch dashboard data');
  }
};

export const handleUpdateDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    
    // Safety fallback: if id doesn't match payload, align them
    if (payload.dashboardId && payload.dashboardId !== id) {
      payload.dashboardId = id;
    }
    
    // Import updateDashboard dynamically or expect it from service
    // We need to add updateDashboard to the imports at top
    // For now we'll update the top imports in another step.
    const { updateDashboard } = await import('../services/dashboard.service.js');
    const result = await updateDashboard(id, payload);
    
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err, 'Failed to update dashboard');
  }
};
