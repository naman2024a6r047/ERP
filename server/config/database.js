const path = require('path');
const { Sequelize } = require('sequelize');

// ── Ensure .env is loaded even when this file is imported directly ────────────
// (e.g. from check_users.js or seed.js). If dotenv already ran, this is a no-op
// because dotenv never overwrites existing process.env values.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ── Validate required env vars ────────────────────────────────────────────────
const requiredVariables = ['DB_NAME', 'DB_USER', 'DB_PASS'];
const missingVariables = requiredVariables.filter((variable) => !process.env[variable]);

if (missingVariables.length) {
  console.error(`[DB CONFIG] ❌ Missing database environment variables: ${missingVariables.join(', ')}`);
  console.error('[DB CONFIG] Ensure your .env file exists at:', path.join(__dirname, '..', '.env'));
  throw new Error(`Missing database environment variables: ${missingVariables.join(', ')}`);
}

// ── Resolve host ──────────────────────────────────────────────────────────────
// On Hostinger shared hosting, MySQL runs on 127.0.0.1 (not a remote host).
// Sequelize resolves 'localhost' via Unix socket on Linux which can fail on some
// providers, so we always normalise to the IP address.
const dbHost = !process.env.DB_HOST || process.env.DB_HOST === 'localhost'
  ? '127.0.0.1'
  : process.env.DB_HOST;

const dbPort = parseInt(process.env.DB_PORT, 10) || 3306;
const isProd = process.env.NODE_ENV === 'production';

// ── Diagnostic log (never prints password) ────────────────────────────────────
console.log('[DB CONFIG] Initialising Sequelize');
console.log(`[DB CONFIG]   Host     : ${dbHost}`);
console.log(`[DB CONFIG]   Port     : ${dbPort}`);
console.log(`[DB CONFIG]   Database : ${process.env.DB_NAME}`);
console.log(`[DB CONFIG]   User     : ${process.env.DB_USER}`);
console.log(`[DB CONFIG]   NODE_ENV : ${process.env.NODE_ENV || 'not set'}`);

// ── Create Sequelize instance ─────────────────────────────────────────────────
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: dbHost,
    port: dbPort,
    dialect: 'mysql',

    // Logging — SQL queries in dev, silence in production
    logging: isProd ? false : console.log,

    // Connection pool
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,   // max ms to wait for a connection
      idle: 10000,      // close idle connections after 10 s
    },

    // MySQL dialect options — important for Hostinger compatibility
    dialectOptions: {
      connectTimeout: 20000,          // 20 s connect timeout (Hostinger cold starts)
      // Hostinger MySQL 8 uses caching_sha2_password by default;
      // mysql2 handles this natively, but we set supportBigNumbers
      // for safety with BIGINT primary keys (e.g. audit_logs).
      supportBigNumbers: true,
      bigNumberStrings: false,
    },

    // Sequelize model defaults
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: false,
    },

    // Retry on transient connection drops
    retry: {
      max: 3,
    },
  }
);

module.exports = sequelize;
