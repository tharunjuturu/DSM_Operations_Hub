import path from 'path';

export const config = {
  port: process.env.PORT || 3001,
  dbPath: path.resolve('database.json'),
  apiPrefix: '' // keeping empty since frontend directly calls /db payload based on earlier structure
};

export default config;
