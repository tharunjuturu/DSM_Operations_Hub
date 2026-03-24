import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const dbPath = path.resolve('database.json');

// Get Entire Database
app.get('/db', async (req, res) => {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.json({}); 
    } else {
      res.status(500).json({ error: 'Failed to read database.json' });
    }
  }
});

// Overwrite Entire Database
app.post('/db', async (req, res) => {
  try {
    await fs.writeFile(dbPath, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write to database.json' });
  }
});

// Start Server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n✅ DSM Ops Hub Backend Server running on http://localhost:${PORT}`);
  console.log(`💾 Database synced to: ${dbPath}\n`);
});
