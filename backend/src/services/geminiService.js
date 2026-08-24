const db = require('../database/db');

let genAI = null;

function initGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      genAI = new GoogleGenerativeAI(apiKey);
      console.log('🤖 Gemini AI initialized successfully');
    } catch (err) {
      console.warn('⚠️  Gemini AI not available:', err.message);
    }
  } else {
    console.log('💡 Gemini API key not configured - using intelligent rule-based insights');
  }
}

function buildContext() {
  const today = new Date().toISOString().split('T')[0];

  const expedicoes = db.all(
    `SELECT * FROM expedicoes WHERE data = ? ORDER BY horario_planejado`,
    [today]
  );

  const eficiencia = db.get(
    `SELECT 
      SUM(CASE WHEN tipo = 'entrada' THEN peso_kg ELSE 0 END) as entrada,
      SUM(CASE WHEN tipo = 'saida' THEN peso_kg ELSE 0 END) as saida
     FROM producao WHERE data = ?`,
    [today]
  );

  const rankingAtrasos = db.all(`
    SELECT cliente, COUNT(*) as total_atrasos
    FROM expedicoes 
    WHERE status = 'atrasado' AND data >= date('now', '-30 days')
    GROUP BY cliente ORDER BY total_atrasos DESC LIMIT 5
  `);

  const eficienciaPct = eficiencia && eficiencia.entrada > 0
    ? ((eficiencia.saida / eficiencia.entrada) * 100).toFixed(1)
    : '0.0';

  const stats = {
    total: expedicoes.length,
    concluidos: expedicoes.filter(e => e.status === 'concluido').length,
    atrasados: expedicoes.filter(e => e.status === 'atrasado').length,
    proximos: expedicoes.filter(e => e.status === 'proximo').length,
    no_prazo: expedicoes.filter(e => e.status === 'no_prazo').length,
  };

  return { today, expedicoes, stats, eficiencia: eficiencia || { entrada: 0, saida: 0 }, eficienciaPct, rankingAtrasos };
}

function generateSmartInsights(context) {
  const insights = [];
  const { stats, eficienciaPct, rankingAtrasos, expedicoes } = context;
  const efPct = parseFloat(eficienciaPct);

  if (efPct >= 94) {
    insights.push(`✅ **Eficiência ${efPct}%** — acima da meta de 94%. Operação no verde!`);
  } else if (efPct > 0) {
    insights.push(`⚠️ **Eficiência ${efPct}%** — abaixo da meta de 94%. Atenção necessária!`);
  } else {
    insights.push(`📊 **Eficiência:** Aguardando dados de produção do dia.`);
  }

  if (stats.atrasados > 0) {
    const atrasados = expedicoes.filter(e => e.status === 'atrasado');
    insights.push(`🔴 **${stats.atrasados} expedição(ões) atrasada(s):** ${atrasados.map(e => e.cliente).join(', ')}`);
  }

  if (stats.proximos > 0) {
    const proximos = expedicoes.filter(e => e.status === 'proximo');
    insights.push(`⏰ **${stats.proximos} próximo(s) do limite:** ${proximos.map(e => e.cliente).join(', ')}`);
  }

  const completionRate = stats.total > 0 ? ((stats.concluidos / stats.total) * 100).toFixed(0) : 0;
  if (parseInt(completionRate) === 100 && stats.total > 0) {
    insights.push(`🏆 **100% concluído!** Excelente desempenho operacional hoje.`);
  } else if (stats.total > 0) {
    insights.push(`📊 **Progresso: ${completionRate}%** — ${stats.concluidos}/${stats.total} expedições concluídas.`);
  }

  if (rankingAtrasos.length > 0) {
    insights.push(`📈 **Maior histórico de atrasos (30d):** ${rankingAtrasos[0].cliente} (${rankingAtrasos[0].total_atrasos}x)`);
  }

  if (stats.proximos >= 2) {
    insights.push(`🔮 **Predição IA:** Alta probabilidade de atrasos nas próximas horas com base no padrão histórico.`);
  }

  return insights.join('\n\n');
}

