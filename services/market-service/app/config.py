import os

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Consumido em L-03 (lock/unlock de item no inventário) e L-05 (débito/crédito
# de carteira e transferência de custódia do item na compra do mercado).
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
