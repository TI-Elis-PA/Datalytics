const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { calcularStatus, getExpedicaoSummary } = require('../services/alertEngine');

// GET /api/expedicoes/hoje
router.get('/hoje', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = getExpedicaoSummary(today);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/expedicoes/historico
router.get('/historico', (req, res) => {
  try {
    const { mes, ano } = req.query;
    let whereClause = `data >= date('now', '-30 days')`;
    const params = [];

    if (mes && ano) {
      whereClause = `strftime('%m', data) = ? AND strftime('%Y', data) = ?`;
      params.push(String(mes).padStart(2, '0'), String(ano));
    }

    const historico = db.all(
      `SELECT * FROM expedicoes WHERE ${whereClause} ORDER BY data DESC, horario_planejado ASC`,
      params
    );

    const statsByDay = db.all(
      `SELECT data,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) as concluidos,
        SUM(CASE WHEN status = 'atrasado' THEN 1 ELSE 0 END) as atrasados
       FROM expedicoes WHERE data >= date('now', '-30 days')
       GROUP BY data ORDER BY data DESC`
    );

    res.json({ success: true, data: { historico, statsByDay } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/expedicoes/ranking
router.get('/ranking', (req, res) => {
  try {
    const ranking = db.all(`
      SELECT cliente,
        COUNT(*) as total_expedicoes,
        SUM(CASE WHEN status = 'atrasado' THEN 1 ELSE 0 END) as total_atrasos,
        SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) as total_concluidos,
        CAST(ROUND(
          (CAST(SUM(CASE WHEN status = 'atrasado' THEN 1 ELSE 0 END) AS REAL) / COUNT(*)) * 100, 1
        ) AS TEXT) as taxa_atraso,
        SUM(peso_kg) as peso_total
      FROM expedicoes
      WHERE data >= date('now', '-30 days')
      GROUP BY cliente
      ORDER BY total_atrasos DESC
    `);
    res.json({ success: true, data: ranking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/expedicoes/alertas
router.get('/alertas', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const alertas = db.all(
      `SELECT al.*, e.cliente, e.horario_planejado
       FROM alertas_log al
       JOIN expedicoes e ON al.expedicao_id = e.id
       WHERE date(al.created_at) = ?
       ORDER BY al.created_at DESC LIMIT 20`,
      [today]
    );
    res.json({ success: true, data: alertas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/expedicoes
router.post('/', (req, res) => {
  try {
    const { cliente, horario_planejado, peso_kg, observacoes } = req.body;
    if (!cliente || !horario_planejado) {
      return res.status(400).json({ success: false, error: 'cliente e horario_planejado são obrigatórios' });
    }
    const today = new Date().toISOString().split('T')[0];
    const status = calcularStatus(horario_planejado, null, 'pendente');
    const result = db.exec(
      `INSERT INTO expedicoes (cliente, horario_planejado, status, data, peso_kg, observacoes) VALUES (?, ?, ?, ?, ?, ?)`,
      [cliente, horario_planejado, status, today, peso_kg || 0, observacoes || null]
    );
    const newExp = db.get('SELECT * FROM expedicoes WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ success: true, data: newExp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/expedicoes/:id/concluir
router.put('/:id/concluir', (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();
    const horarioReal = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    db.exec(
      `UPDATE expedicoes SET status = 'concluido', horario_real = ?, updated_at = datetime('now') WHERE id = ?`,
      [horarioReal, id]
    );
    const exp = db.get('SELECT * FROM expedicoes WHERE id = ?', [id]);
    if (exp) {
      db.exec(
        `INSERT INTO alertas_log (expedicao_id, tipo, mensagem) VALUES (?, 'concluido', ?)`,
        [id, `✅ ${exp.cliente} expedido às ${horarioReal}`]
      );
    }
    res.json({ success: true, data: exp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/expedicoes/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { horario_planejado, peso_kg, observacoes } = req.body;
    const current = db.get('SELECT * FROM expedicoes WHERE id = ?', [id]);
    if (!current) return res.status(404).json({ success: false, error: 'Expedição não encontrada' });
    db.exec(
      `UPDATE expedicoes SET 
        horario_planejado = ?, peso_kg = ?, observacoes = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        horario_planejado || current.horario_planejado,
        peso_kg || current.peso_kg,
        observacoes || current.observacoes,
        id,
      ]
    );
    const updated = db.get('SELECT * FROM expedicoes WHERE id = ?', [id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/expedicoes/:id
router.delete('/:id', (req, res) => {
  try {
    db.exec('DELETE FROM expedicoes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/expedicoes/alertas/:id/lido
router.put('/alertas/:id/lido', (req, res) => {
  try {
    db.exec('UPDATE alertas_log SET lido = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
