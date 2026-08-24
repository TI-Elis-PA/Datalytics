"""Sprint 01 – Expedição routes"""
import asyncio
import logging
import os
import urllib.parse
from datetime import date, datetime, timedelta
from uuid import UUID

import httpx
from fastapi import APIRouter, HTTPException

from app.core.models import ExpedicaoCreate, ExpedicaoConcluir, ExpedicaoUpdate
from app.core.status_engine import calcular_status
from app.core.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Webhook Helper ───


async def disparar_webhook_async(client_name: str, planned_time: str):
    """Send delay alerts via Teams and/or WhatsApp webhooks."""
    teams_url = os.getenv("TEAMS_WEBHOOK_URL")
    msg_texto = (
        f"🚨 ALERTA DE ATRASO CRÍTICO 🚨\n"
        f"A expedição para o cliente {client_name} (prevista para {planned_time}) "
        f"acaba de entrar em status de atraso! Ação imediata necessária."
    )

    async with httpx.AsyncClient(verify=not os.getenv("DISABLE_SSL_VERIFY", "").lower() == "true") as client:
        # 1. Teams Webhook
        if teams_url and "sua-empresa" not in teams_url:
            try:
                await client.post(teams_url, json={"text": msg_texto}, timeout=5)
                logger.info("Teams webhook sent for %s", client_name)
            except Exception as e:
                logger.error("Teams Webhook error: %s", e)

        # 2. WhatsApp Alert (CallMeBot)
        wa_phone = os.getenv("WHATSAPP_PHONE")
        wa_api = os.getenv("WHATSAPP_APIKEY")
        if wa_phone and wa_api and "5511999999999" not in wa_phone:
            try:
                msg_encoded = urllib.parse.quote(msg_texto)
                url = (
                    f"https://api.callmebot.com/whatsapp.php"
                    f"?phone={wa_phone}&text={msg_encoded}&apikey={wa_api}"
                )
                await client.get(url, timeout=5)
                logger.info("WhatsApp webhook sent for %s", client_name)
            except Exception as e:
                logger.error("WhatsApp Webhook error: %s", e)


# ─── Endpoints ───


@router.get("/hoje")
async def get_expedicoes_hoje(target_date: str = None):
    """Lista todas as expedições de um dia específico (padrão: hoje) com status atualizado."""
    sb = get_supabase()
    today = target_date if target_date else date.today().isoformat()

    resp = (
        sb.table("expedicao_diaria")
        .select("*")
        .eq("data", today)
        .order("horario_planejado")
        .execute()
    )
    expedicoes = resp.data or []

    # Recalculate statuses and collect updates for batch
    updates_batch: list[dict] = []
    webhook_tasks: list = []

    for exp in expedicoes:
        if exp["status"] != "concluido":
            novo_status = calcular_status(
                exp["horario_planejado"], exp.get("horario_real"), exp["status"]
            )
            if novo_status != exp["status"]:
                old_status = exp["status"]
                exp["status"] = novo_status

                # Queue for batch update
                updates_batch.append({"id": exp["id"], "status": novo_status})

                # Only fire webhook on first transition to 'atrasado'
                if novo_status == "atrasado" and old_status != "atrasado":
                    webhook_tasks.append(
                        disparar_webhook_async(exp["cliente"], exp["horario_planejado"])
                    )

    # Batch update — one UPDATE per changed record (still individual due to Supabase API)
    for upd in updates_batch:
        try:
            sb.table("expedicao_diaria").update(
                {"status": upd["status"], "updated_at": datetime.now().isoformat()}
            ).eq("id", upd["id"]).execute()
        except Exception as e:
            logger.error("Failed to update status for %s: %s", upd["id"], e)

    # Fire webhooks concurrently
    if webhook_tasks:
        await asyncio.gather(*webhook_tasks, return_exceptions=True)

    # Stats
    stats = {
        "total": len(expedicoes),
        "concluidos": sum(1 for e in expedicoes if e["status"] == "concluido"),
        "atrasados": sum(1 for e in expedicoes if e["status"] == "atrasado"),
        "proximos": sum(1 for e in expedicoes if e["status"] == "proximo"),
        "no_prazo": sum(1 for e in expedicoes if e["status"] == "no_prazo"),
        "pendentes": sum(1 for e in expedicoes if e["status"] != "concluido"),
        "peso_previsto_total": sum(e.get("peso_previsto_kg", 0) or 0 for e in expedicoes),
        "peso_expedido_total": sum(e.get("peso_expedido_kg", 0) or 0 for e in expedicoes),
    }

    return {"success": True, "data": {"expedicoes": expedicoes, "stats": stats}}


@router.get("/historico")
async def get_historico(mes: int = None, ano: int = None):
    """Histórico mensal de expedições."""
    sb = get_supabase()
    query = sb.table("expedicao_diaria").select("*")

    if mes and ano:
        start = f"{ano}-{mes:02d}-01"
        end_month = mes + 1 if mes < 12 else 1
        end_year = ano if mes < 12 else ano + 1
        end = f"{end_year}-{end_month:02d}-01"
        query = query.gte("data", start).lt("data", end)
    else:
        # Last 30 days (Fix #3: was 300)
        thirty_ago = (date.today() - timedelta(days=30)).isoformat()
        query = query.gte("data", thirty_ago)

    resp = query.order("data", desc=True).order("horario_planejado").execute()
    return {"success": True, "data": resp.data or []}


