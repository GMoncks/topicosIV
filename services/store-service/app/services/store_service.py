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
from app.config import AUTH_SERVICE_URL, LIBRARY_SERVICE_URL


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

        session_data = {
            "session_token": user_token or "offline_dev_token",
            "user_id": user_id,
            "game_id": game.id,
            "game_title": game.title,
            "library_api_url": os.getenv("LIBRARY_API_URL", "http://localhost:8003"),
        }

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("game.py", game_code)
            zf.writestr("mist_sdk.py", sdk_code)
            zf.writestr("session.json", json.dumps(session_data, indent=2, ensure_ascii=False))

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

            return {
                "status": "success",
                "order_id": order_id,
                "items": items_response,
                "total_paid": total_amount,
                "new_wallet_balance": new_wallet_balance,
                "purchased_at": now
            }
        finally:
            if owns_client:
                await client.aclose()
