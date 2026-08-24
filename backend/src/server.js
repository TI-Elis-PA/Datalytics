require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cron = require('node-cron');

const { initDatabase } = require('./database/db');
const { runMigrations } = require('./database/migrations');
const { seedDatabase } = require('./database/seed');
const { initGemini } = require('./services/geminiService');
const { runAlertEngine } = require('./services/alertEngine');

const expedicoesRouter = require('./routes/expedicoes');
const producaoRouter = require('./routes/producao');
const aiRouter = require('./routes/ai');
const npsRouter = require('./routes/nps');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const ts = new Date().toLocaleTimeString('pt-BR');
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/expedicoes', expedicoesRouter);
app.use('/api/producao', producaoRouter);
app.use('/api/ai', aiRouter);
app.use('/api/nps', npsRouter);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime(), name: 'CNN Dashboard API v1.0' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ success: false, error: 'Erro interno do servidor' });
});

// WebSocket
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.emit('connected', { message: 'CNN Dashboard em tempo real! 🚀', timestamp: new Date().toISOString() });
  socket.on('disconnect', () => console.log(`🔌 Client disconnected: ${socket.id}`));
  socket.on('request:refresh', () => runAlertEngine(io));
});

// Cron: Check expedition statuses every 30 seconds
cron.schedule('*/30 * * * * *', () => {
  try { runAlertEngine(io); } catch (err) { console.error('Alert engine error:', err.message); }
});

// Cron: Broadcast production update every minute
cron.schedule('* * * * *', () => {
  try {
    const db = require('./database/db');
    const today = new Date().toISOString().split('T')[0];
    const prod = db.get(
      `SELECT 
        SUM(CASE WHEN tipo = 'entrada' THEN peso_kg ELSE 0 END) as entrada,
        SUM(CASE WHEN tipo = 'saida' THEN peso_kg ELSE 0 END) as saida
       FROM producao WHERE data = ?`,
      [today]
    );
    if (prod) {
      const eficiencia = prod.entrada > 0 ? ((prod.saida / prod.entrada) * 100).toFixed(2) : 0;
      io.emit('producao:update', { ...prod, eficiencia: parseFloat(eficiencia) });
    }
  } catch (err) {
    console.error('Producao broadcast error:', err.message);
  }
});

const PORT = process.env.PORT || 3001;

async function start() {
  console.log('\n🚀 CNN TEAM Dashboard – Iniciando servidor...\n');

  try {
    await initDatabase();
    runMigrations();
    seedDatabase();
    initGemini();

    server.listen(PORT, () => {
      console.log(`\n✅ Servidor: http://localhost:${PORT}`);
      console.log(`📡 WebSocket ativo | 🔄 Alertas: 30s`);
      console.log(`\n🌱 Pronto!\n`);
      setTimeout(() => {
        try { runAlertEngine(io); } catch (e) { /* ignore on startup */ }
      }, 1000);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
