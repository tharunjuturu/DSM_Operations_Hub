/**
 * Reusable utility to handle catching and standardizing error responses 
 */
export const handleError = (res, error, defaultMessage = "Internal Server Error") => {
  console.error(`[Error]: ${error.message || defaultMessage}`);
  res.status(500).json({ error: error.message || defaultMessage });
};
