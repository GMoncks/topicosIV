import asyncio
import os
from contextlib import asynccontextmanager
from typing import Optional
import httpx
import jwt
from fastapi import FastAPI, Request, Response, Query, WebSocket, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    AUTH_SERVICE_URL,
    STORE_SERVICE_URL,
    LIBRARY_SERVICE_URL,
    SOCIAL_SERVICE_URL,
    MARKET_SERVICE_URL,
    UGC_SERVICE_URL,
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
)

http_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(timeout=30.0)
    yield
    await http_client.aclose()


app = FastAPI(
    title="MIST — API Gateway",
    description="Gateway central de microsserviços, autenticação e roteamento reverso",
    version="1.0.0",
    lifespan=lifespan
)

cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PUBLIC_AUTH_PATHS = {"register", "login", "health", "points-shop/items", "cards/catalog"}



@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "api-gateway"}


@app.api_route("/api/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_auth(path: str, request: Request):
    """
    Proxy reverso para o auth-service.
    - Remove qualquer header X-User-* externo para evitar spoofing.
    - Valida o token JWT centralizadamente.
    - Se rota pública (/register, /login, /health): encaminha diretamente.
    - Se rota protegida (/me, etc.): bloqueia 401 se ausente/inválido e injeta X-User-Id confiável.
    """
    global http_client
    if http_client is None:
        http_client = httpx.AsyncClient(timeout=15.0)

    # 1. Sanitização dos cabeçalhos recebidos (elimina cabeçalhos de identidade enviados pelo cliente)
    forward_headers = {}
    for header_name, header_value in request.headers.items():
        lower_name = header_name.lower()
        if lower_name.startswith("x-user-"):
            continue  # Descarta tentativas de spoofing
        if lower_name not in ("host", "content-length"):
            forward_headers[header_name] = header_value

    # 2. Validação centralizada de JWT
    auth_header = request.headers.get("authorization")
    user_payload: Optional[dict] = None

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            user_payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        except Exception:
            user_payload = None

    is_public = path in PUBLIC_AUTH_PATHS or path.startswith("health")

    if not is_public:
        if not user_payload:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token de autenticação ausente ou inválido"}
            )
        # Injeta cabeçalhos confiáveis para o microsserviço interno
        forward_headers["X-User-Id"] = str(user_payload.get("sub", ""))
        if "email" in user_payload:
            forward_headers["X-User-Email"] = str(user_payload["email"])
        if "username" in user_payload:
            forward_headers["X-User-Username"] = str(user_payload["username"])
    elif user_payload:
        # Se rota for pública mas o usuário já possuir token válido, propaga identidade
        forward_headers["X-User-Id"] = str(user_payload.get("sub", ""))

    # 3. Encaminhamento via httpx
    target_url = f"{AUTH_SERVICE_URL.rstrip('/')}/{path}"
    body = await request.body()

    try:
        upstream_response = await http_client.request(
            method=request.method,
            url=target_url,
            headers=forward_headers,
            params=request.query_params,
            content=body
        )
        return Response(
            content=upstream_response.content,
            status_code=upstream_response.status_code,
            headers=dict(upstream_response.headers),
            media_type=upstream_response.headers.get("content-type")
        )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Serviço de autenticação temporariamente indisponível"}
        )


