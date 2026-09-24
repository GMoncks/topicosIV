import os
import sys
import json
import tempfile
from pathlib import Path
import pytest

STORE_DATA_DIR = Path(__file__).resolve().parent.parent / "app" / "data"


def test_compile_mini_games():
    games = ["forca.py", "labirinto.py", "quiz.py"]
    for game_name in games:
        game_path = STORE_DATA_DIR / "games" / game_name
        assert game_path.is_file(), f"Arquivo do jogo {game_name} não encontrado em {game_path}"
        with open(game_path, "r", encoding="utf-8") as f:
            code = f.read()
        # Valida que o código Python compila perfeitamente sem erros de sintaxe
        compiled = compile(code, str(game_path), "exec")
        assert compiled is not None


def test_mist_sdk_offline_sandbox():
    sdk_path = STORE_DATA_DIR / "mist_sdk.py"
    assert sdk_path.is_file()

    # Importa mist_sdk dinamicamente
    if str(STORE_DATA_DIR) not in sys.path:
        sys.path.insert(0, str(STORE_DATA_DIR))

    import mist_sdk

    # Reseta cache interno
    mist_sdk._session_data = None

    # Chamada sem session.json existente: fallback sandbox seguro
    sess = mist_sdk.get_session()
    assert sess is not None
    assert "session_token" in sess
    assert sess.get("user_id") == 1

    # start_session não deve levantar exceção mesmo offline
    start_res = mist_sdk.start_session()
    assert start_res is not None
    assert "session_id" in start_res

    # ping não deve quebrar
    ping_res = mist_sdk.ping()
    # Em offline, retorna None silenciosamente
    assert ping_res is None or isinstance(ping_res, dict)

    # unlock_achievement não deve quebrar
    ach_res = mist_sdk.unlock_achievement("first_win")
    assert ach_res is None or isinstance(ach_res, dict)


def test_mist_sdk_with_session_file():
    if str(STORE_DATA_DIR) not in sys.path:
        sys.path.insert(0, str(STORE_DATA_DIR))
    import mist_sdk

    with tempfile.TemporaryDirectory() as tmpdir:
        session_file = Path(tmpdir) / "session.json"
        sample_data = {
            "session_token": "token_especial_unit_test",
            "user_id": 999,
            "game_id": 12,
            "library_api_url": "http://127.0.0.1:9999",
        }
        with open(session_file, "w", encoding="utf-8") as f:
            json.dump(sample_data, f)

        # Força o diretório atual temporariamente
        old_cwd = os.getcwd()
        try:
            os.chdir(tmpdir)
            mist_sdk._session_data = None
            loaded = mist_sdk.get_session()
            assert loaded["session_token"] == "token_especial_unit_test"
            assert loaded["user_id"] == 999
            assert loaded["game_id"] == 12
        finally:
            os.chdir(old_cwd)
            mist_sdk._session_data = None