@router.get("/ranking")
async def get_ranking():
    """Ranking de clientes por taxa de atraso (últimos 30 dias)."""
    sb = get_supabase()
    # Fix #3: was 300
    thirty_ago = (date.today() - timedelta(days=30)).isoformat()

    resp = (
        sb.table("expedicao_diaria")
        .select("cliente, status, peso_previsto_kg, peso_expedido_kg")
        .gte("data", thirty_ago)
        .execute()
    )
    data = resp.data or []

    # Group by client
    clients: dict = {}
    for row in data:
        c = row["cliente"]
        if c not in clients:
            clients[c] = {"cliente": c, "total": 0, "atrasados": 0, "concluidos": 0, "peso_total": 0}
        clients[c]["total"] += 1
        if row["status"] == "atrasado":
            clients[c]["atrasados"] += 1
        if row["status"] == "concluido":
            clients[c]["concluidos"] += 1
        clients[c]["peso_total"] += row.get("peso_previsto_kg", 0) or 0

    ranking = sorted(
        [
            {
                "taxa_atraso": round((v["atrasados"] / v["total"]) * 100, 1) if v["total"] > 0 else 0,
                **v,
            }
            for v in clients.values()
        ],
        key=lambda x: x["atrasados"],
        reverse=True,
    )
    return {"success": True, "data": ranking}


@router.get("/alertas")
async def get_alertas():
    """Alertas não lidos do dia."""
    sb = get_supabase()
    today = date.today().isoformat()
    resp = (
        sb.table("alertas_log")
        .select("*, expedicao_diaria(cliente, horario_planejado)")
        .gte("created_at", today)
        .eq("lido", False)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return {"success": True, "data": resp.data or []}


@router.post("/broadcast-atrasos")
async def broadcast_atrasos():
    """Dispara webhook para todos os atrasos de hoje (AI Agent Action)."""
    sb = get_supabase()
    today = date.today().isoformat()
    resp = (
        sb.table("expedicao_diaria")
        .select("*")
        .eq("data", today)
        .eq("status", "atrasado")
        .execute()
    )
    atrasados = resp.data or []

    tasks = []
    for exp in atrasados:
        tasks.append(disparar_webhook_async(exp["cliente"], exp["horario_planejado"]))
        # Fix #2: tipo "alerta" → "atrasado" (matches CHECK constraint)
        try:
            sb.table("alertas_log").insert(
                {
                    "expedicao_id": exp["id"],
                    "tipo": "atrasado",
                    "mensagem": f"🤖 IA disparou Alerta WhatsApp para {exp['cliente']}",
                }
            ).execute()
        except Exception as e:
            logger.error("Failed to log alert for %s: %s", exp["cliente"], e)

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)

    return {"success": True, "disparados": len(tasks)}


@router.post("/")
async def criar_expedicao(body: ExpedicaoCreate):
    """Cadastrar nova expedição."""
    sb = get_supabase()
    status = calcular_status(body.horario_planejado, None, "pendente")
    payload = {**body.model_dump(), "data": date.today().isoformat(), "status": status}
    resp = sb.table("expedicao_diaria").insert(payload).execute()

    if not resp.data:
        raise HTTPException(500, "Erro ao criar expedição")

    return {"success": True, "data": resp.data[0]}


@router.put("/{id}/concluir")
async def concluir_expedicao(id: UUID, body: ExpedicaoConcluir = None):
    """Marcar expedição como concluída."""
    sb = get_supabase()
    now_str = datetime.now().strftime("%H:%M")

    updates = {
        "status": "concluido",
        "horario_real": body.horario_real or now_str if body else now_str,
        "updated_at": datetime.now().isoformat(),
    }
    if body and body.peso_expedido_kg is not None:
        updates["peso_expedido_kg"] = body.peso_expedido_kg

    resp = sb.table("expedicao_diaria").update(updates).eq("id", str(id)).execute()
    if not resp.data:
        raise HTTPException(404, "Expedição não encontrada")

    exp = resp.data[0]
    # Log alert
    try:
        sb.table("alertas_log").insert(
            {
                "expedicao_id": str(id),
                "tipo": "concluido",
                "mensagem": f"✅ {exp['cliente']} expedido às {updates['horario_real']}",
            }
        ).execute()
    except Exception as e:
        logger.error("Failed to log completion alert: %s", e)

    return {"success": True, "data": exp}


@router.put("/{id}")
async def atualizar_expedicao(id: UUID, body: ExpedicaoUpdate):
    """Atualizar dados de uma expedição."""
    sb = get_supabase()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}

    if not updates:
        raise HTTPException(400, "Nenhum campo para atualizar")

    updates["updated_at"] = datetime.now().isoformat()
    resp = sb.table("expedicao_diaria").update(updates).eq("id", str(id)).execute()

    if not resp.data:
        raise HTTPException(404, "Expedição não encontrada")

    return {"success": True, "data": resp.data[0]}


@router.delete("/{id}")
async def deletar_expedicao(id: UUID):
    """Deletar expedição."""
    sb = get_supabase()

    # Fix #9: Verify record exists before deleting
    check = sb.table("expedicao_diaria").select("id").eq("id", str(id)).execute()
    if not check.data:
        raise HTTPException(404, "Expedição não encontrada")

    sb.table("expedicao_diaria").delete().eq("id", str(id)).execute()
    return {"success": True, "message": "Expedição removida"}


@router.put("/alertas/{id}/lido")
async def marcar_alerta_lido(id: UUID):
    """Marcar alerta como lido."""
    sb = get_supabase()
    sb.table("alertas_log").update({"lido": True}).eq("id", str(id)).execute()
    return {"success": True}
