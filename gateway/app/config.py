import os

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
STORE_SERVICE_URL = os.getenv("STORE_SERVICE_URL", "http://localhost:8002")
LIBRARY_SERVICE_URL = os.getenv("LIBRARY_SERVICE_URL", "http://localhost:8003")
SOCIAL_SERVICE_URL = os.getenv("SOCIAL_SERVICE_URL", "http://localhost:8004")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "mist_super_secret_jwt_key_development_secret_32bytes")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

DEFAULT_DEV_SECRET = "mist_super_secret_jwt_key_development_secret_32bytes"

if ENVIRONMENT == "production":
    if not JWT_SECRET_KEY or JWT_SECRET_KEY == DEFAULT_DEV_SECRET or len(JWT_SECRET_KEY) < 32:
        raise RuntimeError(
            "Configuração Insegura: Em ambiente de produção, a variável JWT_SECRET_KEY "
            "deve ser configurada com uma chave forte de no mínimo 32 caracteres e não pode ser o valor padrão."
        )


