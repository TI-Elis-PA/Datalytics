"""NPS router"""
import logging
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException

from app.core.models import NPSCreate
from app.core.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/")
async def registrar_nps(body: NPSCreate):
    """Registrar avaliação NPS."""
    sb = get_supabase()

    # Map nota to emoji if not provided — avoid mutating the Pydantic model
    emoji = body.emoji
    if not emoji:
        if body.nota >= 9:
            emoji = "happy"
        elif body.nota >= 7:
            emoji = "neutral"
        else:
            emoji = "sad"

    payload = {**body.model_dump(), "emoji": emoji}
    resp = sb.table("historico_nps").insert(payload).execute()

    if not resp.data:
        raise HTTPException(500, "Erro ao registrar avaliação NPS")

    return {"success": True, "data": resp.data[0]}


@router.get("/resumo")
async def get_resumo():
    """Resumo NPS dos últimos 30 dias."""
    sb = get_supabase()
    thirty_ago = (date.today() - timedelta(days=30)).isoformat()

    resp = sb.table("historico_nps").select("*").gte("created_at", thirty_ago).execute()
    data = resp.data or []

    if not data:
        return {
            "success": True,
            "data": {
                "nps_score": 0,
                "total": 0,
                "media": 0,
                "promotores": 0,
                "neutros": 0,
                "detratores": 0,
            },
        }

    total = len(data)
    promotores = sum(1 for d in data if d["nota"] >= 9)
    neutros = sum(1 for d in data if 7 <= d["nota"] <= 8)
    detratores = sum(1 for d in data if d["nota"] <= 6)
    media = round(sum(d["nota"] for d in data) / total, 1)
    nps_score = round(((promotores - detratores) / total) * 100)

    # Score distribution
    distribuicao: dict[str, int] = {}
    for d in data:
        n = str(d["nota"])
        distribuicao[n] = distribuicao.get(n, 0) + 1

    # By date trend
    by_date: dict = {}
    for d in data:
        dt = d["created_at"][:10]
        if dt not in by_date:
            by_date[dt] = {"data": dt, "notas": [], "total": 0}
        by_date[dt]["notas"].append(d["nota"])
        by_date[dt]["total"] += 1

    tendencia = sorted(
        [
            {
                "media": round(sum(v["notas"]) / len(v["notas"]), 1),
                **{k: val for k, val in v.items() if k != "notas"},
            }
            for v in by_date.values()
        ],
        key=lambda x: x["data"],
    )

    # Recent comments
    comentarios = [d for d in data if d.get("comentario")][-10:]

    return {
        "success": True,
        "data": {
            "nps_score": nps_score,
            "total": total,
            "media": media,
            "promotores": promotores,
            "neutros": neutros,
            "detratores": detratores,
            "distribuicao": [{"nota": int(k), "count": v} for k, v in sorted(distribuicao.items())],
            "tendencia": tendencia,
            "comentarios": sorted(comentarios, key=lambda x: x["created_at"], reverse=True),
        },
    }
