import os
import httpx
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.achievement import Achievement

STORE_SERVICE_URL = os.getenv("STORE_SERVICE_URL", "http://store-service:8002")

# Conquistas exclusivas para os jogos desenvolvidos internamente (MIST Studios)
MIST_STUDIOS_ACHIEVEMENTS: Dict[str, List[Dict[str, Any]]] = {
    "MIST Forca": [
        {
            "achievement_id": "first_word",
            "name": "Primeira Palavra",
            "description": "Descobriu com sucesso sua primeira palavra no jogo da forca.",
            "icon_url": "https://api.dicebear.com/7.x/shapes/svg?seed=forca_first_word",
            "rarity": "Comum",
        },
        {
            "achievement_id": "flawless_win",
            "name": "Mente Afiada",
            "description": "Completou uma palavra sem errar nenhuma letra.",
            "icon_url": "https://api.dicebear.com/7.x/shapes/svg?seed=forca_flawless",
            "rarity": "Raro",
        },
        {
            "achievement_id": "hangman_master",
            "name": "Mestre da Forca",
            "description": "Venceu múltiplas rodadas consecutivas de palavras difíceis.",
            "icon_url": "https://api.dicebear.com/7.x/shapes/svg?seed=forca_master",
            "rarity": "Épico",
        },
    ],
    "MIST Labirinto": [
        {
            "achievement_id": "first_move",
            "name": "Primeiros Passos",
            "description": "Iniciou sua jornada e deu os primeiros passos na masmorra.",
            "icon_url": "https://api.dicebear.com/7.x/shapes/svg?seed=maze_first_move",
            "rarity": "Comum",
        },
        {
            "achievement_id": "maze_runner",
            "name": "Escapista",
            "description": "Encontrou com sucesso a saída do labirinto.",
            "icon_url": "https://api.dicebear.com/7.x/shapes/svg?seed=maze_runner",
            "rarity": "Raro",
        },
        {
            "achievement_id": "speedrunner",
            "name": "Velocista da Masmorra",
            "description": "Escapou do labirinto coletando itens em tempo recorde.",
            "icon_url": "https://api.dicebear.com/7.x/shapes/svg?seed=maze_speedrunner",
            "rarity": "Épico",
        },
    ],
    "MIST Quiz": [
        {
            "achievement_id": "first_answer",
            "name": "Curioso por Natureza",
            "description": "Respondeu à primeira pergunta do quiz de ciência da computação.",
            "icon_url": "https://api.dicebear.com/7.x/shapes/svg?seed=quiz_first_answer",
            "rarity": "Comum",
        },
        {
            "achievement_id": "perfect_score",
            "name": "Gênio da Computação",
            "description": "Acertou 100% das perguntas sem errar nenhuma questão.",
            "icon_url": "https://api.dicebear.com/7.x/shapes/svg?seed=quiz_perfect",
            "rarity": "Épico",
        },
        {
            "achievement_id": "trivia_master",
            "name": "Enciclopédia Humana",
            "description": "Alcançou pontuação perfeita nas rodadas mais desafiadoras.",
            "icon_url": "https://api.dicebear.com/7.x/shapes/svg?seed=quiz_master",
            "rarity": "Lendário",
        },
    ],
}

# Template de conquistas para títulos de terceiros (Steam Imported)
def get_generic_achievements_for_game(title: str) -> List[Dict[str, Any]]:
    slug = "".join(c.lower() for c in title if c.isalnum())
    return [
        {
            "achievement_id": "first_launch",
            "name": f"Início de {title}",
            "description": f"Iniciou {title} pela primeira vez e registrou telemetria.",
            "icon_url": f"https://api.dicebear.com/7.x/shapes/svg?seed={slug}_launch",
            "rarity": "Comum",
        },
        {
            "achievement_id": "dedicated_player",
            "name": "Jogador Dedicado",
            "description": f"Acumulou tempo de jogo e explorou as mecânicas em {title}.",
            "icon_url": f"https://api.dicebear.com/7.x/shapes/svg?seed={slug}_dedicated",
            "rarity": "Raro",
        },
        {
            "achievement_id": "master_completionist",
            "name": "Conquistador Lendário",
            "description": f"Dominou as principais missões e desafios em {title}.",
            "icon_url": f"https://api.dicebear.com/7.x/shapes/svg?seed={slug}_master",
            "rarity": "Épico",
        },
    ]


