"""
MIST AI Client — Helper de Inteligência Artificial para o social-service.
Suporta provedores externos (Google Gemini, OpenAI, Groq) via REST com httpx,
com fallback determinístico automático para mock local resiliente e sem custos.
"""

import os
import re
import json
import logging
from typing import Optional, List, Dict, Any, Union
import httpx

logger = logging.getLogger("mist.ai_client")


class AIClient:
    """
    Cliente de IA unificado para o ecossistema MIST.
    """

    def __init__(
        self,
        provider: Optional[str] = None,
        timeout: Optional[float] = None,
        gemini_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None,
        groq_api_key: Optional[str] = None,
    ):
        self.provider_setting = (provider or os.getenv("AI_PROVIDER", "auto")).lower().strip()
        self.timeout = float(timeout or os.getenv("AI_TIMEOUT_SECONDS", "8.0"))

        self.gemini_api_key = gemini_api_key or os.getenv("GEMINI_API_KEY", "").strip()
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY", "").strip()
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()

        self.groq_api_key = groq_api_key or os.getenv("GROQ_API_KEY", "").strip()
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant").strip()

    def resolve_provider(self) -> str:
        """
        Determina o provedor efetivo a ser utilizado.
        Se 'auto', verifica na ordem: Gemini -> OpenAI -> Groq -> Mock.
        """
        if self.provider_setting == "mock":
            return "mock"

        if self.provider_setting in ("gemini", "google"):
            return "gemini" if self.gemini_api_key else "mock"

        if self.provider_setting == "openai":
            return "openai" if self.openai_api_key else "mock"

        if self.provider_setting == "groq":
            return "groq" if self.groq_api_key else "mock"

        # Modo 'auto': seleciona o primeiro provedor configurado com chave válida
        if self.gemini_api_key:
            return "gemini"
        if self.openai_api_key:
            return "openai"
        if self.groq_api_key:
            return "groq"

        return "mock"

    async def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
    ) -> str:
        """
        Gera resposta textual. Em caso de qualquer falha externa,
        aciona o fallback determinístico local.
        """
        effective_provider = self.resolve_provider()

        if effective_provider == "gemini":
            try:
                return await self._call_gemini(prompt, system_instruction, temperature)
            except Exception as exc:
                logger.warning(f"[AIClient] Falha no Gemini ({exc}). Acionando fallback mock.")

        elif effective_provider == "openai":
            try:
                return await self._call_openai_compatible(
                    url="https://api.openai.com/v1/chat/completions",
                    api_key=self.openai_api_key,
                    model=self.openai_model,
                    prompt=prompt,
                    system_instruction=system_instruction,
                    temperature=temperature,
                )
            except Exception as exc:
                logger.warning(f"[AIClient] Falha no OpenAI ({exc}). Acionando fallback mock.")

        elif effective_provider == "groq":
            try:
                return await self._call_openai_compatible(
                    url="https://api.groq.com/openai/v1/chat/completions",
                    api_key=self.groq_api_key,
                    model=self.groq_model,
                    prompt=prompt,
                    system_instruction=system_instruction,
                    temperature=temperature,
                )
            except Exception as exc:
                logger.warning(f"[AIClient] Falha no Groq ({exc}). Acionando fallback mock.")

        # Fallback local determinístico
        return self._mock_generate_text(prompt, system_instruction)

    async def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> Union[Dict[str, Any], List[Any]]:
        """
        Gera e faz o parsing de JSON a partir do prompt informado.
        """
        full_system = (system_instruction or "") + "\nResponda estritamente com JSON válido, sem texto explicativo adicional."
        raw_text = await self.generate_text(prompt=prompt, system_instruction=full_system.strip())

        # Tenta extrair bloco json se vier envolvido em ```json ... ```
        cleaned = raw_text.strip()
        if "```" in cleaned:
            matches = re.findall(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
            if matches:
                cleaned = matches[0].strip()

        try:
            return json.loads(cleaned)
        except Exception:
            # Fallback para parser mock caso a LLM não formate estritamente
            return self._mock_generate_json(prompt, system_instruction)

    # --------------------------------------------------------------------------
    # Chamadas HTTP Externas (REST via httpx)
    # --------------------------------------------------------------------------

    async def _call_gemini(
        self,
        prompt: str,
        system_instruction: Optional[str],
        temperature: float
    ) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_api_key}"
        body: Dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature},
        }
        if system_instruction:
            body["system_instruction"] = {"parts": [{"text": system_instruction}]}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=body)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    async def _call_openai_compatible(
        self,
        url: str,
        api_key: str,
        model: str,
        prompt: str,
        system_instruction: Optional[str],
        temperature: float
    ) -> str:
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        body = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=body, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()

    # --------------------------------------------------------------------------
    # Personas de Negócio MIST (Alto Nível)
    # --------------------------------------------------------------------------

    async def curate_recommendations(
        self,
        user_library_games: List[dict],
        catalog_games: List[dict],
        limit: int = 4,
        user_favorite_tags: Optional[List[str]] = None
    ) -> List[dict]:
        """
        MIST AI Curator (G-02): Analisa o perfil do usuário e recomenda jogos do catálogo
        com score de afinidade e justificativas personalizadas.
        """
        owned_titles = {g.get("title") for g in user_library_games if g.get("title")}
        candidates = [g for g in catalog_games if g.get("title") not in owned_titles]

        if not candidates:
            return []

        if self.resolve_provider() != "mock":
            fav_info = f", e tags favoritas em destaque: {user_favorite_tags}" if user_favorite_tags else ""
            prompt = (
                f"Com base na biblioteca do usuário: {[g.get('title') for g in user_library_games]}{fav_info},\n"
                f"Analise os seguintes jogos candidatos: {[g.get('title') for g in candidates]}.\n"
                f"Selecione os melhores {limit} jogos e gere um array JSON de objetos contendo "
                f"'game_title', 'score' (0 a 100) e 'reason' em português."
            )
            try:
                enriched = await self.generate_json(
                    prompt=prompt,
                    system_instruction="Você é o MIST AI Curator, especialista em recomendação de jogos da plataforma MIST."
                )
                if isinstance(enriched, list) and len(enriched) > 0:
                    results = []
                    for item in enriched[:limit]:
                        matching = next((c for c in candidates if c.get("title") == item.get("game_title")), None)
                        if matching:
                            res_item = dict(matching)
                            res_item["recommendation_score"] = item.get("score", 90)
                            res_item["recommendation_reason"] = item.get("reason", "Altamente recomendado para seu perfil.")
                            results.append(res_item)
                    if results:
                        return results
            except Exception:
                pass

        # Fallback Heurístico Determinístico do Curator
        user_tags = {}
        for g in user_library_games:
            for t in g.get("tags", []):
                user_tags[t] = user_tags.get(t, 0) + 1

        if user_favorite_tags:
            for t in user_favorite_tags:
                user_tags[t] = user_tags.get(t, 0) + 2

        scored = []
        for g in candidates:
            score = 50.0
            common_tags = []
            for t in g.get("tags", []):
                if t in user_tags:
                    score += 15.0 * user_tags[t]
                    common_tags.append(t)
            score += float(g.get("review_score", 8.0)) * 2.0

            if common_tags:
                tags_str = ", ".join(common_tags[:3])
                reason = f"Recomendado porque você aprecia jogos com as características: {tags_str}."
            else:
                reason = f"Destaque da comunidade MIST na categoria {g.get('category', 'Popular')} com ótima avaliação."

            item = dict(g)
            item["recommendation_score"] = round(min(score, 99.0), 1)
            item["recommendation_reason"] = reason
            scored.append(item)

        scored.sort(key=lambda x: x["recommendation_score"], reverse=True)
        return scored[:limit]

    async def generate_dynamic_quests(
        self,
        game_title: str,
        game_category: str = "Aventura",
        user_playtime_minutes: int = 0
    ) -> List[dict]:
        """
        MIST Quest Master (G-03): Gera desafios e missões semanais dinâmicas.
        """
        if self.resolve_provider() != "mock":
            prompt = (
                f"Gere 3 missões dinâmicas semanais para o jogo '{game_title}' ({game_category}). "
                f"O jogador possui {user_playtime_minutes} minutos jogados. "
                f"Retorne um array JSON de objetos com 'id', 'title', 'description', 'xp_reward' (número inteiro)."
            )
            try:
                res = await self.generate_json(
                    prompt=prompt,
                    system_instruction="Você é o MIST Quest Master, que cria desafios divertidos para os jogadores."
                )
                if isinstance(res, list) and len(res) > 0:
                    return res[:3]
            except Exception:
                pass

        return [
            {
                "id": f"quest_{game_title.lower()[:4]}_1",
                "title": f"Explorador de {game_title}",
                "description": f"Jogue pelo menos 30 minutos em {game_title} nesta semana.",
                "xp_reward": 150,
                "target_minutes": 30
            },
            {
                "id": f"quest_{game_title.lower()[:4]}_2",
                "title": "Conquistador Dedicado",
                "description": f"Desbloqueie qualquer conquista em {game_title}.",
                "xp_reward": 300,
                "target_achievements": 1
            },
            {
                "id": f"quest_{game_title.lower()[:4]}_3",
                "title": "Mestre da Comunidade",
                "description": f"Compartilhe uma avaliação ou jogue uma partida perfeita de {game_title}.",
                "xp_reward": 500,
                "target_score": 100
            }
        ]

    async def companion_chat_reply(
        self,
        user_message: str,
        chat_history: Optional[List[dict]] = None,
        user_profile: Optional[dict] = None
    ) -> str:
        """
        MIST Companion Bot (G-04): Amigo gamer virtual no chat WebSocket.
        """
        if self.resolve_provider() != "mock":
            history_str = "\n".join([f"{h.get('sender')}: {h.get('text')}" for h in (chat_history or [])[-5:]])
            profile_name = (user_profile or {}).get("username", "Gamer")
            prompt = f"Histórico:\n{history_str}\n\n{profile_name}: {user_message}\nMIST Bot:"
            try:
                return await self.generate_text(
                    prompt=prompt,
                    system_instruction=(
                        "Você é o MIST Companion Bot, o amigo gamer oficial da plataforma MIST. "
                        "Seja simpático, descontraído, conheça bem jogos de computador, use gírias leves "
                        "de jogos e responda de forma concisa em português."
                    )
                )
            except Exception:
                pass

        msg_lower = user_message.lower()

        if any(w in msg_lower for w in ["oi", "olá", "ola", "hey", "e aí", "e ai", "bom dia", "boa tarde"]):
            return "E aí! Tudo certo no lobby? Qual jogo estamos grindando hoje?"

        if any(w in msg_lower for w in ["recomenda", "indica", "qual jogo", "sugestão", "sugestao"]):
            return "Se você curte desafios rápidos de raciocínio, recomendo muito o MIST Forca e o MIST Labirinto direto do catálogo! Ambos têm conquistas prontas para desbloquear."

        if any(w in msg_lower for w in ["conquista", "trofeu", "troféu", "achievement", "quest"]):
            return "Conquistas são a melhor parte! A cada nova conquista você ganha XP para subir de nível no MIST. Precisa de dicas para alguma?"

        if any(w in msg_lower for w in ["amigo", "social", "chat", "jogar junto"]):
            return "Adicionar amigos na MIST é super fácil! Vá até a aba Social, envie o convite com o ID do seu amigo e vocês já podem bater papo em tempo real."

        if any(w in msg_lower for w in ["comprar", "loja", "preço", "desconto", "promoção", "promocao"]):
            return "Fique de olho na Loja MIST! Sempre tem lançamentos com ótimas avaliações e jogos indie gratuitos para download imediato."

        return "Boa jogada! Estou aqui monitorando suas sessões no MIST. Me avise se quiser dicas de jogos, conquistas ou parceiros de coop!"

    # --------------------------------------------------------------------------
    # Geradores Mock Básicos
    # --------------------------------------------------------------------------

    def _mock_generate_text(self, prompt: str, system_instruction: Optional[str]) -> str:
        prompt_preview = (prompt[:60] + "...") if len(prompt) > 60 else prompt
        return f"[MIST AI Mock] Resposta simulada para: '{prompt_preview}'. Contexto integrado com sucesso."

    def _mock_generate_json(self, prompt: str, system_instruction: Optional[str]) -> dict:
        return {
            "status": "mock_success",
            "message": "Resposta JSON simulada pelo MIST AI Client",
            "prompt_echo": prompt[:80]
        }

