from datetime import date
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.game import Game

SEED_GAMES: List[Dict[str, Any]] = [
    {
        "title": "The Blood of the Dawnwalker",
        "description": "Um RPG de ação gótico onde você desperta como o último andarilho do alvorecer em um reino consumido pela escuridão perpétua. Domine artes proibidas de sangue e espada para restaurar o sol.",
        "price": 275.00,
        "original_price": 275.00,
        "discount_percentage": 0,
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
        "original_price": 90.00,
        "discount_percentage": 0,
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
        "original_price": 200.00,
        "discount_percentage": 0,
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
        "original_price": 400.00,
        "discount_percentage": 0,
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
        "original_price": 150.00,
        "discount_percentage": 0,
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
        "original_price": 250.00,
        "discount_percentage": 0,
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
        "original_price": 350.00,
        "discount_percentage": 0,
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
        "original_price": 300.00,
        "discount_percentage": 0,
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
        "original_price": 199.00,
        "discount_percentage": 0,
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
        "price": 76.49,
        "original_price": 89.99,
        "discount_percentage": 15,
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
        "original_price": 199.90,
        "discount_percentage": 0,
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
        "price": 95.40,
        "original_price": 159.00,
        "discount_percentage": 40,
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
        "price": 159.99,
        "original_price": 199.99,
        "discount_percentage": 20,
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
        "original_price": 0.0,
        "discount_percentage": 0,
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
        "original_price": 0.0,
        "discount_percentage": 0,
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
        "original_price": 0.0,
        "discount_percentage": 0,
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
    },
    # Novos títulos populados para enriquecer o catálogo MIST
    {
        "title": "Red Dead Redemption 2",
        "description": "Vencedor de mais de 175 prêmios de Jogo do Ano. Acompanhe Arthur Morgan e a notória gangue Van der Linde na travessia das terras selvagens do coração dos Estados Unidos no alvorecer da era moderna.",
        "price": 98.96,
        "original_price": 299.90,
        "discount_percentage": 67,
        "tags": ["Mundo Aberto", "Faroeste", "História Rica", "Ação"],
        "category": "Ação",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1174180/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 1, 15),
        "developer": "Rockstar Games",
        "publisher": "Rockstar Games",
        "review_score": 9.7,
        "game_file": None
    },
    {
        "title": "God of War Ragnarök",
        "description": "Kratos e Atreus embarcam em uma jornada mítica por cada um dos Nove Reinos em busca de respostas enquanto as forças de Asgard se preparam para uma batalha profetizada que causará o fim do mundo.",
        "price": 249.90,
        "original_price": 249.90,
        "discount_percentage": 0,
        "tags": ["Ação", "Mitologia", "Aventura", "Combate"],
        "category": "Ação",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2322010/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 8, 20),
        "developer": "Santa Monica Studio",
        "publisher": "PlayStation Publishing",
        "review_score": 9.6,
        "game_file": None
    },
    {
        "title": "Hades II",
        "description": "Batalhe além do Submundo usando magia negra para confrontar Chronos, o Titã do Tempo, nesta sequência fascinante do aclamado dungeon crawler rogue-like da Supergiant Games.",
        "price": 71.19,
        "original_price": 88.99,
        "discount_percentage": 20,
        "tags": ["Roguelike", "Ação", "Mitologia Grega", "Indie"],
        "category": "Ação",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145350/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 5, 6),
        "developer": "Supergiant Games",
        "publisher": "Supergiant Games",
        "review_score": 9.8,
        "game_file": None
    },
    {
        "title": "Forza Horizon 5",
        "description": "Sua aventura Horizon definitiva te espera! Explore as paisagens de mundo aberto vibrantes e em constante evolução do México com corridas divertidas e ilimitadas em centenas dos melhores carros do mundo.",
        "price": 124.50,
        "original_price": 249.00,
        "discount_percentage": 50,
        "tags": ["Corrida", "Mundo Aberto", "Automobilismo", "Multijogador"],
        "category": "Corrida",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 3, 12),
        "developer": "Playground Games",
        "publisher": "Xbox Game Studios",
        "review_score": 9.1,
        "game_file": None
    },
    {
        "title": "Dead Cells",
        "description": "Um rogue-lite de ação em plataformas estilo metroidvania. Explore um castelo em constante mutação... Isso se você for capaz de derrotar os guardiões em combates 2D frenéticos.",
        "price": 31.99,
        "original_price": 79.99,
        "discount_percentage": 60,
        "tags": ["Roguelite", "Metroidvania", "Pixel Art", "Indie"],
        "category": "Ação",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/588650/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 2, 28),
        "developer": "Motion Twin",
        "publisher": "Motion Twin",
        "review_score": 9.4,
        "game_file": None
    },
    {
        "title": "Stardew Valley",
        "description": "Você herdou a antiga fazenda do seu avô em Stardew Valley. Equipado com ferramentas de segunda mão e algumas moedas, você irá construir a vida dos seus sonhos no campo!",
        "price": 17.49,
        "original_price": 24.99,
        "discount_percentage": 30,
        "tags": ["Simulação", "Agricultura", "Relaxante", "Indie"],
        "category": "Simulação",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/413150/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 2, 26),
        "developer": "ConcernedApe",
        "publisher": "ConcernedApe",
        "review_score": 9.9,
        "game_file": None
    },
    {
        "title": "Resident Evil 4 — Remake",
        "description": "A sobrevivência é apenas o começo. Seis anos após o desastre biológico em Raccoon City, Leon S. Kennedy rastreia a filha sequestrada do presidente até uma vila europeia isolada onde algo está terrivelmente errado.",
        "price": 84.50,
        "original_price": 169.00,
        "discount_percentage": 50,
        "tags": ["Terror", "Sobrevivência", "Ação", "Zumbis"],
        "category": "Terror",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2050650/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 3, 24),
        "developer": "CAPCOM",
        "publisher": "CAPCOM",
        "review_score": 9.6,
        "game_file": None
    },
    {
        "title": "Portal 2",
        "description": "O jogo perpétuo de quebra-cabeças em primeira pessoa inovador da Valve. Use o dispositivo portátil de portais para superar os testes traiçoeiros da sarcástica IA GLaDOS.",
        "price": 8.24,
        "original_price": 32.99,
        "discount_percentage": 75,
        "tags": ["Quebra-Cabeça", "Ficção Científica", "Cooperativo", "Comédia"],
        "category": "Estratégia",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/620/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 4, 19),
        "developer": "Valve",
        "publisher": "Valve",
        "review_score": 9.9,
        "game_file": None
    },
    {
        "title": "Black Myth: Wukong",
        "description": "Um RPG de ação com raízes na mitologia chinesa. Você parte como o Predestinado para desvendar a verdade obscura sob o véu de uma lenda gloriosa do passado.",
        "price": 229.99,
        "original_price": 229.99,
        "discount_percentage": 0,
        "tags": ["Ação", "Mitologia", "Soulslike", "Fantasia"],
        "category": "RPG",
        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2358720/header.jpg",
        "screenshots": [
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80"
        ],
        "release_date": date(2026, 8, 20),
        "developer": "Game Science",
        "publisher": "Game Science",
        "review_score": 9.3,
        "game_file": None
    }
]


