import os

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# URLs de serviços consumidos pelo market-service serão adicionadas aqui
# conforme os tickets que efetivamente as utilizam (L-03, L-05, ...).
