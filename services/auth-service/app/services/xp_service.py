import math
from typing import Dict, Any, Tuple
from app.models.user import User


def calculate_level(total_xp: int) -> int:
    """Calcula o nível do usuário com base na fórmula: level = floor(sqrt(total_xp / 100)).
    Garante nível mínimo 1 como base inicial do sistema."""
    if total_xp <= 0:
        return 1
    lvl = int(math.floor(math.sqrt(total_xp / 100.0)))
    return max(1, lvl)


def get_level_thresholds(level: int) -> Tuple[int, int]:
    """Retorna (min_xp_do_nivel, min_xp_do_proximo_nivel)."""
    current_min = (level ** 2) * 100
    next_min = ((level + 1) ** 2) * 100
    return current_min, next_min


def get_level_progress(total_xp: int) -> Dict[str, Any]:
    """Retorna métricas de progresso de nível detalhadas."""
    effective_xp = max(100, total_xp)
    level = calculate_level(effective_xp)
    current_min, next_min = get_level_thresholds(level)

    needed_in_level = next_min - current_min
    current_in_level = max(0, effective_xp - current_min)

    percent = min(100.0, round((current_in_level / needed_in_level) * 100.0, 1)) if needed_in_level > 0 else 100.0

    return {
        "level": level,
        "total_xp": effective_xp,
        "current_level_min_xp": current_min,
        "next_level_min_xp": next_min,
        "current_xp_in_level": current_in_level,
        "xp_needed_in_level": needed_in_level,
        "progress_percent": percent,
    }


def add_xp(user: User, xp_gain: int) -> Tuple[User, bool]:
    """Adiciona XP ao usuário e recalcula o nível, retornando (user, leveled_up)."""
    current_total = getattr(user, "total_xp", 100)
    if current_total is None or current_total < 100:
        current_total = 100

    old_level = calculate_level(current_total)
    new_total = current_total + max(0, xp_gain)
    new_level = calculate_level(new_total)

    user.total_xp = new_total
    user.level = new_level

    leveled_up = new_level > old_level
    return user, leveled_up
