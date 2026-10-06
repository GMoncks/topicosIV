import React from 'react';

export interface AffectedGame {
  id: number;
  title: string;
  banner_url?: string;
  original_price?: number;
  discount_price?: number;
  discount_percentage?: number;
  reason?: string;
}

export interface SystemNoticeData {
  title: string;
  category?: string; // 'Catálogo' | 'Atualização' | 'Segurança' | 'Comunidade'
  dateLabel?: string;
  importantNote?: string;
  content: string;
  affectedGames?: AffectedGame[];
  actionButton?: {
    label: string;
    route?: string;
    gameId?: number;
  };
}

interface SystemNoticeModalProps {
  isOpen: boolean;
  notice: SystemNoticeData | null;
  onClose: () => void;
  onNavigate?: (route: string) => void;
  onOpenGame?: (gameId: number, relevantInfo?: string) => void;
}

export const SystemNoticeModal: React.FC<SystemNoticeModalProps> = ({
  isOpen,
  notice,
  onClose,
  onNavigate,
  onOpenGame,
}) => {
  if (!isOpen || !notice) return null;

  const isCatalog = notice.category?.toLowerCase().includes('catálogo') || notice.title.toLowerCase().includes('catálogo');

  const handleGameAction = (game: AffectedGame) => {
    onClose();
    if (onOpenGame) {
      onOpenGame(
        game.id,
        `Aproveite o desconto de despedida de ${game.discount_percentage || 50}% OFF antes que o jogo deixe o catálogo!`
      );
    } else if (onNavigate) {
      onNavigate('store');
    }
  };

  const handleMainAction = () => {
    onClose();
    if (notice.actionButton?.gameId && onOpenGame) {
      onOpenGame(notice.actionButton.gameId);
    } else if (notice.actionButton?.route && onNavigate) {
      onNavigate(notice.actionButton.route);
    } else if (onNavigate) {
      onNavigate(isCatalog ? 'store' : 'news');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-notice-title"
      data-testid="system-notice-modal"
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0d1322]/95 border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="p-5 px-6 bg-gradient-to-r from-amber-950/30 via-brand-surface/60 to-purple-950/30 border-b border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-[11px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                isCatalog
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                  : 'bg-brand-purple/20 text-brand-purpleLight border-brand-purple/40'
              }`}
            >
              <i className={`fa-solid ${isCatalog ? 'fa-bullhorn' : 'fa-circle-info'} text-xs`}></i>
              {notice.category || 'Comunicado Oficial MIST'}
            </span>

            {notice.dateLabel && (
              <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                • {notice.dateLabel}
              </span>
            )}
          </div>

          <button
            type="button"
            data-testid="close-notice-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-800/60 hover:bg-gray-700/80 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Fechar comunicado"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Corpo do Comunicado */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Título Principal */}
          <div>
            <h2
              id="system-notice-title"
              className="text-xl sm:text-2xl font-black text-white font-display tracking-tight leading-snug"
            >
              {notice.title}
            </h2>
            {notice.dateLabel && (
              <p className="text-xs text-gray-400 sm:hidden mt-1">{notice.dateLabel}</p>
            )}
          </div>

          {/* Aviso Importante / Destaque */}
          {notice.importantNote && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-amber-200 text-xs sm:text-sm leading-relaxed">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <i className="fa-solid fa-triangle-exclamation text-sm"></i>
              </div>
              <div>
                <span className="font-bold block text-amber-300 mb-0.5">Observação Importante:</span>
                {notice.importantNote}
              </div>
            </div>
          )}

          {/* Conteúdo Explicativo */}
          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line space-y-3">
            {notice.content}
          </div>

          {/* Lista de Jogos Afetados (Ex: Jogos deixando o catálogo) */}
          {notice.affectedGames && notice.affectedGames.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800/80">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-amber-400"></i>
                Títulos com Desconto de Despedida
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {notice.affectedGames.map((game) => (
                  <div
                    key={game.id}
                    data-testid={`affected-game-${game.id}`}
                    className="p-3 rounded-xl bg-brand-surface/70 border border-gray-700/60 hover:border-amber-500/50 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {game.banner_url ? (
                        <div className="relative h-24 w-full rounded-lg overflow-hidden mb-2 bg-gray-900">
                          <img
                            src={game.banner_url}
                            alt={game.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {game.discount_percentage && (
                            <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-gray-950 font-black text-[10px] px-1.5 py-0.5 rounded shadow">
                              -{game.discount_percentage}% OFF
                            </span>
                          )}
                        </div>
                      ) : null}

                      <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                        {game.title}
                      </h4>
                      {game.reason && (
                        <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                          {game.reason}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-800/60 flex items-center justify-between">
                      <div>
                        {game.original_price && game.discount_price && (
                          <span className="text-[10px] text-gray-500 line-through block">
                            R$ {game.original_price.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                        <span className="text-xs font-black text-emerald-400">
                          R$ {(game.discount_price ?? game.original_price ?? 0).toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGameAction(game)}
                        className="text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-500 px-2.5 py-1 rounded-lg transition shadow-sm cursor-pointer"
                        title="Ver detalhes e comprar"
                      >
                        Ver na Loja
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 px-6 bg-brand-surface/40 border-t border-gray-800/80 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800/60 transition cursor-pointer"
          >
            Entendido
          </button>

          <button
            type="button"
            data-testid="notice-action-button"
            onClick={handleMainAction}
            className="px-5 py-2 rounded-xl text-xs font-bold text-gray-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
          >
            <span>{notice.actionButton?.label || (isCatalog ? 'Explorar Ofertas na Loja' : 'Acessar Central de Notícias')}</span>
            <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        </div>
      </div>
    </div>
  );
};
