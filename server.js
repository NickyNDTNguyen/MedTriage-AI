// ============================================================================
// Application bootstrap.
//
// MedTriage AI - four-layer architecture
//   public/            PRESENTATION LAYER   browser UI (HTML/CSS/ES modules)
//   src/presentation/  PRESENTATION LAYER   HTTP boundary: routes, controllers
//   src/application/   APPLICATION LOGIC    services, domain rules, workflows
//   src/dataaccess/    DATA ACCESS LAYER    repositories (SQL) + API gateways
//   src/database/      DATABASE LAYER       schema, connection, seed data
//
// Dependencies point downward only. A repository never imports a service; a
// service never imports Express; the browser only ever sees JSON from /api.
// ============================================================================
import express from 'express';
import path from 'node:path';
import config from './src/config/index.js';
import db from './src/database/connection.js';
import apiRoutes from './src/presentation/routes/index.js';
import { attachUser } from './src/presentation/middleware/session.js';
import { errorHandler, notFound } from './src/presentation/middleware/errorHandler.js';
import { sessionRepository } from './src/dataaccess/repositories/UserRepository.js';
import { ensureSeeded } from './src/database/seed.js';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));
app.use(attachUser);

// --- API (JSON only) -------------------------------------------------------
app.use('/api', apiRoutes);
app.use('/api', notFound);

// --- Presentation layer: the single-page UI --------------------------------
const publicDir = path.join(config.root, 'public');
app.use(express.static(publicDir, { extensions: ['html'] }));
app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

app.use(errorHandler);

// --- start -----------------------------------------------------------------
ensureSeeded();
sessionRepository.purgeExpired();

const server = app.listen(config.port, () => {
  console.log(`\n  MedTriage AI running at http://localhost:${config.port}`);
  console.log(`  notifications: ${config.notifications.mode}   assistant: ${config.ai.mode}`);
  console.log('  demo logins are listed in README.md\n');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => { db.close(); process.exit(0); });
  });
}

export default app;
