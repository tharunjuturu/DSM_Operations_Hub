import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import our new modular backend architecture
import { config } from './backend/config/index.js';
import routes from './backend/routes/index.js';
import { requestContext } from './backend/utils/context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Middleware to capture variant context for request scope
app.use((req, res, next) => {
  const variant = req.headers['x-variant'] || 'vsm_pt';
  requestContext.run({ variant }, next);
});

// Mount all backend API routes
app.use(config.apiPrefix, routes);

// Serve Tool Guide directly from root
app.get('/demo_guide.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'demo_guide.html'));
});

// Serve Frontend in Production
app.use(express.static(path.join(__dirname, 'dist')));
app.use((req, res) => {
  const file = path.join(__dirname, 'dist', 'index.html');
  res.sendFile(file, (err) => {
     if (err) res.status(404).send("Frontend build not found. Run 'npm run build' first.");
  });
});

// Start Server
app.listen(config.port, () => {
  console.log(`\n✅ DSM Ops Hub Backend Server running on port ${config.port}`);
  console.log(`💾 Database mapped to: ${config.dbPath}\n`);
  console.log(`🏗️  Modular Architecture Pattern Active 🚀\n`);
});
