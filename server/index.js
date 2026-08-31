import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import { getDb, closeDb } from './db.js';
import { seedDatabase } from './seed.js';
import casesRouter from './routes/cases.js';
import evidenceRouter from './routes/evidence.js';
import provenanceRouter from './routes/provenance.js';
import investigationRouter from './routes/investigation.js';
import aiRouter from './routes/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure data directory exists
mkdirSync(join(__dirname, '..', 'data'), { recursive: true });

// Initialize database and seed
getDb();
seedDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/cases', casesRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/provenance', provenanceRouter);
app.use('/api/investigation', investigationRouter);
app.use('/api/ai', aiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`FPC-SORVAX backend running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    closeDb();
    process.exit(0);
  });
});

export { app, server };
