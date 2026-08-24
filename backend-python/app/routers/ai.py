"""AI router – Gemini integration with smart fallback via httpx"""
import logging
import os
from datetime import date, timedelta, datetime

import httpx
from fastapi import APIRouter

from app.core.models import AIQuestion
from app.core.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()


async def _call_gemini_api(prompt: str) -> str | None:
    """Call Google Gemini REST API directly via httpx (lightweight, no gRPC/C++ binaries)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your-gemini-api-key-here":
        return None

    # Model: gemini-2.5-flash or gemini-1.5-flash
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    try:
        verify_ssl = os.getenv("DISABLE_SSL_VERIFY", "false").lower() != "true"
        async with httpx.AsyncClient(verify=verify_ssl, timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
            else:
                logger.error("Gemini API error (%d): %s", resp.status_code, resp.text)
    except Exception as e:
        logger.error("Gemini API request failed: %s", e)
    return None


def _build_context(target_date: str = None) -> dict:
    sb = get_supabase()
    today = target_date if target_date else date.today().isoformat()

    exp_resp = sb.table("expedicao_diaria").select("*").eq("data", today).execute()
    expedicoes = exp_resp.data or []

    prod_resp = (
        sb.table("producao_diaria")
        .select("tipo, peso_kg, turno, cliente")
        .eq("data", today)
        .execute()
    )
    prod = prod_resp.data or []

    entrada = sum(r["peso_kg"] for r in prod if r["tipo"] == "entrada")
    saida = sum(r["peso_kg"] for r in prod if r["tipo"] == "saida")
    eficiencia = round(saida / entrada * 100, 1) if entrada > 0 else 0

    # Root Cause Analysis: Turnos e Pior Cliente
    turnos_ef: dict = {}
    for r in prod:
        t = r.get("turno", "manha")
        if t not in turnos_ef:
            turnos_ef[t] = {"entrada": 0, "saida": 0}
        turnos_ef[t][r["tipo"]] += r["peso_kg"]

    turnos_res = []
    for t, vals in turnos_ef.items():
        ef = round(vals["saida"] / vals["entrada"] * 100, 1) if vals["entrada"] > 0 else 0
        turnos_res.append(f"{t}: {ef}%")

    clientes_saida: dict = {}
    for r in prod:
        if r["tipo"] == "saida" and r.get("cliente"):
            c = r["cliente"]
            clientes_saida[c] = clientes_saida.get(c, 0) + r["peso_kg"]

    pior_cliente = None
    if clientes_saida:
        cli_efs = []
        for exp in expedicoes:
            c = exp["cliente"]
            peso_prev = exp.get("peso_previsto_kg", 0) or 0
            if peso_prev > 0:
                peso_real = clientes_saida.get(c, 0)
                ef = peso_real / peso_prev * 100
                cli_efs.append(
                    {"cliente": c, "eficiencia": ef, "gap": peso_prev - peso_real}
                )
        if cli_efs:
            cli_efs.sort(key=lambda x: x["eficiencia"])
            w = cli_efs[0]
            pior_cliente = f"{w['cliente']} ({round(w['eficiencia'], 1)}% ef, {w['gap']}kg pendente)"

    thirty_ago = (date.today() - timedelta(days=30)).isoformat()
    rank_resp = (
        sb.table("expedicao_diaria")
        .select("cliente, status")
        .eq("status", "atrasado")
        .gte("data", thirty_ago)
        .execute()
    )
    rank_data = rank_resp.data or []
    ranking: dict = {}
    for r in rank_data:
        ranking[r["cliente"]] = ranking.get(r["cliente"], 0) + 1
    ranking_sorted = sorted(ranking.items(), key=lambda x: x[1], reverse=True)[:5]

    stats = {
        "total": len(expedicoes),
        "concluidos": sum(1 for e in expedicoes if e["status"] == "concluido"),
        "atrasados": sum(1 for e in expedicoes if e["status"] == "atrasado"),
        "proximos": sum(1 for e in expedicoes if e["status"] == "proximo"),
        "no_prazo": sum(1 for e in expedicoes if e["status"] in ("no_prazo", "pendente")),
    }

    # Fetch yesterday's context
    try:
        dt_today = datetime.fromisoformat(today[:10])
    except ValueError:
        dt_today = datetime.now()
        
    yesterday = (dt_today - timedelta(days=1)).date().isoformat()
    
    exp_ontem_resp = sb.table("expedicao_diaria").select("status").eq("data", yesterday).execute()
    prod_ontem_resp = sb.table("producao_diaria").select("tipo, peso_kg").eq("data", yesterday).execute()
    
    prod_ontem = prod_ontem_resp.data or []
    ent_ontem = sum(r["peso_kg"] for r in prod_ontem if r["tipo"] == "entrada")
    sai_ontem = sum(r["peso_kg"] for r in prod_ontem if r["tipo"] == "saida")
    eficiencia_ontem = round(sai_ontem / ent_ontem * 100, 1) if ent_ontem > 0 else 0

    exp_ontem = exp_ontem_resp.data or []
    stats_ontem = {
        "total": len(exp_ontem),
        "concluidos": sum(1 for e in exp_ontem if e["status"] == "concluido"),
        "atrasados": sum(1 for e in exp_ontem if e["status"] == "atrasado"),
    }

    return {
        "today": today,
        "yesterday": yesterday,
        "expedicoes": expedicoes,
        "stats": stats,
        "eficiencia_ontem": eficiencia_ontem,
        "stats_ontem": stats_ontem,
        "entrada": entrada,
        "saida": saida,
        "eficiencia": eficiencia,
        "turnos": ", ".join(turnos_res) if turnos_res else "N/A",
        "pior_cliente": pior_cliente or "N/A",
        "ranking": ranking_sorted,
    }


def _smart_insights(ctx: dict) -> str:
    insights = []
    s = ctx["stats"]
    ef = ctx["eficiencia"]

    # ── Section 1: Efficiency Overview ──
    if ef >= 94:
        insights.append(
            f"✅ **Eficiência da Planta: {ef}%** — Meta de 94% atingida!\n"
            f"A planta está operando acima do esperado. "
            f"Entrada de {ctx['entrada']:.0f}kg com saída de {ctx['saida']:.0f}kg. "
            f"Eficiência por turno: {ctx['turnos']}."
        )
    elif ef > 0:
        gap_kg = ctx["entrada"] - ctx["saida"]
        insights.append(
            f"⚠️ **Eficiência da Planta: {ef}%** — Abaixo da meta de 94%\n"
            f"Ainda faltam **{gap_kg:.0f}kg** para atingir a meta. "
            f"Entrada: {ctx['entrada']:.0f}kg | Saída: {ctx['saida']:.0f}kg.\n"
            f"Eficiência por turno: **{ctx['turnos']}**.\n"
            f"Principal ofensor (gargalo): **{ctx['pior_cliente']}**."
        )
    else:
        insights.append(
            "📊 **Eficiência:** Ainda não há dados de produção registrados para hoje.\n"
            "Os dados aparecerão automaticamente conforme a operação registrar entradas e saídas."
        )

    # ── Section 2: Expedition Status ──
    if s["total"] > 0:
        pct = round(s["concluidos"] / s["total"] * 100)
        insights.append(
            f"🚚 **Expedição do Dia: {pct}% concluída** — {s['concluidos']}/{s['total']} clientes\n"
            f"• 🟢 No prazo: {s['no_prazo']} | 🟡 Próximos: {s['proximos']} | "
            f"🔴 Atrasados: {s['atrasados']} | ✅ Concluídos: {s['concluidos']}"
        )
    else:
        insights.append(
            "🚚 **Expedição:** Nenhuma expedição programada para esta data.\n"
            "Verifique se os dados foram importados corretamente via planilha Excel."
        )

    # ── Section 3: Critical Alerts ──
    if s["atrasados"] > 0:
        nomes = [e["cliente"] for e in ctx["expedicoes"] if e["status"] == "atrasado"]
        insights.append(
            f"🔴 **ALERTA: {s['atrasados']} expedição(ões) atrasada(s)**\n"
            f"Clientes afetados: **{', '.join(nomes)}**.\n"
            f"Recomendação: Priorize essas expedições imediatamente e notifique o responsável pelo transporte."
        )

    if s["proximos"] > 0:
        nomes = [e["cliente"] for e in ctx["expedicoes"] if e["status"] == "proximo"]
        insights.append(
            f"⏰ **ATENÇÃO: {s['proximos']} próximo(s) do horário limite**\n"
            f"Clientes: **{', '.join(nomes)}**.\n"
            f"Ação sugerida: Agilize o carregamento para evitar que entrem em atraso."
        )

    # ── Section 4: 30-Day Trend Analysis ──
    if ctx["ranking"]:
        ranking_lines = [f"  {i+1}. **{c}** — {n} atraso(s)" for i, (c, n) in enumerate(ctx["ranking"])]
        top = ctx["ranking"][0]
        insights.append(
            f"📈 **Análise de Tendência (30 dias):**\n"
            f"Os clientes com maior histórico de atrasos são:\n" +
            "\n".join(ranking_lines) +
            f"\n\nO cliente **{top[0]}** lidera com **{top[1]} ocorrências**. "
            f"Considere revisar o horário planejado ou adiantar a produção deste cliente."
        )
    else:
        insights.append(
            "📈 **Histórico (30 dias):** Nenhum atraso registrado no último mês. Excelente!"
        )

    # ── Section 5: Predictions ──
    if s["proximos"] >= 2:
        insights.append(
            "🔮 **Predição IA:** Com base nos dados atuais, há alta probabilidade de novos atrasos nas próximas horas.\n"
            f"Motivo: {s['proximos']} expedições próximas do limite simultaneamente geram risco de cascata operacional."
        )
    elif pct == 100 if s["total"] > 0 else False:
        insights.append(
            "🏆 **Parabéns! 100% das expedições concluídas!**\n"
            "A operação do dia foi encerrada com sucesso. Todos os clientes atendidos dentro do planejamento."
        )

    return "\n\n".join(insights)


def _smart_answer(question: str, ctx: dict) -> str:
    q = question.lower()

    if "eficiên" in q or "eficien" in q:
        return (
            f"📊 **Eficiência atual: {ctx['eficiencia']}%**\n\n"
            f"• Entrada: {ctx['entrada']:.0f} kg\n"
            f"• Saída: {ctx['saida']:.0f} kg\n"
            f"• Meta: 94% {'✅' if ctx['eficiencia'] >= 94 else '⚠️'}"
        )

    if "atraso" in q or "atrasado" in q:
        atrasados = [e for e in ctx["expedicoes"] if e["status"] == "atrasado"]
        if not atrasados:
            return "✅ Nenhuma expedição atrasada no momento!"
        return f"🔴 **{len(atrasados)} atrasada(s):**\n" + "\n".join(
            f"• {e['cliente']} — previsto {e['horario_planejado']}" for e in atrasados
        )

    if "relat" in q or "resumo" in q:
        s = ctx["stats"]
        return (
            f"📋 **Relatório do dia:**\n\n"
            f"🚚 Expedição: {s['total']} clientes | ✅ {s['concluidos']} | 🔴 {s['atrasados']} atrasados\n\n"
            f"🏭 Produção: {ctx['entrada']:.0f}kg entrada | {ctx['saida']:.0f}kg saída | "
            f"Eficiência: {ctx['eficiencia']}%"
        )

    if "ranking" in q or "pior" in q:
        if not ctx["ranking"]:
            return "✅ Sem histórico de atrasos nos últimos 30 dias!"
        return "🏆 **Ranking de atrasos (30d):**\n" + "\n".join(
            f"{i + 1}. {c}: {n} atrasos" for i, (c, n) in enumerate(ctx["ranking"])
        )

    return _smart_insights(ctx) or "📊 Pergunte sobre: eficiência, atrasos, relatório ou ranking de clientes."


@router.post("/chat")
async def chat(body: AIQuestion):
    """Chat com IA sobre dados operacionais."""
    ctx = _build_context(body.date)
    s = ctx["stats"]
    s_ontem = ctx["stats_ontem"]

    prompt = f"""Você é um analista de operações industrial (Copiloto) especializado em logística e produção na lavanderia industrial Elis.
