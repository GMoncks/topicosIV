import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SOCIAL_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if SOCIAL_DIR in sys.path:
    sys.path.remove(SOCIAL_DIR)
sys.path.insert(0, SOCIAL_DIR)

from sqlalchemy.pool import StaticPool

import app.models.activity  # noqa: F401
import app.models.message  # noqa: F401
import app.models.friend  # noqa: F401
import app.models.notification  # noqa: F401
import app.models.group  # noqa: F401
import app.models.forum  # noqa: F401
import app.models.group_message  # noqa: F401

from app.db.database import Base, get_db
from app.main import app

# Configuração de banco de teste isolado em memória com StaticPool
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_create_and_list_groups(client):
    # Criar grupo pelo usuário 1
    resp = client.post(
        "/groups",
        json={
            "name": "RPG Brasil & Souls Enthusiasts",
            "description": "Comunidade dedicada a Elden Ring, Dark Souls e Baldur's Gate 3.",
            "avatar_url": "https://images.unsplash.com/photo-1542751371-adc38448a05e",
            "header_url": "https://images.unsplash.com/photo-1511512578047-dfb367046420",
            "category": "RPG",
            "is_private": False,
        },
        headers={"X-User-Id": "1"},
    )
    assert resp.status_code == 201
    group_data = resp.json()
    group_id = group_data["id"]
    assert group_data["name"] == "RPG Brasil & Souls Enthusiasts"
    assert group_data["owner_id"] == 1
    assert group_data["members_count"] == 1
    assert group_data["role"] == "owner"
    assert group_data["is_member"] is True

    # Criar segundo grupo pelo usuário 2
    client.post(
        "/groups",
        json={
            "name": "Speedrunners MIST",
            "description": "Quebrando recordes mundiais em Hollow Knight e Celeste.",
            "category": "Desafios",
        },
        headers={"X-User-Id": "2"},
    )

    # Listar grupos sem filtro
    list_resp = client.get("/groups", headers={"X-User-Id": "1"})
    assert list_resp.status_code == 200
    groups = list_resp.json()
    assert len(groups) == 2

    # Filtrar por categoria RPG
    rpg_resp = client.get("/groups?category=RPG", headers={"X-User-Id": "1"})
    assert rpg_resp.status_code == 200
    rpg_groups = rpg_resp.json()
    assert len(rpg_groups) == 1
    assert rpg_groups[0]["name"] == "RPG Brasil & Souls Enthusiasts"

    # Buscar por texto "speedrun"
    search_resp = client.get("/groups?q=speedrun", headers={"X-User-Id": "1"})
    assert search_resp.status_code == 200
    assert len(search_resp.json()) == 1


def test_join_and_leave_group(client):
    # Criação do grupo pelo usuário 1
    create_resp = client.post(
        "/groups",
        json={"name": "Indie Gems", "description": "Jogos independentes incríveis.", "category": "Indie"},
        headers={"X-User-Id": "1"},
    )
    group_id = create_resp.json()["id"]

    # Usuário 3 consulta o grupo antes de entrar
    detail_before = client.get(f"/groups/{group_id}", headers={"X-User-Id": "3"})
    assert detail_before.status_code == 200
    assert detail_before.json()["is_member"] is False
    assert detail_before.json()["members_count"] == 1

    # Usuário 3 entra no grupo
    join_resp = client.post(f"/groups/{group_id}/join", headers={"X-User-Id": "3"})
    assert join_resp.status_code == 200
    assert join_resp.json()["is_member"] is True
    assert join_resp.json()["members_count"] == 2

    # Idempotência ao tentar entrar novamente
    join_again = client.post(f"/groups/{group_id}/join", headers={"X-User-Id": "3"})
    assert join_again.status_code == 200
    assert join_again.json()["members_count"] == 2

    # Listagem de membros
    members_resp = client.get(f"/groups/{group_id}/members")
    assert members_resp.status_code == 200
    members = members_resp.json()
    assert len(members) == 2
    user_ids = [m["user_id"] for m in members]
    assert 1 in user_ids and 3 in user_ids

    # Usuário 3 sai do grupo
    leave_resp = client.post(f"/groups/{group_id}/leave", headers={"X-User-Id": "3"})
    assert leave_resp.status_code == 200
    assert leave_resp.json()["is_member"] is False
    assert leave_resp.json()["members_count"] == 1