@app.api_route("/api/points-shop/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_points_shop(path: str, request: Request):
    """Proxy reverso para operações da Loja de Pontos no auth-service."""
    return await proxy_auth(f"points-shop/{path}", request)


@app.api_route("/api/profile/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_profile(path: str, request: Request):
    """Proxy reverso para perfil e equipamento de cosméticos no auth-service."""
    return await proxy_auth(f"profile/{path}", request)


@app.api_route("/api/inventory", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
@app.api_route("/api/inventory/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_inventory(request: Request, path: str = ""):
    """Proxy reverso para inventário de cosméticos no auth-service."""
    subpath = f"/{path}" if path else ""
    return await proxy_auth(f"inventory{subpath}", request)


@app.api_route("/api/me/level-progress", methods=["GET", "OPTIONS"])
async def proxy_my_level_progress(request: Request):
    """Proxy reverso para progresso de nível do usuário atual."""
    return await proxy_auth("me/level-progress", request)


@app.api_route("/api/cards", methods=["GET", "POST", "OPTIONS"])
@app.api_route("/api/cards/{path:path}", methods=["GET", "POST", "OPTIONS"])
async def proxy_cards(request: Request, path: str = ""):
    """Proxy reverso para catálogo e concessão de cartas no auth-service."""
    subpath = f"/{path}" if path else ""
    return await proxy_auth(f"cards{subpath}", request)


@app.api_route("/api/crafting/{path:path}", methods=["POST", "OPTIONS"])
async def proxy_crafting(path: str, request: Request):
    """Proxy reverso para forja de insígnias no auth-service."""
    return await proxy_auth(f"crafting/{path}", request)


@app.api_route("/api/badges/{path:path}", methods=["GET", "OPTIONS"])
async def proxy_badges(path: str, request: Request):
    """Proxy reverso para insígnias por jogo ou por usuário no auth-service."""
    return await proxy_auth(f"badges/{path}", request)


@app.api_route("/api/me/privacy", methods=["GET", "PATCH", "OPTIONS"])
async def proxy_privacy(request: Request):
    """Proxy reverso para configurações de privacidade no auth-service."""
    return await proxy_auth("me/privacy", request)


@app.api_route("/api/me/profile", methods=["GET", "PATCH", "OPTIONS"])
async def proxy_my_profile(request: Request):
    """Proxy reverso para atualização do perfil do usuário autenticado no auth-service."""
    return await proxy_auth("me/profile", request)


@app.api_route("/api/me/wallet/recharge", methods=["POST", "OPTIONS"])
async def proxy_wallet_recharge(request: Request):
    """Proxy reverso para recarga de saldo da carteira no auth-service."""
    return await proxy_auth("me/wallet/recharge", request)


@app.api_route("/api/users/{username}/profile", methods=["GET", "OPTIONS"])
async def proxy_public_profile(username: str, request: Request):
    """Proxy reverso para perfil público visitável no auth-service."""
    return await proxy_auth(f"users/{username}/profile", request)



@app.api_route("/api/games", methods=["GET", "OPTIONS"])

@app.api_route("/api/games/{path:path}", methods=["GET", "OPTIONS"])
async def proxy_games(request: Request, path: str = ""):
    """
    Proxy reverso para consulta ao catálogo da Store (/games e /games/{id}).
    Rotas públicas com repasse opcional de identidade autenticada caso presente.
    """
    global http_client
    if http_client is None:
        http_client = httpx.AsyncClient(timeout=15.0)

    forward_headers = {}
    for header_name, header_value in request.headers.items():
        lower_name = header_name.lower()
        if lower_name.startswith("x-user-"):
            continue
        if lower_name not in ("host", "content-length"):
            forward_headers[header_name] = header_value

    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            user_payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            forward_headers["X-User-Id"] = str(user_payload.get("sub", ""))
            forward_headers["X-User-Token"] = token
        except Exception:
            pass

    subpath = f"/{path}" if path else ""
    target_url = f"{STORE_SERVICE_URL.rstrip('/')}/games{subpath}"

    try:
        upstream_response = await http_client.request(
            method=request.method,
            url=target_url,
            headers=forward_headers,
            params=request.query_params
        )
        return Response(
            content=upstream_response.content,
            status_code=upstream_response.status_code,
            headers=dict(upstream_response.headers),
            media_type=upstream_response.headers.get("content-type")
        )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Serviço de loja temporariamente indisponível"}
        )


@app.api_route("/api/store/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_store(path: str, request: Request):
    """
    Proxy reverso genérico para rotas do store-service (/api/store/*).
    """
    global http_client
    if http_client is None:
        http_client = httpx.AsyncClient(timeout=15.0)

    forward_headers = {}
    for header_name, header_value in request.headers.items():
        lower_name = header_name.lower()
        if lower_name.startswith("x-user-"):
            continue
        if lower_name not in ("host", "content-length"):
            forward_headers[header_name] = header_value

    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            user_payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            forward_headers["X-User-Id"] = str(user_payload.get("sub", ""))
            if "username" in user_payload:
                forward_headers["X-User-Username"] = str(user_payload["username"])
            forward_headers["X-User-Token"] = token
        except Exception:
            pass

    target_url = f"{STORE_SERVICE_URL.rstrip('/')}/{path}"
    body = await request.body()

    try:
        upstream_response = await http_client.request(
            method=request.method,
            url=target_url,
            headers=forward_headers,
            params=request.query_params,
            content=body
        )
        return Response(
            content=upstream_response.content,
            status_code=upstream_response.status_code,
            headers=dict(upstream_response.headers),
            media_type=upstream_response.headers.get("content-type")
        )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Serviço de loja temporariamente indisponível"}
        )


@app.api_route("/api/system-reviews", methods=["GET", "POST", "OPTIONS"])
@app.api_route("/api/system-reviews/{path:path}", methods=["GET", "POST", "OPTIONS"])
async def proxy_system_reviews(request: Request, path: str = ""):
    """Proxy reverso para avaliações e feedback da plataforma MIST no store-service."""
    subpath = f"/{path}" if path else ""
    return await proxy_store(f"system-reviews{subpath}", request)


@app.api_route("/api/library/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_library(path: str, request: Request):
    """
    Proxy reverso para o library-service (/api/library/*).
    - Remove qualquer header X-User-* externo para evitar spoofing.
    - Valida o token JWT centralizadamente.
    - Se rota protegida (ex: my-games): bloqueia 401 se ausente/inválido e injeta X-User-Id confiável.
    - Se rota de grant ou health: permite execução repassando parâmetros.
    """
    global http_client
    if http_client is None:
        http_client = httpx.AsyncClient(timeout=15.0)

    # 1. Sanitização dos cabeçalhos recebidos contra spoofing
    forward_headers = {}
    for header_name, header_value in request.headers.items():
        lower_name = header_name.lower()
        if lower_name.startswith("x-user-"):
            continue
        if lower_name not in ("host", "content-length"):
            forward_headers[header_name] = header_value

    # 2. Validação centralizada de JWT
    auth_header = request.headers.get("authorization")
    user_payload: Optional[dict] = None

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            user_payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        except Exception:
            user_payload = None

    # Rotas que exigem obrigatoriamente usuário autenticado
    requires_auth = path.startswith("my-games")

    if requires_auth:
        if not user_payload:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token de autenticação ausente ou inválido"}
            )
        forward_headers["X-User-Id"] = str(user_payload.get("sub", ""))
    elif user_payload:
        forward_headers["X-User-Id"] = str(user_payload.get("sub", ""))

    subpath = f"/{path}" if path else ""
    target_url = f"{LIBRARY_SERVICE_URL.rstrip('/')}/library{subpath}"
    body = await request.body()

    try:
        upstream_response = await http_client.request(
            method=request.method,
            url=target_url,
            headers=forward_headers,
            params=request.query_params,
            content=body
        )
        return Response(
            content=upstream_response.content,
            status_code=upstream_response.status_code,
            headers=dict(upstream_response.headers),
            media_type=upstream_response.headers.get("content-type")
        )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Serviço de biblioteca temporariamente indisponível"}
        )


@app.api_route("/api/social/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_social(path: str, request: Request):
    """
    Proxy reverso para o social-service (/api/social/*).
    - Remove qualquer header X-User-* externo para evitar spoofing.
    - Valida o token JWT centralizadamente.
    - Se rota pública (health): permite diretamente.
    - Se rota protegida (amizades, mensagens, etc.): exige JWT válido e injeta X-User-Id e X-User-Token.
    """
    global http_client
    if http_client is None:
        http_client = httpx.AsyncClient(timeout=15.0)

    forward_headers = {}
    for header_name, header_value in request.headers.items():
        lower_name = header_name.lower()
        if lower_name.startswith("x-user-"):
            continue
        if lower_name not in ("host", "content-length"):
            forward_headers[header_name] = header_value

    auth_header = request.headers.get("authorization")
    user_payload: Optional[dict] = None
    token: Optional[str] = None

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            user_payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        except Exception:
            user_payload = None

    is_public = path.startswith("health")

    if not is_public:
        if not user_payload:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token de autenticação ausente ou inválido"}
            )
        forward_headers["X-User-Id"] = str(user_payload.get("sub", ""))
        if token:
            forward_headers["X-User-Token"] = token
    elif user_payload:
        forward_headers["X-User-Id"] = str(user_payload.get("sub", ""))
        if token:
            forward_headers["X-User-Token"] = token

    target_url = f"{SOCIAL_SERVICE_URL.rstrip('/')}/{path}"
    body = await request.body()

    try:
        upstream_response = await http_client.request(
            method=request.method,
            url=target_url,
            headers=forward_headers,
            params=request.query_params,
            content=body
        )
        return Response(
            content=upstream_response.content,
            status_code=upstream_response.status_code,
            headers=dict(upstream_response.headers),
            media_type=upstream_response.headers.get("content-type")
        )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Serviço social temporariamente indisponível"}
        )


@app.api_route("/api/market/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_market(path: str, request: Request):
    """
    Proxy reverso genérico para rotas do market-service (/api/market/*).
    """
    global http_client
    if http_client is None:
        http_client = httpx.AsyncClient(timeout=15.0)

    forward_headers = {}
    for header_name, header_value in request.headers.items():
        lower_name = header_name.lower()
        if lower_name.startswith("x-user-"):
            continue
        if lower_name not in ("host", "content-length"):
            forward_headers[header_name] = header_value

    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            user_payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            forward_headers["X-User-Id"] = str(user_payload.get("sub", ""))
            forward_headers["X-User-Token"] = token
        except Exception:
            pass

    target_url = f"{MARKET_SERVICE_URL.rstrip('/')}/{path}"
    body = await request.body()

    try:
        upstream_response = await http_client.request(
            method=request.method,
            url=target_url,
            headers=forward_headers,
            params=request.query_params,
            content=body
        )
        return Response(
            content=upstream_response.content,
            status_code=upstream_response.status_code,
            headers=dict(upstream_response.headers),
            media_type=upstream_response.headers.get("content-type")
        )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Serviço de mercado temporariamente indisponível"}
        )


@app.api_route("/api/ugc/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_ugc(path: str, request: Request):
    """
    Proxy reverso para o ugc-service (/api/ugc/*).
    - Remove cabeçalhos X-User-* para evitar spoofing.
    - Valida token JWT.
    - Rotas de leitura pública (health, uploads/, GET /screenshots): permitem acesso anônimo,
      mas se houver JWT injetam X-User-Id para cálculo de liked_by_me.
    - Rotas protegidas (upload, like, unlike, delete): bloqueiam 401 se ausente/inválido e injetam X-User-Id / X-User-Name.
    """
    global http_client
    if http_client is None:
        http_client = httpx.AsyncClient(timeout=15.0)

    forward_headers = {}
    for header_name, header_value in request.headers.items():
        lower_name = header_name.lower()
        if lower_name.startswith("x-user-"):
            continue
        if lower_name not in ("host", "content-length"):
            forward_headers[header_name] = header_value

    auth_header = request.headers.get("authorization")
    user_payload: Optional[dict] = None

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            user_payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        except Exception:
            user_payload = None

    is_public = (
        path.startswith("health")
        or path.startswith("uploads/")
        or (request.method == "GET" and (
            path == "screenshots"
            or path.startswith("screenshots/")
            or path == "workshop/items"
            or path.startswith("workshop/items/")
        ))
        or (request.method == "POST" and "/download" in path)
    )

    if not is_public:
        if not user_payload:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token de autenticação ausente ou inválido"}
            )
        forward_headers["X-User-Id"] = str(user_payload.get("sub", ""))
        if user_payload.get("username"):
            forward_headers["X-User-Name"] = str(user_payload.get("username", ""))
    elif user_payload:
        forward_headers["X-User-Id"] = str(user_payload.get("sub", ""))
        if user_payload.get("username"):
            forward_headers["X-User-Name"] = str(user_payload.get("username", ""))

    target_url = f"{UGC_SERVICE_URL.rstrip('/')}/{path}"
    body = await request.body()

    try:
        upstream_response = await http_client.request(
            method=request.method,
            url=target_url,
            headers=forward_headers,
            params=request.query_params,
            content=body,
            timeout=60.0
        )
        return Response(
            content=upstream_response.content,
            status_code=upstream_response.status_code,
            headers=dict(upstream_response.headers),
            media_type=upstream_response.headers.get("content-type")
        )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Serviço UGC temporariamente indisponível"}
        )


