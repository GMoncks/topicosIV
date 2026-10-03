import os
import shutil
import logging
import zlib
import struct
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db.database import UPLOADS_DIR
from app.models.screenshot import Screenshot, ScreenshotLike
from app.models.workshop import WorkshopItem, WorkshopSubscription

logger = logging.getLogger(__name__)

SEED_ASSETS_DIRS = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "seed_assets"),
    "/app/seed_assets",
    os.path.join(os.getcwd(), "seed_assets"),
]


def ensure_media_file_exists(filename: str, fallback_color=(100, 100, 100), is_zip=False):
    """Garante que o arquivo físico exista em UPLOADS_DIR, copiando de seed_assets ou gerando fallback."""
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    target_path = os.path.join(UPLOADS_DIR, filename)
    if os.path.exists(target_path) and os.path.getsize(target_path) > 0:
        return

    # 1. Tenta copiar de seed_assets
    for assets_dir in SEED_ASSETS_DIRS:
        src = os.path.join(assets_dir, filename)
        if os.path.exists(src) and os.path.getsize(src) > 0:
            try:
                shutil.copy2(src, target_path)
                logger.info(f"Copiado asset de seed: {filename} -> {target_path}")
                return
            except Exception as e:
                logger.warning(f"Falha ao copiar asset de {src}: {e}")

    # 2. Fallback mínimo se não encontrar
    if is_zip:
        with open(target_path, "wb") as zf:
            zf.write(bytes([80, 75, 5, 6]) + bytes([0] * 18))
        logger.info(f"Gerado zip mínimo de fallback: {filename}")
    else:
        width, height = 400, 225
        raw_data = b"".join(b"\x00" + bytes(fallback_color) * width for _ in range(height))
        compressed = zlib.compress(raw_data)
        def chunk(tag, data):
            return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
        png = b"\x89PNG\r\n\x1a\n"
        png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        png += chunk(b"IDAT", compressed)
        png += chunk(b"IEND", b"")
        with open(target_path, "wb") as f:
            f.write(png)
        logger.info(f"Gerado PNG de fallback: {filename}")


SAMPLE_SCREENSHOTS = [
    {"user_id": 1, "user_name": "mkritli", "user_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=mkritli", "game_id": 11, "game_title": "Elden Ring: Shadow of the Erdtree", "caption": "Enfrentando Messmer no topo do Castelo das Sombras!", "filename": "er_messmer.png", "color": (130, 40, 30), "likes": 18, "days_ago": 1},
    {"user_id": 2, "user_name": "gabriel_t800", "user_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=gabriel_t800", "game_id": 8, "game_title": "The Witcher 3: Wild Hunt — Remastered", "caption": "Pôr do sol em Kaer Morhen com o ray tracing ativado. Arte pura.", "filename": "tw3_sunset.png", "color": (160, 80, 20), "likes": 24, "days_ago": 2},
    {"user_id": 3, "user_name": "sarah_connor", "user_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=sarah_connor", "game_id": 12, "game_title": "Cyberpunk 2077: Phantom Liberty", "caption": "Dogtown à noite é uma das melhores atmosferas dos videogames.", "filename": "cp_dogtown.png", "color": (20, 120, 160), "likes": 15, "days_ago": 3},
    {"user_id": 5, "user_name": "elena_rpg", "user_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=elena_rpg", "game_id": 13, "game_title": "Baldur's Gate 3", "caption": "Meu grupo final antes da batalha decisiva em Baldur's Gate.", "filename": "bg3_party.png", "color": (80, 40, 120), "likes": 31, "days_ago": 4},
    {"user_id": 1, "user_name": "mkritli", "user_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=mkritli", "game_id": 13, "game_title": "Baldur's Gate 3", "caption": "A vista dos portões da Cidade Baixa.", "filename": "bg3_city.png", "color": (60, 90, 110), "likes": 9, "days_ago": 5},
    {"user_id": 2, "user_name": "gabriel_t800", "user_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=gabriel_t800", "game_id": 7, "game_title": "Control Resonant", "caption": "Geometria brutalista e poder telecinético.", "filename": "control_brutalism.png", "color": (140, 20, 40), "likes": 12, "days_ago": 6},
    {"user_id": 4, "user_name": "lucas_speed", "user_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=lucas_speed", "game_id": 2, "game_title": "Orbitals", "caption": "Gravidade zero e corrida orbital perfeita.", "filename": "orbitals_drift.png", "color": (30, 70, 150), "likes": 7, "days_ago": 7},
    {"user_id": 5, "user_name": "elena_rpg", "user_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=elena_rpg", "game_id": 5, "game_title": "Fire Emblem: Fortune's Weave", "caption": "Crítico cinematográfico com 1% de chance!", "filename": "fe_crit.png", "color": (150, 130, 30), "likes": 20, "days_ago": 8},
    {"user_id": 1, "user_name": "mkritli", "user_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=mkritli", "game_id": 10, "game_title": "Hollow Knight: Silksong", "caption": "Pharloom parece ainda mais desafiadora e bela!", "filename": "silksong_citadel.png", "color": (120, 30, 70), "likes": 42, "days_ago": 9},
    {"user_id": 3, "user_name": "sarah_connor", "user_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=sarah_connor", "game_id": 3, "game_title": "Onimusha: Way of the Sword", "caption": "Contra-ataque Issen executado com perfeição milimétrica.", "filename": "onimusha_issen.png", "color": (100, 100, 100), "likes": 14, "days_ago": 10},
]

