#!/usr/bin/env python3
"""
MIST Local Daemon — Executor Nativo de Jogos MIST
Serviço leve local (127.0.0.1:39090) responsável por receber comandos do frontend MIST
e executar jogos nativamente em novas janelas do sistema operacional.
Zero dependências externas (Python 3.8+ stdlib-only).
"""

import os
import sys
import json
import shutil
import sqlite3
import subprocess
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

DAEMON_PORT = int(os.environ.get("MIST_DAEMON_PORT", 39090))
DAEMON_HOST = os.environ.get("MIST_DAEMON_HOST", "127.0.0.1")

ROOT_DIR = Path(__file__).resolve().parent.parent
MIST_HOME = Path.home() / ".mist"
INSTALLED_GAMES_DIR = MIST_HOME / "installed"

KNOWN_GAMES = {
    14: {"title": "MIST Forca", "file": "services/store-service/app/data/games/forca.py", "slug": "mist_forca"},
    15: {"title": "MIST Labirinto", "file": "services/store-service/app/data/games/labirinto.py", "slug": "mist_labirinto"},
    16: {"title": "MIST Quiz", "file": "services/store-service/app/data/games/quiz.py", "slug": "mist_quiz"},
}


def resolve_game_info(game_id: int):
    if game_id in KNOWN_GAMES:
        return KNOWN_GAMES[game_id]

    db_path = ROOT_DIR / "services" / "store-service" / "app" / "data" / "store.db"
    if db_path.exists():
        try:
            con = sqlite3.connect(str(db_path))
            cur = con.cursor()
            row = cur.execute("SELECT id, title, game_file FROM games WHERE id = ?", (game_id,)).fetchone()
            con.close()
            if row and row[2]:
                slug = "".join(c.lower() if c.isalnum() else "_" for c in row[1]).strip("_")
                return {
                    "title": row[1],
                    "file": f"services/store-service/app/data/{row[2]}",
                    "slug": slug
                }
        except Exception:
            pass

    return {
        "title": f"Jogo MIST #{game_id}",
        "file": None,
        "slug": f"game_{game_id}"
    }


class MistDaemonHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ["/", "/health"]:
            response_data = {
                "status": "running",
                "service": "mist-local-daemon",
                "version": "1.0.0",
                "os": os.name,
                "python": sys.version.split()[0],
                "installed_dir": str(INSTALLED_GAMES_DIR)
            }
            body = json.dumps(response_data, indent=2).encode("utf-8")
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/launch":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)

            try:
                payload = json.loads(post_data.decode("utf-8")) if post_data else {}
            except Exception:
                payload = {}

            game_id = payload.get("game_id")
            session_token = payload.get("session_token", "local_session_token")
            user_id = payload.get("user_id", 1)
            library_url = payload.get("library_api_url", "http://localhost:8003")

            if not game_id:
                self.send_response(400)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "game_id obrigatório"}).encode("utf-8"))
                return

            game_info = resolve_game_info(int(game_id))
            slug = game_info["slug"]
            game_title = game_info["title"]

            run_dir = INSTALLED_GAMES_DIR / slug
            run_dir.mkdir(parents=True, exist_ok=True)

            # Localiza ou copia o código fonte do jogo e o SDK
            sdk_src = ROOT_DIR / "services" / "store-service" / "app" / "data" / "mist_sdk.py"
            sdk_dest = run_dir / "mist_sdk.py"
            if sdk_src.exists():
                shutil.copy2(sdk_src, sdk_dest)

            game_src = ROOT_DIR / game_info["file"] if game_info.get("file") else None
            game_dest = run_dir / "game.py"

            if game_src and game_src.exists():
                shutil.copy2(game_src, game_dest)
            elif not game_dest.exists():
                # Cria script de demonstração seguro se não houver arquivo específico
                demo_code = f"""
import mist_sdk
import time

print("="*40)
print("Bem-vindo a {game_title}!")
print("Executado nativamente pelo MIST Daemon.")
print("="*40)

try:
    sess = mist_sdk.start_session()
    print("Sessao MIST registrada:", sess)
except Exception as e:
    print("Aviso:", e)

input("\\nPressione ENTER para sair...")
"""
                game_dest.write_text(demo_code, encoding="utf-8")

            # Escreve ou atualiza o session.json com credenciais do jogador
            session_file = run_dir / "session.json"
            session_payload = {
                "session_token": session_token,
                "user_id": user_id,
                "game_id": int(game_id),
                "game_title": game_title,
                "library_api_url": library_url
            }
            session_file.write_text(json.dumps(session_payload, indent=2, ensure_ascii=False), encoding="utf-8")

            # Executa o jogo em nova janela de console
            try:
                if os.name == "nt":
                    # Windows: CREATE_NEW_CONSOLE abre janela cmd/powershell independente
                    proc = subprocess.Popen(
                        [sys.executable, "game.py"],
                        cwd=str(run_dir),
                        creationflags=subprocess.CREATE_NEW_CONSOLE
                    )
                else:
                    # Linux / macOS
                    proc = subprocess.Popen(
                        [sys.executable, "game.py"],
                        cwd=str(run_dir)
                    )

                res_body = {
                    "success": True,
                    "message": f"Jogo '{game_title}' iniciado com sucesso!",
                    "game_id": game_id,
                    "game_title": game_title,
                    "pid": proc.pid,
                    "directory": str(run_dir)
                }
                status_code = 200
            except Exception as exc:
                res_body = {
                    "success": False,
                    "error": f"Falha ao disparar processo: {str(exc)}"
                }
                status_code = 500

            body_bytes = json.dumps(res_body, indent=2).encode("utf-8")
            self.send_response(status_code)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body_bytes)))
            self.end_headers()
            self.wfile.write(body_bytes)
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()


def run_daemon():
    server = HTTPServer((DAEMON_HOST, DAEMON_PORT), MistDaemonHandler)
    print("=" * 60)
    print(f" MIST LOCAL DAEMON ATIVO — http://{DAEMON_HOST}:{DAEMON_PORT}")
    print(f" Aguardando comandos da interface web MIST para abrir jogos.")
    print(f" Pressione Ctrl+C para encerrar o daemon.")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando MIST Daemon...")
        server.server_close()


if __name__ == "__main__":
    run_daemon()
