"""Sprint 03 – Estoque routes"""
import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.core.models import EstoqueCreate, EstoqueUpdate, EstoqueMovimentacao
from app.core.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()


def _status_estoque(quantidade: float, estoque_minimo: float) -> str:
    """Semáforo de estoque: ok / baixo / critico."""
    if quantidade <= 0 or (estoque_minimo > 0 and quantidade <= estoque_minimo * 0.5):
        return "critico"
    if estoque_minimo > 0 and quantidade <= estoque_minimo:
        return "baixo"
    return "ok"


@router.get("/")
async def listar_estoque():
    """Lista todos os itens de estoque com status calculado (semáforo)."""
    sb = get_supabase()
    resp = sb.table("estoque").select("*").order("produto").execute()
    itens = resp.data or []

    for item in itens:
        item["status"] = _status_estoque(
            float(item.get("quantidade", 0) or 0),
            float(item.get("estoque_minimo", 0) or 0),
        )

    return {"success": True, "data": itens}


@router.get("/resumo")
async def resumo_estoque():
    """KPIs gerais do estoque."""
    sb = get_supabase()
    resp = sb.table("estoque").select("*").execute()
    itens = resp.data or []

    total_itens = len(itens)
    baixos = 0
    criticos = 0
    valor_total = 0.0

    for item in itens:
        qtd = float(item.get("quantidade", 0) or 0)
        minimo = float(item.get("estoque_minimo", 0) or 0)
        valor_total += qtd * float(item.get("valor_unitario", 0) or 0)

        status = _status_estoque(qtd, minimo)
        if status == "critico":
            criticos += 1
        elif status == "baixo":
            baixos += 1

    return {
        "success": True,
        "data": {
            "total_itens": total_itens,
            "baixos": baixos,
            "criticos": criticos,
            "saudaveis": total_itens - baixos - criticos,
            "valor_total": round(valor_total, 2),
        },
    }


@router.get("/{id}/movimentacoes")
async def listar_movimentacoes(id: UUID):
    """Histórico de movimentações de um item."""
    sb = get_supabase()
    resp = (
        sb.table("estoque_movimentacoes")
        .select("*")
        .eq("estoque_id", str(id))
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"success": True, "data": resp.data or []}


@router.post("/")
async def criar_item(body: EstoqueCreate):
    """Cadastrar novo item de estoque."""
    sb = get_supabase()
    payload = {**body.model_dump()}
    resp = sb.table("estoque").insert(payload).execute()

    if not resp.data:
        raise HTTPException(500, "Erro ao criar item de estoque")

    item = resp.data[0]
    try:
        sb.table("estoque_movimentacoes").insert(
            {
                "estoque_id": item["id"],
                "tipo": "ajuste",
                "quantidade": item["quantidade"],
                "observacao": "Cadastro inicial do item",
                "usuario": "sistema",
            }
        ).execute()
    except Exception as e:
        logger.error("Falha ao registrar movimentação inicial: %s", e)

    return {"success": True, "data": item}


@router.put("/{id}")
async def atualizar_item(id: UUID, body: EstoqueUpdate):
    """Atualizar dados de um item de estoque."""
    sb = get_supabase()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}

    if not updates:
        raise HTTPException(400, "Nenhum campo para atualizar")

    updates["updated_at"] = datetime.now().isoformat()
    resp = sb.table("estoque").update(updates).eq("id", str(id)).execute()

    if not resp.data:
        raise HTTPException(404, "Item de estoque não encontrado")

    return {"success": True, "data": resp.data[0]}


@router.post("/{id}/movimentacao")
async def movimentar_item(id: UUID, body: EstoqueMovimentacao):
    """Registrar entrada/saída/ajuste e atualizar a quantidade em estoque."""
    sb = get_supabase()

    check = sb.table("estoque").select("*").eq("id", str(id)).execute()
    if not check.data:
        raise HTTPException(404, "Item de estoque não encontrado")

    item = check.data[0]
    qtd_atual = float(item.get("quantidade", 0) or 0)
    delta = body.quantidade if body.tipo == "entrada" else -body.quantidade
    nova_qtd = max(0, qtd_atual + delta)

    updates = {"quantidade": nova_qtd, "updated_at": datetime.now().isoformat()}
    resp = sb.table("estoque").update(updates).eq("id", str(id)).execute()

    try:
        sb.table("estoque_movimentacoes").insert(
            {
                "estoque_id": str(id),
                "tipo": body.tipo,
                "quantidade": body.quantidade,
                "observacao": body.observacao,
                "usuario": body.usuario,
            }
        ).execute()
    except Exception as e:
        logger.error("Falha ao registrar movimentação: %s", e)

    return {"success": True, "data": resp.data[0]}


@router.delete("/{id}")
async def deletar_item(id: UUID):
    """Deletar item de estoque (movimentações são removidas em cascata)."""
    sb = get_supabase()

    check = sb.table("estoque").select("id").eq("id", str(id)).execute()
    if not check.data:
        raise HTTPException(404, "Item de estoque não encontrado")

    sb.table("estoque").delete().eq("id", str(id)).execute()
    return {"success": True, "message": "Item removido"}