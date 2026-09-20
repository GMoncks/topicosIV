import os
from contextlib import asynccontextmanager
from typing import Optional
import httpx
import jwt
from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    AUTH_SERVICE_URL,
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
)

http_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(timeout=15.0)
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

PUBLIC_AUTH_PATHS = {"register", "login", "health"}


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
