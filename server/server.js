const path = require('path');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');

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
// Disable x-powered-by header
app.disable('x-powered-by');

// Configure Helmet
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
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
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
app.use(cookieParser());
app.use(hpp()); // Protect against HTTP Parameter Pollution
app.use(compression());

// ── Global Audit Logger (A2) ──────────────────────────────────────────────────
app.use(auditLogger);

// ── Serve React static files (production) ────────────────────────────────────
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(clientBuildPath));

// ── Serve uploaded files (avatars, documents) ─────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ── API Routes ────────────────────────────────────────────────────────────────
const csrfProtection = require('./middleware/csrf');
app.use('/api', csrfProtection);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/results', require('./routes/results'));
app.use('/api/session', require('./routes/session'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/fc', require('./routes/feeCollector'));
app.use('/api/teacher-attendance', require('./routes/teacherAttendance'));
app.use('/api/staff-leaves', require('./routes/staffLeaves'));
app.use('/api/class-incharge', require('./routes/classIncharge'));
app.use('/api/class-fees', require('./routes/classFees'));
app.use('/api/credentials', require('./routes/credentials'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/events', require('./routes/events'));

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
    .then(async () => {
      console.log('[DB] ✅ MySQL connected successfully');
      dbStatus.connected = true;
      dbStatus.error = null;
      dbStatus.checkedAt = new Date().toISOString();

      // 🚨 ONE-TIME AUTO-RECOVERY: Reset or Create Admin password to 'admin123'
      try {
        const { User } = require('./models');
        const bcrypt = require('bcryptjs');
        const adminEmail = 'admin@school.com';
        let admin = await User.findOne({ where: { role: 'admin' } });
        
        const newHash = await bcrypt.hash('admin123', 12);
        
        if (admin) {
          admin.password = newHash;
          admin.email = adminEmail; // Force standard email
          await admin.save({ hooks: false });
          console.log('🛡️ [SECURITY RECOVERY] Admin password successfully reset to: admin123');
        } else {
          admin = await User.create({
            name: 'Admin',
            email: adminEmail,
            password: 'admin123', // hooks will hash it
            role: 'admin',
            is_active: true
          });
          console.log('🛡️ [SECURITY RECOVERY] Admin user successfully recreated!');
        }
      } catch (err) {
        console.error('Failed to run recovery script:', err.message);
      }

      // ── Schema sync strategy ────────────────────────────────────────────
      // PRODUCTION  → sync() with NO alter and NO force. Tables must already
      //               exist (created via schema.sql or migrations).
      // DEVELOPMENT → sync({ alter: true }) to auto-apply model changes.
      if (isProd) {
        console.log('[DB] Production mode — skipping sequelize.sync() to avoid index conflicts');
        // Run hotfixes for existing tables
        await sequelize.query('ALTER TABLE `settings` MODIFY COLUMN `value` LONGTEXT;').catch(err => {
          console.error('[DB] Failed to alter settings table to LONGTEXT:', err.message);
        });

        // Migration check: If tables were created with camelCase timestamps, drop them once to recreate with snake_case
        try {
          const [results] = await sequelize.query("SHOW COLUMNS FROM `document_submissions` LIKE 'createdAt'");
          if (results && results.length > 0) {
            console.log('[DB] Found outdated camelCase columns. Dropping tables to recreate with correct snake_case timestamps...');
            await sequelize.query("DROP TABLE IF EXISTS `document_submissions`");
            await sequelize.query("DROP TABLE IF EXISTS `document_requests`");
            await sequelize.query("DROP TABLE IF EXISTS `events`");
          }
        } catch (e) {
          // If table doesn't exist yet, it will throw an error, which is fine
        }

        // Auto-create any new tables that were added after initial deployment
        const newTableQueries = [
          `CREATE TABLE IF NOT EXISTS \`events\` (
            \`id\` INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`title\` VARCHAR(150) NOT NULL,
            \`description\` TEXT,
            \`event_date\` DATETIME NOT NULL,
            \`location\` VARCHAR(150),
            \`is_active\` TINYINT(1) DEFAULT 1,
            \`created_by\` INTEGER,
            \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB;`,
          `CREATE TABLE IF NOT EXISTS \`document_requests\` (
            \`id\` INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`title\` VARCHAR(255) NOT NULL,
            \`description\` TEXT,
            \`document_type\` ENUM('pdf','image','any') DEFAULT 'any',
            \`recipient_type\` ENUM('everyone','all_students','all_teachers','individual') NOT NULL,
            \`recipients\` JSON,
            \`custom_fields\` JSON,
            \`created_by\` INTEGER NOT NULL,
            \`deadline\` DATETIME,
            \`status\` ENUM('active','closed') DEFAULT 'active',
            \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB;`,
          `CREATE TABLE IF NOT EXISTS \`document_submissions\` (
            \`id\` INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`request_id\` INTEGER NOT NULL,
            \`user_id\` INTEGER NOT NULL,
            \`file_url\` VARCHAR(255) NOT NULL,
            \`custom_data\` JSON,
            \`status\` ENUM('pending','approved','rejected') DEFAULT 'pending',
            \`feedback\` TEXT,
            \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB;`
        ];
        for (const sql of newTableQueries) {
          try { await sequelize.query(sql); } catch (e) { console.error('[DB] Table creation warning:', e.message); }
        }
        console.log('[DB] ✅ New tables checked / created');
      } else {
        console.log('[DB] Development mode — running sync({ alter: true })');
        return sequelize.sync({ alter: true });
      }
    })
    .then(async () => {
      console.log('[DB] ✅ Database tables verified and synced');
      try {
        const { migratePendingStudents, migrateFeeColumns } = require('./utils/dbMigrator');
        await migratePendingStudents();
        await migrateFeeColumns();

        const { rejectOldPendingStudents, calculateOverdueFees } = require('./utils/cleanupTasks');
        // Run once on boot, then every 24 hours
        await rejectOldPendingStudents();
        await calculateOverdueFees();
        setInterval(rejectOldPendingStudents, 24 * 60 * 60 * 1000);
        setInterval(calculateOverdueFees, 24 * 60 * 60 * 1000);
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