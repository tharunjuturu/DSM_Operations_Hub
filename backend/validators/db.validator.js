/**
 * Validates incoming POST /db payload structure to ensure data safety
 */
export const validateDbPayload = (req, res, next) => {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      error: 'Invalid database payload: Expected a JSON object schema.',
      success: false
    });
  }

  // Ensure mandatory top-level collection keys exist or default cleanly
  if (body.tasks && !Array.isArray(body.tasks)) {
    return res.status(400).json({
      error: 'Invalid database payload: "tasks" must be an array.',
      success: false
    });
  }

  if (body.teamMembers && !Array.isArray(body.teamMembers)) {
    return res.status(400).json({
      error: 'Invalid database payload: "teamMembers" must be an array.',
      success: false
    });
  }

  next();
};
