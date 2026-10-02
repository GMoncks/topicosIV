import random
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.trading_card import TradingCard
from app.models.badge import Badge

GAME_NAMES = {
    1: "Dead Cells",
    2: "Hollow Knight",
    3: "Celeste",
    5: "Cyberpunk 2077",
    8: "Hades",
    10: "Elden Ring",
    12: "The Witcher 3",
    13: "Baldur's Gate 3",
    14: "Portal 2",
    15: "Stardew Valley",
    16: "Terraria",
}

DEFAULT_CARDS_CATALOG = [
    # Dead Cells (game_id 1)
    {"game_id": 1, "card_name": "Decapitado", "card_art_url": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=400&q=80", "rarity": "Comum", "description": "O guerreiro imortal que nunca descansa nos esgotos."},
    {"game_id": 1, "card_name": "O Colecionador", "card_art_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80", "rarity": "Incomum", "description": "Guardião das células e de projetos esquecidos."},
    {"game_id": 1, "card_name": "Mão do Rei", "card_art_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80", "rarity": "Raro", "description": "O protetor leal da sala do trono."},

    # Hollow Knight (game_id 2)
    {"game_id": 2, "card_name": "O Cavaleiro de Hallownest", "card_art_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80", "rarity": "Comum", "description": "A pequena sombra nascida do vazio."},
    {"game_id": 2, "card_name": "Hornet Protetora", "card_art_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80", "rarity": "Incomum", "description": "Protetora habilidosa armada com agulha e linha."},
    {"game_id": 2, "card_name": "Receptáculo Puro", "card_art_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80", "rarity": "Raro", "description": "O ápice do poder forjado nas profundezas do Abismo."},

    # Celeste (game_id 3)
    {"game_id": 3, "card_name": "Madeline", "card_art_url": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=400&q=80", "rarity": "Comum", "description": "Determinada a escalar cada pico da montanha."},
    {"game_id": 3, "card_name": "Badeline", "card_art_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80", "rarity": "Incomum", "description": "O reflexo das incertezas e a outra parte de si."},
    {"game_id": 3, "card_name": "Morango Dourado", "card_art_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80", "rarity": "Raro", "description": "O símbolo supremo de superação nas alturas."},

    # Cyberpunk 2077 (game_id 5)
    {"game_id": 5, "card_name": "Netrunner de Night City", "card_art_url": "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=400&q=80", "rarity": "Comum", "description": "Especialista em invasão neural nos becos iluminados a neon."},
    {"game_id": 5, "card_name": "Samurai Cromado", "card_art_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80", "rarity": "Incomum", "description": "Lâminas mantis prontas para a rebelião urbana."},
    {"game_id": 5, "card_name": "Johnny Silverhand", "card_art_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80", "rarity": "Raro", "description": "O roqueiro rebelde que nunca se apaga da rede."},
]

DEFAULT_BADGES = [
    {"game_id": 1, "name": "Guardião da Prisão", "description": "Insígnia de mestre sobrevivente em Dead Cells.", "xp_value": 100, "icon_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80"},
    {"game_id": 2, "name": "Coração de Hallownest", "description": "Insígnia de honra por explorar o reino esquecido em Hollow Knight.", "xp_value": 100, "icon_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80"},
    {"game_id": 3, "name": "Pico de Celeste", "description": "Insígnia comemorativa pela conquista da montanha Celeste.", "xp_value": 100, "icon_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80"},
    {"game_id": 5, "name": "Lenda do Afterlife", "description": "Insígnia concedida aos maiores mercenários de Night City.", "xp_value": 100, "icon_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80"},
]


def ensure_catalog_seeded(db: Session):
    """Garante que as cartas e insígnias padrão estejam inseridas no banco de dados."""
    existing_cards = db.query(TradingCard).count()
    if existing_cards == 0:
        for item in DEFAULT_CARDS_CATALOG:
            card = TradingCard(
                game_id=item["game_id"],
                card_name=item["card_name"],
                card_art_url=item["card_art_url"],
                rarity=item["rarity"],
                is_foil=False,
                description=item.get("description")
            )
            db.add(card)

    existing_badges = db.query(Badge).count()
    if existing_badges == 0:
        for b in DEFAULT_BADGES:
            badge = Badge(
                game_id=b["game_id"],
                name=b["name"],
                description=b["description"],
                xp_value=b.get("xp_value", 100),
                icon_url=b["icon_url"],
                is_foil=False,
                level=1
            )
            db.add(badge)

    db.commit()


def seed_generic_cards_for_game(db: Session, game_id: int) -> List[TradingCard]:
    """Cria um set padrão de cartas genéricas com raridades distintas para um jogo qualquer."""
    game_title = GAME_NAMES.get(game_id, f"Jogo #{game_id}")
    
    templates = [
        {
            "card_name": f"{game_title} — Vanguarda",
            "rarity": "Comum",
            "card_art_url": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=400&q=80",
            "description": f"Carta colecionável inicial de combate de {game_title}."
        },
        {
            "card_name": f"{game_title} — Artefato Rúnico",
            "rarity": "Incomum",
            "card_art_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80",
            "description": f"Relíquia mística descoberta no universo de {game_title}."
        },
        {
            "card_name": f"{game_title} — Herói Lendário",
            "rarity": "Raro",
            "card_art_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
            "description": f"A lenda viva reverenciada em {game_title}."
        },
    ]

    cards = []
    for t in templates:
        card = TradingCard(
            game_id=game_id,
            card_name=t["card_name"],
            card_art_url=t["card_art_url"],
            rarity=t["rarity"],
            is_foil=False,
            description=t["description"]
        )
        db.add(card)
        cards.append(card)

    # Cria também a Badge correspondente caso não exista
    existing_badge = db.query(Badge).filter(Badge.game_id == game_id, Badge.is_foil == False).first()
    if not existing_badge:
        badge = Badge(
            game_id=game_id,
            name=f"Insígnia {game_title}",
            description=f"Insígnia forjada após completar a coleção de cartas de {game_title}.",
            xp_value=100,
            icon_url="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80",
            is_foil=False,
            level=1
        )
        db.add(badge)

    db.commit()
    for c in cards:
        db.refresh(c)
    return cards


def get_or_create_game_cards(db: Session, game_id: int) -> List[TradingCard]:
    """Retorna o set de cartas do jogo, gerando cartas genéricas se não existirem."""
    cards = db.query(TradingCard).filter(TradingCard.game_id == game_id).all()
    if not cards:
        cards = seed_generic_cards_for_game(db, game_id)
    return cards


def get_or_create_game_badge(db: Session, game_id: int, is_foil: bool = False) -> Badge:
    """Retorna a insígnia configurada para o jogo, gerando caso necessário."""
    badge = db.query(Badge).filter(Badge.game_id == game_id, Badge.is_foil == is_foil).first()
    if not badge:
        game_title = GAME_NAMES.get(game_id, f"Jogo #{game_id}")
        badge = Badge(
            game_id=game_id,
            name=f"Insígnia {game_title}{' (Foil)' if is_foil else ''}",
            description=f"Insígnia concedida pela maestria completa no jogo {game_title}.",
            xp_value=200 if is_foil else 100,
            icon_url="https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=300&q=80" if is_foil else "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80",
            is_foil=is_foil,
            level=1
        )
        db.add(badge)
        db.commit()
        db.refresh(badge)
    return badge
