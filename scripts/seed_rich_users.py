#!/usr/bin/env python3
"""
MIST — Seed de Usuários Ativos com Alto Volume de Transações, Checkouts e Playtime.
Popula os microsserviços (auth-service, store-service, library-service, market-service)
diretamente via Docker ou conexões locais.
"""

import os
import sys
import json
import subprocess
from datetime import datetime, timezone, timedelta

USERS_DATA = [
    {
        "id": 1,
        "username": "mkritli",
        "email": "mauricio@live.com",
        "password": "Password@123",
        "wallet_balance": 450.00,
        "points_balance": 3500,
        "level": 12,
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=mkritli",
        "library": [
            {"game_id": 11, "title": "Elden Ring: Shadow of the Erdtree", "playtime": 8420, "installed": True, "days_ago": 1, "price": 199.90},
            {"game_id": 13, "title": "Baldur's Gate 3", "playtime": 5100, "installed": True, "days_ago": 3, "price": 199.99},
            {"game_id": 12, "title": "Cyberpunk 2077: Phantom Liberty", "playtime": 2760, "installed": True, "days_ago": 7, "price": 159.00},
            {"game_id": 1, "title": "The Blood of the Dawnwalker", "playtime": 480, "installed": True, "days_ago": 10, "price": 275.00},
            {"game_id": 10, "title": "Hollow Knight: Silksong", "playtime": 0, "installed": True, "days_ago": 2, "price": 89.99, "status": "NÃO INICIADO (0 min)"},
            {"game_id": 14, "title": "MIST Forca", "playtime": 0, "installed": False, "days_ago": 15, "price": 0.0, "status": "NÃO INICIADO (0 min)"},
        ],
        "unowned": [2, 3, 4, 5, 6, 7, 8, 9, 15, 16],
        "wishlist": [4, 6],
        "transactions": [
            ("recarga", 500.00, "Recarga via PIX aprovada", 25),
            ("compra", 199.90, "Compra: Elden Ring: Shadow of the Erdtree", 24),
            ("compra", 199.99, "Compra: Baldur's Gate 3", 20),
            ("recarga", 300.00, "Recarga de saldo na Carteira MIST", 16),
            ("compra", 159.00, "Compra: Cyberpunk 2077: Phantom Liberty", 15),
            ("venda", 85.00, "Venda no Mercado da Comunidade: Adesivo Holográfico MIST", 12),
            ("venda", 120.00, "Venda no Mercado: Card Raro #04", 11),
            ("compra", 275.00, "Compra: The Blood of the Dawnwalker", 10),
            ("recarga", 200.00, "Recarga de saldo na Carteira MIST", 5),
            ("compra", 89.99, "Compra: Hollow Knight: Silksong", 2),
            ("venda", 45.00, "Venda no Mercado: Skin MIST Labirinto", 1),
        ]
    },
    {
        "id": 2,
        "username": "gabriel_t800",
        "email": "gabriel@mistgames.com",
        "password": "Password@123",
        "wallet_balance": 1250.00,
        "points_balance": 8200,
        "level": 24,
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=gabriel_t800",
        "library": [
            {"game_id": 8, "title": "The Witcher 3: Wild Hunt — Remastered", "playtime": 12300, "installed": True, "days_ago": 2, "price": 300.00},
            {"game_id": 9, "title": "Wardogs", "playtime": 3600, "installed": True, "days_ago": 5, "price": 199.00},
            {"game_id": 2, "title": "Orbitals", "playtime": 1500, "installed": True, "days_ago": 8, "price": 90.00},
            {"game_id": 15, "title": "MIST Labirinto", "playtime": 45, "installed": True, "days_ago": 12, "price": 0.0},
            {"game_id": 7, "title": "Control Resonant", "playtime": 0, "installed": True, "days_ago": 4, "price": 350.00, "status": "NÃO INICIADO (0 min)"},
            {"game_id": 5, "title": "Fire Emblem: Fortune's Weave", "playtime": 0, "installed": False, "days_ago": 14, "price": 150.00, "status": "NÃO INICIADO (0 min)"},
        ],
        "unowned": [1, 3, 4, 6, 10, 11, 12, 13, 14, 16],
        "wishlist": [3, 11],
        "transactions": [
            ("recarga", 1000.00, "Recarga Bancária Carteira MIST", 30),
            ("compra", 300.00, "Compra: The Witcher 3: Wild Hunt — Remastered", 28),
            ("compra", 199.00, "Compra: Wardogs", 22),
            ("venda", 250.00, "Venda no Mercado: Faca Tática MIST", 20),
            ("venda", 320.00, "Venda no Mercado: Item Cosmético Lendário", 18),
            ("compra", 90.00, "Compra: Orbitals", 15),
            ("compra", 150.00, "Compra: Fire Emblem: Fortune's Weave", 14),
            ("recarga", 500.00, "Recarga de saldo na Carteira MIST", 10),
            ("venda", 180.00, "Venda no Mercado: Luvas Exclusivas", 8),
            ("compra", 350.00, "Compra: Control Resonant", 4),
            ("venda", 89.00, "Venda no Mercado: Card Raro #12", 2),
        ]
    },
    {
        "id": 3,
        "username": "sarah_connor",
        "email": "sarah.connor@sky.net",
        "password": "Password@123",
        "wallet_balance": 380.00,
        "points_balance": 2100,
        "level": 8,
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=sarah_connor",
        "library": [
            {"game_id": 12, "title": "Cyberpunk 2077: Phantom Liberty", "playtime": 6800, "installed": True, "days_ago": 1, "price": 159.00},
            {"game_id": 3, "title": "Onimusha: Way of the Sword", "playtime": 1920, "installed": True, "days_ago": 6, "price": 200.00},
            {"game_id": 6, "title": "Silent Hill: Townfall", "playtime": 750, "installed": True, "days_ago": 11, "price": 250.00},
            {"game_id": 1, "title": "The Blood of the Dawnwalker", "playtime": 0, "installed": True, "days_ago": 3, "price": 275.00, "status": "NÃO INICIADO (0 min)"},
            {"game_id": 16, "title": "MIST Quiz", "playtime": 0, "installed": False, "days_ago": 18, "price": 0.0, "status": "NÃO INICIADO (0 min)"},
        ],
        "unowned": [2, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15],
        "wishlist": [4, 7],
        "transactions": [
            ("recarga", 600.00, "Recarga de saldo na Carteira MIST", 22),
            ("compra", 250.00, "Compra: Silent Hill: Townfall", 20),
            ("compra", 200.00, "Compra: Onimusha: Way of the Sword", 16),
            ("recarga", 300.00, "Recarga de saldo na Carteira MIST", 12),
            ("compra", 159.00, "Compra: Cyberpunk 2077: Phantom Liberty", 10),
            ("compra", 275.00, "Compra: The Blood of the Dawnwalker", 3),
            ("venda", 64.00, "Venda no Mercado: Insígnia Especial Cyber", 2),
        ]
    },
    {
        "id": 4,
        "username": "lucas_speed",
        "email": "lucas.speed@speedrun.io",
        "password": "Password@123",
        "wallet_balance": 85.00,
        "points_balance": 1450,
        "level": 6,
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=lucas_speed",
        "library": [
            {"game_id": 10, "title": "Hollow Knight: Silksong", "playtime": 9200, "installed": True, "days_ago": 1, "price": 89.99},
            {"game_id": 2, "title": "Orbitals", "playtime": 4100, "installed": True, "days_ago": 4, "price": 90.00},
            {"game_id": 14, "title": "MIST Forca", "playtime": 180, "installed": True, "days_ago": 15, "price": 0.0},
            {"game_id": 15, "title": "MIST Labirinto", "playtime": 120, "installed": True, "days_ago": 18, "price": 0.0},
            {"game_id": 13, "title": "Baldur's Gate 3", "playtime": 0, "installed": True, "days_ago": 2, "price": 199.99, "status": "NÃO INICIADO (0 min)"},
        ],
        "unowned": [1, 3, 4, 5, 6, 7, 8, 9, 11, 12, 16],
        "wishlist": [11, 12],
        "transactions": [
            ("recarga", 300.00, "Recarga PIX", 26),
            ("compra", 89.99, "Compra: Hollow Knight: Silksong", 25),
            ("compra", 90.00, "Compra: Orbitals", 20),
            ("recarga", 200.00, "Recarga de saldo na Carteira MIST", 10),
            ("compra", 199.99, "Compra: Baldur's Gate 3", 2),
            ("venda", 15.00, "Venda no Mercado: Emoticon Speed", 1),
        ]
    },
    {
        "id": 5,
        "username": "elena_rpg",
        "email": "elena.rostova@questguild.org",
        "password": "Password@123",
        "wallet_balance": 740.00,
        "points_balance": 4800,
        "level": 15,
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=elena_rpg",
        "library": [
            {"game_id": 13, "title": "Baldur's Gate 3", "playtime": 14500, "installed": True, "days_ago": 1, "price": 199.99},
            {"game_id": 5, "title": "Fire Emblem: Fortune's Weave", "playtime": 7200, "installed": True, "days_ago": 3, "price": 150.00},
            {"game_id": 8, "title": "The Witcher 3: Wild Hunt — Remastered", "playtime": 4800, "installed": True, "days_ago": 8, "price": 300.00},
            {"game_id": 3, "title": "Onimusha: Way of the Sword", "playtime": 0, "installed": True, "days_ago": 5, "price": 200.00, "status": "NÃO INICIADO (0 min)"},
            {"game_id": 2, "title": "Orbitals", "playtime": 0, "installed": False, "days_ago": 16, "price": 90.00, "status": "NÃO INICIADO (0 min)"},
        ],
        "unowned": [1, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16],
        "wishlist": [1, 6],
        "transactions": [
            ("recarga", 800.00, "Recarga Bancária Carteira MIST", 28),
            ("compra", 199.99, "Compra: Baldur's Gate 3", 26),
            ("compra", 150.00, "Compra: Fire Emblem: Fortune's Weave", 22),
            ("recarga", 500.00, "Recarga de saldo na Carteira MIST", 18),
            ("compra", 300.00, "Compra: The Witcher 3: Wild Hunt — Remastered", 15),
            ("compra", 90.00, "Compra: Orbitals", 14),
            ("compra", 200.00, "Compra: Onimusha: Way of the Sword", 5),
            ("venda", 120.00, "Venda no Mercado: Background Perfil Fantasia", 4),
            ("venda", 160.00, "Venda no Mercado: Insígnia Mago Ancião", 2),
        ]
    },
    {
        "id": 6,
        "username": "novato_mist",
        "email": "novato@mist.com",
        "password": "Password@123",
        "wallet_balance": 200.00,
        "points_balance": 500,
        "level": 1,
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=novato_mist",
        "library": [
            {"game_id": 16, "title": "MIST Quiz", "playtime": 35, "installed": True, "days_ago": 1, "price": 0.0},
            {"game_id": 2, "title": "Orbitals", "playtime": 0, "installed": True, "days_ago": 2, "price": 90.00, "status": "NÃO INICIADO (0 min)"},
        ],
        "unowned": [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        "wishlist": [10, 14],
        "transactions": [
            ("recarga", 200.00, "Bônus de Boas-vindas MIST", 3),
            ("compra", 90.00, "Compra: Orbitals", 2),
            ("recarga", 90.00, "Recarga de saldo na Carteira MIST", 1),
        ]
    }
]


def run_cmd_in_container(container_name: str, py_script: str) -> str:
    """Executa script python via stdin no container docker."""
    proc = subprocess.run(
        ["docker", "exec", "-i", container_name, "python"],
        input=py_script,
        capture_output=True,
        text=True
    )
    if proc.returncode != 0:
        print(f"ERRO no container {container_name}:")
        print("STDOUT:", proc.stdout)
        print("STDERR:", proc.stderr)
        raise RuntimeError(f"Falha ao executar script em {container_name}: {proc.stderr}")
    return proc.stdout



USERS_JSON_STR = json.dumps(USERS_DATA)

def seed_auth():
    print("-> Semeando auth-service...")
    script = f"""
import bcrypt
import json
from datetime import datetime, timezone
from app.db.database import SessionLocal
from app.models.user import User

users_data = json.loads({repr(USERS_JSON_STR)})

db = SessionLocal()
for u in users_data:
    salt = bcrypt.gensalt()
    h_pwd = bcrypt.hashpw(u["password"].encode("utf-8"), salt).decode("utf-8")
    
    existing = db.query(User).filter(User.id == u["id"]).first()
    if existing:
        existing.username = u["username"]
        existing.email = u["email"]
        existing.hashed_password = h_pwd
        existing.wallet_balance = u["wallet_balance"]
        existing.points_balance = u["points_balance"]
        existing.level = u["level"]
        existing.avatar_url = u["avatar_url"]
    else:
        new_u = User(
            id=u["id"],
            username=u["username"],
            email=u["email"],
            hashed_password=h_pwd,
            wallet_balance=u["wallet_balance"],
            points_balance=u["points_balance"],
            level=u["level"],
            avatar_url=u["avatar_url"],
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_u)
db.commit()
print("Auth: " + str(db.query(User).count()) + " usuarios salvos.")
db.close()
"""
    out = run_cmd_in_container("mist-auth-service", script)
    print("   " + out.strip())


def seed_store():
    print("-> Semeando store-service (compras e wishlists)...")
    script = f"""
from datetime import datetime, timezone, timedelta
from app.db.database import SessionLocal
from app.models.purchase import Purchase
from app.models.wishlist import Wishlist
import json

users_data = json.loads({repr(USERS_JSON_STR)})
db = SessionLocal()

db.query(Purchase).delete()
db.query(Wishlist).delete()
db.commit()

now = datetime.now(timezone.utc)
p_count = 0
w_count = 0

for u in users_data:
    u_id = u["id"]
    for item in u["library"]:
        dt = now - timedelta(days=item.get("days_ago", 5))
        p = Purchase(
            user_id=u_id,
            game_id=item["game_id"],
            price_paid=item.get("price", 0.0),
            status="completed",
            purchased_at=dt,
            idempotency_key=f"seed_chk_{{u_id}}_{{item['game_id']}}"
        )
        db.add(p)
        p_count += 1
        
    for w_gid in u.get("wishlist", []):
        w = Wishlist(
            user_id=u_id,
            game_id=w_gid,
            added_at=now - timedelta(days=15)
        )
        db.add(w)
        w_count += 1

db.commit()
print(f"Store: {{p_count}} checkouts e {{w_count}} itens de wishlist inseridos.")
db.close()
"""
    out = run_cmd_in_container("mist-store-service", script)
    print("   " + out.strip())


def seed_library():
    print("-> Semeando library-service (playtime e biblioteca)...")
    script = f"""
from datetime import datetime, timezone, timedelta
from app.db.database import SessionLocal
from app.models.library_item import LibraryItem
import json

users_data = json.loads({repr(USERS_JSON_STR)})
db = SessionLocal()

db.query(LibraryItem).delete()
db.commit()

now = datetime.now(timezone.utc)
lib_count = 0

for u in users_data:
    u_id = u["id"]
    for item in u["library"]:
        days_ago = item.get("days_ago", 5)
        acq_at = now - timedelta(days=days_ago)
        
        playtime = item.get("playtime", 0)
        last_played = (now - timedelta(hours=4)) if playtime > 0 else None
        
        li = LibraryItem(
            user_id=u_id,
            game_id=item["game_id"],
            acquired_at=acq_at,
            playtime_minutes=playtime,
            is_installed=item.get("installed", False),
            last_played=last_played
        )
        db.add(li)
        lib_count += 1

db.commit()
print(f"Library: {{lib_count}} itens de biblioteca com playtime e status.")
db.close()
"""
    out = run_cmd_in_container("mist-library-service", script)
    print("   " + out.strip())


def seed_market():
    print("-> Semeando market-service (wallet_transactions e market_listings)...")
    script = f"""
from datetime import datetime, timezone, timedelta
from app.db.database import SessionLocal
from app.models.transaction import WalletTransaction
from app.models.listing import MarketListing
import json

users_data = json.loads({repr(USERS_JSON_STR)})
db = SessionLocal()

db.query(WalletTransaction).delete()
db.query(MarketListing).delete()
db.commit()

now = datetime.now(timezone.utc)
tx_count = 0

for u in users_data:
    u_id = u["id"]
    for t_type, amount, desc, days_ago in u.get("transactions", []):
        t_dt = now - timedelta(days=days_ago, minutes=tx_count * 15)
        tx = WalletTransaction(
            user_id=u_id,
            type=t_type,
            amount=amount,
            description=desc,
            created_at=t_dt
        )
        db.add(tx)
        tx_count += 1

db.commit()
print(f"Market: {{tx_count}} transacoes no extrato da carteira inseridas.")

# Anúncios no Mercado da Comunidade para busca e compra
sample_listings = [
    {{"seller_id": 1, "item_id": 101, "item_type": "card", "item_name": "Elden Ring: Erdtree Foil Trading Card", "game_id": 11, "price": 12.50}},
    {{"seller_id": 2, "item_id": 102, "item_type": "avatar_frame", "item_name": "Elden Ring: Malenia Blade of Miquella Frame", "game_id": 11, "price": 25.00}},
    {{"seller_id": 2, "item_id": 103, "item_type": "emoticon", "item_name": "CS2 / Counter-Strike: AK-47 Neon Rider Sticker", "game_id": 9, "price": 45.00}},
    {{"seller_id": 3, "item_id": 104, "item_type": "badge", "item_name": "CS2 / Counter-Strike: Tactical Karambit Pin", "game_id": 9, "price": 180.00}},
    {{"seller_id": 4, "item_id": 105, "item_type": "background", "item_name": "Steam Deck OLED Nebula Animated Background", "game_id": None, "price": 15.00}},
    {{"seller_id": 1, "item_id": 106, "item_type": "badge", "item_name": "Cyberpunk 2077: Samurai Rockerboy Insignia", "game_id": 12, "price": 32.00}},
    {{"seller_id": 5, "item_id": 107, "item_type": "emoticon", "item_name": "Baldur's Gate 3: Mind Flayer Rare Emoticon", "game_id": 13, "price": 8.50}},
    {{"seller_id": 2, "item_id": 108, "item_type": "background", "item_name": "The Witcher 3: Wolf Medallion Animated Profile", "game_id": 8, "price": 18.00}},
    {{"seller_id": 4, "item_id": 109, "item_type": "avatar_frame", "item_name": "Hollow Knight: Hornet Needle Avatar Frame", "game_id": 10, "price": 30.00}},
    {{"seller_id": 4, "item_id": 110, "item_type": "badge", "item_name": "Speedrunner Golden Stopwatch Commemorative Badge", "game_id": None, "price": 65.00}},
    {{"seller_id": 3, "item_id": 111, "item_type": "card", "item_name": "Silent Hill: Townfall Misty Card #03", "game_id": 6, "price": 9.90}},
    {{"seller_id": 5, "item_id": 112, "item_type": "card", "item_name": "Fire Emblem: Fortune's Weave Legendary Crest Card", "game_id": 5, "price": 14.00}},
]

list_count = 0
for l in sample_listings:
    listing = MarketListing(
        seller_id=l["seller_id"],
        item_id=l["item_id"],
        item_type=l["item_type"],
        item_name=l["item_name"],
        game_id=l["game_id"],
        price=l["price"],
        status="ativo",
        created_at=now - timedelta(days=2, hours=list_count)
    )
    db.add(listing)
    list_count += 1

db.commit()
print(f"Market: {{list_count}} anuncios ativos no Mercado da Comunidade inseridos.")
db.close()
"""
    out = run_cmd_in_container("mist-market-service", script)
    print("   " + out.strip())


def seed_ugc():
    print("-> Semeando ugc-service com capturas da comunidade...")
    script = """
import os
import json
import zlib
import struct
from datetime import datetime, timezone, timedelta
from app.db.database import SessionLocal, UPLOADS_DIR, engine, Base
from app.models.screenshot import Screenshot, ScreenshotLike

Base.metadata.create_all(bind=engine)
os.makedirs(UPLOADS_DIR, exist_ok=True)

def generate_solid_png(path, color_rgb):
    width, height = 400, 225
    raw_data = b"".join(b"\\x00" + bytes(color_rgb) * width for _ in range(height))
    compressed = zlib.compress(raw_data)
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
    png = b"\\x89PNG\\r\\n\\x1a\\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", compressed)
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)

sample_screenshots = [
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

db = SessionLocal()
now = datetime.now(timezone.utc)
created_count = 0

for item in sample_screenshots:
    file_path = os.path.join(UPLOADS_DIR, item["filename"])
    if not os.path.exists(file_path):
        generate_solid_png(file_path, item["color"])
    
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
            created_at=now - timedelta(days=item["days_ago"])
        )
        db.add(sc)
        db.flush()
        like = ScreenshotLike(screenshot_id=sc.id, user_id=2, created_at=now)
        db.add(like)
        created_count += 1

db.commit()
total_sc = db.query(Screenshot).count()
print(f"UGC Capturas: {created_count} novas capturas inseridas (total no banco: {total_sc}).")

from app.models.workshop import WorkshopItem, WorkshopSubscription

sample_mods = [
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

mods_created = 0
subs_created = 0

for m in sample_mods:
    prev_path = os.path.join(UPLOADS_DIR, m["preview_name"])
    if not os.path.exists(prev_path):
        generate_solid_png(prev_path, m["preview_color"])

    zip_path = os.path.join(UPLOADS_DIR, m["file_name"])
    if not os.path.exists(zip_path):
        # Cria arquivo zip valido minimo
        with open(zip_path, "wb") as zf:
            zf.write(bytes([80, 75, 5, 6]) + bytes([0] * 18))

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
            updated_at=now - timedelta(days=m["days_ago"])
        )
        db.add(item_obj)
        db.flush()
        mods_created += 1

        for sub_user_id in m["subscribers"]:
            sub = WorkshopSubscription(
                user_id=sub_user_id,
                item_id=item_obj.id,
                created_at=now - timedelta(days=m["days_ago"] - 1)
            )
            db.add(sub)
            subs_created += 1

db.commit()
total_mods = db.query(WorkshopItem).count()
total_subs = db.query(WorkshopSubscription).count()
print(f"UGC Workshop: {mods_created} novos mods inseridos (total no banco: {total_mods}), {subs_created} novas inscrições (total: {total_subs}).")
db.close()
"""
    try:
        out = run_cmd_in_container("mist-ugc-service", script)
        print("   " + out.strip())
    except Exception as e:
        print(f"   [AVISO] Não foi possível rodar no container mist-ugc-service: {e}")


def generate_users_txt(filepath: str):
    """Gera o arquivo de texto explicativo no diretório raiz do projeto."""
    lines = [
        "=" * 80,
        "MIST — LISTA DE USUÁRIOS DE TESTE, TRANSAÇÕES, CHECKOUTS E BIBLIOTECA",
        "=" * 80,
        f"Data de Geração: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        "Senha padrão para todos os usuários: Password@123",
        "=" * 80,
        "",
    ]

    for u in USERS_DATA:
        lines.append("-" * 80)
        lines.append(f"USUÁRIO #{u['id']}: {u['username']} (Nível {u['level']})")
        lines.append("-" * 80)
        lines.append(f"• E-mail:          {u['email']}")
        lines.append(f"• Senha de acesso: {u['password']}")
        lines.append(f"• Saldo Carteira:  R$ {u['wallet_balance']:.2f}")
        lines.append(f"• Pontos MIST:     {u['points_balance']} pts")
        lines.append(f"• Total Transações: {len(u['transactions'])} lançamentos no extrato")
        lines.append(f"• Total Checkouts:  {len(u['library'])} compras finalizadas")
        lines.append("")
        lines.append("  [JOGOS ADQUIRIDOS NA BIBLIOTECA]")
        for item in u["library"]:
            hours = item["playtime"] / 60.0
            status_text = ""
            if item["playtime"] == 0:
                status_text = " -> [ATENÇÃO: JOGO AINDA NÃO INICIADO - 0 MINUTOS]"
            elif hours > 50:
                status_text = " -> [MUITO JOGADO / HARDCORE]"
            installed_str = "Instalado" if item["installed"] else "Não Instalado"
            lines.append(f"    - ID {item['game_id']:02d}: {item['title']:<38} | {item['playtime']:>5} min ({hours:>5.1f}h) | {installed_str:<13}{status_text}")

        owned_ids = {item["game_id"] for item in u["library"]}
        all_catalog_ids = set(range(1, 26))
        unowned_ids = sorted(list(all_catalog_ids - owned_ids))
        lines.append("")
        lines.append("  [JOGOS NÃO ADQUIRIDOS PELO USUÁRIO (DISPONÍVEIS NA LOJA)]")
        lines.append(f"    - Total de jogos não possuídos: {len(unowned_ids)} títulos disponíveis na loja")
        lines.append(f"    - IDs dos jogos não possuídos: {unowned_ids}")

        lines.append("")
        lines.append("  [ÚLTIMAS TRANSAÇÕES NO EXTRATO DA CARTEIRA]")
        for t_type, amount, desc, days_ago in u["transactions"][:5]:
            lines.append(f"    - [{t_type.upper():<7}] R$ {amount:>7.2f} - {desc} ({days_ago} dias atrás)")
        if len(u["transactions"]) > 5:
            lines.append(f"    - ... e mais {len(u['transactions']) - 5} transações registradas.")
        lines.append("")

    lines.append("=" * 80)
    lines.append("Instruções de Login:")
    lines.append("1. Acesse o Frontend MIST em http://localhost:3000")
    lines.append("2. Clique em 'Iniciar Sessão'")
    lines.append("3. Digite o Usuário/E-mail de qualquer conta acima e a senha 'Password@123'")
    lines.append("4. Verifique a Biblioteca, Extrato da Carteira, Recomendações e Wishlist")
    lines.append("=" * 80)

    content = "\n".join(lines)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"-> Arquivo de texto gerado com sucesso em: {filepath}")


def main():
    print("Iniciando processo de população de dados ricos de usuários no MIST...")
    seed_auth()
    seed_store()
    seed_library()
    seed_market()
    seed_ugc()

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    txt_path = os.path.join(root_dir, "usuarios.txt")
    generate_users_txt(txt_path)
    print("\n✓ População concluída com 100% de sucesso!")


if __name__ == "__main__":
    main()
