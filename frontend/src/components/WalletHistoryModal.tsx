import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { walletApi, WalletTransactionApiResponse, WalletTransactionType } from '../api/client';

interface WalletHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  topOffset?: number;
}

const PAGE_SIZE = 10;

const TYPE_LABELS: Record<WalletTransactionType, string> = {
  compra: 'Compra',
  venda: 'Venda',
  recarga: 'Recarga',
  resgate: 'Resgate',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export const WalletHistoryModal: React.FC<WalletHistoryModalProps> = ({
  isOpen,
  onClose,
  topOffset = 16,
}) => {
  const [items, setItems] = useState<WalletTransactionApiResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [typeFilter, setTypeFilter] = useState<WalletTransactionType | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    walletApi
      .getHistory({ type: typeFilter || undefined, skip, limit: PAGE_SIZE })
      .then((data) => {
        if (isMounted) {
          setItems(data.items);
          setTotal(data.total);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Não foi possível carregar o extrato da carteira.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [typeFilter, skip]);

  useEffect(() => {
    if (!isOpen) return;
    return loadHistory();
  }, [isOpen, loadHistory]);

  // Reseta paginação e filtro sempre que a modal é reaberta
  useEffect(() => {
    if (isOpen) {
      setSkip(0);
      setTypeFilter('');
    }
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const hasPrevPage = skip > 0;
  const hasNextPage = skip + PAGE_SIZE < total;
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-history-title"
      data-testid="wallet-history-modal"
      className="fixed inset-0 z-[130] flex items-start justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
      style={{ paddingTop: `${topOffset}px` }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[calc(100vh-32px)] bg-brand-card border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 id="wallet-history-title" className="text-xl font-display font-bold text-white">Extrato da Carteira</h2>
            <p className="text-sm text-gray-400">Histórico de compras, vendas, recargas e resgates</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark pointer-events-none"></i>
          </button>
        </div>

        <div className="px-6 pt-4 flex items-center gap-2" role="tablist" aria-label="Filtrar por tipo">
          {(['', 'compra', 'venda', 'recarga', 'resgate'] as const).map((type) => (
            <button
              key={type || 'all'}
              type="button"
              role="tab"
              aria-selected={typeFilter === type}
              onClick={() => {
                setTypeFilter(type);
                setSkip(0);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                typeFilter === type
                  ? 'bg-brand-purple/20 border-brand-purple text-brand-purple'
                  : 'bg-brand-surface border-gray-600 text-gray-300 hover:border-gray-400'
              }`}
            >
              {type === '' ? 'Todos' : TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 py-6">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Carregando extrato...</span>
            </div>
          ) : error ? (
            <p className="text-red-300 text-sm py-4">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">Nenhuma transação encontrada.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((tx) => (
                <li
                  key={tx.id}
                  className="bg-brand-surface border border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                        {TYPE_LABELS[tx.type]}
                      </span>
                      <span className="text-xs text-gray-500">{formatDateTime(tx.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-200 truncate">{tx.description}</p>
                  </div>
                  <span
                    className={`text-sm font-bold whitespace-nowrap ${
                      tx.direction === 'credit' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {tx.direction === 'credit' ? '+' : '-'} {formatCurrency(tx.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!loading && !error && total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 text-sm text-gray-400">
            <button
              type="button"
              onClick={() => setSkip((prev) => Math.max(0, prev - PAGE_SIZE))}
              disabled={!hasPrevPage}
              className="px-3 py-1.5 rounded-lg border border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-500 transition cursor-pointer"
            >
              Anterior
            </button>
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setSkip((prev) => prev + PAGE_SIZE)}
              disabled={!hasNextPage}
              className="px-3 py-1.5 rounded-lg border border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-500 transition cursor-pointer"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