def test_forum_posts_lifecycle(client):
    # Criar grupo
    grp = client.post(
        "/groups",
        json={"name": "Soulsborne Brasil", "description": "Discussão de builds e lore.", "category": "RPG"},
        headers={"X-User-Id": "1"},
    ).json()
    group_id = grp["id"]

    # Usuário 2 tenta postar sem ser membro -> 403 Forbidden
    unauth_post = client.post(
        f"/groups/{group_id}/posts",
        json={"title": "Spam", "content": "Não sou membro"},
        headers={"X-User-Id": "2"},
    )
    assert unauth_post.status_code == 403

    # Usuário 2 entra no grupo
    client.post(f"/groups/{group_id}/join", headers={"X-User-Id": "2"})

    # Usuário 1 cria post fixado
    post1_resp = client.post(
        f"/groups/{group_id}/posts",
        json={
            "title": "Regras da Comunidade & Guia de Builds",
            "content": "Sejam bem-vindos! Respeitem todos e marquem spoilers.",
            "is_pinned": True,
        },
        headers={"X-User-Id": "1"},
    )
    assert post1_resp.status_code == 201
    post1 = post1_resp.json()
    assert post1["title"] == "Regras da Comunidade & Guia de Builds"
    assert post1["is_pinned"] is True

    # Usuário 2 cria post comum
    post2_resp = client.post(
        f"/groups/{group_id}/posts",
        json={
            "title": "Qual a melhor build de Força para Elden Ring?",
            "content": "Estou em dúvida entre a Greatsword colossal ou duas Maças.",
        },
        headers={"X-User-Id": "2"},
    )
    assert post2_resp.status_code == 201
    post2 = post2_resp.json()
    assert post2["is_pinned"] is False

    # Listar tópicos do fórum (o fixado deve vir primeiro)
    list_posts = client.get(f"/groups/{group_id}/posts")
    assert list_posts.status_code == 200
    posts = list_posts.json()
    assert len(posts) == 2
    assert posts[0]["id"] == post1["id"]  # Fixado primeiro


def test_forum_replies_and_lock(client):
    # Criar grupo e membro
    grp = client.post(
        "/groups",
        json={"name": "Tactical Shooters", "description": "CS2 e táticas.", "category": "FPS"},
        headers={"X-User-Id": "1"},
    ).json()
    group_id = grp["id"]

    client.post(f"/groups/{group_id}/join", headers={"X-User-Id": "2"})

    # Criar tópico
    post = client.post(
        f"/groups/{group_id}/posts",
        json={"title": "Line-up de Smokes na Mirage", "content": "Alguém tem o guia atualizado do bomb A?"},
        headers={"X-User-Id": "2"},
    ).json()
    post_id = post["id"]

    # Usuário 1 responde ao tópico
    reply_resp = client.post(
        f"/posts/{post_id}/replies",
        json={"content": "Sim! Você pode alinhar no pilar da caverna e jogar com jumpthrow."},
        headers={"X-User-Id": "1"},
    )
    assert reply_resp.status_code == 201
    reply = reply_resp.json()
    assert reply["author_id"] == 1
    assert "jumpthrow" in reply["content"]

    # Obter detalhes do post com incremento de visualizações e lista de replies
    post_detail = client.get(f"/posts/{post_id}")
    assert post_detail.status_code == 200
    p_data = post_detail.json()
    assert p_data["views_count"] >= 1
    assert p_data["replies_count"] == 1
    assert len(p_data["replies"]) == 1

    # Dono do grupo tranca o post
    lock_resp = client.patch(f"/posts/{post_id}", json={"is_locked": True}, headers={"X-User-Id": "1"})
    assert lock_resp.status_code == 200
    assert lock_resp.json()["is_locked"] is True

    # Tentativa de resposta em tópico trancado -> 400 Bad Request
    fail_reply = client.post(
        f"/posts/{post_id}/replies",
        json={"content": "Tentando responder tópico trancado"},
        headers={"X-User-Id": "2"},
    )
    assert fail_reply.status_code == 400


def test_group_chat_websocket_and_history(client):
    # Criar grupo
    grp = client.post(
        "/groups",
        json={"name": "Speedrunners Chat", "description": "Sala de chat ao vivo.", "category": "Geral"},
        headers={"X-User-Id": "1"},
    ).json()
    group_id = grp["id"]
    client.post(f"/groups/{group_id}/join", headers={"X-User-Id": "2"})

    # Enviar mensagem REST / WebSocket
    msg_post = client.post(
        f"/groups/{group_id}/chat/messages",
        json={"content": "Fala pessoal, alguém treinando Hollow Knight hoje?"},
        headers={"X-User-Id": "1"},
    )
    assert msg_post.status_code == 201
    saved_msg = msg_post.json()
    assert saved_msg["group_id"] == group_id
    assert saved_msg["user_id"] == 1

    # Consultar histórico de mensagens do grupo
    hist = client.get(f"/groups/{group_id}/chat/messages")
    assert hist.status_code == 200
    messages = hist.json()
    assert len(messages) == 1
    assert messages[0]["content"] == "Fala pessoal, alguém treinando Hollow Knight hoje?"

    # Teste da conexão WebSocket do grupo
    with client.websocket_connect(f"/ws/group/{group_id}/chat?user_id=2") as ws:
        # Enviar mensagem pelo socket
        ws.send_json({"type": "chat_message", "content": "Estou no Pantheon 5 agora!"})
        data = ws.receive_json()
        assert data["type"] == "chat_message"
        assert data["user_id"] == 2
        assert data["content"] == "Estou no Pantheon 5 agora!"
