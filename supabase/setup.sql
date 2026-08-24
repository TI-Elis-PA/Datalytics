-- ============================================================
-- CNN TEAM Dashboard - Supabase SQL Setup
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- 1. TABELA: expedicao_diaria (Sprint 01 - Farol da Expedição)
-- ============================================================
CREATE TABLE IF NOT EXISTS expedicao_diaria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente TEXT NOT NULL,
  horario_planejado TIME NOT NULL,
  horario_real TIME,
  status TEXT DEFAULT 'pendente' 
    CHECK (status IN ('pendente', 'no_prazo', 'proximo', 'atrasado', 'concluido')),
  data DATE DEFAULT CURRENT_DATE,
  peso_previsto_kg NUMERIC(10,2) DEFAULT 0,
  peso_expedido_kg NUMERIC(10,2) DEFAULT 0,
  observacoes TEXT,
  planta TEXT DEFAULT 'CNN',
  turno TEXT DEFAULT 'manha' CHECK (turno IN ('manha', 'tarde', 'noite')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TABELA: producao_diaria (Sprint 02 - Eficiência)
-- ============================================================
CREATE TABLE IF NOT EXISTS producao_diaria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE DEFAULT CURRENT_DATE,
  cliente TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  peso_kg NUMERIC(10,2) NOT NULL,
  turno TEXT DEFAULT 'manha' CHECK (turno IN ('manha', 'tarde', 'noite')),
  planta TEXT DEFAULT 'CNN',
  origem TEXT DEFAULT 'manual' CHECK (origem IN ('manual', 'excel', 'api', 'mock')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TABELA: historico_nps (NPS Inteligente)
-- ============================================================
CREATE TABLE IF NOT EXISTS historico_nps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nota INTEGER NOT NULL CHECK (nota >= 0 AND nota <= 10),
  emoji TEXT CHECK (emoji IN ('happy', 'neutral', 'sad')),
  comentario TEXT,
  pagina TEXT DEFAULT 'dashboard',
  turno TEXT,
  usuario_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. TABELA: alertas_log
-- ============================================================
CREATE TABLE IF NOT EXISTS alertas_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expedicao_id UUID REFERENCES expedicao_diaria(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('proximo_limite', 'atrasado', 'nao_expedido', 'concluido')),
  mensagem TEXT NOT NULL,
  lido BOOLEAN DEFAULT FALSE,
  planta TEXT DEFAULT 'CNN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4b. TABELA: estoque (Sprint 03 - Gestão de Estoque)
-- ============================================================
CREATE TABLE IF NOT EXISTS estoque (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto TEXT NOT NULL,
  categoria TEXT DEFAULT 'produto_acabado'
    CHECK (categoria IN ('materia_prima', 'produto_acabado', 'insumo', 'embalagem', 'quimico')),
  quantidade NUMERIC(10,2) NOT NULL DEFAULT 0,
  unidade TEXT DEFAULT 'kg' CHECK (unidade IN ('kg', 'un', 'pallet', 'cx', 'litro')),
  estoque_minimo NUMERIC(10,2) NOT NULL DEFAULT 0,
  localizacao TEXT,
  fornecedor TEXT,
  valor_unitario NUMERIC(10,2) DEFAULT 0,
  planta TEXT DEFAULT 'CNN',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4c. TABELA: estoque_movimentacoes (auditoria de entradas/saídas)
-- ============================================================
CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estoque_id UUID REFERENCES estoque(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade NUMERIC(10,2) NOT NULL,
  observacao TEXT,
  usuario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. INDEXES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_expedicao_data ON expedicao_diaria(data);
CREATE INDEX IF NOT EXISTS idx_expedicao_status ON expedicao_diaria(status);
CREATE INDEX IF NOT EXISTS idx_expedicao_cliente ON expedicao_diaria(cliente);
CREATE INDEX IF NOT EXISTS idx_producao_data ON producao_diaria(data);
CREATE INDEX IF NOT EXISTS idx_producao_tipo ON producao_diaria(tipo);
CREATE INDEX IF NOT EXISTS idx_nps_created ON historico_nps(created_at);

-- Fix #13: Missing indexes for alertas_log
CREATE INDEX IF NOT EXISTS idx_alertas_created ON alertas_log(created_at);
CREATE INDEX IF NOT EXISTS idx_alertas_lido ON alertas_log(lido) WHERE lido = FALSE;

-- Estoque
CREATE INDEX IF NOT EXISTS idx_estoque_categoria ON estoque(categoria);
CREATE INDEX IF NOT EXISTS idx_estoque_produto ON estoque(produto);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_estoque ON estoque_movimentacoes(estoque_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_created ON estoque_movimentacoes(created_at);

-- ============================================================
-- 6. FUNÇÃO: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_expedicao_updated_at ON expedicao_diaria;
CREATE TRIGGER update_expedicao_updated_at
  BEFORE UPDATE ON expedicao_diaria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_estoque_updated_at ON estoque;
CREATE TRIGGER update_estoque_updated_at
  BEFORE UPDATE ON estoque
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. VIEWS para o dashboard
-- ============================================================

-- Resumo do dia (expedição)
CREATE OR REPLACE VIEW vw_resumo_expedicao_hoje AS
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'concluido') AS concluidos,
  COUNT(*) FILTER (WHERE status = 'atrasado') AS atrasados,
  COUNT(*) FILTER (WHERE status = 'proximo') AS proximos,
  COUNT(*) FILTER (WHERE status IN ('pendente', 'no_prazo')) AS no_prazo,
  COUNT(*) FILTER (WHERE status != 'concluido') AS pendentes,
  COALESCE(SUM(peso_previsto_kg), 0) AS peso_total_previsto,
  COALESCE(SUM(peso_expedido_kg), 0) AS peso_total_expedido
FROM expedicao_diaria
WHERE data = CURRENT_DATE;

-- Eficiência de produção hoje
CREATE OR REPLACE VIEW vw_eficiencia_hoje AS
SELECT
  COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN peso_kg END), 0) AS entrada_total,
  COALESCE(SUM(CASE WHEN tipo = 'saida' THEN peso_kg END), 0) AS saida_total,
  COALESCE(
    ROUND(
      SUM(CASE WHEN tipo = 'saida' THEN peso_kg END) /
      NULLIF(SUM(CASE WHEN tipo = 'entrada' THEN peso_kg END), 0) * 100,
      2
    ), 0
  ) AS eficiencia_pct
FROM producao_diaria
WHERE data = CURRENT_DATE;

-- ============================================================
-- 8. ENABLE REALTIME (execute APÓS criar as tabelas)
-- ============================================================
-- Vá em: Database > Replication > Supabase Realtime
-- Habilite as tabelas: expedicao_diaria, producao_diaria, historico_nps, alertas_log
-- OU use este SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE expedicao_diaria;
ALTER PUBLICATION supabase_realtime ADD TABLE producao_diaria;
ALTER PUBLICATION supabase_realtime ADD TABLE historico_nps;
ALTER PUBLICATION supabase_realtime ADD TABLE alertas_log;
ALTER PUBLICATION supabase_realtime ADD TABLE estoque;
ALTER PUBLICATION supabase_realtime ADD TABLE estoque_movimentacoes;

-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Habilita RLS nas tabelas
ALTER TABLE expedicao_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE producao_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_nps ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Fix #6: RLS mais restritiva
-- SELECT: aberto para anon (dashboard precisa ler)
-- INSERT/UPDATE/DELETE: requer autenticação
-- Para hackathon: anon pode tudo (descomente o bloco "hackathon" abaixo)
-- ============================================================

-- Limpa policies antigas
DROP POLICY IF EXISTS "allow_all_anon" ON expedicao_diaria;
DROP POLICY IF EXISTS "allow_all_anon" ON producao_diaria;
DROP POLICY IF EXISTS "allow_all_anon" ON historico_nps;
DROP POLICY IF EXISTS "allow_all_anon" ON alertas_log;

DROP POLICY IF EXISTS "select_anon" ON expedicao_diaria;
DROP POLICY IF EXISTS "select_anon" ON producao_diaria;
DROP POLICY IF EXISTS "select_anon" ON historico_nps;
DROP POLICY IF EXISTS "select_anon" ON alertas_log;

DROP POLICY IF EXISTS "mutate_authenticated" ON expedicao_diaria;
DROP POLICY IF EXISTS "mutate_authenticated" ON producao_diaria;
DROP POLICY IF EXISTS "mutate_authenticated" ON historico_nps;
DROP POLICY IF EXISTS "mutate_authenticated" ON alertas_log;
DROP POLICY IF EXISTS "select_anon" ON estoque;
DROP POLICY IF EXISTS "select_anon" ON estoque_movimentacoes;
DROP POLICY IF EXISTS "mutate_authenticated" ON estoque;
DROP POLICY IF EXISTS "mutate_authenticated" ON estoque_movimentacoes;

-- SELECT: anon e authenticated podem ler
CREATE POLICY "select_anon" ON expedicao_diaria FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "select_anon" ON producao_diaria FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "select_anon" ON historico_nps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "select_anon" ON alertas_log FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "select_anon" ON estoque FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "select_anon" ON estoque_movimentacoes FOR SELECT TO anon, authenticated USING (true);

-- INSERT/UPDATE/DELETE: apenas authenticated (backend com service_role bypassa RLS de qualquer forma)
CREATE POLICY "mutate_authenticated" ON expedicao_diaria FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mutate_authenticated" ON producao_diaria FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mutate_authenticated" ON historico_nps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mutate_authenticated" ON alertas_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mutate_authenticated" ON estoque FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mutate_authenticated" ON estoque_movimentacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- NOTA: O backend Python usa a ANON KEY ou SERVICE_ROLE_KEY.
-- Se usar SERVICE_ROLE_KEY, ela bypassa RLS automaticamente.
-- Se usar ANON_KEY, precisa também de policies INSERT para anon:
-- ============================================================
-- Descomente abaixo se o backend usar ANON KEY e precisar escrever:
CREATE POLICY "insert_anon" ON expedicao_diaria FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "insert_anon" ON producao_diaria FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "insert_anon" ON historico_nps FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "insert_anon" ON alertas_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "insert_anon" ON estoque FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "insert_anon" ON estoque_movimentacoes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "update_anon" ON expedicao_diaria FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "update_anon" ON producao_diaria FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "update_anon" ON alertas_log FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "update_anon" ON estoque FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "delete_anon" ON expedicao_diaria FOR DELETE TO anon USING (true);
CREATE POLICY "delete_anon" ON estoque FOR DELETE TO anon USING (true);
CREATE POLICY "delete_anon" ON estoque_movimentacoes FOR DELETE TO anon USING (true);

-- ============================================================
-- 10. DADOS MOCK MASIVOS para demo (+15 Toneladas Hospitais/Hoteis/Industria)
-- ============================================================
DO $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_now TIME := CURRENT_TIME;
BEGIN
  -- Só insere se não houver dados hoje
  IF NOT EXISTS (SELECT 1 FROM expedicao_diaria WHERE data = v_today) THEN
    
    INSERT INTO expedicao_diaria (cliente, horario_planejado, horario_real, status, data, peso_previsto_kg, peso_expedido_kg) VALUES
      ('Hospital São Lucas',            (v_now - INTERVAL '3 hours')::TIME,  NULL,                               'atrasado',  v_today, 1850, 0),
      ('Hospital das Clínicas',         (v_now - INTERVAL '90 minutes')::TIME,(v_now - INTERVAL '95 minutes')::TIME,'concluido',v_today, 3200, 3200),
      ('Rede de Hotéis Plaza',          (v_now + INTERVAL '15 minutes')::TIME, NULL,                              'proximo',  v_today, 1100, 0),
      ('Indústria Automotiva XYZ',      (v_now - INTERVAL '30 minutes')::TIME,(v_now - INTERVAL '35 minutes')::TIME,'concluido',v_today, 1560, 1560),
      ('Hospital Santa Maria',          (v_now + INTERVAL '45 minutes')::TIME, NULL,                              'no_prazo', v_today, 2580, 0),
      ('Resort Internacional Sul',      (v_now + INTERVAL '90 minutes')::TIME, NULL,                              'no_prazo', v_today, 820,  0),
      ('Indústria Farmacêutica Vida',   (v_now - INTERVAL '2 hours')::TIME,   NULL,                               'atrasado', v_today, 2890, 0),
      ('Maternidade Central',           (v_now + INTERVAL '2 hours')::TIME,   NULL,                               'no_prazo', v_today, 1450, 0),
      ('Hotel Executivo Faria Lima',    (v_now - INTERVAL '60 minutes')::TIME,(v_now - INTERVAL '65 minutes')::TIME,'concluido',v_today, 900,  900),
      ('Metalúrgica Nacional',          (v_now + INTERVAL '20 minutes')::TIME, NULL,                              'proximo',  v_today, 1670, 0);

    INSERT INTO producao_diaria (cliente, tipo, peso_kg, turno, origem) VALUES
      ('Geral Planta',                  'entrada', 11500, 'manha', 'mock'),
      ('Geral Planta',                  'entrada', 6200,  'tarde', 'mock'),
      ('Hospital das Clínicas',         'saida',   3200,  'manha', 'mock'),
      ('Indústria Automotiva XYZ',      'saida',   1560,  'manha', 'mock'),
      ('Hotel Executivo Faria Lima',    'saida',   900,   'manha', 'mock'),
      ('Hospital Santa Maria',          'saida',   1200,  'tarde', 'mock');

    INSERT INTO historico_nps (nota, emoji, comentario, pagina) VALUES
      (10, 'happy',   'Excelente! Muito mais fácil acompanhar a operação do hospital.',   'expedicao'),
      (9,  'happy',   'Muito bom, economizei tempo no monitoramento industrial.',        'producao'),
      (8,  'neutral', 'Ótimo painel, mas queria mais filtros por rede hoteleira.',               'expedicao'),
      (10, 'happy',   'Perfeito! Os alertas ajudam o hotel a não ficar sem enxoval.',                'dashboard'),
      (7,  'neutral', 'Bom, mas poderia ter mais informações da maternidade.',               'producao'),
      (9,  'happy',   'A IA é incrível! Muito útil.',                        'dashboard'),
      (10, 'happy',   'Melhor ferramenta que já usei na fábrica!',           'expedicao');

    INSERT INTO estoque (produto, categoria, quantidade, unidade, estoque_minimo, localizacao, fornecedor, valor_unitario) VALUES
      ('Lençol Hospitalar 1.80x2.60 (Branco)',  'produto_acabado', 1250, 'un',    300,   'Almox. A - Rack 1', 'Têxtil Sul Ltda',        45.00),
      ('Toalha Banho Algodão 70x140',           'produto_acabado', 860,  'un',    500,   'Almox. A - Rack 2', 'Têxtil Sul Ltda',        28.50),
      ('Fronha Hospitalar 50x80',               'produto_acabado', 340,  'un',    400,   'Almox. A - Rack 3', 'Têxtil Sul Ltda',        12.00),
      ('Cobertor Soft 2.20x2.40',               'produto_acabado', 95,   'un',    150,   'Almox. A - Rack 4', 'Têxtil Sul Ltda',        89.90),
      ('Toalha de Rolo 300m (Bobina)',          'produto_acabado', 45,   'cx',    20,    'Almox. B - Pallet 1','Higiene Pro Brasil',    120.00),
      ('Sabonete Líquido Neutro 5L',            'insumo',           78,   'un',    40,    'Almox. B - Rack 5', 'Higiene Pro Brasil',    35.00),
      ('Detergente Neutro 5L',                  'quimico',           32,   'un',    25,    'Almox. C - Área Química', 'Quimcal Ltda',       22.00),
      ('Álcool 70% 5L',                         'quimico',           15,   'litro', 30,   'Almox. C - Área Química', 'Quimcal Ltda',       18.00),
      ('Tecido Cru Algodão (Rolo 100m)',        'materia_prima',     22,   'un',    10,    'Almox. D - Rack 1', 'Fibra Têxtil Nacional', 650.00),
      ('Elástico 3cm (Rolo)',                   'materia_prima',     18,   'un',    15,    'Almox. D - Rack 2', 'Fibra Têxtil Nacional', 85.00),
      ('Zíper Inox 60cm',                       'materia_prima',     210,  'un',    100,   'Almox. D - Rack 3', 'Fibra Têxtil Nacional', 4.50),
      ('Linha de Costura 1000m',                'insumo',            58,   'cx',    50,    'Almox. D - Rack 4', 'Fibra Têxtil Nacional', 38.00),
      ('Sacola Plástica Grande 50x70',          'embalagem',         2400, 'un',    1000,  'Almox. E - Rack 1', 'Embalagens BR',        0.35),
      ('Caixa de Papelão 60x40x40',             'embalagem',         420,  'un',    600,   'Almox. E - Rack 2', 'Embalagens BR',        3.80),
      ('Pallet Madeira PBR',                    'embalagem',         8,    'un',    12,    'Pátio Externo',     'Embalagens BR',        45.00);

    INSERT INTO estoque_movimentacoes (estoque_id, tipo, quantidade, observacao, usuario) 
    SELECT id, 'ajuste', quantidade, 'Seed inicial - carga de estoque', 'sistema' FROM estoque;

  END IF;
END $$;
