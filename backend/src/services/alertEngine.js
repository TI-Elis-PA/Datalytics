const db = require('../database/db');

function calcularStatus(horarioPlanejado, horarioReal, statusAtual) {
  if (statusAtual === 'concluido' && horarioReal) return 'concluido';
  const now = new Date();
  const [ph, pm] = horarioPlanejado.split(':').map(Number);
  const planned = new Date();
  planned.setHours(ph, pm, 0, 0);
  const diffMinutes = (planned - now) / (1000 * 60);
  if (diffMinutes > 30) return 'no_prazo';
  if (diffMinutes > 0 && diffMinutes <= 30) return 'proximo';
  return 'atrasado';
}

function runAlertEngine(io) {
  const today = new Date().toISOString().split('T')[0];
  const expedicoes = db.all(
    `SELECT * FROM expedicoes WHERE data = ? AND status != 'concluido'`,
    [today]
  );

  let hasChanges = false;

  for (const exp of expedicoes) {
    const novoStatus = calcularStatus(exp.horario_planejado, exp.horario_real, exp.status);
    if (novoStatus !== exp.status) {
      db.exec(
        `UPDATE expedicoes SET status = ?, updated_at = datetime('now') WHERE id = ?`,
        [novoStatus, exp.id]
      );

      const tipo = novoStatus === 'atrasado' ? 'atrasado' : 'proximo_limite';
      const mensagem = novoStatus === 'atrasado'
        ? `⚠️ ${exp.cliente} está ATRASADO! Previsto: ${exp.horario_planejado}`
        : `⏰ ${exp.cliente} próximo do limite! Previsto: ${exp.horario_planejado}`;

      const existing = db.get(
        `SELECT id FROM alertas_log WHERE expedicao_id = ? AND tipo = ? AND date(created_at) = ?`,
        [exp.id, tipo, today]
      );

      if (!existing) {
        db.exec(
          `INSERT INTO alertas_log (expedicao_id, tipo, mensagem) VALUES (?, ?, ?)`,
          [exp.id, tipo, mensagem]
        );
      }
      hasChanges = true;
    }
  }

  const hour = new Date().getHours();
  if (hour >= 18) {
    const pending = db.all(
      `SELECT * FROM expedicoes WHERE data = ? AND status IN ('pendente','no_prazo','proximo','atrasado')`,
      [today]
    );
    for (const exp of pending) {
      const existing = db.get(
        `SELECT id FROM alertas_log WHERE expedicao_id = ? AND tipo = 'nao_expedido' AND date(created_at) = ?`,
        [exp.id, today]
      );
      if (!existing) {
        db.exec(
          `INSERT INTO alertas_log (expedicao_id, tipo, mensagem) VALUES (?, ?, ?)`,
          [exp.id, 'nao_expedido', `🚨 ${exp.cliente} NÃO foi expedido hoje!`]
        );
        hasChanges = true;
      }
    }
  }

  if (hasChanges && io) {
    const summary = getExpedicaoSummary(today);
    io.emit('expedicao:update', summary);

    const newAlerts = db.all(
      `SELECT al.*, e.cliente FROM alertas_log al
       JOIN expedicoes e ON al.expedicao_id = e.id
       WHERE al.lido = 0 AND date(al.created_at) = ?
       ORDER BY al.created_at DESC LIMIT 5`,
      [today]
    );
    if (newAlerts.length > 0) io.emit('alertas:new', newAlerts);
  }

  return hasChanges;
}

function getExpedicaoSummary(date) {
  const expedicoes = db.all(
    `SELECT * FROM expedicoes WHERE data = ? ORDER BY horario_planejado ASC`,
    [date]
  );
  const stats = {
    total: expedicoes.length,
    concluidos: expedicoes.filter(e => e.status === 'concluido').length,
    pendentes: expedicoes.filter(e => e.status !== 'concluido').length,
    atrasados: expedicoes.filter(e => e.status === 'atrasado').length,
    proximos: expedicoes.filter(e => e.status === 'proximo').length,
    no_prazo: expedicoes.filter(e => e.status === 'no_prazo').length,
  };
  return { expedicoes, stats };
}

module.exports = { runAlertEngine, calcularStatus, getExpedicaoSummary };