# ==============================================================================
# WEBSOCKET PROXY (F-03, F-04)
# ==============================================================================
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
import websockets


async def proxy_websocket_connection(client_ws: WebSocket, upstream_ws_url: str):
    await client_ws.accept()
    try:
        async with websockets.connect(upstream_ws_url) as server_ws:
            async def client_to_server():
                try:
                    while True:
                        msg = await client_ws.receive_text()
                        await server_ws.send(msg)
                except Exception:
                    pass

            async def server_to_client():
                try:
                    async for msg in server_ws:
                        await client_ws.send_text(msg)
                except Exception:
                    pass

            t1 = asyncio.create_task(client_to_server())
            t2 = asyncio.create_task(server_to_client())
            done, pending = await asyncio.wait(
                [t1, t2],
                return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()
    except Exception:
        pass
    finally:
        try:
            await client_ws.close()
        except Exception:
            pass


@app.websocket("/ws/chat/{room_id}")
async def gateway_ws_chat_proxy(websocket: WebSocket, room_id: str):
    query_str = str(websocket.query_params)
    base_ws_url = SOCIAL_SERVICE_URL.replace("http://", "ws://").replace("https://", "wss://").rstrip("/")
    upstream_url = f"{base_ws_url}/ws/chat/{room_id}"
    if query_str:
        upstream_url += f"?{query_str}"
    await proxy_websocket_connection(websocket, upstream_url)


@app.websocket("/ws/presence")
async def gateway_ws_presence_proxy(websocket: WebSocket):
    query_str = str(websocket.query_params)
    base_ws_url = SOCIAL_SERVICE_URL.replace("http://", "ws://").replace("https://", "wss://").rstrip("/")
    upstream_url = f"{base_ws_url}/ws/presence"
    if query_str:
        upstream_url += f"?{query_str}"
    await proxy_websocket_connection(websocket, upstream_url)


@app.websocket("/ws/notifications")
async def gateway_ws_notifications_proxy(websocket: WebSocket):
    query_str = str(websocket.query_params)
    base_ws_url = SOCIAL_SERVICE_URL.replace("http://", "ws://").replace("https://", "wss://").rstrip("/")
    upstream_url = f"{base_ws_url}/ws/notifications"
    if query_str:
        upstream_url += f"?{query_str}"
    await proxy_websocket_connection(websocket, upstream_url)


@app.websocket("/ws/group/{group_id}/chat")
async def gateway_ws_group_chat_proxy(websocket: WebSocket, group_id: int):
    query_str = str(websocket.query_params)
    base_ws_url = SOCIAL_SERVICE_URL.replace("http://", "ws://").replace("https://", "wss://").rstrip("/")
    upstream_url = f"{base_ws_url}/ws/group/{group_id}/chat"
    if query_str:
        upstream_url += f"?{query_str}"
    await proxy_websocket_connection(websocket, upstream_url)



@app.get("/api/search")
async def global_search(
    request: Request,
    q: Optional[str] = Query(None, description="Termo de pesquisa global"),
    limit: int = Query(5, ge=1, le=20, description="Limite de resultados por categoria")
):
    """
    Busca Global Agregada (R-01 a R-04).
    Dispara consultas assíncronas paralelas via httpx para Store, Auth, Social e Market services.
    Resiliência graciosa: se algum serviço estiver indisponível ou retornar erro,
    retorna lista vazia para aquela seção sem falhar a resposta global.
    """
    global http_client
    if http_client is None:
        http_client = httpx.AsyncClient(timeout=10.0)

    if not q or not q.strip():
        return {
            "query": "",
            "total": 0,
            "games": [],
            "users": [],
            "groups": [],
            "market_items": []
        }

    query_term = q.strip()
    auth_header = request.headers.get("authorization")
    social_headers = {"Authorization": auth_header} if auth_header else {}

    # Helpers assíncronos resilientes
    async def fetch_games():
        try:
            resp = await http_client.get(
                f"{STORE_SERVICE_URL.rstrip('/')}/games",
                params={"search": query_term, "limit": limit}
            )
            if resp.status_code == 200:
                data = resp.json()
                return data if isinstance(data, list) else data.get("items", [])
            return []
        except Exception:
            return []

    async def fetch_users():
        try:
            resp = await http_client.get(
                f"{AUTH_SERVICE_URL.rstrip('/')}/users/search",
                params={"q": query_term, "limit": limit}
            )
            if resp.status_code == 200:
                data = resp.json()
                return data if isinstance(data, list) else []
            return []
        except Exception:
            return []

    async def fetch_groups():
        try:
            resp = await http_client.get(
                f"{SOCIAL_SERVICE_URL.rstrip('/')}/groups",
                params={"q": query_term, "search": query_term, "limit": limit},
                headers=social_headers
            )
            if resp.status_code == 200:
                data = resp.json()
                return data if isinstance(data, list) else []
            return []
        except Exception:
            return []

    async def fetch_market():
        try:
            resp = await http_client.get(
                f"{MARKET_SERVICE_URL.rstrip('/')}/market/listings",
                params={"search": query_term, "limit": limit}
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("items", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
            return []
        except Exception:
            return []

    # Execução concorrente com asyncio.gather
    results = await asyncio.gather(
        fetch_games(),
        fetch_users(),
        fetch_groups(),
        fetch_market(),
        return_exceptions=True
    )

    games_res = results[0] if isinstance(results[0], list) else []
    users_res = results[1] if isinstance(results[1], list) else []
    groups_res = results[2] if isinstance(results[2], list) else []
    market_res = results[3] if isinstance(results[3], list) else []

    total_count = len(games_res) + len(users_res) + len(groups_res) + len(market_res)

    return {
        "query": query_term,
        "total": total_count,
        "games": games_res,
        "users": users_res,
        "groups": groups_res,
        "market_items": market_res
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


