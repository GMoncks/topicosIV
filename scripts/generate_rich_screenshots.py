import os
import math
from PIL import Image, ImageDraw, ImageFont

GAMES_CONFIG = [
    {
        "filename": "er_messmer.png",
        "title": "Elden Ring: Shadow of the Erdtree",
        "caption": "Enfrentando Messmer no topo do Castelo das Sombras!",
        "author": "mkritli",
        "primary_color": (160, 40, 20),
        "secondary_color": (40, 10, 5),
        "accent_color": (255, 180, 50),
        "symbol": "⚔️",
        "sub_badge": "BOSS FIGHT • SHADOW REALM",
    },
    {
        "filename": "tw3_sunset.png",
        "title": "The Witcher 3: Wild Hunt — Remastered",
        "caption": "Pôr do sol em Kaer Morhen com o ray tracing ativado. Arte pura.",
        "author": "gabriel_t800",
        "primary_color": (180, 80, 20),
        "secondary_color": (50, 15, 30),
        "accent_color": (255, 210, 80),
        "symbol": "🐺",
        "sub_badge": "RAY TRACING ON • 4K ULTRA",
    },
    {
        "filename": "cp_dogtown.png",
        "title": "Cyberpunk 2077: Phantom Liberty",
        "caption": "Dogtown à noite é uma das melhores atmosferas dos videogames.",
        "author": "sarah_connor",
        "primary_color": (20, 140, 190),
        "secondary_color": (220, 20, 100),
        "accent_color": (250, 240, 60),
        "symbol": "⚡",
        "sub_badge": "PATH TRACING • NIGHT CITY",
    },
    {
        "filename": "bg3_party.png",
        "title": "Baldur's Gate 3",
        "caption": "Meu grupo final antes da batalha decisiva em Baldur's Gate.",
        "author": "elena_rpg",
        "primary_color": (90, 40, 140),
        "secondary_color": (20, 15, 45),
        "accent_color": (160, 100, 255),
        "symbol": "🎲",
        "sub_badge": "ACT III • THE FINAL BATTLE",
    },
    {
        "filename": "bg3_city.png",
        "title": "Baldur's Gate 3",
        "caption": "A vista dos portões da Cidade Baixa.",
        "author": "mkritli",
        "primary_color": (40, 90, 120),
        "secondary_color": (15, 30, 45),
        "accent_color": (100, 210, 230),
        "symbol": "🏰",
        "sub_badge": "LOWER CITY GATES • EXPLORATION",
    },
    {
        "filename": "control_brutalism.png",
        "title": "Control Resonant",
        "caption": "Geometria brutalista e poder telecinético.",
        "author": "gabriel_t800",
        "primary_color": (150, 20, 40),
        "secondary_color": (25, 25, 30),
        "accent_color": (255, 60, 60),
        "symbol": "🔻",
        "sub_badge": "FEDERAL BUREAU • OLDEST HOUSE",
    },
    {
        "filename": "orbitals_drift.png",
        "title": "Orbitals",
        "caption": "Gravidade zero e corrida orbital perfeita.",
        "author": "lucas_speed",
        "primary_color": (30, 80, 170),
        "secondary_color": (10, 20, 50),
        "accent_color": (50, 200, 255),
        "symbol": "🚀",
        "sub_badge": "ZERO-G APEX • SPEEDRUN",
    },
    {
        "filename": "fe_crit.png",
        "title": "Fire Emblem: Fortune's Weave",
        "caption": "Crítico cinematográfico com 1% de chance!",
        "author": "elena_rpg",
        "primary_color": (170, 130, 20),
        "secondary_color": (50, 20, 10),
        "accent_color": (255, 230, 100),
        "symbol": "🗡️",
        "sub_badge": "CRITICAL HIT • 1% PROBABILITY",
    },
    {
        "filename": "silksong_citadel.png",
        "title": "Hollow Knight: Silksong",
        "caption": "Pharloom parece ainda mais desafiadora e bela!",
        "author": "mkritli",
        "primary_color": (140, 30, 80),
        "secondary_color": (30, 10, 25),
        "accent_color": (255, 120, 180),
        "symbol": "🪡",
        "sub_badge": "PHARLOOM CITADEL • SILK & SONG",
    },
    {
        "filename": "onimusha_issen.png",
        "title": "Onimusha: Way of the Sword",
        "caption": "Contra-ataque Issen executado com perfeição milimétrica.",
        "author": "sarah_connor",
        "primary_color": (100, 110, 120),
        "secondary_color": (20, 25, 30),
        "accent_color": (200, 220, 255),
        "symbol": "⛩️",
        "sub_badge": "ISSEN COUNTER • SAMURAI HONOURED",
    },
]


