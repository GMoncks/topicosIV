import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { systemReviewsApi } from '../api/client';
import { SystemReviewItem } from '../types';

export const Reviews: React.FC = () => {
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [reviews, setReviews] = useState<SystemReviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [content, setContent] = useState<string>('');
  const [isRecommended, setIsRecommended] = useState<boolean>(true);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await systemReviewsApi.getReviews({ limit: 50 });
      setReviews(data);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar as avaliações no momento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      setError('Por favor, escreva sua avaliação antes de enviar.');
      return;
    }

    if (trimmed.length > 500) {
      setError('A avaliação não pode exceder o limite de 500 caracteres.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await systemReviewsApi.createReview({
        content: trimmed,
        is_recommended: isRecommended,
      });

      setContent('');
      setSuccessMessage('Sua avaliação foi publicada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchReviews();
    } catch (err: any) {
      setError(err?.message || 'Erro ao publicar avaliação.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const positiveCount = reviews.filter((r) => r.is_recommended).length;
  const approvalPercent = reviews.length > 0 ? Math.round((positiveCount / reviews.length) * 100) : 100;

  return (
    <div className="min-h-full bg-[#0a0f14] text-gray-200 p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-gray-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold mb-1">
            <i className="fa-solid fa-star"></i>
            <span>Comunidade MIST</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Reviews e Feedbacks da Plataforma
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Avaliações e comentários dos usuários sobre a experiência no ecossistema MIST.
          </p>
        </div>

        {/* Resumo de Aprovação */}
        {reviews.length > 0 && (
          <div className="bg-[#121a24] border border-gray-800 rounded-xl px-5 py-3 flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-gray-400 block">Aprovação Geral</span>
              <span className="text-lg font-bold text-emerald-400">{approvalPercent}% Positiva</span>
            </div>
            <div className="h-10 w-px bg-gray-800"></div>
            <div>
              <span className="text-xs text-gray-400 block">Total de Reviews</span>
              <span className="text-lg font-bold text-white">{reviews.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Formulário de Envio (Logado vs Deslogado) */}
      <div className="bg-[#101822] border border-gray-800 rounded-2xl p-6 shadow-xl">
        {isAuthenticated ? (
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="review-form">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800/80">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <i className="fa-solid fa-user-circle text-blue-400 text-lg"></i>
                <span>
                  Avaliando como <strong className="text-white font-bold">{user?.username}</strong>
                </span>
              </div>

              {/* Botões de Recomendação */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 mr-1">Recomendação:</span>
                <button
                  type="button"
                  onClick={() => setIsRecommended(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isRecommended
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-[#182330] text-gray-400 hover:text-white'
                  }`}
                  data-testid="recommend-yes-btn"
                >
                  <i className="fa-solid fa-thumbs-up"></i>
                  Recomendo
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecommended(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    !isRecommended
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-[#182330] text-gray-400 hover:text-white'
                  }`}
                  data-testid="recommend-no-btn"
                >
                  <i className="fa-solid fa-thumbs-down"></i>
                  Não Recomendo
                </button>
              </div>
            </div>

            {/* Caixa de Texto */}
            <div className="space-y-1.5">
              <label htmlFor="review-content" className="block text-xs font-semibold text-gray-300">
                Sua avaliação sobre o MIST (até 500 caracteres):
              </label>
              <textarea
                id="review-content"
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 500))}
                rows={4}
                maxLength={500}
                placeholder="Compartilhe sua opinião sobre o MIST, os jogos nativos, a loja ou a execução via daemon..."
                className="w-full bg-[#0a0f14] border border-gray-700/80 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition resize-none"
                data-testid="review-textarea"
              />
              <div className="flex items-center justify-between text-xs">
                <span className={content.length >= 480 ? 'text-amber-400' : 'text-gray-400'}>
                  {content.length}/500 caracteres
                </span>
                {content.length >= 500 && (
                  <span className="text-amber-400 font-medium">Limite atingido</span>
                )}
              </div>
            </div>

            {/* Mensagens de Sucesso ou Erro */}
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <i className="fa-solid fa-circle-check"></i>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Botão de Envio */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting || !content.trim() || content.length > 500}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
                data-testid="submit-review-btn"
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i>
                    <span>Publicar Avaliação</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2" data-testid="guest-review-notice">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <i className="fa-solid fa-lock text-base"></i>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Gostaria de avaliar o MIST?</h3>
                <p className="text-xs text-gray-400">
                  Faça login ou crie uma conta para registrar sua opinião com seu usuário e data/hora.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shrink-0 cursor-pointer shadow-md shadow-blue-600/20"
              data-testid="login-to-review-btn"
            >
              Iniciar Sessão
            </button>
          </div>
        )}
      </div>

      {/* Lista de Avaliações */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-comments text-blue-400 text-base"></i>
            <span>Avaliações Recentes da Comunidade</span>
          </h2>
          <span className="text-xs text-gray-400">
            {reviews.length} {reviews.length === 1 ? 'avaliação registrada' : 'avaliações registradas'}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 space-y-2">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-blue-400"></i>
            <p className="text-sm">Carregando avaliações da comunidade...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-[#101822] border border-gray-800 rounded-xl p-10 text-center text-gray-400 space-y-2">
            <i className="fa-regular fa-comment-dots text-3xl text-gray-600"></i>
            <p className="text-sm">Nenhuma avaliação foi publicada ainda.</p>
            <p className="text-xs text-gray-400">Seja o primeiro a avaliar a plataforma MIST!</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="reviews-list">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-[#101822] border border-gray-800 rounded-xl p-5 hover:border-gray-700/80 transition space-y-3"
                data-testid={`review-item-${rev.id}`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold uppercase shadow">
                      {rev.username.slice(0, 2)}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">{rev.username}</span>
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <i className="fa-regular fa-clock text-[10px]"></i>
                        {formatDate(rev.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Badge de recomendação */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      rev.is_recommended
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <i className={`fa-solid ${rev.is_recommended ? 'fa-thumbs-up' : 'fa-thumbs-down'}`}></i>
                    <span>{rev.is_recommended ? 'Recomenda o MIST' : 'Não Recomenda'}</span>
                  </div>
                </div>

                {/* Conteúdo do Review */}
                <p className="text-sm text-gray-300 leading-relaxed break-words bg-[#0b1016] p-3.5 rounded-lg border border-gray-800/60">
                  {rev.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
