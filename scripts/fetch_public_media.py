"""
Script para obter capturas de tela e capas de mods públicas da internet
para a Comunidade (Capturas de Tela) e Oficina (Workshop) do MIST.
"""

import os
import io
import shutil
import urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

TARGET_DIR = "/home/mkritli/Workspace/Git/topicosIV/services/ugc-service/app/data/uploads"
os.makedirs(TARGET_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

SCREENSHOTS = [
    {
        "filename": "er_messmer.png",
        "url": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=1280&q=80",
        "tag": "ELDEN RING",
        "sub": "Shadow of the Erdtree — Messmer Castle",
    },
    {
        "filename": "tw3_sunset.png",
        "url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&q=80",
        "tag": "THE WITCHER 3",
        "sub": "Kaer Morhen Sunset — Ray Tracing Ultra",
    },
    {
        "filename": "cp_dogtown.png",
        "url": "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1280&q=80",
        "tag": "CYBERPUNK 2077",
        "sub": "Dogtown Under Night Neon Lights",
    },
    {
        "filename": "bg3_party.png",
        "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80",
        "tag": "BALDUR'S GATE 3",
        "sub": "Final Gathering Before Netherbrain",
    },
    {
        "filename": "bg3_city.png",
        "url": "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=1280&q=80",
        "tag": "BALDUR'S GATE 3",
        "sub": "Lower City Grand Fortification Gates",
    },
    {
        "filename": "control_brutalism.png",
        "url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1280&q=80",
        "tag": "CONTROL RESONANT",
        "sub": "Oldest House Monolithic Red Sector",
    },
    {
        "filename": "orbitals_drift.png",
        "url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80",
        "tag": "ORBITALS",
        "sub": "Sub-orbital Drift Over Low Atmosphere",
    },
    {
        "filename": "fe_crit.png",
        "url": "https://images.unsplash.com/photo-1563089145-599997674d42?w=1280&q=80",
        "tag": "FIRE EMBLEM",
        "sub": "Fortune's Weave — 1% Critical Strike",
    },
    {
        "filename": "silksong_citadel.png",
        "url": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1280&q=80",
        "tag": "HOLLOW KNIGHT: SILKSONG",
        "sub": "The Undergrowth of Pharloom Citadel",
    },
    {
        "filename": "onimusha_issen.png",
        "url": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&q=80",
        "tag": "ONIMUSHA",
        "sub": "Way of the Sword — Critical Flash Issen",
    },
]

WORKSHOP_ITEMS = [
    {
        "filename": "mod_er_coop.png",
        "url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&q=80",
        "title": "Seamless Co-op Reforged",
        "badge": "MOD • ELDEN RING",
        "color": (212, 168, 67),
    },
    {
        "filename": "mod_bg3_basket.png",
        "url": "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1280&q=80",
        "title": "Basket Full of Equipment",
        "badge": "MOD • BALDUR'S GATE 3",
        "color": (78, 140, 255),
    },
    {
        "filename": "mod_tw3_hd.png",
        "url": "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1280&q=80",
        "title": "HD Reworked Project NextGen",
        "badge": "MOD • THE WITCHER 3",
        "color": (230, 80, 60),
    },
    {
        "filename": "mod_control_reshade.png",
        "url": "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1280&q=80",
        "title": "Photorealistic Brutalism ReShade",
        "badge": "MOD • CONTROL",
        "color": (240, 70, 70),
    },
    {
        "filename": "mod_cp2077_ncpd.png",
        "url": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1280&q=80",
        "title": "NCPD Tactical Overhaul",
        "badge": "MOD • CYBERPUNK 2077",
        "color": (0, 210, 255),
    },
    {
        "filename": "mod_cp2077_neon.png",
        "url": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1280&q=80",
        "title": "Monowire Neon Glow & Cyberware",
        "badge": "MOD • CYBERPUNK 2077",
        "color": (255, 0, 128),
    },
    {
        "filename": "mod_orbitals_hud.png",
        "url": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1280&q=80",
        "title": "Cockpit Telemetry HUD Assistant",
        "badge": "MOD • ORBITALS",
        "color": (50, 230, 180),
    },
    {
        "filename": "mod_silksong_cloak.png",
        "url": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1280&q=80",
        "title": "Hornet Crimson Cloak & Silver Needle",
        "badge": "MOD • SILKSONG",
        "color": (220, 50, 80),
    },
    {
        "filename": "mod_bg3_spells.png",
        "url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&q=80",
        "title": "5e Spells & Subclasses Overhaul",
        "badge": "MOD • BALDUR'S GATE 3",
        "color": (160, 90, 255),
    },
    {
        "filename": "mod_tw3_traducao.png",
        "url": "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1280&q=80",
        "title": "Tradução Aprimorada PT-BR & Lore",
        "badge": "MOD • THE WITCHER 3",
        "color": (46, 204, 113),
    },
]

def download_image(url: str) -> Image.Image:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = resp.read()
    return Image.open(io.BytesIO(data)).convert("RGB")

def process_screenshot(item):
    filepath = os.path.join(TARGET_DIR, item["filename"])
    print(f"Fetching Screenshot: {item['filename']}...")
    img = download_image(item["url"])
    # Redimensiona mantendo proporção e corta para 1280x720
    target_w, target_h = 1280, 720
    img_ratio = img.width / img.height
    target_ratio = target_w / target_h
    if img_ratio > target_ratio:
        new_w = int(img.height * target_ratio)
        offset = (img.width - new_w) // 2
        img = img.crop((offset, 0, offset + new_w, img.height))
    else:
        new_h = int(img.width / target_ratio)
        offset = (img.height - new_h) // 2
        img = img.crop((0, offset, img.width, offset + new_h))
    img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # Adicionar sutil vinheta e marca d'água estética de screenshot
    draw = ImageDraw.Draw(img, "RGBA")
    # Barra inferior com gradiente escuro
    overlay = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    for y in range(target_h - 100, target_h):
        alpha = int(180 * ((y - (target_h - 100)) / 100))
        overlay_draw.line([(0, y), (target_w, y)], fill=(10, 15, 25, alpha))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    # Desenhar texto com sombra
    draw = ImageDraw.Draw(img)
    draw.text((36, target_h - 60), item["tag"], fill=(255, 255, 255))
    draw.text((36, target_h - 38), item["sub"], fill=(180, 200, 220))

    img.save(filepath, "PNG", optimize=True)
    print(f"Saved: {filepath} ({os.path.getsize(filepath) // 1024} KB)")

def process_workshop_card(item):
    filepath = os.path.join(TARGET_DIR, item["filename"])
    print(f"Fetching Workshop Card: {item['filename']}...")
    img = download_image(item["url"])
    target_w, target_h = 1280, 720
    img_ratio = img.width / img.height
    target_ratio = target_w / target_h
    if img_ratio > target_ratio:
        new_w = int(img.height * target_ratio)
        offset = (img.width - new_w) // 2
        img = img.crop((offset, 0, offset + new_w, img.height))
    else:
        new_h = int(img.width / target_ratio)
        offset = (img.height - new_h) // 2
        img = img.crop((0, offset, img.width, offset + new_h))
    img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # Tratamento visual estilo Workshop Card da Steam:
    # 1. Overlay escuro na base e cantos para alto contraste
    overlay = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    # Barra inferior estilizada de mod
    for y in range(target_h - 160, target_h):
        alpha = int(220 * ((y - (target_h - 160)) / 160))
        overlay_draw.line([(0, y), (target_w, y)], fill=(12, 16, 24, alpha))
    
    # Badge do topo (STEAM WORKSHOP / OFICINA MIST)
    overlay_draw.rounded_rectangle([30, 30, 260, 68], radius=6, fill=(18, 24, 38, 220), outline=item["color"], width=2)
    
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)
    
    # Textos da Badge e Título
    draw.text((45, 42), "OFICINA MIST", fill=item["color"])
    draw.text((40, target_h - 110), item["badge"], fill=item["color"])
    draw.text((40, target_h - 75), item["title"], fill=(255, 255, 255))
    
    # Linha decorativa colorida na base
    draw.rectangle([0, target_h - 6, target_w, target_h], fill=item["color"])

    img.save(filepath, "PNG", optimize=True)
    print(f"Saved: {filepath} ({os.path.getsize(filepath) // 1024} KB)")

def main():
    print("=== Iniciando Download e Processamento de Mídias Públicas ===")
    for ss in SCREENSHOTS:
        try:
            process_screenshot(ss)
        except Exception as e:
            print(f"Erro ao processar screenshot {ss['filename']}: {e}")
            
    for ws in WORKSHOP_ITEMS:
        try:
            process_workshop_card(ws)
        except Exception as e:
            print(f"Erro ao processar workshop {ws['filename']}: {e}")
            
    print("=== Concluído! ===")

if __name__ == "__main__":
    main()
