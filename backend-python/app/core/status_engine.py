"""
Business logic: calculates expedition status based on planned time
"""
import logging
from datetime import datetime
from typing import Literal

logger = logging.getLogger(__name__)

StatusType = Literal["pendente", "no_prazo", "proximo", "atrasado", "concluido"]


def calcular_status(
    horario_planejado_str: str,
    horario_real: str | None,
    status_atual: str,
) -> StatusType:
    """
    Calculate the current expedition status based on planned time vs now.
    - concluido: already finished
    - no_prazo:  > 30min until deadline
    - proximo:   0-30min until deadline (inclusive of exact time)
    - atrasado:  past deadline, not finished
    """
    if status_atual == "concluido" and horario_real:
        return "concluido"

    try:
        now = datetime.now()
        h, m = map(int, horario_planejado_str.split(":"))
        planned = now.replace(hour=h, minute=m, second=0, microsecond=0)
        diff_minutes = (planned - now).total_seconds() / 60

        if diff_minutes > 30:
            return "no_prazo"
        elif diff_minutes >= 0:  # Fix: includes exact time (0 minutes)
            return "proximo"
        else:
            return "atrasado"
    except (ValueError, TypeError) as e:
        logger.warning("Error calculating status for '%s': %s", horario_planejado_str, e)
        return status_atual  # type: ignore[return-value]


def get_emoji_status(status: str) -> str:
    """Return emoji representation for a given status."""
    return {
        "no_prazo": "🟢",
        "proximo": "🟡",
        "atrasado": "🔴",
        "concluido": "✅",
        "pendente": "⏳",
    }.get(status, "❓")