Responda em português brasileiro, de forma direta, analítica e objetiva. Use emojis para formatar e não gere introduções muito longas.

DADOS OPERACIONAIS DE HOJE ({ctx['today']}):
- Expedições: {s['total']} caminhões no total. {s['concluidos']} concluídos, {s['atrasados']} atrasados, {s['proximos']} próximos do limite de horário.
- Eficiência Global da Fábrica: {ctx['eficiencia']}% (Total de roupas processadas: {ctx['entrada']:.0f}kg, expedidas: {ctx['saida']:.0f}kg). Meta: 94%.
- Eficiência por Turno: {ctx['turnos']}
- Principal Ofensor (Gargalo/Maior volume pendente): {ctx['pior_cliente']}
- Top clientes com problemas no mês (30d): {', '.join(f'{c} ({n}x)' for c, n in ctx['ranking'])}

DADOS DE ONTEM ({ctx['yesterday']}):
- Eficiência Global: {ctx['eficiencia_ontem']}%
- Expedições: {s_ontem['total']} total, {s_ontem['concluidos']} concluídos, {s_ontem['atrasados']} atrasados.

INSTRUÇÕES DO SISTEMA:
1. Se a eficiência estiver abaixo de 94%, seja crítico. Identifique o gargalo (pior cliente ou turno ruim) e sugira ações práticas (ex: "Acionar manutenção", "Alocar mais pessoas no acabamento").
2. Se houver atrasos de expedição e você sugerir alertar clientes/gestores, coloque OBRIGATORIAMENTE a tag [ACTION:ALERT_WHATSAPP] em uma linha isolada no final da resposta. O frontend usará isso para criar um botão de disparo automático.
3. Se a pergunta for fora de contexto, redirecione educadamente para a operação.

