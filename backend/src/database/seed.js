const db = require('./db');

function seedDatabase() {
  console.log('🌱 Seeding database with demo data...');

  // Check if already seeded
  const existing = db.get("SELECT COUNT(*) as count FROM expedicoes");
  if (existing && existing.count > 0) {
    console.log('📦 Database already has data, skipping seed');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  const formatTime = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const timeOffset = (offsetMinutes) => {
    const d = new Date(now.getTime() + offsetMinutes * 60000);
    return formatTime(d.getHours(), d.getMinutes());
  };

  // Today's expeditions
  const expedicoes = [
    { cliente: 'Atacadão Distribuidora Ltda',   hp: timeOffset(-180), hr: null,            status: 'atrasado',  peso: 1250 },
    { cliente: 'Supermercado Bom Preço',         hp: timeOffset(-90),  hr: timeOffset(-95), status: 'concluido', peso: 840  },
    { cliente: 'Rede Pão de Açúcar Regional',    hp: timeOffset(15),   hr: null,            status: 'proximo',   peso: 2100 },
    { cliente: 'Frigorífico São Paulo SA',       hp: timeOffset(-30),  hr: timeOffset(-35), status: 'concluido', peso: 960  },
    { cliente: 'Distribuidora Norte Sul',        hp: timeOffset(45),   hr: null,            status: 'no_prazo',  peso: 1580 },
    { cliente: 'Mercado Central Express',        hp: timeOffset(90),   hr: null,            status: 'no_prazo',  peso: 720  },
    { cliente: 'Cooperativa Agro Vale',          hp: timeOffset(-120), hr: null,            status: 'atrasado',  peso: 1890 },
    { cliente: 'Hiper Atacado Paraná',           hp: timeOffset(120),  hr: null,            status: 'no_prazo',  peso: 450  },
    { cliente: 'Supernet Distribuições',         hp: timeOffset(-60),  hr: timeOffset(-65), status: 'concluido', peso: 1100 },
    { cliente: 'Frigorífico Boa Vista',          hp: timeOffset(20),   hr: null,            status: 'proximo',   peso: 670  },
  ];

  for (const e of expedicoes) {
    db.exec(
      `INSERT INTO expedicoes (cliente, horario_planejado, horario_real, status, data, peso_kg) VALUES (?, ?, ?, ?, ?, ?)`,
      [e.cliente, e.hp, e.hr, e.status, today, e.peso]
    );
  }

  // Today's production
  const producaoItems = [
    ['Geral Planta', 'entrada', 8500, 'manha'],
    ['Geral Planta', 'entrada', 4200, 'tarde'],
    ['Atacadão Distribuidora Ltda', 'saida', 1180, 'manha'],
    ['Supermercado Bom Preço', 'saida', 840, 'manha'],
    ['Frigorífico São Paulo SA', 'saida', 960, 'manha'],
    ['Supernet Distribuições', 'saida', 1100, 'manha'],
    ['Rede Pão de Açúcar Regional', 'saida', 1950, 'tarde'],
    ['Distribuidora Norte Sul', 'saida', 1420, 'tarde'],
  ];

  for (const [cliente, tipo, peso, turno] of producaoItems) {
    db.exec(
      `INSERT INTO producao (cliente, tipo, peso_kg, data, turno) VALUES (?, ?, ?, ?, ?)`,
      [cliente, tipo, peso, today, turno]
    );
  }

  // Historical data - last 30 days
  const clientes = [
    'Atacadão Distribuidora Ltda', 'Supermercado Bom Preço', 'Rede Pão de Açúcar Regional',
    'Frigorífico São Paulo SA', 'Distribuidora Norte Sul', 'Mercado Central Express', 'Cooperativa Agro Vale',
  ];

  for (let daysAgo = 1; daysAgo <= 30; daysAgo++) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toISOString().split('T')[0];

    const entradaKg = 9000 + Math.floor(Math.random() * 4000);
    db.exec(
      `INSERT INTO producao (cliente, tipo, peso_kg, data, turno) VALUES (?, ?, ?, ?, ?)`,
      ['Geral Planta', 'entrada', entradaKg, dateStr, 'manha']
    );

    for (const cliente of clientes) {
      const isLate = Math.random() < 0.2;
      const isNear = !isLate && Math.random() < 0.1;
      const status = isLate ? 'atrasado' : isNear ? 'proximo' : 'concluido';
      const ph = 8 + Math.floor(Math.random() * 10);
      const pm = Math.floor(Math.random() * 60);
      const delay = isLate ? Math.floor(Math.random() * 120) + 30 : 0;
      const rh = Math.min(23, ph + Math.floor(delay / 60));
      const rm = (pm + delay) % 60;
      const peso = 400 + Math.floor(Math.random() * 2000);

      db.exec(
        `INSERT INTO expedicoes (cliente, horario_planejado, horario_real, status, data, peso_kg) VALUES (?, ?, ?, ?, ?, ?)`,
        [cliente, formatTime(ph, pm), status === 'concluido' ? formatTime(rh, rm) : null, status, dateStr, peso]
      );

      if (status === 'concluido') {
        db.exec(
          `INSERT INTO producao (cliente, tipo, peso_kg, data, turno) VALUES (?, ?, ?, ?, ?)`,
          [cliente, 'saida', peso, dateStr, ph < 12 ? 'manha' : 'tarde']
        );
      }
    }
  }

  // NPS data
  const npsData = [
    [10, 'Excelente! Ficou muito mais fácil acompanhar a operação.', 'expedicao'],
    [9,  'Muito bom, economizei tempo no monitoramento.', 'producao'],
    [8,  'Ótimo painel, mas queria mais filtros.', 'expedicao'],
    [10, 'Perfeito! Os alertas me ajudam muito.', 'dashboard'],
    [7,  'Bom, mas poderia ter mais cores.', 'producao'],
    [9,  'Muito útil para o dia a dia da operação.', 'expedicao'],
    [10, '', 'dashboard'],
    [6,  'Precisa de mais funcionalidades.', 'historico'],
    [9,  'A IA é incrível! Muito útil.', 'dashboard'],
    [10, 'Melhor ferramenta que já usei na fábrica!', 'expedicao'],
  ];

  for (const [nota, comentario, pagina] of npsData) {
    db.exec(
      `INSERT INTO nps_respostas (nota, comentario, pagina) VALUES (?, ?, ?)`,
      [nota, comentario || null, pagina]
    );
  }

  console.log(`✅ Seed complete! ${expedicoes.length} expedições, produção histórica 30d, ${npsData.length} NPS`);
}

module.exports = { seedDatabase };
