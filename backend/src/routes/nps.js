const express = require('express');
const router = express.Router();
const db = require('../database/db');

// POST /api/nps
router.post('/', (req, res) => {
  try {
    const { nota, comentario, pagina } = req.body;
    if (nota === undefined || nota === null) {
      return res.status(400).json({ success: false, error: 'nota é obrigatória' });
    }
    if (nota < 0 || nota > 10) {
      return res.status(400).json({ success: false, error: 'nota deve ser entre 0 e 10' });
    }
    const result = db.exec(
      `INSERT INTO nps_respostas (nota, comentario, pagina) VALUES (?, ?, ?)`,
      [nota, comentario || null, pagina || 'dashboard']
    );
    res.status(201).json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/nps/resumo
router.get('/resumo', (req, res) => {
  try {
    const stats = db.get(`
      SELECT
        COUNT(*) as total,
        ROUND(AVG(nota), 1) as media,
        SUM(CASE WHEN nota >= 9 THEN 1 ELSE 0 END) as promotores,
        SUM(CASE WHEN nota BETWEEN 7 AND 8 THEN 1 ELSE 0 END) as neutros,
        SUM(CASE WHEN nota <= 6 THEN 1 ELSE 0 END) as detratores
      FROM nps_respostas
      WHERE date(created_at) >= date('now', '-30 days')
    `);

    const nps = stats && stats.total > 0
      ? Math.round(((stats.promotores - stats.detratores) / stats.total) * 100)
      : 0;

    const distribuicao = db.all(`
      SELECT nota, COUNT(*) as count
      FROM nps_respostas
      WHERE date(created_at) >= date('now', '-30 days')
      GROUP BY nota ORDER BY nota ASC
    `);

    const tendencia = db.all(`
      SELECT date(created_at) as data, ROUND(AVG(nota), 1) as media, COUNT(*) as total
      FROM nps_respostas
      WHERE date(created_at) >= date('now', '-30 days')
      GROUP BY date(created_at) ORDER BY data ASC
    `);

    const comentarios = db.all(`
      SELECT nota, comentario, pagina, created_at
      FROM nps_respostas
      WHERE comentario IS NOT NULL AND comentario != ''
      ORDER BY created_at DESC LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        nps_score: nps,
        total: stats?.total || 0,
        media: stats?.media || 0,
        promotores: stats?.promotores || 0,
        neutros: stats?.neutros || 0,
        detratores: stats?.detratores || 0,
        distribuicao,
        tendencia,
        comentarios,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
