/**
 * SQLite wrapper using sql.js (pure JavaScript - no native compilation required)
 * Provides a synchronous API similar to better-sqlite3
 */
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs-extra');

const DB_PATH = path.join(__dirname, '../../data/cnn_dashboard.db');

// Ensure data directory exists
fs.ensureDirSync(path.dirname(DB_PATH));

// We wrap sql.js to provide a synchronous-like interface
// sql.js runs fully synchronous in Node.js
let sqlDb = null;

function initDb() {
  if (sqlDb) return sqlDb;
  throw new Error('Database not initialized. Call initDatabase() first.');
}

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing DB file if it exists
  let filebuffer = null;
  if (fs.existsSync(DB_PATH)) {
    filebuffer = fs.readFileSync(DB_PATH);
  }
  
  sqlDb = filebuffer ? new SQL.Database(filebuffer) : new SQL.Database();
  
  // Auto-save to disk periodically
  setInterval(() => saveDatabase(), 5000);
  
  // Save on process exit
  process.on('exit', saveDatabase);
  process.on('SIGINT', () => { saveDatabase(); process.exit(0); });
  process.on('SIGTERM', () => { saveDatabase(); process.exit(0); });
  
  console.log('💾 Database loaded from:', DB_PATH);
  return sqlDb;
}

function saveDatabase() {
  if (!sqlDb) return;
  try {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Error saving database:', err.message);
  }
}

/**
 * Execute a SQL statement (INSERT, UPDATE, DELETE, CREATE)
 * @param {string} sql
 * @param {Array} params
 */
function exec(sql, params = []) {
  const db = initDb();
  db.run(sql, params);
  return { lastInsertRowid: db.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0] };
}

/**
 * Execute multi-statement SQL (no params, for migrations)
 */
function execMulti(sql) {
  const db = initDb();
  db.run(sql);
}

/**
 * Get a single row
 */
function get(sql, params = []) {
  const db = initDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

/**
 * Get all rows
 */
function all(sql, params = []) {
  const db = initDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Prepared statement builder (fluent API compatible with routes)
 */
function prepare(sql) {
  return {
    run: (...args) => {
      const params = args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])
        ? namedToPositional(sql, args[0])
        : args;
      return exec(resolveNamed(sql, args[0]), params.positional || params);
    },
    get: (...args) => {
      const resolved = resolveQuery(sql, args);
      return get(resolved.sql, resolved.params);
    },
    all: (...args) => {
      const resolved = resolveQuery(sql, args);
      return all(resolved.sql, resolved.params);
    },
  };
}

/**
 * Resolve named parameters (@param) to positional (?)
 */
function resolveQuery(sql, args) {
  // If first arg is object (named params), convert
  if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    return namedToPositional(sql, args[0]);
  }
  // Positional params
  return { sql, params: args.flat() };
}

function namedToPositional(sql, obj) {
  const params = [];
  const resolved = sql.replace(/@(\w+)/g, (_, key) => {
    params.push(obj[key] !== undefined ? obj[key] : null);
    return '?';
  });
  return { sql: resolved, params };
}

function resolveNamed(sql, obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return sql;
  return sql.replace(/@(\w+)/g, '?');
}

module.exports = {
  initDatabase,
  saveDatabase,
  prepare,
  exec: execMulti,
  get,
  all,
};
