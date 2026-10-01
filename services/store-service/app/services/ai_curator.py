"""
MIST AI Curator — Módulo de Justificativas Contextuais Avançadas (Ticket S-02).
Gera explicações em linguagem natural amigável e precisa,
conectando os jogos recomendados com o histórico de jogo do usuário.
"""

from typing import List, Dict, Any, Optional


def generate_contextual_justification(
    played_games: List[Dict[str, Any]],
    target_game: Dict[str, Any]
) -> str:
    """
    Gera uma justificativa contextual em linguagem natural amigável explicando
    a recomendação de um jogo com base no histórico de jogos do usuário.
    """
    target_title = target_game.get("title", "o jogo")
    target_tags = target_game.get("tags", [])
    if isinstance(target_tags, str):
        import json
        try:
            target_tags = json.loads(target_tags)
        except Exception:
            target_tags = [t.strip() for t in target_tags.split(",") if t.strip()]

    target_category = target_game.get("category", "Geral")
    review_score = target_game.get("review_score", 9.0)

    if not played_games:
        return f"Destaque popular da comunidade MIST na categoria {target_category} com excelente avaliação ({review_score}/10)."

    # Procura jogo mais recente ou com mais tags em comum
    best_match_game = None
    best_common_tags: List[str] = []

    for pg in played_games:
        pg_tags = pg.get("tags", [])
        if isinstance(pg_tags, str):
            import json
            try:
                pg_tags = json.loads(pg_tags)
            except Exception:
                pg_tags = [t.strip() for t in pg_tags.split(",") if t.strip()]

        common = [t for t in target_tags if t in pg_tags]
        if len(common) > len(best_common_tags):
            best_common_tags = common
            best_match_game = pg

    if best_match_game and best_common_tags:
        played_title = best_match_game.get("title", "jogos anteriores")
        tags_str = ", ".join(best_common_tags[:2])
        return f"Porque você jogou {played_title}, que compartilha elementos de {tags_str}."

    if best_match_game:
        played_title = best_match_game.get("title", "jogos da sua biblioteca")
        return f"Porque você jogou {played_title}, um título aclamado do mesmo estilo."

    if target_tags:
        tags_str = ", ".join(target_tags[:2])
        return f"Recomendado porque você aprecia jogos com as características: {tags_str}."

    return f"Destaque da comunidade MIST na categoria {target_category} com ótima avaliação."
