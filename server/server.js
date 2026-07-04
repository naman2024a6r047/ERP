const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ── Load environment variables FIRST — before any other module reads process.env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { sequelize } = require('./models');
const errorHandler = require('./middleware/errorHandler');
const auditLogger = require('./middleware/auditLogger');

const app = express();
const port = parseInt(process.env.PORT, 10) || 5000;
const host = process.env.HOST || '0.0.0.0';
const isProd = process.env.NODE_ENV === 'production';

// ── Global Process Error Handlers ─────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  // Give the logger a moment to flush, then exit
  setTimeout(() => process.exit(1), 1000);
});

// Trust the first proxy hop (essential for rate limiting behind reverse proxies)
app.set('trust proxy', 1);

// ── Security Headers (L5) ─────────────────────────────────────────────────────
// Configure Helmet to allow service worker registration for push notifications.
// Default helmet() sets worker-src 'none' which blocks SW registration entirely.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://fcm.googleapis.com", "https://*.push.services.mozilla.com"],
      workerSrc: ["'self'"],
      childSrc: ["'self'", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── Global Rate Limiter ────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                  // limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
}));

// ── CORS ───────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

// ── Body Parsers with size limits (M9) ─────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Global Audit Logger (A2) ──────────────────────────────────────────────────
app.use(auditLogger);

// ── Serve React static files (production) ────────────────────────────────────
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(clientBuildPath));

// ── Serve uploaded files (avatars, documents) ─────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/results', require('./routes/results'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/events', require('./routes/events'));
app.use('/api/session', require('./routes/session'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/fc', require('./routes/feeCollector'));
app.use('/api/teacher-attendance', require('./routes/teacherAttendance'));
app.use('/api/class-incharge', require('./routes/classIncharge'));
app.use('/api/class-fees', require('./routes/classFees'));
app.use('/api/credentials', require('./routes/credentials'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/settings', require('./routes/settings'));

// ── Database status (shared between health and db-check) ──────────────────────
let dbStatus = { connected: false, error: null, checkedAt: null };

// ── Health check (quick — uses cached status) ─────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: dbStatus.connected ? 'OK' : 'ERROR',
    message: 'School ERP API running',
    database: dbStatus
  });
});

// ── Database check (live — runs a fresh authenticate()) ───────────────────────
app.get('/api/db-check', async (req, res) => {
  try {
    await sequelize.authenticate();
    dbStatus.connected = true;
    dbStatus.error = null;
    dbStatus.checkedAt = new Date().toISOString();
    res.json({
      status: 'OK',
      database: 'connected',
      checkedAt: dbStatus.checkedAt,
    });
  } catch (err) {
    dbStatus.connected = false;
    dbStatus.error = err.message;
    dbStatus.checkedAt = new Date().toISOString();
    res.status(503).json({
      status: 'ERROR',
      database: err.message,
      checkedAt: dbStatus.checkedAt,
    });
  }
});

// ── React SPA catch-all (must be AFTER all /api routes) ──────────────────────
// Any request that doesn't match an API route gets the React app's index.html,
// allowing React Router to handle client-side routing.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// ── Dedicated Error Handler (L6, M10) ──────────────────────────────────────────
app.use(errorHandler);

// ── Startup ───────────────────────────────────────────────────────────────────
// Start listening immediately so the server stays online and Hostinger doesn't
// return a 503. Database connection happens asynchronously in the background so
// health-check routes respond instantly even during a slow MySQL cold-start.
app.listen(port, host, () => {
  console.log('════════════════════════════════════════════════════════');
  console.log(`  School ERP Server started`);
  console.log(`  Host     : ${host}`);
  console.log(`  Port     : ${port}`);
  console.log(`  NODE_ENV : ${process.env.NODE_ENV || 'not set'}`);
  console.log('════════════════════════════════════════════════════════');

  // ── Connect to database asynchronously ──────────────────────────────────
  sequelize.authenticate()
    .then(() => {
      console.log('[DB] ✅ MySQL connected successfully');
      dbStatus.connected = true;
      dbStatus.error = null;
      dbStatus.checkedAt = new Date().toISOString();

      // ── Schema sync strategy ────────────────────────────────────────────
      // PRODUCTION  → sync() with NO alter and NO force. Tables must already
      //               exist (created via schema.sql or migrations).
      // DEVELOPMENT → sync({ alter: true }) to auto-apply model changes.
      if (isProd) {
        console.log('[DB] Production mode — skipping schema alter (tables must exist)');
        return sequelize.sync().then(() => {
          // Hotfix: Ensure Settings value is LONGTEXT for base64 logos
          return sequelize.query('ALTER TABLE `settings` MODIFY COLUMN `value` LONGTEXT;').catch(err => {
            console.error('[DB] Failed to alter settings table to LONGTEXT:', err.message);
          });
        });
      } else {
        console.log('[DB] Development mode — running sync({ alter: true })');
        return sequelize.sync({ alter: true });
      }
    })
    .then(async () => {
      console.log('[DB] ✅ Database tables verified and synced');
      try {
        const { migratePendingStudents } = require('./utils/dbMigrator');
        await migratePendingStudents();

        const { rejectOldPendingStudents } = require('./utils/cleanupTasks');
        // Run once on boot, then every 24 hours
        await rejectOldPendingStudents();
        setInterval(rejectOldPendingStudents, 24 * 60 * 60 * 1000);
      } catch (migrationErr) {
        console.error('[DB] ❌ Automatic migration of pending students failed:', migrationErr.message);
      }
    })
    .catch((err) => {
      console.error('════════════════════════════════════════════════════════');
      console.error('[DB] ❌ Database connection FAILED');
      console.error(`[DB] Error name    : ${err.name}`);
      console.error(`[DB] Error message : ${err.message}`);

      // Helpful diagnostics for common Hostinger errors
      if (err.message.includes('ECONNREFUSED')) {
        console.error('[DB] HINT: MySQL is not reachable. Check DB_HOST and DB_PORT.');
        console.error('[DB] HINT: On Hostinger, DB_HOST should be 127.0.0.1 and DB_PORT 3306.');
      } else if (err.message.includes('Access denied')) {
        console.error('[DB] HINT: Wrong DB_USER or DB_PASS. Check Hostinger → Databases → MySQL.');
      } else if (err.message.includes('Unknown database')) {
        console.error('[DB] HINT: DB_NAME is wrong. Verify the exact database name in Hostinger panel.');
      }

      console.error('════════════════════════════════════════════════════════');
      dbStatus.connected = false;
      dbStatus.error = err.message;
      dbStatus.checkedAt = new Date().toISOString();
    });
});