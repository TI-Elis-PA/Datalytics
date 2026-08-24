"""
Seed permanente – gera 1 ano de dados realistas (idempotente).

Chamado automaticamente no startup do servidor.
Nunca duplica dados: verifica se já existem registros no intervalo antes de inserir.
"""
import logging
import random
from datetime import date, datetime, timedelta

from app.core.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# ─── Clientes fixos (perfil operacional real) ───
CLIENTES = [
    "Hospital São Lucas",
    "Hospital das Clínicas",
    "Rede de Hotéis Plaza",
    "Indústria Automotiva XYZ",
    "Hospital Santa Maria",
    "Resort Internacional Sul",
    "Indústria Farmacêutica Vida",
    "Maternidade Central",
    "Hotel Executivo Faria Lima",
    "Metalúrgica Nacional",
    "Hospital de Câncer Esperança",
    "Rede D'Or São Luiz",
    "Indústria Química Apex",
    "Hotel Ibis Paulista",
    "Hospital Sírio Libanês",
]

NPS_COMENTARIOS = [
    ("happy", "Excelente! Muito mais fácil acompanhar a operação."),
    ("happy", "Muito bom, economizei tempo no monitoramento."),
    ("neutral", "Ótimo painel, mas queria mais filtros."),
    ("happy", "Perfeito! Os alertas ajudam muito."),
    ("neutral", "Bom, mas poderia ter mais informações."),
    ("happy", "A IA é incrível! Muito útil."),
    ("happy", "Melhor ferramenta que já usei na operação!"),
    ("sad", "Às vezes demora para atualizar os dados."),
    ("neutral", "Funcional, mas a interface poderia ser melhor."),
    ("happy", "Impressionante a precisão dos alertas!"),
    ("happy", "Facilitou muito o controle de expedição."),
    ("neutral", "Precisa de mais opções de exportação."),
    ("happy", "Parabéns ao time, produto excelente!"),
    ("sad", "Tive dificuldade no primeiro uso."),
    ("happy", "Reduziu nossos atrasos em 30%!"),
]

NPS_PAGINAS = ["dashboard", "expedicao", "producao", "dashboard", "expedicao"]
TURNOS_PESO = [("manha", 0.65), ("tarde", 0.35)]

# ─── Estoque inicial (Sprint 03) ───
ESTOQUE_INICIAL = [
    ("Lençol Hospitalar 1.80x2.60 (Branco)", "produto_acabado", 1250, "un", 300, "Almox. A - Rack 1", "Têxtil Sul Ltda", 45.00),
    ("Toalha Banho Algodão 70x140", "produto_acabado", 860, "un", 500, "Almox. A - Rack 2", "Têxtil Sul Ltda", 28.50),
    ("Fronha Hospitalar 50x80", "produto_acabado", 340, "un", 400, "Almox. A - Rack 3", "Têxtil Sul Ltda", 12.00),
    ("Cobertor Soft 2.20x2.40", "produto_acabado", 95, "un", 150, "Almox. A - Rack 4", "Têxtil Sul Ltda", 89.90),
    ("Toalha de Rolo 300m (Bobina)", "produto_acabado", 45, "cx", 20, "Almox. B - Pallet 1", "Higiene Pro Brasil", 120.00),
    ("Sabonete Líquido Neutro 5L", "insumo", 78, "un", 40, "Almox. B - Rack 5", "Higiene Pro Brasil", 35.00),
    ("Detergente Neutro 5L", "quimico", 32, "un", 25, "Almox. C - Área Química", "Quimcal Ltda", 22.00),
    ("Álcool 70% 5L", "quimico", 15, "litro", 30, "Almox. C - Área Química", "Quimcal Ltda", 18.00),
    ("Tecido Cru Algodão (Rolo 100m)", "materia_prima", 22, "un", 10, "Almox. D - Rack 1", "Fibra Têxtil Nacional", 650.00),
    ("Elástico 3cm (Rolo)", "materia_prima", 18, "un", 15, "Almox. D - Rack 2", "Fibra Têxtil Nacional", 85.00),
    ("Zíper Inox 60cm", "materia_prima", 210, "un", 100, "Almox. D - Rack 3", "Fibra Têxtil Nacional", 4.50),
    ("Linha de Costura 1000m", "insumo", 58, "cx", 50, "Almox. D - Rack 4", "Fibra Têxtil Nacional", 38.00),
    ("Sacola Plástica Grande 50x70", "embalagem", 2400, "un", 1000, "Almox. E - Rack 1", "Embalagens BR", 0.35),
    ("Caixa de Papelão 60x40x40", "embalagem", 420, "un", 600, "Almox. E - Rack 2", "Embalagens BR", 3.80),
    ("Pallet Madeira PBR", "embalagem", 8, "un", 12, "Pátio Externo", "Embalagens BR", 45.00),
]


