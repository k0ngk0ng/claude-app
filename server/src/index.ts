import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './db.js';
import { authRoutes } from './routes/auth.js';
import { settingsRoutes } from './routes/settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const PORT = parseInt(process.env.PORT || '3456', 10);

// Initialize database
initDatabase();

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',  // Electron app uses file:// or localhost
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/api/health', (c) => c.json({
  status: 'ok',
  version: pkg.version,
  registrationDisabled: process.env.DISABLE_REGISTRATION === 'true',
}));

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/settings', settingsRoutes);

// Start
serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[server] ClaudeStudio server running on http://localhost:${info.port}`);
});
