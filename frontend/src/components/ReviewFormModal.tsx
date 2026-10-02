import React, { useEffect, useState } from 'react';
import { reviewApi, ReviewApiResponse } from '../api/client';

interface ReviewFormModalProps {
  gameId: number;
  gameTitle: string;
  isOpen: boolean;
  existingReview?: ReviewApiResponse | null;
  onClose: () => void;
  onSubmitted: (review: ReviewApiResponse) => void;
}

const MAX_TEXT_LENGTH = 2000;

export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({
  gameId,
  gameTitle,
  isOpen,
  existingReview,
  onClose,
  onSubmitted,
}) => {
  const [isRecommended, setIsRecommended] = useState<boolean | null>(null);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reabastece o formulário com a avaliação existente sempre que a modal é reaberta
  useEffect(() => {
    if (isOpen) {
      setIsRecommended(existingReview ? existingReview.is_recommended : null);
      setText(existingReview?.text ?? '');
      setError(null);
    }
  }, [isOpen, existingReview]);

  if (!isOpen) return null;

  const trimmedText = text.trim();
  const isValid = isRecommended !== null && trimmedText.length > 0 && trimmedText.length <= MAX_TEXT_LENGTH;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const review = await reviewApi.submitReview(gameId, {
        is_recommended: isRecommended as boolean,
        text: trimmedText,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mist:review-submitted', { detail: { gameId } }));
      }
      onSubmitted(review);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar avaliação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        // Impede que o clique escape para o fundo da modal de detalhes do jogo por trás desta.
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg bg-brand-card border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-9 h-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition cursor-pointer"
        >
          <i className="fa-solid fa-xmark pointer-events-none"></i>
        </button>

        <h2 className="text-xl font-display font-bold text-white mb-1">
          {existingReview ? 'Editar avaliação' : 'Escrever avaliação'}
        </h2>
        <p className="text-sm text-gray-400 mb-6">{gameTitle}</p>

        <div className="mb-6">
          <span className="block text-sm font-bold text-gray-300 mb-3">Você recomenda este jogo?</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsRecommended(true)}
              aria-pressed={isRecommended === true}
              className={`flex-1 py-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                isRecommended === true
                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                  : 'bg-brand-surface border-gray-600 text-gray-300 hover:border-emerald-500/60'
              }`}
            >
              <i className="fa-solid fa-thumbs-up"></i>
              Sim
            </button>
            <button
              type="button"
              onClick={() => setIsRecommended(false)}
              aria-pressed={isRecommended === false}
              className={`flex-1 py-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                isRecommended === false
                  ? 'bg-red-600/30 border-red-500 text-red-300'
                  : 'bg-brand-surface border-gray-600 text-gray-300 hover:border-red-500/60'
              }`}
            >
              <i className="fa-solid fa-thumbs-down"></i>
              Não
            </button>
          </div>
        </div>

        <div className="mb-2">
          <label htmlFor="review-text" className="block text-sm font-bold text-gray-300 mb-2">
            Sua avaliação
          </label>
          <textarea
            id="review-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_TEXT_LENGTH}
            rows={5}
            placeholder="Conte o que achou do jogo..."
            className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm text-black placeholder-gray-500 focus:outline-none focus:border-brand-purple resize-none shadow-sm"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500 flex items-center gap-1.5">
              <i className="fa-solid fa-clock"></i>
              {existingReview
                ? `${existingReview.playtime_at_review} min jogados na última avaliação`
                : 'Suas horas jogadas atuais serão anexadas automaticamente'}
            </span>
            <span className={`text-xs ${trimmedText.length > MAX_TEXT_LENGTH ? 'text-red-400' : 'text-gray-500'}`}>
              {trimmedText.length}/{MAX_TEXT_LENGTH}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="w-full mt-2 bg-brand-purple hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              Enviando...
            </>
          ) : (
            <span>{existingReview ? 'Atualizar avaliação' : 'Publicar avaliação'}</span>
          )}
        </button>
      </div>
    </div>
  );
};
