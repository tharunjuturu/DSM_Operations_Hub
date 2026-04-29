/**
 * Default structure to return if database.json doesn't exist yet
 */
export const getDefaultSchema = () => {
  return {
    users: [],
    tasks: [],
    customDashboards: [],
    taskGroups: [],
    reviews: [],
    archives: [],
    tracker_data: {}
  };
};

/**
 * Validates incoming payloads to ensure minimum database integrity
 */
export const validateDatabaseSchema = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid Database Payload: Expected Object');
  }
  // Add complex Joi/Zod validation or mongoose schemas here as the app scales
  return true;
};
