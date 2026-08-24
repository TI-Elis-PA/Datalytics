const db = require('./db');

function runMigrations() {
  console.log('🗄️  Running database migrations...');

  const statements = [
    // Sprint 01: Expeditions table
    `CREATE TABLE IF NOT EXISTS expedicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT NOT NULL,
      horario_planejado TEXT NOT NULL,
      horario_real TEXT,
      status TEXT DEFAULT 'pendente',
      data TEXT DEFAULT (date('now')),
      peso_kg REAL DEFAULT 0,
      observacoes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,

    // Sprint 02: Production weights table
    `CREATE TABLE IF NOT EXISTS producao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT,
      tipo TEXT NOT NULL,
      peso_kg REAL NOT NULL,
      data TEXT DEFAULT (date('now')),
      turno TEXT DEFAULT 'manha',
      created_at TEXT DEFAULT (datetime('now'))
    )`,

    // NPS Responses
    `CREATE TABLE IF NOT EXISTS nps_respostas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nota INTEGER NOT NULL,
      comentario TEXT,
      pagina TEXT DEFAULT 'dashboard',
      created_at TEXT DEFAULT (datetime('now'))
    )`,

    // Alert Log
    `CREATE TABLE IF NOT EXISTS alertas_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expedicao_id INTEGER,
      tipo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      lido INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,

    // AI Insights cache
    `CREATE TABLE IF NOT EXISTS ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      conteudo TEXT NOT NULL,
      dados_contexto TEXT,
      data TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )`,
  ];

  for (const stmt of statements) {
    try {
      db.exec(stmt);
    } catch (err) {
      console.error('Migration error:', err.message);
    }
  }

  console.log('✅ Migrations completed successfully');
}

module.exports = { runMigrations };