async function generateWithGemini(prompt, context) {
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const fullPrompt = `Você é um analista de operações industrial especializado em logística e produção.
Responda em português brasileiro, de forma direta e objetiva. Use emojis quando apropriado.

DADOS OPERACIONAIS (${context.today}):
- Expedições: ${context.stats.total} total, ${context.stats.concluidos} concluídas, ${context.stats.atrasados} atrasadas, ${context.stats.proximos} próximas
- Eficiência: ${context.eficienciaPct}% (entrada: ${context.eficiencia.entrada?.toFixed(0)||0}kg, saída: ${context.eficiencia.saida?.toFixed(0)||0}kg)
- Top atrasos 30d: ${context.rankingAtrasos.map(r => `${r.cliente}(${r.total_atrasos}x)`).join(', ')}

PERGUNTA: ${prompt}

Responda de forma concisa (máximo 4 linhas para insights rápidos).`;
    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  } catch (err) {
    console.error('Gemini error:', err.message);
    return null;
  }
}

async function answerQuestion(question) {
  const context = buildContext();
  const geminiAnswer = await generateWithGemini(question, context);
  if (geminiAnswer) return { answer: geminiAnswer, source: 'gemini' };

  const q = question.toLowerCase();

  if (q.includes('eficiên') || q.includes('eficien')) {
    return {
      answer: `📊 **Eficiência atual: ${context.eficienciaPct}%**\n\n• Entrada: ${(context.eficiencia.entrada||0).toFixed(0)} kg\n• Saída: ${(context.eficiencia.saida||0).toFixed(0)} kg\n• Meta: 94% ${parseFloat(context.eficienciaPct) >= 94 ? '✅' : '⚠️'}`,
      source: 'smart',
    };
  }

  if (q.includes('atraso') || q.includes('atrasado')) {
    const atrasados = context.expedicoes.filter(e => e.status === 'atrasado');
    if (atrasados.length === 0) return { answer: '✅ Nenhuma expedição atrasada no momento!', source: 'smart' };
    return {
      answer: `🔴 **${atrasados.length} atrasada(s):**\n${atrasados.map(e => `• ${e.cliente} — previsto ${e.horario_planejado}`).join('\n')}`,
      source: 'smart',
    };
  }

  if (q.includes('relat') || q.includes('resumo')) {
    return {
      answer: `📋 **Relatório do dia:**\n\n🚚 Expedição: ${context.stats.total} clientes | ✅ ${context.stats.concluidos} | 🔴 ${context.stats.atrasados} atrasados | ⏰ ${context.stats.proximos} próximos\n\n🏭 Produção: ${(context.eficiencia.entrada||0).toFixed(0)}kg entrada | ${(context.eficiencia.saida||0).toFixed(0)}kg saída | Eficiência: ${context.eficienciaPct}%`,
      source: 'smart',
    };
  }

  if (q.includes('ranking') || q.includes('pior') || q.includes('mais atras')) {
    if (context.rankingAtrasos.length === 0) return { answer: '✅ Sem histórico de atrasos nos últimos 30 dias!', source: 'smart' };
    return {
      answer: `🏆 **Ranking de atrasos (30d):**\n${context.rankingAtrasos.map((r, i) => `${i + 1}. ${r.cliente}: ${r.total_atrasos} atrasos`).join('\n')}`,
      source: 'smart',
    };
  }

  return {
    answer: generateSmartInsights(context) || '📊 Pergunte sobre: eficiência, atrasos, relatório ou ranking de clientes.',
    source: 'smart',
  };
}

async function generateAutoInsights() {
  const context = buildContext();
  return { conteudo: generateSmartInsights(context), stats: context.stats };
}

module.exports = { initGemini, answerQuestion, generateAutoInsights, buildContext, generateSmartInsights };
