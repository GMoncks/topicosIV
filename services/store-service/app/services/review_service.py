from typing import List, Optional, Tuple
import httpx
from fastapi import HTTPException, status
from sqlalchemy import case, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import LIBRARY_SERVICE_URL
from app.models.review import Review, ReviewVote
from app.schemas.review import ReviewCreate, ReviewSummary

# (aprovação mínima em %, rótulo), avaliados em ordem decrescente.
APPROVAL_LABELS = [
    (95, "Extremamente Positivo"),
    (80, "Muito Positivo"),
    (70, "Majoritariamente Positivo"),
    (40, "Misto"),
    (20, "Majoritariamente Negativo"),
    (0, "Muito Negativo"),
]


class ReviewService:
    @staticmethod
    def approval_label(approval_pct: float) -> str:
        for minimum, label in APPROVAL_LABELS:
            if approval_pct >= minimum:
                return label
        return APPROVAL_LABELS[-1][1]

    @staticmethod
    def get_summary(db: Session, game_id: int) -> ReviewSummary:
        """Calcula a aprovação percentual do jogo a partir dos reviews reais."""
        total, positive = db.query(
            func.count(Review.id),
            func.coalesce(func.sum(case((Review.is_recommended.is_(True), 1), else_=0)), 0),
        ).filter(Review.game_id == game_id).one()
        if not total:
            return ReviewSummary()
        approval_pct = int(positive * 100.0 / total + 0.5)  # arredonda .5 para cima
        return ReviewSummary(
            reviews_count=total,
            positive_count=int(positive),
            approval_pct=approval_pct,
            approval_label=f"{ReviewService.approval_label(approval_pct)} - {approval_pct}%",
        )

    @staticmethod
    async def fetch_playtime_minutes(
        user_id: int,
        game_id: int,
        library_service_url: Optional[str] = None,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> int:
        """
        Valida a posse do jogo e retorna os minutos jogados, via library-service.
        Falha fechado: 403 se o usuário não possui o jogo e 503 se o library-service não confirmar.
        """
        lib_url = (library_service_url or LIBRARY_SERVICE_URL).rstrip("/")
        client = http_client or httpx.AsyncClient(timeout=10.0)
        try:
            resp = await client.get(f"{lib_url}/library/users/{user_id}/has-game/{game_id}")
        except httpx.HTTPError:
            resp = None
        finally:
            if http_client is None:
                await client.aclose()

        if resp is None or resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Não foi possível validar a posse do jogo na biblioteca. Tente novamente em instantes.",
            )
        data = resp.json()
        if not data.get("owned"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas quem possui o jogo na biblioteca pode avaliá-lo.",
            )
        return max(int(data.get("playtime_minutes") or 0), 0)

    @staticmethod
    def upsert_review(
        db: Session, user_id: int, game_id: int, payload: ReviewCreate, playtime_minutes: int
    ) -> Tuple[Review, bool]:
        """Cria o review ou atualiza o existente do par (usuário, jogo). Retorna (review, created)."""
        review = db.query(Review).filter_by(user_id=user_id, game_id=game_id).first()
        created = review is None
        if created:
            review = Review(user_id=user_id, game_id=game_id)
            db.add(review)
        review.is_recommended = payload.is_recommended
        review.text = payload.text
        review.playtime_at_review = playtime_minutes
        try:
            db.commit()
        except IntegrityError:
            # Corrida entre dois POSTs simultâneos do mesmo usuário: o outro venceu, então atualizamos.
            db.rollback()
            review = db.query(Review).filter_by(user_id=user_id, game_id=game_id).one()
            review.is_recommended = payload.is_recommended
            review.text = payload.text
            review.playtime_at_review = playtime_minutes
            db.commit()
            created = False
        db.refresh(review)
        return review, created

    @staticmethod
    def helpful_counts(db: Session, review_ids: List[int]) -> dict:
        if not review_ids:
            return {}
        rows = (
            db.query(ReviewVote.review_id, func.count(ReviewVote.id))
            .filter(ReviewVote.review_id.in_(review_ids))
            .group_by(ReviewVote.review_id)
            .all()
        )
        return {review_id: count for review_id, count in rows}

    @staticmethod
    def list_reviews(
        db: Session,
        game_id: int,
        sort: str = "recent",
        is_recommended: Optional[bool] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[Tuple[Review, int]]:
        """Lista reviews do jogo como pares (review, helpful_count), por 'recent' ou 'helpful'."""
        query = db.query(Review).filter(Review.game_id == game_id)
        if is_recommended is not None:
            query = query.filter(Review.is_recommended == is_recommended)

        if sort == "helpful":
            votes = func.count(ReviewVote.id)
            query = (
                query.outerjoin(ReviewVote, ReviewVote.review_id == Review.id)
                .group_by(Review.id)
                .order_by(votes.desc(), Review.created_at.desc(), Review.id.desc())
            )
        else:
            query = query.order_by(Review.created_at.desc(), Review.id.desc())

        reviews = query.offset(skip).limit(limit).all()
        counts = ReviewService.helpful_counts(db, [r.id for r in reviews])
        return [(review, counts.get(review.id, 0)) for review in reviews]

    @staticmethod
    def add_helpful_vote(db: Session, review_id: int, user_id: int) -> Tuple[int, bool]:
        """Registra o voto 'útil' (idempotente). Retorna (helpful_count, created)."""
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avaliação não encontrada")
        if review.user_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode votar na sua própria avaliação.",
            )

        created = True
        db.add(ReviewVote(review_id=review_id, user_id=user_id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            created = False
        count = db.query(func.count(ReviewVote.id)).filter(ReviewVote.review_id == review_id).scalar()
        return count, created