FALLBACK_GAMES = [
    {"id": 1, "title": "The Blood of the Dawnwalker", "publisher": "Steam Imported"},
    {"id": 2, "title": "Orbitals", "publisher": "Steam Imported"},
    {"id": 3, "title": "Onimusha: Way of the Sword", "publisher": "Steam Imported"},
    {"id": 4, "title": "Marvel's Wolverine", "publisher": "Steam Imported"},
    {"id": 5, "title": "DOOM: The Dark Ages", "publisher": "Steam Imported"},
    {"id": 6, "title": "Metal Gear Solid Delta: Snake Eater", "publisher": "Steam Imported"},
    {"id": 7, "title": "Crimson Desert", "publisher": "Steam Imported"},
    {"id": 8, "title": "Hollow Knight: Silksong", "publisher": "Steam Imported"},
    {"id": 9, "title": "Borderlands 4", "publisher": "Steam Imported"},
    {"id": 10, "title": "Clair Obscur: Expedition 33", "publisher": "Steam Imported"},
    {"id": 11, "title": "Bioshock 4: Isolations", "publisher": "Steam Imported"},
    {"id": 12, "title": "Deadlock", "publisher": "Steam Imported"},
    {"id": 13, "title": "MIST Forca", "publisher": "MIST Studios"},
    {"id": 14, "title": "MIST Labirinto", "publisher": "MIST Studios"},
    {"id": 15, "title": "MIST Quiz", "publisher": "MIST Studios"},
]


def fetch_games_catalog(store_url: str) -> List[Dict[str, Any]]:
    """Tenta consultar o catálogo real do store-service via HTTP, com fallback seguro."""
    try:
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(f"{store_url.rstrip('/')}/games?limit=100")
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    return data
    except Exception:
        pass
    return FALLBACK_GAMES


def seed_achievements(db: Session, store_url: Optional[str] = None) -> int:
    """
    Popula dinamicamente a tabela de conquistas no library-service.
    Diferencia jogos 'MIST Studios' de jogos 'Steam Imported' com base no campo publisher.
    """
    url = store_url or STORE_SERVICE_URL
    games = fetch_games_catalog(url)
    created_count = 0

    for g in games:
        game_id = g.get("id")
        title = g.get("title", f"Jogo #{game_id}")
        publisher = g.get("publisher", "Steam Imported")

        if not game_id:
            continue

        # Seleciona as conquistas adequadas baseadas no Publisher
        if publisher == "MIST Studios" and title in MIST_STUDIOS_ACHIEVEMENTS:
            ach_list = MIST_STUDIOS_ACHIEVEMENTS[title]
        else:
            ach_list = get_generic_achievements_for_game(title)

        for ach_data in ach_list:
            existing = (
                db.query(Achievement)
                .filter_by(game_id=game_id, achievement_id=ach_data["achievement_id"])
                .first()
            )
            if not existing:
                new_ach = Achievement(
                    game_id=game_id,
                    achievement_id=ach_data["achievement_id"],
                    name=ach_data["name"],
                    description=ach_data.get("description"),
                    icon_url=ach_data.get("icon_url"),
                    rarity=ach_data.get("rarity", "Comum"),
                )
                db.add(new_ach)
                created_count += 1
            else:
                # Atualiza campos caso tenham mudado
                existing.name = ach_data["name"]
                existing.description = ach_data.get("description")
                existing.icon_url = ach_data.get("icon_url")
                existing.rarity = ach_data.get("rarity", "Comum")

    if created_count > 0:
        db.commit()

    return created_count


if __name__ == "__main__":
    from app.db.database import SessionLocal, init_db
    init_db()
    db = SessionLocal()
    try:
        added = seed_achievements(db)
        print(f"Seed de conquistas concluída: {added} conquistas criadas.")
    finally:
        db.close()
