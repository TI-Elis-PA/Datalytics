const express = require('express');
const router = express.Router();
const { answerQuestion, generateAutoInsights, buildContext, generateSmartInsights } = require('../services/geminiService');
const db = require('../database/db');

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'message é obrigatório' });

    const response = await answerQuestion(message);
    res.json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ai/insights
router.get('/insights', async (req, res) => {
  try {
    const context = buildContext();
    const conteudo = generateSmartInsights(context);
    
    // Also get cached insights from DB
    const today = new Date().toISOString().split('T')[0];
    const cached = db.prepare(`
      SELECT * FROM ai_insights WHERE data = ? ORDER BY created_at DESC LIMIT 5
    `).all(today);

    res.json({
      success: true,
      data: {
        insights: conteudo,
        historico: cached,
        context: {
          stats: context.stats,
          eficienciaPct: context.eficienciaPct,
          rankingAtrasos: context.rankingAtrasos,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/relatorio-dia
router.post('/relatorio-dia', async (req, res) => {
  try {
    const response = await answerQuestion(
      'Gere um relatório executivo completo do dia de hoje, com resumo de expedição, eficiência da produção, pontos de atenção e recomendações para melhoria.'
    );
    res.json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