SAMPLE_MODS = [
    {
        "id": 1,
        "author_id": 1,
        "author_name": "mkritli",
        "game_id": 11,
        "game_title": "Elden Ring: Shadow of the Erdtree",
        "title": "Seamless Co-op Reforged",
        "description": "Jogue toda a campanha de Elden Ring e o Reino das Sombras de forma cooperativa ininterrupta, sem restrições de invasão forçada ou barreiras de névoa.",
        "category": "Mod",
        "tags": ["Coop", "Multiplayer", "Gameplay", "Erdtree"],
        "version": "1.3.4",
        "file_name": "elden_ring_seamless_coop.zip",
        "preview_name": "mod_er_coop.png",
        "preview_color": (160, 40, 20),
        "file_size": 24500000,
        "downloads": 1420,
        "rating": 4.95,
        "days_ago": 12,
        "subscribers": [2, 3, 4, 5]
    },
    {
        "id": 2,
        "author_id": 1,
        "author_name": "mkritli",
        "game_id": 13,
        "game_title": "Baldur's Gate 3",
        "title": "Basket Full of Equipment (Expanded Edition)",
        "description": "Mais de 800 peças de armaduras, trajes medievais e acessórios mágicos estilizados compatíveis com todas as raças e arquétipos.",
        "category": "Mod",
        "tags": ["Armor", "Items", "Customization", "D&D"],
        "version": "2.1.0",
        "file_name": "bg3_basket_equipment.pak",
        "preview_name": "mod_bg3_basket.png",
        "preview_color": (90, 50, 140),
        "file_size": 52000000,
        "downloads": 890,
        "rating": 4.88,
        "days_ago": 10,
        "subscribers": [2, 5]
    },
    {
        "id": 3,
        "author_id": 2,
        "author_name": "gabriel_t800",
        "game_id": 8,
        "game_title": "The Witcher 3: Wild Hunt — Remastered",
        "title": "HD Reworked Project NextGen",
        "description": "Substituição completa de texturas, rochas, água e modelos 3D com resolução 4K otimizada para a versão NextGen sem perda de FPS.",
        "category": "Mod",
        "tags": ["Graphics", "Textures", "NextGen", "Overhaul"],
        "version": "12.0.1",
        "file_name": "tw3_hd_reworked.zip",
        "preview_name": "mod_tw3_hd.png",
        "preview_color": (180, 90, 30),
        "file_size": 48000000,
        "downloads": 2350,
        "rating": 4.98,
        "days_ago": 18,
        "subscribers": [1, 3, 5]
    },
    {
        "id": 4,
        "author_id": 2,
        "author_name": "gabriel_t800",
        "game_id": 7,
        "game_title": "Control Resonant",
        "title": "Photorealistic Brutalism ReShade & RT Enhancement",
        "description": "Preset cinemático focado na iluminação brutalista da Oldest House, sombras volumétricas ultra nítidas e reflexos dinâmicos.",
        "category": "Mod",
        "tags": ["ReShade", "Lighting", "RayTracing"],
        "version": "1.0.5",
        "file_name": "control_brutalism_reshade.zip",
        "preview_name": "mod_control_reshade.png",
        "preview_color": (150, 20, 50),
        "file_size": 12000000,
        "downloads": 410,
        "rating": 4.70,
        "days_ago": 5,
        "subscribers": [1]
    },
    {
        "id": 5,
        "author_id": 3,
        "author_name": "sarah_connor",
        "game_id": 12,
        "game_title": "Cyberpunk 2077: Phantom Liberty",
        "title": "Night City Gang Wars & NCPD Tactical Overhaul",
        "description": "IA de combate tática inteligente para o NCPD e MaxTac, reforços aéreos em viaturas AV e confrontos territoriais espontâneos entre gangues.",
        "category": "Mod",
        "tags": ["Overhaul", "AI", "Combat", "NCPD"],
        "version": "2.3.0",
        "file_name": "cp2077_ncpd_overhaul.zip",
        "preview_name": "mod_cp2077_ncpd.png",
        "preview_color": (20, 140, 180),
        "file_size": 38000000,
        "downloads": 1780,
        "rating": 4.92,
        "days_ago": 8,
        "subscribers": [1, 2]
    },
    {
        "id": 6,
        "author_id": 3,
        "author_name": "sarah_connor",
        "game_id": 12,
        "game_title": "Cyberpunk 2077: Phantom Liberty",
        "title": "Monowire Neon Glow & Cyberware Aesthetics",
        "description": "Skins luminosas customizáveis para os implantes de braço (Monowire, Mantis Blades e Gorilla Arms) com 12 paletas RGB selecionáveis.",
        "category": "Skin",
        "tags": ["Skin", "Cyberware", "Cosmetic", "RGB"],
        "version": "1.2.0",
        "file_name": "cp2077_neon_monowire.zip",
        "preview_name": "mod_cp2077_neon.png",
        "preview_color": (210, 20, 120),
        "file_size": 18000000,
        "downloads": 920,
        "rating": 4.85,
        "days_ago": 6,
        "subscribers": [1, 4]
    },
    {
        "id": 7,
        "author_id": 4,
        "author_name": "lucas_speed",
        "game_id": 2,
        "game_title": "Orbitals",
        "title": "Cockpit Telemetry HUD & Delta-V Flight Assistant",
        "description": "Ferramenta de instrumentação de voo orbital com vetor de empuxo vetorial, indicador de periapsis/apoapsis e telemetria preditiva em tempo real.",
        "category": "Ferramenta",
        "tags": ["HUD", "Telemetry", "Sim", "Tools"],
        "version": "3.0.1",
        "file_name": "orbitals_flight_assistant.zip",
        "preview_name": "mod_orbitals_hud.png",
        "preview_color": (30, 80, 160),
        "file_size": 8500000,
        "downloads": 320,
        "rating": 4.78,
        "days_ago": 14,
        "subscribers": [2]
    },
    {
        "id": 8,
        "author_id": 4,
        "author_name": "lucas_speed",
        "game_id": 10,
        "game_title": "Hollow Knight: Silksong",
        "title": "Hornet Crimson Cloak & Silver Needle Skin",
        "description": "Skin visual alternativa elegante para Hornet: manto escarlate com bordados dourados e efeito de rastro prateado no ataque de agulha.",
        "category": "Skin",
        "tags": ["Skin", "Hornet", "Cosmetic", "Silksong"],
        "version": "1.0.0",
        "file_name": "silksong_crimson_cloak.zip",
        "preview_name": "mod_silksong_cloak.png",
        "preview_color": (160, 20, 60),
        "file_size": 14000000,
        "downloads": 2150,
        "rating": 4.97,
        "days_ago": 3,
        "subscribers": [1, 5]
    },
    {
        "id": 9,
        "author_id": 5,
        "author_name": "elena_rpg",
        "game_id": 13,
        "game_title": "Baldur's Gate 3",
        "title": "5e Spells & Custom Subclasses Overhaul",
        "description": "Implementação fiel de mais de 70 magias das edições D&D 5e (Xanathar e Tasha) e 8 novas subclasses balanceadas para o ato 3.",
        "category": "Mod",
        "tags": ["Spells", "Classes", "Ruleset", "D&D"],
        "version": "4.5.2",
        "file_name": "bg3_5e_spells.zip",
        "preview_name": "mod_bg3_spells.png",
        "preview_color": (100, 30, 150),
        "file_size": 34000000,
        "downloads": 1920,
        "rating": 4.96,
        "days_ago": 15,
        "subscribers": [1, 2, 3]
    },
    {
        "id": 10,
        "author_id": 5,
        "author_name": "elena_rpg",
        "game_id": 8,
        "game_title": "The Witcher 3: Wild Hunt — Remastered",
        "title": "Tradução Aprimorada PT-BR e Correções de Lore",
        "description": "Revisão ortográfica e terminológica completa da localização em Português Brasileiro, alinhada com as obras de Andrzej Sapkowski.",
        "category": "Tradução",
        "tags": ["Tradução", "PT-BR", "Lore", "Textos"],
        "version": "1.8.0",
        "file_name": "tw3_traducao_ptbr.zip",
        "preview_name": "mod_tw3_traducao.png",
        "preview_color": (40, 110, 60),
        "file_size": 9500000,
        "downloads": 670,
        "rating": 4.89,
        "days_ago": 20,
        "subscribers": [1, 2]
    }
]


