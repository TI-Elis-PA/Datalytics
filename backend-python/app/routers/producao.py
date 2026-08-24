"""Sprint 02 – Produção routes"""
import logging
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException

from app.core.models import ProducaoCreate
from app.core.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/hoje")
async def get_producao_hoje(target_date: str = None):
    """Resumo de produção de um dia específico (padrão: hoje)."""
    sb = get_supabase()
    today = target_date if target_date else date.today().isoformat()

    resp = sb.table("producao_diaria").select("*").eq("data", today).execute()
    registros = resp.data or []

    entrada_total = sum(r["peso_kg"] for r in registros if r["tipo"] == "entrada")
    saida_total = sum(r["peso_kg"] for r in registros if r["tipo"] == "saida")
    eficiencia = (saida_total / entrada_total * 100) if entrada_total > 0 else 0
    pendente = max(0, entrada_total - saida_total)

    # Per-client breakdown from expedições
    exp_resp = sb.table("expedicao_diaria").select("*").eq("data", today).execute()
    expedicoes = exp_resp.data or []

    por_cliente = []
    for exp in expedicoes:
        saidas_cliente = sum(
            r["peso_kg"]
            for r in registros
            if r["tipo"] == "saida" and r.get("cliente") == exp["cliente"]
        )
        peso_prev = exp.get("peso_previsto_kg", 0) or 0
        ef_cliente = (
            (saidas_cliente / peso_prev * 100)
            if peso_prev > 0
            else (100 if saidas_cliente > 0 else 0)
        )
        por_cliente.append(
            {
                "cliente": exp["cliente"],
                "peso_previsto": peso_prev,
                "peso_expedido": exp.get("peso_expedido_kg", 0) or saidas_cliente,
                "eficiencia": round(ef_cliente, 1),
                "status": exp["status"],
                "horario_planejado": exp["horario_planejado"],
                "horario_real": exp.get("horario_real"),
            }
        )

    # Turno breakdown
    por_turno = {}
    for r in registros:
        t = r.get("turno", "manha")
        if t not in por_turno:
            por_turno[t] = {"turno": t, "entrada": 0, "saida": 0}
        por_turno[t]["entrada" if r["tipo"] == "entrada" else "saida"] += r["peso_kg"]

    return {
        "success": True,
        "data": {
            "resumo": {
                "entrada_total": entrada_total,
                "saida_total": saida_total,
                "pendente": pendente,
                "eficiencia": round(eficiencia, 2),
                "status": "ok" if eficiencia >= 94 else "alerta" if eficiencia > 0 else "sem_dados",
            },
            "por_cliente": por_cliente,
            "por_turno": list(por_turno.values()),
        },
    }


@router.get("/historico")
async def get_historico():
    """Histórico de produção para gráficos (últimos 30 dias)."""
    sb = get_supabase()
    # Fix #3: was 300
    thirty_ago = (date.today() - timedelta(days=30)).isoformat()

    resp = (
        sb.table("producao_diaria")
        .select("data, tipo, peso_kg")
        .gte("data", thirty_ago)
        .execute()
    )
    registros = resp.data or []

    # Group by date
    by_date: dict = {}
    for r in registros:
        d = r["data"]
        if d not in by_date:
            by_date[d] = {"data": d, "entrada": 0, "saida": 0}
        by_date[d]["entrada" if r["tipo"] == "entrada" else "saida"] += r["peso_kg"]

    diario = sorted(
        [
            {
                "eficiencia": round(v["saida"] / v["entrada"] * 100, 2) if v["entrada"] > 0 else 0,
                **v,
            }
            for v in by_date.values()
        ],
        key=lambda x: x["data"],
    )

    # Today vs Yesterday
    today_str = date.today().isoformat()
    yesterday_str = (date.today() - timedelta(days=1)).isoformat()
    comparativo = [d for d in diario if d["data"] in [today_str, yesterday_str]]

    return {"success": True, "data": {"diario": diario, "comparativo": comparativo}}


@router.post("/entrada")
async def registrar_entrada(body: ProducaoCreate):
    """Registrar peso de entrada na planta."""
    sb = get_supabase()
    # Fix #16: Validate tipo instead of silently mutating
    if body.tipo != "entrada":
        raise HTTPException(400, "Use o endpoint /saida para registrar saídas")

    payload = {**body.model_dump(), "data": date.today().isoformat()}
    resp = sb.table("producao_diaria").insert(payload).execute()

    if not resp.data:
        raise HTTPException(500, "Erro ao registrar entrada")

    return {"success": True, "data": resp.data[0]}


@router.post("/saida")
async def registrar_saida(body: ProducaoCreate):
    """Registrar peso de saída por cliente."""
    sb = get_supabase()
    # Fix #16: Validate tipo instead of silently mutating
    if body.tipo != "saida":
        raise HTTPException(400, "Use o endpoint /entrada para registrar entradas")

    payload = {**body.model_dump(), "data": date.today().isoformat()}
    resp = sb.table("producao_diaria").insert(payload).execute()

    if not resp.data:
        raise HTTPException(500, "Erro ao registrar saída")

    return {"success": True, "data": resp.data[0]}