def seed_estoque():
    """Insere a carga inicial de estoque se a tabela estiver vazia (idempotente)."""
    sb = get_supabase()
    try:
        resp = sb.table("estoque").select("id").limit(1).execute()
        if resp.data:
            logger.info("Seed: estoque já possui itens — pulando.")
            return
    except Exception as e:
        logger.error("Seed: erro ao verificar estoque existente: %s", e)
        return

    rows = [
        {
            "produto": produto,
            "categoria": categoria,
            "quantidade": quantidade,
            "unidade": unidade,
            "estoque_minimo": minimo,
            "localizacao": localizacao,
            "fornecedor": fornecedor,
            "valor_unitario": valor,
            "planta": "CNN",
        }
        for (produto, categoria, quantidade, unidade, minimo, localizacao, fornecedor, valor) in ESTOQUE_INICIAL
    ]

    try:
        sb.table("estoque").insert(rows).execute()
        logger.info("Seed: ✅ %d itens de estoque inseridos!", len(rows))
    except Exception as e:
        logger.error("Seed: erro ao inserir estoque: %s", e)


def _pick_turno() -> str:
    r = random.random()
    if r < 0.65:
        return "manha"
    return "tarde"


def _is_weekend(d: date) -> bool:
    return d.weekday() >= 5  # Saturday=5, Sunday=6