def seed_games(db: Session) -> int:
    """
    Carrega o catálogo inicial e jogos promocionais na inicialização da aplicação.
    
    DIRETRIZ DE PERSISTÊNCIA:
    - Se um jogo da lista padrão ainda não existir no banco, ele é inserido.
    - Se um jogo já existir no banco de dados:
      * Preserva todas as alterações feitas posteriormente em tempo de execução (preços alterados,
        novos descontos, dados editados no banco de dados).
      * Aplica valores promocionais (original_price e discount_percentage) apenas se o registro
        no banco estiver nulo/não configurado previamente.
    Dessa forma, os dados padrão são carregados no boot, e modificações posteriores persistem no banco.
    """
    changes_count = 0
    for game_data in SEED_GAMES:
        existing = db.query(Game).filter(Game.title == game_data["title"]).first()
        if not existing:
            # Novo jogo a ser carregado no catálogo
            game = Game(**game_data)
            db.add(game)
            changes_count += 1
        else:
            # Jogo já existente: preserva modificações de banco e apenas migra colunas promocionais nulas
            updated = False
            
            # Sincroniza campos promocionais apenas se não estiverem definidos no banco
            if existing.original_price is None and game_data.get("original_price") is not None:
                existing.original_price = game_data["original_price"]
                existing.discount_percentage = game_data.get("discount_percentage", 0)
                # Se o preço atual for igual ao original e houver desconto, aplica o promocional inicial
                if existing.price == game_data["original_price"] or existing.price is None:
                    existing.price = game_data["price"]
                updated = True

            # Se existirem campos essenciais nulos, preenche
            if existing.discount_percentage is None:
                existing.discount_percentage = game_data.get("discount_percentage", 0)
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
