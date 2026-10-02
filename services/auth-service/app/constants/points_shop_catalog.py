"""
Catálogo Canônico da Loja de Pontos MIST.
Define os itens cosméticos disponíveis para resgate através de Pontos MIST.
"""

from typing import List, Dict, Any, Optional

POINTS_SHOP_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "p1",
        "name": "Maré Crepuscular",
        "category": "Plano de fundo do perfil",
        "item_type": "background",
        "price_points": 500,
        "asset_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
        "description": "Um horizonte relaxante à beira da praia ao entardecer."
    },
    {
        "id": "p2",
        "name": ":chicken_cry:",
        "category": "Emoticon",
        "item_type": "emoticon",
        "price_points": 100,
        "asset_url": "https://images.unsplash.com/photo-1548247416-ec66f4900b2e?auto=format&fit=crop&w=600&q=80",
        "description": "Emoticon clássico da galinha desolada para chats e comentários."
    },
    {
        "id": "frame_neon",
        "name": "Moldura Neon Cyberpunk",
        "category": "Moldura de avatar",
        "item_type": "avatar_frame",
        "price_points": 1000,
        "asset_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80",
        "description": "Borda pulsante em tons de ciano e magenta futuristas."
    },
    {
        "id": "frame_gold",
        "name": "Moldura Mestre Dourada",
        "category": "Moldura de avatar",
        "item_type": "avatar_frame",
        "price_points": 1500,
        "asset_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
        "description": "Ornamentos dourados reluzentes dignos dos campeões lendários."
    },
    {
        "id": "frame_arcane",
        "name": "Moldura Arcana Cósmica",
        "category": "Moldura de avatar",
        "item_type": "avatar_frame",
        "price_points": 1200,
        "asset_url": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80",
        "description": "Runas místicas e partículas astrais de magia antiga."
    },
    {
        "id": "bg_synthwave",
        "name": "Metrópole Synthwave 1984",
        "category": "Plano de fundo do perfil",
        "item_type": "background",
        "price_points": 800,
        "asset_url": "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1600&q=80",
        "description": "Arranha-céus de neon e pôr do sol retrô dos anos 80."
    },
    {
        "id": "bg_nebula",
        "name": "Nebulosa Abissal MIST",
        "category": "Plano de fundo do perfil",
        "item_type": "background",
        "price_points": 1000,
        "asset_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80",
        "description": "Vastidão do espaço sideral com poeira estelar violeta."
    },
    {
        "id": "p3",
        "name": "Banquete à Beira-Mar",
        "category": "Perfil de jogo",
        "item_type": "profile_bundle",
        "price_points": 2500,
        "asset_url": "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1600&q=80",
        "description": "Conjunto comemorativo de verão com cores tropicais."
    },
    {
        "id": "avatar_cyberpunk",
        "name": "Avatar Cyberpunk Operative",
        "category": "Foto de perfil",
        "item_type": "avatar",
        "price_points": 800,
        "asset_url": "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80",
        "description": "Retrato cibernético de um mercenário nas luzes de neon de Neo-Tóquio."
    },
    {
        "id": "avatar_arcane_mage",
        "name": "Avatar Mago Arcano",
        "category": "Foto de perfil",
        "item_type": "avatar",
        "price_points": 800,
        "asset_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
        "description": "Conjurador das artes antigas e manipulador dos mistérios do éter."
    },
    {
        "id": "avatar_valkyrie",
        "name": "Avatar Valquíria Cósmica",
        "category": "Foto de perfil",
        "item_type": "avatar",
        "price_points": 1000,
        "asset_url": "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80",
        "description": "Guerreira lendária forjada na poeira de supernovas astrais."
    },
    {
        "id": "avatar_pixel_knight",
        "name": "Avatar Cavaleiro Pixel",
        "category": "Foto de perfil",
        "item_type": "avatar",
        "price_points": 600,
        "asset_url": "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=400&q=80",
        "description": "Herói nostálgico 16-bit pronto para enfrentar qualquer masmorra."
    },
    {
        "id": "avatar_mecha_bot",
        "name": "Avatar MIST Mecha",
        "category": "Foto de perfil",
        "item_type": "avatar",
        "price_points": 700,
        "asset_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
        "description": "Unidade autônoma de combate blindada com tecnologia de ponta."
    },
    {
        "id": "avatar_mestre_dourado",
        "name": "Avatar Mestre Dourado",
        "category": "Foto de perfil",
        "item_type": "avatar",
        "price_points": 1000,
        "asset_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
        "description": "Retrato de prestígio dourado dos grandes mestres do MIST."
    },
    {
        "id": "avatar_neon_cyberpunk",
        "name": "Avatar Neon Cyberpunk",
        "category": "Foto de perfil",
        "item_type": "avatar",
        "price_points": 900,
        "asset_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80",
        "description": "Arte gráfica retrofuturista com circuitos e tonalidades neon."
    },
    {
        "id": "avatar_arcano_cosmico",
        "name": "Avatar Arcano Cósmico",
        "category": "Foto de perfil",
        "item_type": "avatar",
        "price_points": 900,
        "asset_url": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80",
        "description": "Entidade mágica envolta por constelações e poder astral ancestral."
    }
]


def get_catalog_item(item_id: str) -> Optional[Dict[str, Any]]:
    for item in POINTS_SHOP_CATALOG:
        if item["id"] == item_id:
            return item
    return None
