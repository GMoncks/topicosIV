import React, { useCallback, useEffect, useState } from 'react';
import { reviewApi, ReviewApiResponse } from '../api/client';

interface ReviewsListProps {
  gameId: number;
  currentUserId?: number;
  isAuthenticated: boolean;
  onReviewsLoaded?: (reviews: ReviewApiResponse[]) => void;
}

type SortMode = 'recent' | 'helpful';

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes} min jogados`;
  const hours = minutes / 60;
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}h jogadas`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

export const ReviewsList: React.FC<ReviewsListProps> = ({
  gameId,
  currentUserId,
  isAuthenticated,
  onReviewsLoaded,
}) => {
  const [sort, setSort] = useState<SortMode>('recent');
  const [reviews, setReviews] = useState<ReviewApiResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votingIds, setVotingIds] = useState<Set<number>>(new Set());

  const loadReviews = useCallback(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    reviewApi.listReviews(gameId, { sort })
      .then((data) => {
        if (isMounted) {
          setReviews(data);
          onReviewsLoaded?.(data);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Não foi possível carregar as avaliações.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [gameId, sort, onReviewsLoaded]);

  useEffect(() => {
    return loadReviews();
  }, [loadReviews]);

  // Recarrega a lista quando uma avaliação deste jogo é publicada/atualizada em outro componente
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.gameId === gameId) {
        loadReviews();
      }
    };
    window.addEventListener('mist:review-submitted', handler);
    return () => window.removeEventListener('mist:review-submitted', handler);
  }, [gameId, loadReviews]);

  const handleHelpful = async (reviewId: number) => {
    if (!isAuthenticated || votingIds.has(reviewId)) return;
    setVotingIds((prev) => new Set(prev).add(reviewId));
    try {
      const result = await reviewApi.markHelpful(reviewId);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, helpful_count: result.helpful_count } : r))
      );
    } catch (err) {
      console.error('Erro ao marcar avaliação como útil:', err);
    } finally {
      setVotingIds((prev) => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4" role="tablist" aria-label="Ordenar avaliações">
        <button
          type="button"
          role="tab"
          aria-selected={sort === 'recent'}
          onClick={() => setSort('recent')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition cursor-pointer ${
            sort === 'recent'
              ? 'bg-brand-purple/20 border-brand-purple text-brand-purple'
              : 'bg-brand-surface border-gray-600 text-gray-300 hover:border-gray-400'
          }`}
        >
          Mais recentes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sort === 'helpful'}
          onClick={() => setSort('helpful')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition cursor-pointer ${
            sort === 'helpful'
              ? 'bg-brand-purple/20 border-brand-purple text-brand-purple'
              : 'bg-brand-surface border-gray-600 text-gray-300 hover:border-gray-400'
          }`}
        >
          Mais úteis
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-6">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Carregando avaliações...</span>
        </div>
      ) : error ? (
        <p className="text-red-300 text-sm py-4">{error}</p>
      ) : reviews.length === 0 ? (
        <p className="text-gray-400 text-sm py-4">Ainda não há avaliações para este jogo. Seja o primeiro a avaliar!</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => {
            const isOwnReview = currentUserId !== undefined && review.user_id === currentUserId;
            return (
              <li key={review.id} className="bg-brand-surface border border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                        review.is_recommended
                          ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/40'
                          : 'bg-red-600/20 text-red-300 border border-red-600/40'
                      }`}
                    >
                      <i className={`fa-solid ${review.is_recommended ? 'fa-thumbs-up' : 'fa-thumbs-down'}`}></i>
                      {review.is_recommended ? 'Recomendado' : 'Não recomendado'}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <i className="fa-solid fa-clock"></i>
                      {formatPlaytime(review.playtime_at_review)}
                    </span>
                    {isOwnReview && (
                      <span className="text-xs text-brand-purple font-medium">Sua avaliação</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
                </div>

                <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed mb-3">{review.text}</p>

                <button
                  type="button"
                  onClick={() => handleHelpful(review.id)}
                  disabled={!isAuthenticated || isOwnReview || votingIds.has(review.id)}
                  className="text-xs font-medium text-gray-400 hover:text-brand-purple disabled:hover:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer transition"
                >
                  <i className="fa-regular fa-thumbs-up"></i>
                  Útil {review.helpful_count > 0 && `(${review.helpful_count})`}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