def seed_ugc_data(db: Session) -> int:
    """Popula capturas de tela e workshop caso não existam no banco, assegurando mídias físicas."""
    now = datetime.now(timezone.utc)
    added_sc = 0

    # 1. Garante screenshots físicas e no banco
    for item in SAMPLE_SCREENSHOTS:
        ensure_media_file_exists(item["filename"], fallback_color=item["color"], is_zip=False)
        existing = db.query(Screenshot).filter(Screenshot.filename == item["filename"]).first()
        if not existing:
            sc = Screenshot(
                user_id=item["user_id"],
                username=item["user_name"],
                game_id=item["game_id"],
                game_title=item["game_title"],
                title=item["caption"][:50],
                caption=item["caption"],
                filename=item["filename"],
                file_url=f"/api/ugc/uploads/{item['filename']}",
                width=1920,
                height=1080,
                file_size=45000,
                likes_count=item["likes"],
                created_at=now - timedelta(days=item["days_ago"]),
            )
            db.add(sc)
            db.flush()
            like = ScreenshotLike(screenshot_id=sc.id, user_id=2, created_at=now)
            db.add(like)
            added_sc += 1

    # 2. Garante arquivos de mods físicos e no banco
    added_mods = 0
    for m in SAMPLE_MODS:
        ensure_media_file_exists(m["preview_name"], fallback_color=m["preview_color"], is_zip=False)
        ensure_media_file_exists(m["file_name"], is_zip=True)

        existing_mod = db.query(WorkshopItem).filter(WorkshopItem.title == m["title"]).first()
        if not existing_mod:
            item_obj = WorkshopItem(
                author_id=m["author_id"],
                author_name=m["author_name"],
                game_id=m["game_id"],
                game_title=m["game_title"],
                title=m["title"],
                description=m["description"],
                category=m["category"],
                tags=",".join(m["tags"]),
                version=m["version"],
                filename=m["file_name"],
                file_url=f"/api/ugc/uploads/{m['file_name']}",
                file_size=m["file_size"],
                preview_url=f"/api/ugc/uploads/{m['preview_name']}",
                downloads_count=m["downloads"],
                subscriptions_count=len(m["subscribers"]),
                rating=m["rating"],
                created_at=now - timedelta(days=m["days_ago"]),
                updated_at=now - timedelta(days=m["days_ago"]),
            )
            db.add(item_obj)
            db.flush()
            added_mods += 1

            for sub_user_id in m["subscribers"]:
                sub = WorkshopSubscription(
                    user_id=sub_user_id,
                    item_id=item_obj.id,
                    created_at=now - timedelta(days=m["days_ago"] - 1),
                )
                db.add(sub)

    if added_sc > 0 or added_mods > 0:
        db.commit()
        logger.info(f"Seed UGC concluída: {added_sc} capturas e {added_mods} mods inseridos com mídias sincronizadas.")
    return added_sc + added_mods
