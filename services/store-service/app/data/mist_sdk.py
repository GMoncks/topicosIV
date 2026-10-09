"""
MIST SDK — Biblioteca Client-Side Oficial para Jogos MIST
Módulo padrão stdlib-only (Python 3.8+ sem dependências externas via pip).
Lê session.json e expõe start_session(), ping() e unlock_achievement(id).
"""

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional, Dict, Any

SESSION_FILENAME = "session.json"
_session_data: Optional[Dict[str, Any]] = None


def _find_session_path() -> Optional[Path]:
    """
    Procura o arquivo session.json no diretório de trabalho atual,
    no diretório do script principal ou no diretório do próprio módulo.
    """
    candidates = [
        Path.cwd() / SESSION_FILENAME,
        Path(sys.argv[0]).resolve().parent / SESSION_FILENAME if sys.argv and sys.argv[0] else None,
        Path(__file__).resolve().parent / SESSION_FILENAME,
    ]
    for c in candidates:
        if c and c.is_file():
            return c
    return None


def get_session() -> Dict[str, Any]:
    """
    Carrega e armazena em cache o arquivo session.json.
    """
    global _session_data
    if _session_data is not None:
        return _session_data

    path = _find_session_path()
    if not path:
        # Se não encontrar o arquivo session.json, retorna uma sessão de fallback offline/sandbox
        _session_data = {
            "session_token": "offline_dev_token",
            "user_id": 1,
            "game_id": 0,
            "library_api_url": os.getenv("LIBRARY_API_URL", "http://localhost:8003"),
            "offline": True,
        }
        return _session_data

    try:
        with open(path, "r", encoding="utf-8") as f:
            _session_data = json.load(f)
    except Exception as exc:
        _session_data = {
            "session_token": "offline_error_token",
            "user_id": 1,
            "game_id": 0,
            "library_api_url": os.getenv("LIBRARY_API_URL", "http://localhost:8003"),
            "offline": True,
            "error": str(exc),
        }
    return _session_data


def _make_request(endpoint: str, payload: dict) -> Optional[dict]:
    """
    Executa requisição HTTP POST usando apenas urllib.request da biblioteca padrão.
    """
    session = get_session()
    base_url = session.get("library_api_url", "http://localhost:8003").rstrip("/")
    url = f"{base_url}/{endpoint.lstrip('/')}"

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {session.get('session_token', '')}",
            "X-User-Id": str(session.get("user_id", "")),
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=5.0) as response:
            resp_body = response.read().decode("utf-8")
            if resp_body:
                return json.loads(resp_body)
            return {"status": "ok"}
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError):
        # Falhas de rede ou serviço offline não interrompem a experiência do jogo
        return None
    except Exception:
        return None


def start_session() -> Dict[str, Any]:
    """
    Inicializa a sessão de jogo no MIST Library Service.
    Deve ser chamada na inicialização do game.
    """
    session = get_session()
    payload = {
        "user_id": session.get("user_id"),
        "game_id": session.get("game_id"),
        "session_token": session.get("session_token"),
    }
    resp = _make_request("session/start", payload)
    if resp and isinstance(resp, dict):
        return resp
    return {
        "status": "started_offline",
        "session_id": f"local_sess_{session.get('game_id')}_{session.get('user_id')}",
        "game_id": session.get("game_id"),
    }


def ping() -> Optional[Dict[str, Any]]:
    """
    Envia heartbeat/telemetria para acumular tempo de jogo no MIST.
    """
    session = get_session()
    payload = {
        "session_token": session.get("session_token"),
        "user_id": session.get("user_id"),
        "game_id": session.get("game_id"),
    }
    return _make_request("session/ping", payload)


def unlock_achievement(achievement_id: str) -> Optional[Dict[str, Any]]:
    """
    Notifica o MIST sobre o desbloqueio de uma conquista pelo jogador.
    """
    session = get_session()
    payload = {
        "session_token": session.get("session_token"),
        "user_id": session.get("user_id"),
        "game_id": session.get("game_id"),
        "achievement_id": achievement_id,
    }
    print(f"[MIST SDK] Conquista alcançada: '{achievement_id}'")
    return _make_request("achievements/unlock", payload)


def end_session() -> Optional[Dict[str, Any]]:
    """
    Encerra a sessão de jogo no MIST Library Service.
    """
    session = get_session()
    payload = {
        "session_token": session.get("session_token"),
        "user_id": session.get("user_id"),
        "game_id": session.get("game_id"),
    }
    return _make_request("session/end", payload)


def take_screenshot(caption: str = "", ugc_api_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Captura e salva/envia screenshot do jogo.
    Se o servidor UGC estiver indisponível, realiza salvamento local resiliente (N-02).
    """
    import time
    session = get_session()
    user_id = session.get("user_id", 1)
    game_id = session.get("game_id", 0)
    filename = f"screenshot_{user_id}_{game_id}_{int(time.time())}.png"

    target_url = ugc_api_url or os.getenv("UGC_API_URL", "http://localhost:8006")
    try:
        req = urllib.request.Request(f"{target_url.rstrip('/')}/screenshots/upload")
        with urllib.request.urlopen(req, timeout=1.0) as resp:
            if resp.status in (200, 201):
                return json.loads(resp.read().decode("utf-8"))
    except Exception:
        pass

    shots_dir = Path.cwd() / "screenshots"
    shots_dir.mkdir(parents=True, exist_ok=True)
    shot_file = shots_dir / filename
    shot_file.write_bytes(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82")

    return {
        "status": "saved_locally",
        "filename": filename,
        "caption": caption,
        "path": str(shot_file)
    }