def create_game_screenshot(config, width=1280, height=720):
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)

    p_col = config["primary_color"]
    s_col = config["secondary_color"]
    acc_col = config["accent_color"]

    # Fundo em gradiente suave e dinâmico
    for y in range(height):
        factor_y = y / height
        for x in range(0, width, 4):
            factor_x = x / width
            mix = (factor_x * 0.4 + factor_y * 0.6)
            r = int(s_col[0] * (1 - mix) + p_col[0] * mix)
            g = int(s_col[1] * (1 - mix) + p_col[1] * mix)
            b = int(s_col[2] * (1 - mix) + p_col[2] * mix)
            draw.rectangle([x, y, x + 3, y], fill=(r, g, b))

    # Padrão geométrico de fundo estilo videogame moderno
    grid_spacing = 60
    for gx in range(0, width, grid_spacing):
        alpha_val = int(25 + 15 * math.sin(gx * 0.05))
        draw.line([(gx, 0), (gx, height)], fill=(p_col[0], p_col[1], p_col[2]), width=1)
    for gy in range(0, height, grid_spacing):
        draw.line([(0, gy), (width, gy)], fill=(s_col[0], s_col[1], s_col[2]), width=1)

    # Brilho central e formas poligonais
    cx, cy = width // 2, height // 2
    for radius in range(280, 40, -40):
        intensity = (280 - radius) / 240
        ring_color = (
            int(acc_col[0] * intensity * 0.4 + p_col[0] * 0.6),
            int(acc_col[1] * intensity * 0.4 + p_col[1] * 0.6),
            int(acc_col[2] * intensity * 0.4 + p_col[2] * 0.6),
        )
        draw.ellipse([cx - radius, cy - radius // 2, cx + radius, cy + radius // 2], outline=ring_color, width=2)

    # HUD Elements (Overlays de interface in-game)
    # 1. Top left: MIST Game Capture Stamp
    draw.rectangle([40, 36, 40 + 260, 36 + 34], fill=(10, 10, 15), outline=(acc_col[0], acc_col[1], acc_col[2]), width=1)
    # 2. Top right: Resolution & FPS
    draw.rectangle([width - 240, 36, width - 40, 36 + 34], fill=(10, 10, 15), outline=(60, 70, 80), width=1)

    # 3. Bottom HUD card com nome do jogo e legenda
    card_top = height - 190
    draw.rectangle([40, card_top, width - 40, height - 40], fill=(12, 14, 20), outline=(acc_col[0], acc_col[1], acc_col[2]), width=2)
    # Linha decorativa de acento
    draw.rectangle([40, card_top, width - 40, card_top + 4], fill=acc_col)

    # Badge de Categoria/Modo
    draw.rectangle([65, card_top + 20, 65 + 320, card_top + 48], fill=p_col, outline=acc_col, width=1)

    # Tentativa de carregar fonte TTF padrão, fallback para bitmap padrão
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 34)
        font_badge = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
        font_caption = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        font_hud = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
    except Exception:
        font_title = font_badge = font_caption = font_hud = ImageFont.load_default()

    # Textos desenhados
    draw.text((55, 45), "MIST • IN-GAME CAPTURE", fill=acc_col, font=font_hud)
    draw.text((width - 225, 45), "1920x1080 • 120 FPS", fill=(180, 200, 220), font=font_hud)

    draw.text((75, card_top + 26), config["sub_badge"], fill=(255, 255, 255), font=font_badge)
    draw.text((65, card_top + 60), config["title"], fill=(255, 255, 255), font=font_title)
    draw.text((65, card_top + 106), f"« {config['caption']} »", fill=(210, 220, 235), font=font_caption)
    draw.text((width - 320, card_top + 106), f"Capturado por @{config['author']}", fill=acc_col, font=font_hud)

    return img


def main():
    output_dir = "/tmp/mist_rich_screenshots"
    os.makedirs(output_dir, exist_ok=True)
    print(f"Gerando {len(GAMES_CONFIG)} capturas de tela ricas em {output_dir}...")

    for cfg in GAMES_CONFIG:
        img = create_game_screenshot(cfg)
        out_path = os.path.join(output_dir, cfg["filename"])
        img.save(out_path, format="PNG", optimize=True)
        print(f" -> Criado: {cfg['filename']} ({os.path.getsize(out_path)} bytes)")

    print("Concluído com sucesso!")


if __name__ == "__main__":
    main()
