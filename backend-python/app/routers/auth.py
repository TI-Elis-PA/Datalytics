"""Auth router — login / me / user management"""
import os
import hashlib
import hmac
import json
import base64
import time
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional

from app.core.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

# ─── JWT-like token (simple HMAC-based, no external deps) ───
_SECRET = os.getenv("JWT_SECRET", "datalytics-elis-secret-2026-cnn-team")


def _hash_password(password: str) -> str:
    """SHA-256 hash for password storage."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _create_token(user_id: str, email: str, perfil: str) -> str:
    """Create a simple HMAC-signed token."""
    payload = {
        "sub": user_id,
        "email": email,
        "perfil": perfil,
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 7,  # 7 days
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    signature = hmac.new(_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"


def _verify_token(token: str) -> Optional[dict]:
    """Verify and decode a token. Returns payload or None."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        expected_sig = hmac.new(_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def get_current_user(request: Request) -> dict:
    """Dependency: extract and verify user from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido")
    token = auth_header[7:]
    payload = _verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    return payload


# ─── Models ───
class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    senha: str = Field(min_length=4, max_length=200)


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    senha: str = Field(min_length=4, max_length=200)
    nome: str = Field(min_length=1, max_length=200)
    perfil: str = Field(default="comum", pattern=r"^(gestor|expedidor|comum)$")


# ─── Routes ───

@router.post("/login")
async def login(body: LoginRequest):
    """Authenticate user and return token."""
    sb = get_supabase()
    senha_hash = _hash_password(body.senha)

    try:
        resp = sb.table("usuarios").select("*").eq("email", body.email.lower().strip()).eq("senha_hash", senha_hash).eq("ativo", True).execute()
    except Exception as e:
        logger.error("Login query failed: %s", e)
        raise HTTPException(status_code=500, detail="Erro interno ao autenticar")

    users = resp.data or []
    if not users:
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")

    user = users[0]
    token = _create_token(user["id"], user["email"], user["perfil"])

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "nome": user["nome"],
            "perfil": user["perfil"],
        },
    }


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Return current user info from token."""
    sb = get_supabase()
    try:
        resp = sb.table("usuarios").select("id, email, nome, perfil, ativo").eq("id", user["sub"]).execute()
        users = resp.data or []
        if not users or not users[0].get("ativo"):
            raise HTTPException(status_code=401, detail="Usuário não encontrado ou inativo")
        u = users[0]
        return {
            "success": True,
            "user": {
                "id": u["id"],
                "email": u["email"],
                "nome": u["nome"],
                "perfil": u["perfil"],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching user: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao buscar usuário")


class UserUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    perfil: Optional[str] = None
    ativo: Optional[bool] = None
    senha: Optional[str] = None


@router.get("/usuarios")
async def listar_usuarios(user: dict = Depends(get_current_user)):
    """List all users (gestor only)."""
    if user.get("perfil") != "gestor":
        raise HTTPException(status_code=403, detail="Acesso restrito a gestores")
    sb = get_supabase()
    resp = sb.table("usuarios").select("id, email, nome, perfil, ativo, created_at").order("nome").execute()
    return {"success": True, "data": resp.data or []}


@router.post("/usuarios")
async def criar_usuario(body: UserCreate, user: dict = Depends(get_current_user)):
    """Create a new user (gestor only)."""
    if user.get("perfil") != "gestor":
        raise HTTPException(status_code=403, detail="Acesso restrito a gestores")
    sb = get_supabase()

    # Check if email already exists
    existing = sb.table("usuarios").select("id").eq("email", body.email.lower().strip()).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")

    row = {
        "email": body.email.lower().strip(),
        "senha_hash": _hash_password(body.senha),
        "nome": body.nome.strip(),
        "perfil": body.perfil,
        "ativo": True,
    }
    sb.table("usuarios").insert(row).execute()
    return {"success": True, "message": f"Usuário {body.nome} criado com perfil {body.perfil}"}


@router.put("/usuarios/{user_id}")
async def editar_usuario(user_id: str, body: UserUpdate, user: dict = Depends(get_current_user)):
    """Edit a user (gestor only)."""
    if user.get("perfil") != "gestor":
        raise HTTPException(status_code=403, detail="Acesso restrito a gestores")
    sb = get_supabase()

    # check if user exists
    existing = sb.table("usuarios").select("id").eq("id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    updates = {}
    if body.nome is not None:
        updates["nome"] = body.nome.strip()
    if body.email is not None:
        updates["email"] = body.email.lower().strip()
    if body.perfil is not None:
        updates["perfil"] = body.perfil
    if body.ativo is not None:
        updates["ativo"] = body.ativo
    if body.senha:
        updates["senha_hash"] = _hash_password(body.senha)

    if not updates:
        return {"success": True, "message": "Nenhuma alteração enviada"}

    try:
        sb.table("usuarios").update(updates).eq("id", user_id).execute()
        return {"success": True, "message": "Usuário atualizado com sucesso"}
    except Exception as e:
        logger.error("Error updating user: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao atualizar usuário")


@router.delete("/usuarios/{user_id}")
async def apagar_usuario(user_id: str, user: dict = Depends(get_current_user)):
    """Delete a user (gestor only)."""
    if user.get("perfil") != "gestor":
        raise HTTPException(status_code=403, detail="Acesso restrito a gestores")
    sb = get_supabase()
    
    # check if user exists
    existing = sb.table("usuarios").select("id").eq("id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    try:
        sb.table("usuarios").delete().eq("id", user_id).execute()
        return {"success": True, "message": "Usuário removido com sucesso"}
    except Exception as e:
        logger.error("Error deleting user: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao remover usuário")


# ─── Access Requests (Solicitações) ───

class SolicitacaoCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=3, max_length=200)
    senha: str = Field(min_length=4, max_length=200)
    justificativa: str = Field(default="", max_length=500)


class RespostaSolicitacao(BaseModel):
    mensagem_resposta: Optional[str] = ""


@router.post("/solicitar-acesso")
async def solicitar_acesso(body: SolicitacaoCreate):
    """Public endpoint — anyone can request access."""
    sb = get_supabase()

    # Check if email already registered
    existing_user = sb.table("usuarios").select("id").eq("email", body.email.lower().strip()).execute()
    if existing_user.data:
        raise HTTPException(status_code=409, detail="Este e-mail já possui uma conta ativa.")

    # Check if there's already a pending request
    existing_req = (
        sb.table("solicitacoes_acesso")
        .select("id")
        .eq("email", body.email.lower().strip())
        .eq("status", "pendente")
        .execute()
    )
    if existing_req.data:
        raise HTTPException(status_code=409, detail="Já existe uma solicitação pendente para este e-mail.")

    row = {
        "nome": body.nome.strip(),
        "email": body.email.lower().strip(),
        "senha_hash": _hash_password(body.senha),
        "justificativa": body.justificativa.strip(),
        "status": "pendente",
    }
    sb.table("solicitacoes_acesso").insert(row).execute()
    return {"success": True, "message": "Solicitação enviada! Aguarde a aprovação do gestor."}


@router.get("/solicitacoes")
async def listar_solicitacoes(user: dict = Depends(get_current_user)):
    """List all pending access requests (gestor only)."""
    if user.get("perfil") != "gestor":
        raise HTTPException(status_code=403, detail="Acesso restrito a gestores")
    sb = get_supabase()
    resp = (
        sb.table("solicitacoes_acesso")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return {"success": True, "data": resp.data or []}


@router.get("/solicitacoes/status")
async def consultar_status_solicitacao(email: str):
    """Public endpoint to check request status."""
    sb = get_supabase()
    resp = (
        sb.table("solicitacoes_acesso")
        .select("status, mensagem_resposta, created_at")
        .eq("email", email.lower().strip())
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Nenhuma solicitação encontrada para este e-mail.")
    return {"success": True, "data": resp.data[0]}


@router.post("/solicitacoes/{sol_id}/aprovar")
async def aprovar_solicitacao(sol_id: str, body: RespostaSolicitacao, user: dict = Depends(get_current_user)):
    """Approve an access request — creates a user with 'comum' profile."""
    if user.get("perfil") != "gestor":
        raise HTTPException(status_code=403, detail="Acesso restrito a gestores")
    sb = get_supabase()

    # Fetch the request
    resp = sb.table("solicitacoes_acesso").select("*").eq("id", sol_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    sol = resp.data[0]

    if sol["status"] != "pendente":
        raise HTTPException(status_code=400, detail="Solicitação já processada")

    # Create the user
    new_user = {
        "email": sol["email"],
        "senha_hash": sol["senha_hash"],
        "nome": sol["nome"],
        "perfil": "comum",
        "ativo": True,
    }
    try:
        sb.table("usuarios").insert(new_user).execute()
    except Exception as e:
        logger.error("Error creating user from request: %s", e)
        raise HTTPException(status_code=500, detail="Erro ao criar usuário")

    # Mark request as approved
    sb.table("solicitacoes_acesso").update({
        "status": "aprovada",
        "mensagem_resposta": body.mensagem_resposta.strip() if body.mensagem_resposta else None
    }).eq("id", sol_id).execute()
    return {"success": True, "message": f"Usuário {sol['nome']} aprovado e criado!"}


@router.post("/solicitacoes/{sol_id}/rejeitar")
async def rejeitar_solicitacao(sol_id: str, body: RespostaSolicitacao, user: dict = Depends(get_current_user)):
    """Reject an access request."""
    if user.get("perfil") != "gestor":
        raise HTTPException(status_code=403, detail="Acesso restrito a gestores")
    sb = get_supabase()

    resp = sb.table("solicitacoes_acesso").select("id, status").eq("id", sol_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    if resp.data[0]["status"] != "pendente":
        raise HTTPException(status_code=400, detail="Solicitação já processada")

    sb.table("solicitacoes_acesso").update({
        "status": "rejeitada",
        "mensagem_resposta": body.mensagem_resposta.strip() if body.mensagem_resposta else None
    }).eq("id", sol_id).execute()
    return {"success": True, "message": "Solicitação rejeitada."}

