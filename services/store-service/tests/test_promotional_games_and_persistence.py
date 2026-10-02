import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.models.game import Game
from app.db.seed import seed_games, SEED_GAMES


@pytest.fixture
def memory_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        yield db
    finally:
        db.close()


def test_seed_promotional_games_loaded_on_startup(memory_db):
    """
    Testa se todos os jogos padrão e promocionais são carregados na primeira subida da aplicação.
    """
    inserted = seed_games(memory_db)
    assert inserted == len(SEED_GAMES)

    # Verifica se os jogos foram persistidos
    total_games = memory_db.query(Game).count()
    assert total_games == len(SEED_GAMES)

    # Verifica jogos promocionais com desconto
    promo_games = memory_db.query(Game).filter(Game.discount_percentage > 0).all()
    assert len(promo_games) >= 10, "Deve haver pelo menos 10 jogos em promoção no catálogo"

    for promo in promo_games:
        assert promo.original_price is not None
        assert promo.original_price > promo.price, f"Preço original deve ser maior que o promocional para {promo.title}"
        expected_discount = int(round(100 * (1 - (promo.price / promo.original_price))))
        # Desconto armazenado deve ser compatível com a relação original/preço atual
        assert abs(promo.discount_percentage - expected_discount) <= 2


def test_modifications_persisted_across_restarts(memory_db):
    """
    Valida a diretriz mandatória de persistência:
    Modificações feitas posteriormente em tempo de execução no banco de dados
    devem permanecer intactas mesmo quando seed_games rodar novamente em novos boots da aplicação.
    """
    # 1. Boot inicial da aplicação
    seed_games(memory_db)

    # 2. Modificação manual em tempo de execução (ex: promoção relâmpago editada no banco)
    witcher = memory_db.query(Game).filter(Game.title == "The Witcher 3: Wild Hunt — Remastered").first()
    assert witcher is not None
    original_initial_price = witcher.price

    # Usuário/Admin altera o preço para um valor customizado no banco
    witcher.price = 19.99
    witcher.discount_percentage = 93
    memory_db.commit()

    # Verifica que o valor foi persistido
    witcher_check = memory_db.query(Game).filter(Game.title == "The Witcher 3: Wild Hunt — Remastered").first()
    assert witcher_check.price == 19.99
    assert witcher_check.discount_percentage == 93

    # 3. Simula nova subida da aplicação (reinicialização chamando seed_games)
    changes = seed_games(memory_db)
    assert changes == 0, "Nenhum jogo novo deve ser inserido se o catálogo já foi carregado"

    # 4. Verifica que as modificações feitas em banco NÃO foram sobrescritas pelo seed
    witcher_after_restart = memory_db.query(Game).filter(Game.title == "The Witcher 3: Wild Hunt — Remastered").first()
    assert witcher_after_restart.price == 19.99, "O preço customizado em banco deve ser preservado!"
    assert witcher_after_restart.discount_percentage == 93, "O desconto customizado em banco deve ser preservado!"
    assert witcher_after_restart.price != original_initial_price
