import os
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# Garante que o diretório data exista relativo ao serviço
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "store.db")
DATABASE_URL = os.getenv("STORE_DATABASE_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    json_serializer=lambda obj: json.dumps(obj, ensure_ascii=False)
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
    import app.models.game  # noqa: F401
    import app.models.wishlist  # noqa: F401
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            columns_info = conn.execute(text("PRAGMA table_info(games)")).fetchall()
            existing_columns = {col[1] for col in columns_info}

            column_definitions = {
                "developer": "VARCHAR(100) DEFAULT 'Steam Imported'",
                "publisher": "VARCHAR(100) DEFAULT 'Steam Imported'",
                "review_score": "FLOAT DEFAULT 0.0",
                "game_file": "VARCHAR(255) DEFAULT NULL",
            }

            for col_name, col_def in column_definitions.items():
                if col_name not in existing_columns:
                    conn.execute(text(f"ALTER TABLE games ADD COLUMN {col_name} {col_def}"))

            conn.commit()
        except Exception as e:
            print(f"[store-service] Aviso na sincronização de colunas de games: {e}")