PERGUNTA DO USUÁRIO: {body.message}
"""
    ai_text = await _call_gemini_api(prompt)
    if ai_text:
        return {"success": True, "data": {"answer": ai_text, "source": "gemini"}}

    answer = _smart_answer(body.message, ctx)
    return {"success": True, "data": {"answer": answer, "source": "smart"}}


@router.get("/insights")
async def get_insights(date: str = None):
    """Insights automáticos do dia."""
    ctx = _build_context(date)
    insights_text = _smart_insights(ctx) # Fallback padrão
    
    s = ctx["stats"]
    prompt = f"""Atue como um Especialista de Dados Industriais da Elis. 
Faça uma análise rápida e impactante dos dados operacionais de hoje ({ctx['today']}).
Seja direto, profissional e use emojis.
Divida em 3 curtos tópicos: 1. Status da Produção/Eficiência, 2. Saúde das Expedições (Atrasos), 3. Recomendação de Foco imediato.

DADOS REAIS LIDOS DO SISTEMA AGORA:
- Expedição: {s['atrasados']} atrasos, {s['proximos']} próximos de atrasar. {s['concluidos']}/{s['total']} concluídos.
- Produção Eficiência: {ctx['eficiencia']}% (Entrada: {ctx['entrada']}kg, Saída: {ctx['saida']}kg). Meta é 94%.
- Pior ofensor: {ctx['pior_cliente']}

Gere os insights executivos agora:"""

    ai_text = await _call_gemini_api(prompt)
    if ai_text:
        insights_text = ai_text

    return {
        "success": True,
        "data": {
            "insights": insights_text,
            "context": ctx["stats"],
            "eficiencia": ctx["eficiencia"],
        },
    }


@router.post("/relatorio-dia")
async def relatorio_dia():
    """Relatório executivo do dia."""
    body = AIQuestion(
        message="Gere um relatório executivo completo do dia com resumo de expedição, eficiência, pontos de atenção e recomendações."
    )
    return await chat(body)

