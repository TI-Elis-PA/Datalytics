"""
CNN TEAM Dashboard – FastAPI Backend
Supabase + Gemini AI
"""
import os
import logging
import time
from collections import defaultdict
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

# ─── Structured Logging ───
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cnn_dashboard")

from app.routers import expedicao, producao, nps, ai, ingestao, estoque, auth
from app.core.supabase_client import init_supabase
from app.core.seed_data import seed_one_year, seed_estoque, seed_usuarios


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle"""
    logger.info("CNN TEAM Dashboard API iniciando...")
    init_supabase()
    logger.info("Supabase conectado!")
    # Seed permanente: garante 1 ano de dados realistas
    try:
        seed_one_year()
    except Exception as e:
        logger.error("Seed falhou (não-fatal): %s", e)
    # Seed de estoque (carga inicial)
    try:
        seed_estoque()
    except Exception as e:
        logger.error("Seed de estoque falhou (não-fatal): %s", e)
    # Seed de usuários (auth)
    try:
        seed_usuarios()
    except Exception as e:
        logger.error("Seed de usuarios falhou (não-fatal): %s", e)
    yield
    logger.info("Servidor encerrando...")


app = FastAPI(
    title="CNN TEAM Dashboard API",
    description="Dashboard Inteligente de Produção & Expedição com IA",
    version="1.0.0",
    lifespan=lifespan,
)


# ─── Rate Limiting Middleware (in-memory) ───
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "60"))  # requests
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # seconds


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Basic in-memory rate limiter per client IP."""
    # Skip rate limiting for health checks
    if request.url.path in ("/", "/health", "/docs", "/openapi.json"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    # Clean old entries
    _rate_limit_store[client_ip] = [
        t for t in _rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW
    ]

    if len(_rate_limit_store[client_ip]) >= RATE_LIMIT_MAX:
        logger.warning("Rate limit exceeded for %s", client_ip)
        return JSONResponse(
            status_code=429,
            content={"detail": "Muitas requisições. Tente novamente em breve."},
        )

    _rate_limit_store[client_ip].append(now)
    return await call_next(request)


# ─── CORS (configurable via env) ───
_default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
_env_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = (
    [o.strip() for o in _env_origins.split(",") if o.strip()]
    if _env_origins
    else _default_origins
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ───
app.include_router(expedicao.router, prefix="/api/expedicao", tags=["Expedição"])
app.include_router(producao.router, prefix="/api/producao", tags=["Produção"])
app.include_router(nps.router, prefix="/api/nps", tags=["NPS"])
app.include_router(ai.router, prefix="/api/ai", tags=["IA"])
app.include_router(ingestao.router, prefix="/api/ingestao", tags=["Ingestão de Dados"])
app.include_router(estoque.router, prefix="/api/estoque", tags=["Estoque"])
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticação"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "ok",
        "name": "CNN TEAM Dashboard API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Deep health check — pings Supabase to verify connectivity."""
    from app.core.supabase_client import get_supabase

    try:
        sb = get_supabase()
        sb.table("expedicao_diaria").select("id").limit(1).execute()
        db_status = "ok"
    except Exception as e:
        logger.error("Health check failed: %s", e)
        db_status = "error"

    status = "ok" if db_status == "ok" else "degraded"
    return {"status": status, "service": "CNN Dashboard API", "database": db_status}
