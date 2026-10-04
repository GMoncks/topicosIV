import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.models.game import Game
from app.models.purchase import Purchase
from app.services.ai_client import AIClient
from app.config import AUTH_SERVICE_URL, LIBRARY_SERVICE_URL, SOCIAL_SERVICE_URL, MARKET_SERVICE_URL


class StoreService:
    @staticmethod
    def list_games(
        db: Session,
        category: Optional[str] = None,
        tag: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = "release_date",
        order: Optional[str] = "desc",
        skip: int = 0,
        limit: int = 50,
    ) -> List[Game]:
        query = db.query(Game)

        # Filtro por Categoria
        if category:
            query = query.filter(Game.category.ilike(category.strip()))

        # Filtro por Tag (dentro do array JSON, suportando tanto formato UTF-8 direto quanto unicode escapado)
        if tag:
            cleaned_tag = tag.strip()
            escaped_tag = json.dumps(cleaned_tag)[1:-1]
            if escaped_tag != cleaned_tag:
                query = query.filter(
                    or_(
                        Game.tags.like(f'%"{cleaned_tag}"%'),
                        Game.tags.like(f'%"{escaped_tag}"%')
                    )
                )
            else:
                query = query.filter(Game.tags.like(f'%"{cleaned_tag}"%'))

        # Filtro por Preço Mínimo e Máximo
        if min_price is not None:
            query = query.filter(Game.price >= min_price)
        if max_price is not None:
            query = query.filter(Game.price <= max_price)

        # Busca Textual (Título, Descrição e Publisher)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Game.title.ilike(search_term),
                    Game.description.ilike(search_term),
                    Game.publisher.ilike(search_term)
                )
            )

        # Ordenação
        sort_columns = {
            "price": Game.price,
            "release_date": Game.release_date,
            "review_score": Game.review_score,
            "title": Game.title,
            "id": Game.id,
        }
        column = sort_columns.get(sort_by.lower() if sort_by else "release_date", Game.release_date)

        is_desc = (order or "desc").lower() == "desc"
        query = query.order_by(desc(column) if is_desc else asc(column))

        # Paginação
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_game_by_id(db: Session, game_id: int) -> Optional[Game]:
        return db.query(Game).filter(Game.id == game_id).first()

    @staticmethod
    def build_game_package(
        db: Session,
        game_id: int,
        user_id: int,
        user_token: Optional[str] = None
    ) -> tuple:
        """
        Constrói dinamicamente em memória um arquivo .zip contendo:
        1. game.py (cópia do script correspondente do jogo)
        2. mist_sdk.py (módulo client SDK da plataforma)
        3. session.json (credenciais da sessão do usuário autenticado)
        Retorna (io.BytesIO, filename).
        """
        import io
        import os
        import re
        import zipfile
        from fastapi import HTTPException, status

        game = StoreService.get_game_by_id(db=db, game_id=game_id)
        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jogo não encontrado."
            )

        if not game.game_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este jogo não possui pacote de download direto disponível no momento."
            )

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        game_src_path = os.path.join(base_dir, "data", game.game_file)
        sdk_src_path = os.path.join(base_dir, "data", "mist_sdk.py")

        if not os.path.isfile(game_src_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Arquivo fonte do jogo '{game.game_file}' não foi encontrado no servidor."
            )

        if not os.path.isfile(sdk_src_path):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Módulo mist_sdk.py não encontrado no servidor de distribuição."
            )

        with open(game_src_path, "r", encoding="utf-8") as f:
            game_code = f.read()

        with open(sdk_src_path, "r", encoding="utf-8") as f:
            sdk_code = f.read()

        public_api_url = os.getenv("MIST_PUBLIC_API_URL") or os.getenv("LIBRARY_API_URL") or "https://mist.biomimetics.com.br/api/library"
        session_data = {
            "session_token": user_token or "offline_dev_token",
            "user_id": user_id,
            "game_id": game.id,
            "game_title": game.title,
            "library_api_url": public_api_url,
        }

        # 1. Launcher nativo para Windows
        launcher_bat = (
            "@echo off\r\n"
            "chcp 65001 >nul\r\n"
            f"title MIST Launcher - {game.title}\r\n"
            "echo ========================================================\r\n"
            "echo               MIST STUDIOS - LAUNCHER\r\n"
            "echo ========================================================\r\n"
            "echo.\r\n"
            f"echo Iniciando {game.title}...\r\n"
            "echo Conectando a plataforma MIST (telemetria e conquistas)...\r\n"
            "echo.\r\n"
            "where python >nul 2>nul\r\n"
            "if %ERRORLEVEL% equ 0 (\r\n"
            "    python game.py\r\n"
            "    goto end\r\n"
            ")\r\n"
            "where py >nul 2>nul\r\n"
            "if %ERRORLEVEL% equ 0 (\r\n"
            "    py game.py\r\n"
            "    goto end\r\n"
            ")\r\n"
            "echo [ERRO] Python nao foi encontrado no seu computador!\r\n"
            "echo Para jogar, instale o Python 3 (versao 3.8 ou superior):\r\n"
            "echo https://www.python.org/downloads/\r\n"
            "echo.\r\n"
            "echo Certifique-se de marcar a opcao 'Add Python to PATH' na instalacao.\r\n"
            "echo.\r\n"
            "pause\r\n"
            "exit /b 1\r\n"
            ":end\r\n"
            "echo.\r\n"
            "echo Obrigado por jogar na MIST!\r\n"
            "echo.\r\n"
            "pause\r\n"
        )

        # 2. Launcher nativo para Linux e macOS
        launcher_sh = (
            "#!/usr/bin/env bash\n"
            f"# MIST Studios Launcher - {game.title}\n\n"
            "echo \"========================================================\"\n"
            "echo \"              MIST STUDIOS - LAUNCHER\"\n"
            "echo \"========================================================\"\n"
            "echo \"\"\n"
            f"echo \"Iniciando {game.title}...\"\n"
            "echo \"Conectando a plataforma MIST (telemetria e conquistas)...\"\n"
            "echo \"\"\n"
            "if command -v python3 >/dev/null 2>&1; then\n"
            "    python3 game.py\n"
            "    exit 0\n"
            "elif command -v python >/dev/null 2>&1; then\n"
            "    python game.py\n"
            "    exit 0\n"
            "else\n"
            "    echo \"[ERRO] Python 3 não foi encontrado no seu sistema!\"\n"
            "    echo \"Para jogar este jogo, instale o Python (3.8+):\"\n"
            "    echo \" - Ubuntu/Debian: sudo apt update && sudo apt install python3\"\n"
            "    echo \" - Fedora:        sudo dnf install python3\"\n"
            "    echo \" - Arch Linux:    sudo pacman -S python\"\n"
            "    echo \" - macOS:         brew install python3 ou baixe em https://www.python.org/downloads/\"\n"
            "    echo \"\"\n"
            "    read -p \"Pressione Enter para fechar...\"\n"
            "    exit 1\n"
            "fi\n"
        )

        # 3. Documentação passo a passo (LEIAME.txt)
        readme_txt = (
            "========================================================================\r\n"
            f"                     MIST STUDIOS - JOGO STANDALONE\r\n"
            f"                             {game.title}\r\n"
            "========================================================================\r\n\r\n"
            "Bem-vindo ao pacote oficial de jogo da plataforma MIST!\r\n"
            "Este jogo foi desenvolvido pela MIST Studios e sincroniza automaticamente\r\n"
            "seu tempo de jogo e conquistas desbloqueadas diretamente com a sua conta.\r\n\r\n"
            "------------------------------------------------------------------------\r\n"
            "COMO JOGAR:\r\n"
            "------------------------------------------------------------------------\r\n"
            "1. Extraia todos os arquivos deste arquivo .zip para uma pasta de sua escolha.\r\n"
            "   (IMPORTANTE: mantenha todos os arquivos juntos na mesma pasta)\r\n\r\n"
            "2. Para iniciar o jogo:\r\n"
            "   - No Windows:\r\n"
            "     Dê um duplo clique no arquivo 'jogar.bat'.\r\n"
            "     (Ou abra o Prompt/PowerShell na pasta e digite: python game.py)\r\n\r\n"
            "   - No Linux ou macOS:\r\n"
            "     Abra o terminal na pasta extraída e execute:\r\n"
            "     chmod +x jogar.sh\r\n"
            "     ./jogar.sh\r\n"
            "     (Ou simplesmente digite: python3 game.py)\r\n\r\n"
            "------------------------------------------------------------------------\r\n"
            "REQUISITOS DO SISTEMA:\r\n"
            "------------------------------------------------------------------------\r\n"
            "- Python 3.8 ou superior instalado (não requer nenhuma biblioteca externa;\r\n"
            "  utiliza apenas a biblioteca padrão do Python).\r\n"
            "- Conexão com a internet para sincronização com sua conta MIST\r\n"
            "  (https://mist.biomimetics.com.br/).\r\n"
            "- Caso esteja offline, o jogo funcionará normalmente no modo local e\r\n"
            "  registrará o progresso quando a conexão for reestabelecida.\r\n\r\n"
            "------------------------------------------------------------------------\r\n"
            "ESTRUTURA DE ARQUIVOS:\r\n"
            "------------------------------------------------------------------------\r\n"
            "- game.py       : Código principal do jogo.\r\n"
            "- mist_sdk.py   : SDK de integração e telemetria da plataforma MIST.\r\n"
            "- session.json  : Suas credenciais de sessão e configurações de conexão.\r\n"
            "- jogar.bat     : Inicializador automático para Windows.\r\n"
            "- jogar.sh      : Inicializador automático para Linux e macOS.\r\n"
            "- LEIAME.txt    : Este arquivo de instruções.\r\n\r\n"
            "Divirta-se jogando na MIST!\r\n"
            "========================================================================\r\n"
        )

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("game.py", game_code)
            zf.writestr("mist_sdk.py", sdk_code)
            zf.writestr("session.json", json.dumps(session_data, indent=2, ensure_ascii=False))
            zf.writestr("jogar.bat", launcher_bat)
            zf.writestr("jogar.sh", launcher_sh)
            zf.writestr("LEIAME.txt", readme_txt)

        zip_buffer.seek(0)
        slug = re.sub(r"[^a-zA-Z0-9_\-]", "_", game.title.lower()).strip("_")
        filename = f"{slug}.zip"
        return zip_buffer, filename

    @staticmethod
    def add_to_wishlist(db: Session, user_id: int, game_id: int):
        from app.models.wishlist import Wishlist
        existing = db.query(Wishlist).filter(Wishlist.user_id == user_id, Wishlist.game_id == game_id).first()
        if existing:
            return existing, False
        
        new_wishlist = Wishlist(user_id=user_id, game_id=game_id)
        db.add(new_wishlist)
        db.commit()
        db.refresh(new_wishlist)
        return new_wishlist, True

    @staticmethod
    def remove_from_wishlist(db: Session, user_id: int, game_id: int) -> bool:
        from app.models.wishlist import Wishlist
        item = db.query(Wishlist).filter(Wishlist.user_id == user_id, Wishlist.game_id == game_id).first()
        if not item:
            return False
        
        db.delete(item)
        db.commit()
        return True

    @staticmethod
    def get_user_wishlist(db: Session, user_id: int):
        from app.models.wishlist import Wishlist
        return db.query(Wishlist).filter(Wishlist.user_id == user_id).order_by(desc(Wishlist.added_at)).all()

    @staticmethod
    async def execute_checkout(
        db: Session,
        user_id: int,
        game_ids: List[int],
        idempotency_key: Optional[str] = None,
        auth_service_url: Optional[str] = None,
        library_service_url: Optional[str] = None,
        http_client: Optional[httpx.AsyncClient] = None
    ) -> Dict[str, Any]:
        """
        Orquestra a transação distribuída de compra (unitária ou carrinho) via Saga Pattern.
        Garante:
        1. Preço autoritativo no banco de dados.
        2. Checagem prévia de posse no library-service (409 Conflict se já possuir).
        3. Débito atômico na carteira do auth-service (400 se saldo insuficiente).
        4. Concessão de licenças no library-service.
        5. Compensação (estorno) imediata no auth-service caso a concessão falhe.
        6. Gravação de auditoria em purchases e remoção dos itens da wishlist.
        """
        auth_url = auth_service_url or AUTH_SERVICE_URL
        lib_url = library_service_url or LIBRARY_SERVICE_URL

        # Remove duplicatas preservando ordem
        dedup_ids = list(dict.fromkeys(game_ids))
        if not dedup_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum jogo selecionado para compra."
            )

        # 1. Busca os jogos no catálogo oficial para garantir existência e obter preço autoritativo
        games: List[Game] = []
        for gid in dedup_ids:
            g = StoreService.get_game_by_id(db, gid)
            if not g:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Jogo com ID {gid} não encontrado no catálogo da loja."
                )
            games.append(g)

        owns_client = False
        client = http_client
        if client is None:
            client = httpx.AsyncClient(timeout=10.0)
            owns_client = True

        try:
            # 2. Checagem prévia de posse (ownership check) no library-service
            for g in games:
                try:
                    resp = await client.get(f"{lib_url.rstrip('/')}/library/users/{user_id}/has-game/{g.id}")
                    if resp.status_code == 200 and resp.json().get("owned"):
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=f"Você já possui o jogo '{g.title}' em sua biblioteca."
                        )
                except HTTPException:
                    raise
                except Exception as net_err:
                    # Falha ao consultar library-service
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=f"Não foi possível validar posse na biblioteca: {str(net_err)}"
                    )

            # 3. Calcula o montante total com base nos preços autoritativos do banco
            total_amount = round(sum(float(g.price) for g in games), 2)

            # 4. Débito atômico na carteira do auth-service
            try:
                debit_resp = await client.post(
                    f"{auth_url.rstrip('/')}/users/{user_id}/wallet/debit",
                    json={
                        "amount": total_amount,
                        "reason": f"Checkout MIST: {[g.title for g in games]}"
                    }
                )
            except Exception as net_err:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Falha de comunicação com o serviço financeiro/auth: {str(net_err)}"
                )

            if debit_resp.status_code == 400:
                err_detail = debit_resp.json().get("detail", "Saldo insuficiente na carteira MIST.")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_detail)
            elif debit_resp.status_code != 200:
                raise HTTPException(
                    status_code=debit_resp.status_code,
                    detail="Falha ao processar débito na carteira MIST."
                )

            debit_data = debit_resp.json()
            new_wallet_balance = debit_data.get("new_balance", 0.0)

            # 5. Concessão de licenças no library-service com bloco de compensação Saga
            granted_games = []
            grant_failed = False
            error_message = ""

            for g in games:
                try:
                    grant_resp = await client.post(
                        f"{lib_url.rstrip('/')}/library/grant",
                        json={"user_id": user_id, "game_id": g.id}
                    )
                    if grant_resp.status_code not in (200, 201):
                        grant_failed = True
                        error_message = f"Falha ao conceder licença do jogo '{g.title}'."
                        break
                    granted_games.append(g)
                except Exception as grant_err:
                    grant_failed = True
                    error_message = f"Erro de rede ao conceder licença: {str(grant_err)}"
                    break

            # Se alguma concessão falhou, executa a Transação Compensatória (Estorno integral se valor > 0)
            if grant_failed:
                if total_amount > 0:
                    try:
                        await client.post(
                            f"{auth_url.rstrip('/')}/users/{user_id}/wallet/credit",
                            json={
                                "amount": total_amount,
                                "reason": f"Saga Rollback Checkout: {error_message}"
                            }
                        )
                    except Exception:
                        pass  # Em ambiente real, registra em dead-letter queue para auditoria

                refund_msg = f" A cobrança de R$ {total_amount:.2f} foi integralmente estornada para sua carteira." if total_amount > 0 else ""
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"{error_message}{refund_msg}"
                )

            # 6. Gravação da auditoria de compra e limpeza de wishlist
            order_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            items_response = []

            for g in games:
                purchase = Purchase(
                    user_id=user_id,
                    game_id=g.id,
                    price_paid=float(g.price),
                    status="completed",
                    purchased_at=now,
                    idempotency_key=f"{idempotency_key}_{g.id}" if idempotency_key else None
                )
                db.add(purchase)

                # Housekeeping: remove da wishlist se estiver presente
                StoreService.remove_from_wishlist(db, user_id=user_id, game_id=g.id)

                items_response.append({
                    "game_id": g.id,
                    "title": g.title,
                    "price_paid": float(g.price)
                })

            db.commit()

            # Dispara evento de atividade game_purchased para o social-service (F-06)
            for g in games:
                try:
                    await client.post(
                        f"{SOCIAL_SERVICE_URL.rstrip('/')}/activities",
                        json={
                            "user_id": user_id,
                            "type": "game_purchased",
                            "payload": {
                                "game_id": g.id,
                                "game_title": g.title,
                                "price": float(g.price),
                                "banner_url": g.banner_url
                            }
                        }
                    )
                except Exception:
                    pass

            # Concessão de Pontos MIST: 100 pontos por R$ 1,00 creditados no auth-service
            points_earned = int(total_amount * 100)
            if points_earned > 0:
                try:
                    await client.post(
                        f"{auth_url.rstrip('/')}/users/{user_id}/points/credit",
                        json={
                            "amount": points_earned,
                            "reason": f"Checkout MIST: {[g.title for g in games]}"
                        }
                    )
                except Exception:
                    pass

            # Registra o lançamento no extrato da carteira (T-02) — best-effort,
            # não bloqueia o checkout se o market-service estiver indisponível.
            # Jogos gratuitos (total_amount == 0) não geram lançamento de carteira.
            if total_amount > 0:
                try:
                    titles = ", ".join(g.title for g in games)
                    await client.post(
                        f"{MARKET_SERVICE_URL.rstrip('/')}/wallet/transactions",
                        json={
                            "user_id": user_id,
                            "type": "compra",
                            "amount": total_amount,
                            "description": f"Compra: {titles}"[:500]
                        }
                    )
                except Exception:
                    pass

            return {
                "status": "success",
                "order_id": order_id,
                "items": items_response,
                "total_paid": total_amount,
                "new_wallet_balance": new_wallet_balance,
                "points_earned": points_earned,
                "purchased_at": now
            }

        finally:
            if owns_client:
                await client.aclose()

    @staticmethod
    async def get_curated_recommendations(
        db: Session,
        user_id: Optional[int] = None,
        limit: int = 4,
        client: Optional[httpx.AsyncClient] = None
    ) -> List[dict]:
        """
        MIST AI Curator (G-02): Gera recomendações personalizadas com base na
        biblioteca do usuário e nas tags dos jogos favoritados na wishlist.
        """
        all_games = db.query(Game).all()
        catalog_games = [g.to_dict() for g in all_games]

        user_library_games = []
        user_favorite_tags = []

        if user_id:
            # 1. Consulta biblioteca do usuário no library-service
            owns_client = False
            if client is None:
                client = httpx.AsyncClient(timeout=4.0)
                owns_client = True
            try:
                lib_resp = await client.get(f"{LIBRARY_SERVICE_URL.rstrip('/')}/library/users/{user_id}/games")
                if lib_resp.status_code == 200:
                    user_library_games = lib_resp.json()
            except Exception:
                pass
            finally:
                if owns_client:
                    await client.aclose()

            # 2. Consulta tags dos jogos na Wishlist em store.db
            wishlist_items = StoreService.get_user_wishlist(db, user_id=user_id)
            wishlist_game_ids = [item.game_id for item in wishlist_items]
            if wishlist_game_ids:
                wishlist_games = db.query(Game).filter(Game.id.in_(wishlist_game_ids)).all()
                for wg in wishlist_games:
                    tags = wg.tags if isinstance(wg.tags, list) else json.loads(wg.tags or "[]")
                    user_favorite_tags.extend(tags)

        ai_client = AIClient()
        recommendations = await ai_client.curate_recommendations(
            user_library_games=user_library_games,
            catalog_games=catalog_games,
            limit=limit,
            user_favorite_tags=user_favorite_tags
        )

        from app.services.ai_curator import generate_contextual_justification
        for rec in recommendations:
            if not rec.get("recommendation_reason") or "Destaque da comunidade" in rec.get("recommendation_reason", ""):
                # Se o usuário possui biblioteca, enriquece com a justificativa contextual avançada
                if user_library_games:
                    rec["recommendation_reason"] = generate_contextual_justification(
                        played_games=user_library_games,
                        target_game=rec
                    )

        return recommendations

