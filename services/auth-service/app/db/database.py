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
                conn.commit()
            except Exception:
                pass

