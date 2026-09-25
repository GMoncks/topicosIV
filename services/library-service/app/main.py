import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db, SessionLocal
from app.db.seed_achievements import seed_achievements
from app.api.routes import router as library_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializa tabelas SQLite da biblioteca
    init_db()
    # Executa a seed de conquistas se necessário
    db = SessionLocal()
    try:
        seed_achievements(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="MIST — Library Service",
    description="Serviço de Biblioteca, Posse de Jogos e Telemetria de Licenças",
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

app.include_router(library_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8003, reload=True)