def _batch_insert(table: str, rows: list, chunk_size: int = 500):
    """Insert rows in chunks to avoid Supabase payload limits."""
    sb = get_supabase()
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i : i + chunk_size]
        try:
            sb.table(table).insert(chunk).execute()
        except Exception as e:
            logger.error("Seed batch insert error (%s chunk %d): %s", table, i // chunk_size, e)


def seed_one_year():
    """
    Gera dados realistas de 1 ano para trás (365 dias) se a base estiver vazia.

    Idempotente: verifica a quantidade de dias com dados. Se já houver
    mais de 300 dias com registros, não faz nada.
    """
    sb = get_supabase()
    today = date.today()
    one_year_ago = today - timedelta(days=365)

    # ── Verificação de idempotência ──
    try:
        existing = (
            sb.table("expedicao_diaria")
            .select("data")
            .gte("data", one_year_ago.isoformat())
            .execute()
        )
        existing_dates = set(r["data"] for r in (existing.data or []))
        if len(existing_dates) > 300:
            logger.info(
                "Seed: já existem %d dias com dados — pulando seed.", len(existing_dates)
            )
            return
    except Exception as e:
        logger.error("Seed: erro ao verificar dados existentes: %s", e)
        return

    logger.info("Seed: gerando dados de 1 ano (%s → %s)...", one_year_ago, today)

    all_expedicoes: list[dict] = []
    all_producoes: list[dict] = []
    all_nps: list[dict] = []

    for day_offset in range(366):
        current_date = one_year_ago + timedelta(days=day_offset)
        dt_str = current_date.isoformat()

        # Pular dias que já têm dados
        if dt_str in existing_dates:
            continue

        is_wknd = _is_weekend(current_date)

        # ── Expedições do dia ──
        num_expedicoes = random.randint(4, 8) if is_wknd else random.randint(8, 15)
        day_clients = random.sample(CLIENTES, min(num_expedicoes, len(CLIENTES)))

        # Distribuir horários ao longo do dia (06:00 - 20:00)
        base_minutes = sorted(random.sample(range(360, 1200), len(day_clients)))

        day_concluidos = 0
        day_peso_previsto_total = 0
        day_peso_expedido_total = 0

        for idx, cliente in enumerate(day_clients):
            peso_prev = random.randint(800, 4500)
            h_plan_minutes = base_minutes[idx]
            h_plan = f"{h_plan_minutes // 60:02d}:{h_plan_minutes % 60:02d}"
            turno = _pick_turno()

            # Status distribution: ~70% concluido, ~15% atrasado, ~8% no_prazo, ~7% proximo/pendente
            # Para dias passados, a maioria está concluída ou atrasada (não pendente)
            roll = random.random()
            if current_date < today:
                if roll < 0.72:
                    status = "concluido"
                elif roll < 0.88:
                    status = "atrasado"
                elif roll < 0.95:
                    status = "no_prazo"
                else:
                    status = "concluido"
            else:
                # Hoje: mix de status
                if roll < 0.35:
                    status = "concluido"
                elif roll < 0.55:
                    status = "atrasado"
                elif roll < 0.75:
                    status = "proximo"
                elif roll < 0.90:
                    status = "no_prazo"
                else:
                    status = "pendente"

            if status == "concluido":
                # Horário real: até 30min antes ou depois do planejado
                delta_real = random.randint(-30, 15)
                h_real_minutes = max(0, min(1439, h_plan_minutes + delta_real))
                h_real = f"{h_real_minutes // 60:02d}:{h_real_minutes % 60:02d}"
                peso_exp = peso_prev
                day_concluidos += 1
                day_peso_expedido_total += peso_exp
            else:
                h_real = None
                peso_exp = 0

            day_peso_previsto_total += peso_prev

            all_expedicoes.append(
                {
                    "cliente": cliente,
                    "horario_planejado": h_plan,
                    "horario_real": h_real,
                    "status": status,
                    "data": dt_str,
                    "peso_previsto_kg": peso_prev,
                    "peso_expedido_kg": peso_exp,
                    "turno": turno,
                    "planta": "CNN",
                }
            )

        # ── Produção do dia ──
        # Entrada: baseado no total previsto do dia + margem
        entrada_base = int(day_peso_previsto_total * random.uniform(1.0, 1.15))
        if is_wknd:
            entrada_base = int(entrada_base * 0.6)

        # Saída: baseado nos concluídos + alguma produção extra
        saida_base = day_peso_expedido_total + random.randint(0, 2000)
        saida_base = min(saida_base, int(entrada_base * random.uniform(0.88, 0.99)))

        # Entrada split por turno
        entrada_manha = int(entrada_base * random.uniform(0.55, 0.70))
        entrada_tarde = entrada_base - entrada_manha

        all_producoes.append(
            {
                "cliente": "Geral Planta",
                "tipo": "entrada",
                "peso_kg": entrada_manha,
                "turno": "manha",
                "data": dt_str,
                "origem": "mock",
                "planta": "CNN",
            }
        )
        all_producoes.append(
            {
                "cliente": "Geral Planta",
                "tipo": "entrada",
                "peso_kg": entrada_tarde,
                "turno": "tarde",
                "data": dt_str,
                "origem": "mock",
                "planta": "CNN",
            }
        )

        # Saída como registros individuais por cliente concluído
        for exp in all_expedicoes[-len(day_clients) :]:
            if exp["status"] == "concluido":
                all_producoes.append(
                    {
                        "cliente": exp["cliente"],
                        "tipo": "saida",
                        "peso_kg": exp["peso_expedido_kg"],
                        "turno": exp["turno"],
                        "data": dt_str,
                        "origem": "mock",
                        "planta": "CNN",
                    }
                )

        # ── NPS (1-3 por semana, ~20% dos dias) ──
        if random.random() < 0.20:
            num_nps = random.randint(1, 3)
            for _ in range(num_nps):
                emoji, comentario = random.choice(NPS_COMENTARIOS)
                # Notas ponderadas: média ~8.2
                nota_weights = [0.02, 0.02, 0.02, 0.03, 0.04, 0.05, 0.08, 0.15, 0.22, 0.20, 0.17]
                nota = random.choices(range(11), weights=nota_weights, k=1)[0]
                if nota <= 6:
                    emoji = "sad"
                elif nota <= 8:
                    emoji = "neutral"
                else:
                    emoji = "happy"

                all_nps.append(
                    {
                        "nota": nota,
                        "emoji": emoji,
                        "comentario": comentario,
                        "pagina": random.choice(NPS_PAGINAS),
                        "turno": _pick_turno(),
                        "created_at": f"{dt_str}T{random.randint(8, 17):02d}:{random.randint(0, 59):02d}:00+00:00",
                    }
                )

    # ── Inserção em batch ──
    logger.info(
        "Seed: inserindo %d expedições, %d produções, %d NPS...",
        len(all_expedicoes),
        len(all_producoes),
        len(all_nps),
    )

    _batch_insert("expedicao_diaria", all_expedicoes)
    _batch_insert("producao_diaria", all_producoes)
    _batch_insert("historico_nps", all_nps)

    logger.info("Seed: ✅ Dados de 1 ano inseridos com sucesso!")


# ─────────────────────────────────────────────────────────
# Sprint 04 — Seed de Usuários (Auth + RBAC)
# ─────────────────────────────────────────────────────────

import hashlib

def _hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

USUARIOS_INICIAIS = [
    ("gestor@elis.com",    "elis2026", "Administrador Elis", "gestor"),
    ("expedidor@elis.com", "elis2026", "Operador Expedição", "expedidor"),
    ("usuario@elis.com",   "elis2026", "Usuário Padrão",     "comum"),
]


def seed_usuarios():
    """Cria tabela de usuários (se não existir) e insere usuários padrão."""
    sb = get_supabase()

    # Check if table has data already
    try:
        resp = sb.table("usuarios").select("id").limit(1).execute()
        if resp.data:
            logger.info("Seed: usuarios já possui registros — pulando.")
            return
    except Exception:
        # Table might not exist yet — we'll try to insert and let it fail gracefully
        logger.warning("Seed: tabela 'usuarios' pode não existir. Tentando criar via insert...")

    rows = [
        {
            "email": email,
            "senha_hash": _hash_pw(senha),
            "nome": nome,
            "perfil": perfil,
            "ativo": True,
        }
        for (email, senha, nome, perfil) in USUARIOS_INICIAIS
    ]

    try:
        sb.table("usuarios").insert(rows).execute()
        logger.info("Seed: ✅ %d usuários criados!", len(rows))
    except Exception as e:
        logger.error("Seed: erro ao inserir usuarios: %s", e)

