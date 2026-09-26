import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db
from app.api.routes import router as social_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializa tabelas SQLite do social
    init_db()
    from app.db.database import SessionLocal
    from app.db.seed_social import seed_social_data
    db = SessionLocal()
    try:
        seed_social_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="MIST — Social Service",
    description="Serviço de Amizades, Mensagens, Atividades e Presença",
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

app.include_router(social_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8004, reload=True)
