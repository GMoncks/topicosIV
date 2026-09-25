from datetime import date
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.game import Game

SEED_GAMES: List[Dict[str, Any]] = [
    {
        "title": "The Blood of the Dawnwalker",
        "description": "Um RPG de ação gótico onde você desperta como o último andarilho do alvorecer em um reino consumido pela escuridão perpétua. Domine artes proibidas de sangue e espada para restaurar o sol.",
        "price": 275.00,
        "tags": ["RPG", "Ação", "Fantasia Sombria", "Mundo Aberto"],
        "category": "RPG",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/374320/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 9, 3),
        "developer": "Bandai Namco",
        "publisher": "Steam Imported",
        "review_score": 9.1,
        "game_file": None
    },
    {
        "title": "Orbitals",
        "description": "Simulador de exploração espacial e astrofísica em escala realista. Construa estações orbitais complexas, gerencie manobras gravitacionais de alta precisão e colonize as luas exteriores do sistema solar.",
        "price": 90.00,
        "tags": ["Simulação", "Espaço", "Ficção Científica", "Indie"],
        "category": "Simulação",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/220200/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 9, 3),
        "developer": "Frontier Wave",
        "publisher": "Steam Imported",
        "review_score": 8.5,
        "game_file": None
    },
    {
        "title": "Onimusha: Way of the Sword",
        "description": "O renascimento lendário da franquia épica de samurais. Empunhe a Manopla Oni, absorva almas de demônios Genma e execute contra-ataques mortais Issen no Japão feudal infestado por forças sobrenaturais.",
        "price": 200.00,
        "tags": ["Ação", "Hack and Slash", "Samurai", "Aventura"],
        "category": "Ação",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/761620/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 9, 4),
        "developer": "Capcom",
        "publisher": "Steam Imported",
        "review_score": 8.9,
        "game_file": None
    },
    {
        "title": "Marvel's Wolverine",
        "description": "Uma experiência cinematográfica madura e visceral centrada em Logan. Libere garras de adamantium em combates brutais e descubra segredos obscuros do programa Arma X pelas selvas de Madripoor e além.",
        "price": 400.00,
        "tags": ["Ação", "Super-Herói", "Violento", "História Rica"],
        "category": "Ação",
        "banner_url": "https://media.rawg.io/media/resize/640/-/games/87f/87f93fdc4f0b2a2f0f40b494ac7395ca.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 9, 15),
        "developer": "Sony Interactive Entertainment",
        "publisher": "Steam Imported",
        "review_score": 9.4,
        "game_file": None
    },
    {
        "title": "Fire Emblem: Fortune's Weave",
        "description": "Estratégia tática por turnos em sua expressão máxima. Forje laços inquebráveis entre guerreiros, tome decisões cruciais que moldam o destino de três impérios e domine a arte do posicionamento em combate de grade.",
        "price": 150.00,
        "tags": ["Estratégia", "RPG Tático", "Anime", "Turnos"],
        "category": "Estratégia",
        "banner_url": "https://media.rawg.io/media/games/530/53081dbd5003f990fa5312404ac3d71a.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 9, 17),
        "developer": "Nintendo",
        "publisher": "Steam Imported",
        "review_score": 8.8,
        "game_file": None
    },
    {
        "title": "Silent Hill: Townfall",
        "description": "Mergulhe no terror psicológico opressor em uma cidade litorânea isolada. Enfrente manifestações aterrorizantes da culpa e resolva enigmas perturbadores onde a realidade e o nevoeiro se fundem.",
        "price": 250.00,
        "tags": ["Terror", "Sobrevivência", "Psicológico", "Mistério"],
        "category": "Terror",
        "banner_url": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1636440/0ed1cb4bc30631f95b92f7f13bb06c15d49b4afa/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 9, 24),
        "developer": "Konami",
        "publisher": "Steam Imported",
        "review_score": 8.7,
        "game_file": None
    },
    {
        "title": "Control Resonant",
        "description": "Retorne ao Departamento Federal de Controle como a Diretora Jesse Faden. Explore novos setores em expansão surreal, desbloqueie poderes telecinéticos devastadores e neutralize a nova frequência do Ruído.",
        "price": 350.00,
        "tags": ["Ação", "Sobrenatural", "Ficção Científica", "Tiro"],
        "category": "Ação",
        "banner_url": "https://cdn.prod.website-files.com/64630b03551142e3347ae3da/6a1fd8132b48ed1533f6ad23_CONTROL_Resonant_main.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 9, 24),
        "developer": "Remedy Entertainment",
        "publisher": "Steam Imported",
        "review_score": 9.3,
        "game_file": None
    },
    {
        "title": "The Witcher 3: Wild Hunt — Remastered",
        "description": "A obra-prima definitiva do RPG de fantasia sombria, reconstruída com iluminação Ray Tracing de última geração e texturas ultra-detalhadas. Viva a jornada monumental de Geralt de Rívia em busca de Ciri.",
        "price": 300.00,
        "tags": ["RPG", "Mundo Aberto", "Fantasia", "História Rica"],
        "category": "RPG",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 9, 29),
        "developer": "CD PROJEKT RED",
        "publisher": "Steam Imported",
        "review_score": 9.8,
        "game_file": None
    },
    {
        "title": "Wardogs",
        "description": "Shooter tático cooperativo em primeira pessoa focado em operações clandestinas contemporâneas. Personalização balística realista, destruição procedural de cenários e comunicação tática intensa.",
        "price": 199.00,
        "tags": ["Tiro", "Tático", "Multijogador", "Militar"],
        "category": "Tiro",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/359550/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 9, 10),
        "developer": "Vanguard Studios",
        "publisher": "Steam Imported",
        "review_score": 8.2,
        "game_file": None
    },
    {
        "title": "Hollow Knight: Silksong",
        "description": "A tão aguardada sequência do clássico metroidvania. Como Hornet, princesa protetora de Hallownest, explore um reino inteiramente novo regido pela seda e pela canção, enfrentando mais de 150 novos inimigos.",
        "price": 89.99,
        "tags": ["Metroidvania", "Aventura", "Difícil", "Indie"],
        "category": "Aventura",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1030300/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 8, 15),
        "developer": "Team Cherry",
        "publisher": "Steam Imported",
        "review_score": 9.7,
        "game_file": None
    },
    {
        "title": "Elden Ring: Shadow of the Erdtree",
        "description": "Adentre a Terra das Sombras guiado por Miquella em uma expansão monumental repleta de novos chefes implacáveis, calabouços labirínticos, armamentos inovadores e lore profundo.",
        "price": 199.90,
        "tags": ["RPG", "Soulslike", "Difícil", "Mundo Aberto"],
        "category": "RPG",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2778580/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 6, 21),
        "developer": "FromSoftware",
        "publisher": "Steam Imported",
        "review_score": 9.6,
        "game_file": None
    },
    {
        "title": "Cyberpunk 2077: Phantom Liberty",
        "description": "Uma aventura eletrizante de espionagem e intriga política em Dogtown. Como V, faça um pacto perigoso com a FIA e navegue entre alianças traiçoeiras no coração mais perigoso de Night City.",
        "price": 159.00,
        "tags": ["RPG", "Cyberpunk", "Ficção Científica", "Mundo Aberto"],
        "category": "RPG",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2138330/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 5, 10),
        "developer": "CD PROJEKT RED",
        "publisher": "Steam Imported",
        "review_score": 9.2,
        "game_file": None
    },
    {
        "title": "Baldur's Gate 3",
        "description": "Reúna seu grupo e retorne aos Reinos Esquecidos em uma história sobre companheirismo, sacrifício e a atração do poder absoluto. Decisões com consequências monumentais em um sistema D&D 5e autêntico.",
        "price": 199.99,
        "tags": ["RPG", "D&D", "Turnos", "Escolhas Importam"],
        "category": "RPG",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 4, 1),
        "developer": "Larian Studios",
        "publisher": "Steam Imported",
        "review_score": 9.9,
        "game_file": None
    },
    {
        "title": "MIST Forca",
        "description": "Jogo clássico da forca no terminal integrado à plataforma MIST. Adivinhe palavras sobre computação, teste sua memória e desbloqueie conquistas exclusivas.",
        "price": 0.0,
        "tags": ["Casual", "Palavras", "Indie", "Retro"],
        "category": "Casual",
        "banner_url": "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=1200&auto=format&fit=crop&q=80",
        "screenshots": [
            "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 9, 20),
        "developer": "MIST Studios",
        "publisher": "MIST Studios",
        "review_score": 9.0,
        "game_file": "games/forca.py"
    },
    {
        "title": "MIST Labirinto",
        "description": "Explore masmorras ASCII em tempo real. Navegue pelo labirinto coletando itens raros e encontre a saída enquanto acumula pontuações recordes com telemetria MIST.",
        "price": 0.0,
        "tags": ["Aventura", "Exploração", "Retro", "Indie"],
        "category": "Aventura",
        "banner_url": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80",
        "screenshots": [
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 9, 21),
        "developer": "MIST Studios",
        "publisher": "MIST Studios",
        "review_score": 9.4,
        "game_file": "games/labirinto.py"
    },
    {
        "title": "MIST Quiz",
        "description": "Desafie seus conhecimentos gerais e de ciência da computação neste quiz rápido de múltipla escolha. Acerte sequências perfeitas para desbloquear badges especiais.",
        "price": 0.0,
        "tags": ["Trivia", "Casual", "Educativo", "Indie"],
        "category": "Casual",
        "banner_url": "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=1200&auto=format&fit=crop&q=80",
        "screenshots": [
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 9, 22),
        "developer": "MIST Studios",
        "publisher": "MIST Studios",
        "review_score": 9.2,
        "game_file": "games/quiz.py"
    }
]


def seed_games(db: Session) -> int:
    """
    Popula ou atualiza o catálogo de jogos com as informações e imagens mais recentes.
    Retorna a quantidade de novos jogos inseridos ou atualizados.
    """
    changes_count = 0
    for game_data in SEED_GAMES:
        existing = db.query(Game).filter(Game.title == game_data["title"]).first()
        if not existing:
            game = Game(**game_data)
            db.add(game)
            changes_count += 1
        else:
            updated = False
            fields_to_sync = [
                "developer",
                "publisher",
                "review_score",
                "game_file",
                "banner_url",
                "screenshots",
                "price",
                "description",
                "category",
                "tags",
                "release_date",
            ]
            for field in fields_to_sync:
                if field in game_data and getattr(existing, field) != game_data[field]:
                    setattr(existing, field, game_data[field])
                    updated = True
            if updated:
                changes_count += 1

    if changes_count > 0:
        db.commit()

    return changes_count


if __name__ == "__main__":
    from app.db.database import SessionLocal, init_db
    init_db()
    db = SessionLocal()
    try:
        added = seed_games(db)
        print(f"Seed concluída com sucesso: {added} jogos inseridos/atualizados.")
    finally:
        db.close()
