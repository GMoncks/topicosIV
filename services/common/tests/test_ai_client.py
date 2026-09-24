import pytest
import httpx
from unittest.mock import patch, AsyncMock
from services.common.ai_client import AIClient


@pytest.mark.asyncio
async def test_ai_client_provider_resolution():
    # Sem chaves, deve resolver para 'mock'
    client_empty = AIClient(provider="auto", gemini_api_key="", openai_api_key="", groq_api_key="")
    assert client_empty.resolve_provider() == "mock"

    # Se provider for explicitamente 'mock', permanece 'mock' mesmo com chaves
    client_mock = AIClient(provider="mock", gemini_api_key="fake-gemini-key")
    assert client_mock.resolve_provider() == "mock"

    # Prioridade de chaves no modo 'auto'
    client_gemini = AIClient(provider="auto", gemini_api_key="gem-123")
    assert client_gemini.resolve_provider() == "gemini"

    client_openai = AIClient(provider="auto", gemini_api_key="", openai_api_key="sk-123")
    assert client_openai.resolve_provider() == "openai"

    client_groq = AIClient(provider="auto", gemini_api_key="", openai_api_key="", groq_api_key="gsk-123")
    assert client_groq.resolve_provider() == "groq"


@pytest.mark.asyncio
async def test_ai_client_mock_text_and_json_generation():
    client = AIClient(provider="mock")

    # Geração de texto mock
    text_result = await client.generate_text("Explique o que é a MIST Store")
    assert isinstance(text_result, str)
    assert len(text_result) > 0
    assert "[MIST AI Mock]" in text_result

    # Geração de JSON mock
    json_result = await client.generate_json("Retorne as missões em json")
    assert isinstance(json_result, dict)
    assert json_result.get("status") == "mock_success"
    assert "prompt_echo" in json_result


@pytest.mark.asyncio
async def test_ai_client_fallback_on_network_error():
    """
    Garante que falhas de rede ou HTTP na API externa nunca quebram o sistema MIST,
    acionando o fallback determinístico silenciosamente.
    """
    client = AIClient(provider="gemini", gemini_api_key="fake_key_test")

    with patch.object(httpx.AsyncClient, "post", side_effect=httpx.ConnectError("Conexão recusada pela API externa")):
        result = await client.generate_text("Qual jogo devo jogar?")
        assert isinstance(result, str)
        assert "[MIST AI Mock]" in result


@pytest.mark.asyncio
async def test_ai_curator_mock_recommendations():
    client = AIClient(provider="mock")

    user_library = [
        {"title": "The Blood of the Dawnwalker", "tags": ["RPG", "Ação", "Fantasia Sombria"]}
    ]

    catalog = [
        {"title": "The Blood of the Dawnwalker", "tags": ["RPG", "Ação"], "category": "RPG", "review_score": 9.0},
        {"title": "Dark Souls Clone", "tags": ["RPG", "Ação", "Desafiador"], "category": "RPG", "review_score": 8.8},
        {"title": "Simulador de Fazenda", "tags": ["Simulação", "Casual"], "category": "Simulação", "review_score": 8.0},
        {"title": "MIST Forca", "tags": ["Casual", "Palavras"], "category": "Casual", "review_score": 9.0}
    ]

    recs = await client.curate_recommendations(user_library, catalog, limit=2)

    assert len(recs) <= 2
    # Jogo já possuído não pode ser recomendado
    recommended_titles = [r["title"] for r in recs]
    assert "The Blood of the Dawnwalker" not in recommended_titles

    # O jogo com tags afins deve liderar a recomendação
    assert "Dark Souls Clone" in recommended_titles
    top_rec = recs[0]
    assert top_rec["recommendation_score"] > 0
    assert "recommendation_reason" in top_rec
    assert "RPG" in top_rec["recommendation_reason"] or "Ação" in top_rec["recommendation_reason"]


@pytest.mark.asyncio
async def test_ai_quest_master_mock_quests():
    client = AIClient(provider="mock")

    quests = await client.generate_dynamic_quests(
        game_title="MIST Labirinto",
        game_category="Aventura",
        user_playtime_minutes=35
    )

    assert isinstance(quests, list)
    assert len(quests) >= 2
    for q in quests:
        assert "id" in q
        assert "title" in q
        assert "description" in q
        assert "xp_reward" in q
        assert q["xp_reward"] > 0


@pytest.mark.asyncio
async def test_ai_companion_bot_mock_chat():
    client = AIClient(provider="mock")

    reply_greeting = await client.companion_chat_reply("Olá, tudo bem?")
    assert "lobby" in reply_greeting.lower() or "jogando" in reply_greeting.lower()

    reply_recs = await client.companion_chat_reply("Qual jogo você me recomenda?")
    assert "mist" in reply_recs.lower() or "forca" in reply_recs.lower() or "labirinto" in reply_recs.lower()

    reply_achievements = await client.companion_chat_reply("Como funcionam as conquistas?")
    assert "conquista" in reply_achievements.lower() or "xp" in reply_achievements.lower()

    reply_friends = await client.companion_chat_reply("Como adiciono um amigo?")
    assert "social" in reply_friends.lower() or "amigo" in reply_friends.lower()
