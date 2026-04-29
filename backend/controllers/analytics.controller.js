import { getUserStats } from '../services/analytics.service.js';
import { handleError } from '../utils/errorHandler.js';

export const getUserAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!id) return res.status(400).json({ error: 'User ID is required' });

    const stats = await getUserStats(id, { startDate, endDate });
    res.json({ success: true, data: stats });
  } catch (err) {
    handleError(res, err, 'Failed to fetch user analytics');
  }
};
