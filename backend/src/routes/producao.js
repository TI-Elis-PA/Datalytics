const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/producao/hoje
router.get('/hoje', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const totais = db.get(
      `SELECT 
        SUM(CASE WHEN tipo = 'entrada' THEN peso_kg ELSE 0 END) as entrada_total,
        SUM(CASE WHEN tipo = 'saida' THEN peso_kg ELSE 0 END) as saida_total
       FROM producao WHERE data = ?`,
      [today]
    );

    const entrada = totais?.entrada_total || 0;
    const saida = totais?.saida_total || 0;
    const eficiencia = entrada > 0 ? (saida / entrada) * 100 : 0;
    const pendente = Math.max(0, entrada - saida);

    // Per-client breakdown
    const expedicoes = db.all('SELECT * FROM expedicoes WHERE data = ?', [today]);
    const porCliente = expedicoes.map(exp => {
      const prod = db.get(
        `SELECT 
          SUM(CASE WHEN tipo = 'saida' THEN peso_kg ELSE 0 END) as saida
         FROM producao WHERE data = ? AND cliente = ?`,
        [today, exp.cliente]
      );
      const clienteSaida = prod?.saida || 0;
      return {
        cliente: exp.cliente,
        peso_previsto: exp.peso_kg || 0,
        saida: clienteSaida,
        status: exp.status,
        horario_planejado: exp.horario_planejado,
        horario_real: exp.horario_real,
        eficiencia: exp.peso_kg > 0 ? ((clienteSaida / exp.peso_kg) * 100).toFixed(1) : '0.0',
      };
    });

    // Turno breakdown
    const porTurno = db.all(
      `SELECT turno,
        SUM(CASE WHEN tipo = 'entrada' THEN peso_kg ELSE 0 END) as entrada,
        SUM(CASE WHEN tipo = 'saida' THEN peso_kg ELSE 0 END) as saida
       FROM producao WHERE data = ? GROUP BY turno`,
      [today]
    );

    res.json({
      success: true,
      data: {
        resumo: {
          entrada_total: entrada,
          saida_total: saida,
          pendente,
          eficiencia: parseFloat(eficiencia.toFixed(2)),
          status: eficiencia >= 94 ? 'ok' : eficiencia > 0 ? 'alerta' : 'sem_dados',
        },
        por_cliente: porCliente,
        por_turno: porTurno,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/producao/historico
router.get('/historico', (req, res) => {
  try {
    const diario = db.all(`
      SELECT data,
        SUM(CASE WHEN tipo = 'entrada' THEN peso_kg ELSE 0 END) as entrada,
        SUM(CASE WHEN tipo = 'saida' THEN peso_kg ELSE 0 END) as saida,
        CAST(ROUND(
          (CAST(SUM(CASE WHEN tipo = 'saida' THEN peso_kg ELSE 0 END) AS REAL) /
          NULLIF(SUM(CASE WHEN tipo = 'entrada' THEN peso_kg ELSE 0 END), 0)) * 100, 2
        ) AS TEXT) as eficiencia
      FROM producao WHERE data >= date('now', '-30 days')
      GROUP BY data ORDER BY data ASC
    `);

    const semanal = db.all(`
      SELECT strftime('%Y-W%W', data) as semana,
        SUM(CASE WHEN tipo = 'entrada' THEN peso_kg ELSE 0 END) as entrada,
        SUM(CASE WHEN tipo = 'saida' THEN peso_kg ELSE 0 END) as saida
      FROM producao WHERE data >= date('now', '-90 days')
      GROUP BY semana ORDER BY semana ASC
    `);

    const mensal = db.all(`
      SELECT strftime('%Y-%m', data) as mes,
        SUM(CASE WHEN tipo = 'entrada' THEN peso_kg ELSE 0 END) as entrada,
        SUM(CASE WHEN tipo = 'saida' THEN peso_kg ELSE 0 END) as saida
      FROM producao WHERE data >= date('now', '-365 days')
      GROUP BY mes ORDER BY mes ASC
    `);

    // Today vs Yesterday
    const comparativo = db.all(`
      SELECT data,
        SUM(CASE WHEN tipo = 'entrada' THEN peso_kg ELSE 0 END) as entrada,
        SUM(CASE WHEN tipo = 'saida' THEN peso_kg ELSE 0 END) as saida
      FROM producao
      WHERE data IN (date('now'), date('now', '-1 day'))
      GROUP BY data ORDER BY data DESC
    `);

    res.json({ success: true, data: { diario, semanal, mensal, comparativo } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/producao/entrada
router.post('/entrada', (req, res) => {
  try {
    const { peso_kg, turno, cliente } = req.body;
    if (!peso_kg) return res.status(400).json({ success: false, error: 'peso_kg é obrigatório' });
    const today = new Date().toISOString().split('T')[0];
    const result = db.exec(
      `INSERT INTO producao (cliente, tipo, peso_kg, data, turno) VALUES (?, 'entrada', ?, ?, ?)`,
      [cliente || 'Geral Planta', peso_kg, today, turno || 'manha']
    );
    res.status(201).json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/producao/saida
router.post('/saida', (req, res) => {
  try {
    const { peso_kg, turno, cliente } = req.body;
    if (!peso_kg || !cliente) {
      return res.status(400).json({ success: false, error: 'peso_kg e cliente são obrigatórios' });
    }
    const today = new Date().toISOString().split('T')[0];
    const result = db.exec(
      `INSERT INTO producao (cliente, tipo, peso_kg, data, turno) VALUES (?, 'saida', ?, ?, ?)`,
      [cliente, peso_kg, today, turno || 'manha']
    );
    res.status(201).json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
