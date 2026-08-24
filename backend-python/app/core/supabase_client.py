"""Supabase client singleton — thread-safe, SSL-aware"""
import os
import logging
import threading
from supabase import create_client, Client

logger = logging.getLogger(__name__)

_supabase: Client | None = None
_lock = threading.Lock()


def init_supabase() -> Client:
    """Initialize the Supabase client (thread-safe singleton).
    
    SSL verification is enabled by default. Set DISABLE_SSL_VERIFY=true
    in .env ONLY for development behind corporate proxies.
    """
    global _supabase

    with _lock:
        if _supabase is not None:
            return _supabase

        url = os.getenv("SUPABASE_URL")
        # Prefer ANON key (respects RLS) over SERVICE_ROLE (bypasses RLS)
        key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not url or not key:
            raise ValueError(
                "SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios no .env"
            )

        # Conditional SSL bypass — ONLY when explicitly requested
        if os.getenv("DISABLE_SSL_VERIFY", "").lower() == "true":
            import warnings
            import httpx

            warnings.warn(
                "⚠️ SSL verification disabled — NÃO USE EM PRODUÇÃO!",
                stacklevel=2,
            )

            _original_init = httpx.Client.__init__
            def _patched_init(self, *args, **kwargs):
                kwargs["verify"] = False
                _original_init(self, *args, **kwargs)
            httpx.Client.__init__ = _patched_init

            _original_async_init = httpx.AsyncClient.__init__
            def _patched_async_init(self, *args, **kwargs):
                kwargs["verify"] = False
                _original_async_init(self, *args, **kwargs)
            httpx.AsyncClient.__init__ = _patched_async_init

            logger.warning("SSL verification disabled for all HTTP clients")

        _supabase = create_client(url, key)
        logger.info("Supabase client initialized (URL: %s)", url)
        return _supabase


def get_supabase() -> Client:
    """Get or lazily initialize the Supabase client."""
    if _supabase is None:
        return init_supabase()
    return _supabase
