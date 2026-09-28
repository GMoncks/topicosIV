import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db
from app.models.transaction import WalletTransaction
from app.models.listing import MarketListing
from app.models.trade import TradeOffer
from app.api.routes import router as market_router
from app.api.wallet import router as wallet_router
from app.api.listings import router as listings_router
from app.api.trades import router as trades_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializa tabelas no banco de dados SQLite dedicado (market.db)
    init_db()
    yield


app = FastAPI(
    title="MIST — Market Service",
    description="Serviço do Mercado da Comunidade: anúncios, compra/venda e trocas de itens entre usuários",
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

app.include_router(market_router)
app.include_router(wallet_router)
app.include_router(listings_router)
app.include_router(trades_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8005, reload=True)
