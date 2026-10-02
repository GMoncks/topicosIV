import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# Garante que o diretório data exista relativo ao serviço
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "auth.db")
DATABASE_URL = os.getenv("AUTH_DATABASE_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    import app.models.user  # noqa: F401
    import app.models.inventory  # noqa: F401
    import app.models.trading_card  # noqa: F401
    import app.models.badge  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Migração leve para SQLite existente: adiciona colunas se não existirem
    if DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text
        with engine.connect() as conn:
            try:
                res = conn.execute(text("PRAGMA table_info(users)"))
                columns = [row[1] for row in res.fetchall()]
                if "avatar_frame_url" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN avatar_frame_url VARCHAR(255)"))
                if "profile_background_url" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN profile_background_url VARCHAR(255)"))
                if "total_xp" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN total_xp INTEGER DEFAULT 100"))
                if "real_name" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN real_name VARCHAR(100)"))
                if "bio" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN bio VARCHAR(500)"))
                if "location" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN location VARCHAR(100) DEFAULT 'Brasil'"))
                for priv_col in ["privacy_games", "privacy_achievements", "privacy_playtime", "privacy_inventory", "privacy_screenshots", "privacy_groups"]:
                    if priv_col not in columns:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {priv_col} VARCHAR(20) DEFAULT 'Todos'"))

                inv_res = conn.execute(text("PRAGMA table_info(inventory_items)"))
                inv_cols = [row[1] for row in inv_res.fetchall()]
                if inv_cols:
                    if "status" not in inv_cols:
                        conn.execute(text("ALTER TABLE inventory_items ADD COLUMN status VARCHAR(50) DEFAULT 'disponivel'"))
                    if "game_id" not in inv_cols:
                        conn.execute(text("ALTER TABLE inventory_items ADD COLUMN game_id INTEGER"))
                    if "rarity" not in inv_cols:
                        conn.execute(text("ALTER TABLE inventory_items ADD COLUMN rarity VARCHAR(50) DEFAULT 'Comum'"))
                    if "description" not in inv_cols:
                        conn.execute(text("ALTER TABLE inventory_items ADD COLUMN description VARCHAR(255)"))
                conn.commit()
            except Exception:
                pass

