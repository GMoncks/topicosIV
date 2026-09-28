import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  marketApi,
  MarketItemType,
  MarketListingApiResponse,
  MarketListingStatus,
} from '../api/client';

type MarketView = 'catalog' | 'my-listings';

const ITEM_TYPE_LABELS: Record<MarketItemType, string> = {
  card: 'Carta',
  emoticon: 'Emoticon',
  background: 'Plano de fundo',
  avatar_frame: 'Moldura de avatar',
  badge: 'Insígnia',
};

const STATUS_LABELS: Record<MarketListingStatus, string> = {
  ativo: 'Ativo',
  vendido: 'Vendido',
  cancelado: 'Cancelado',
};

const PAGE_SIZE = 12;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export const Market: React.FC = () => {
  const { isAuthenticated, openAuthModal, user, updateUserBalance } = useAuth();

  const [view, setView] = useState<MarketView>('catalog');

  // Catálogo público
  const [catalog, setCatalog] = useState<MarketListingApiResponse[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogSkip, setCatalogSkip] = useState(0);
  const [typeFilter, setTypeFilter] = useState<MarketItemType | ''>('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Meus Anúncios
  const [myListings, setMyListings] = useState<MarketListingApiResponse[]>([]);
  const [myListingsTotal, setMyListingsTotal] = useState(0);
  const [myListingsSkip, setMyListingsSkip] = useState(0);
  const [statusFilter, setStatusFilter] = useState<MarketListingStatus | ''>('');
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [myListingsError, setMyListingsError] = useState<string | null>(null);

  // Compra
  const [buyTarget, setBuyTarget] = useState<MarketListingApiResponse | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccessMessage, setBuySuccessMessage] = useState<string | null>(null);

  // Cancelamento
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadCatalog = useCallback(() => {
    let isMounted = true;
    setCatalogLoading(true);
    setCatalogError(null);
    marketApi
      .listListings({ item_type: typeFilter || undefined, skip: catalogSkip, limit: PAGE_SIZE })
      .then((data) => {
        if (isMounted) {
          setCatalog(data.items);
          setCatalogTotal(data.total);
        }
      })
      .catch((err) => {
        if (isMounted) setCatalogError(err.message || 'Não foi possível carregar o mercado.');
      })
      .finally(() => {
        if (isMounted) setCatalogLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [typeFilter, catalogSkip]);

  const loadMyListings = useCallback(() => {
    if (!isAuthenticated) return undefined;
    let isMounted = true;
    setMyListingsLoading(true);
    setMyListingsError(null);
    marketApi
      .getMyListings({ status: statusFilter || undefined, skip: myListingsSkip, limit: PAGE_SIZE })
      .then((data) => {
        if (isMounted) {
          setMyListings(data.items);
          setMyListingsTotal(data.total);
        }
      })
      .catch((err) => {
        if (isMounted) setMyListingsError(err.message || 'Não foi possível carregar seus anúncios.');
      })
      .finally(() => {
        if (isMounted) setMyListingsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, statusFilter, myListingsSkip]);

  useEffect(() => {
    if (view === 'catalog') return loadCatalog();
  }, [view, loadCatalog]);

  useEffect(() => {
    if (view === 'my-listings') return loadMyListings();
  }, [view, loadMyListings]);

  const handleSelectView = (nextView: MarketView) => {
    if (nextView === 'my-listings' && !isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setView(nextView);
  };

  const handleOpenBuyConfirm = (listing: MarketListingApiResponse) => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setBuyError(null);
    setBuyTarget(listing);
  };

  const handleConfirmBuy = async () => {
    if (!buyTarget || buying) return;
    try {
      setBuying(true);
      setBuyError(null);
      const result = await marketApi.buyListing(buyTarget.id);
      if (result.new_wallet_balance !== null && result.new_wallet_balance !== undefined) {
        updateUserBalance(result.new_wallet_balance);
      }
      setBuySuccessMessage(`Compra realizada: ${buyTarget.item_name || ITEM_TYPE_LABELS[buyTarget.item_type]}!`);
      setBuyTarget(null);
      loadCatalog();
    } catch (err: any) {
      setBuyError(err.message || 'Falha ao processar a compra. Tente novamente.');
    } finally {
      setBuying(false);
    }
  };

  const handleCancelListing = async (listingId: number) => {
    if (cancellingId) return;
    try {
      setCancellingId(listingId);
      await marketApi.cancelListing(listingId);
      loadMyListings();
    } catch (err: any) {
      setMyListingsError(err.message || 'Falha ao cancelar o anúncio.');
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (!buySuccessMessage) return;
    const timeout = setTimeout(() => setBuySuccessMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [buySuccessMessage]);

  const catalogHasNextPage = catalogSkip + PAGE_SIZE < catalogTotal;
  const myListingsHasNextPage = myListingsSkip + PAGE_SIZE < myListingsTotal;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Mercado da Comunidade</h1>
          <p className="text-gray-400 text-sm mt-1">Compre e venda itens cosméticos com outros jogadores</p>
        </div>
        {buySuccessMessage && (
          <div className="bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2">
            <i className="fa-solid fa-circle-check"></i>
            {buySuccessMessage}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6" role="tablist" aria-label="Navegação do Mercado">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'catalog'}
          onClick={() => handleSelectView('catalog')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
            view === 'catalog'
              ? 'bg-brand-purple text-white'
              : 'bg-brand-surface border border-gray-700 text-gray-300 hover:border-gray-500'
          }`}
        >
          Catálogo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'my-listings'}
          onClick={() => handleSelectView('my-listings')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
            view === 'my-listings'
              ? 'bg-brand-purple text-white'
              : 'bg-brand-surface border border-gray-700 text-gray-300 hover:border-gray-500'
          }`}
        >
          Meus Anúncios
        </button>
      </div>

      {view === 'catalog' ? (
        <div>
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setTypeFilter('');
                setCatalogSkip(0);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                typeFilter === ''
                  ? 'bg-brand-purple/20 border-brand-purple text-brand-purple'
                  : 'bg-brand-surface border-gray-600 text-gray-300 hover:border-gray-400'
              }`}
            >
              Todos
            </button>
            {(Object.keys(ITEM_TYPE_LABELS) as MarketItemType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTypeFilter(type);
                  setCatalogSkip(0);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                  typeFilter === type
                    ? 'bg-brand-purple/20 border-brand-purple text-brand-purple'
                    : 'bg-brand-surface border-gray-600 text-gray-300 hover:border-gray-400'
                }`}
              >
                {ITEM_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {catalogLoading ? (
            <div className="flex items-center gap-2 text-gray-400 py-10">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Carregando anúncios...</span>
            </div>
          ) : catalogError ? (
            <p className="text-red-300 text-sm py-6">{catalogError}</p>
          ) : catalog.length === 0 ? (
            <p className="text-gray-400 text-sm py-6">Nenhum anúncio disponível no momento.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog.map((listing) => {
                const isOwnListing = user?.id === listing.seller_id;
                return (
                  <div
                    key={listing.id}
                    className="bg-brand-surface border border-gray-700 rounded-xl p-4 flex flex-col gap-3"
                  >
                    <div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                        {ITEM_TYPE_LABELS[listing.item_type]}
                      </span>
                      <h3 className="text-white font-bold mt-2 truncate">
                        {listing.item_name || `${ITEM_TYPE_LABELS[listing.item_type]} #${listing.item_id}`}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-emerald-400 font-bold">{formatCurrency(listing.price)}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenBuyConfirm(listing)}
                        disabled={isOwnListing}
                        title={isOwnListing ? 'Você não pode comprar seu próprio anúncio' : 'Comprar'}
                        className="bg-brand-green hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        {isOwnListing ? 'Seu anúncio' : 'Comprar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {catalogTotal > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-6 text-sm text-gray-400">
              <button
                type="button"
                onClick={() => setCatalogSkip((prev) => Math.max(0, prev - PAGE_SIZE))}
                disabled={catalogSkip === 0}
                className="px-3 py-1.5 rounded-lg border border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-500 transition cursor-pointer"
              >
                Anterior
              </button>
              <span>
                {Math.min(catalogSkip + 1, catalogTotal)}–{Math.min(catalogSkip + PAGE_SIZE, catalogTotal)} de{' '}
                {catalogTotal}
              </span>
              <button
                type="button"
                onClick={() => setCatalogSkip((prev) => prev + PAGE_SIZE)}
                disabled={!catalogHasNextPage}
                className="px-3 py-1.5 rounded-lg border border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-500 transition cursor-pointer"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="bg-brand-surface/60 border border-gray-700 rounded-xl p-4 mb-6 text-sm text-gray-400 flex items-start gap-3">
            <i className="fa-solid fa-circle-info text-brand-purple mt-0.5"></i>
            <span>
              Anunciar um novo item para venda ainda depende do Inventário de Cosméticos, que chega em um
              próximo módulo da plataforma. Por enquanto, aqui você acompanha e gerencia os anúncios já
              existentes.
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {(['', 'ativo', 'vendido', 'cancelado'] as const).map((s) => (
              <button
                key={s || 'all'}
                type="button"
                onClick={() => {
                  setStatusFilter(s);
                  setMyListingsSkip(0);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                  statusFilter === s
                    ? 'bg-brand-purple/20 border-brand-purple text-brand-purple'
                    : 'bg-brand-surface border-gray-600 text-gray-300 hover:border-gray-400'
                }`}
              >
                {s === '' ? 'Todos' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {myListingsLoading ? (
            <div className="flex items-center gap-2 text-gray-400 py-10">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Carregando seus anúncios...</span>
            </div>
          ) : myListingsError ? (
            <p className="text-red-300 text-sm py-6">{myListingsError}</p>
          ) : myListings.length === 0 ? (
            <p className="text-gray-400 text-sm py-6">Você ainda não tem anúncios.</p>
          ) : (
            <ul className="space-y-3">
              {myListings.map((listing) => (
                <li
                  key={listing.id}
                  className="bg-brand-surface border border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                        {ITEM_TYPE_LABELS[listing.item_type]}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          listing.status === 'ativo'
                            ? 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40'
                            : listing.status === 'vendido'
                            ? 'bg-blue-600/20 text-blue-300 border-blue-600/40'
                            : 'bg-gray-600/20 text-gray-400 border-gray-600/40'
                        }`}
                      >
                        {STATUS_LABELS[listing.status]}
                      </span>
                    </div>
                    <p className="text-sm text-white truncate">
                      {listing.item_name || `${ITEM_TYPE_LABELS[listing.item_type]} #${listing.item_id}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">{formatCurrency(listing.price)}</span>
                    {listing.status === 'ativo' && (
                      <button
                        type="button"
                        onClick={() => handleCancelListing(listing.id)}
                        disabled={cancellingId === listing.id}
                        className="text-xs font-bold text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed border border-red-500/40 hover:border-red-400 px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        {cancellingId === listing.id ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {myListingsTotal > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-6 text-sm text-gray-400">
              <button
                type="button"
                onClick={() => setMyListingsSkip((prev) => Math.max(0, prev - PAGE_SIZE))}
                disabled={myListingsSkip === 0}
                className="px-3 py-1.5 rounded-lg border border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-500 transition cursor-pointer"
              >
                Anterior
              </button>
              <span>
                {Math.min(myListingsSkip + 1, myListingsTotal)}–{Math.min(myListingsSkip + PAGE_SIZE, myListingsTotal)}{' '}
                de {myListingsTotal}
              </span>
              <button
                type="button"
                onClick={() => setMyListingsSkip((prev) => prev + PAGE_SIZE)}
                disabled={!myListingsHasNextPage}
                className="px-3 py-1.5 rounded-lg border border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-500 transition cursor-pointer"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}

      {buyTarget && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            if (!buying) setBuyTarget(null);
          }}
        >
          <div
            className="relative w-full max-w-md bg-brand-card border border-gray-700/80 rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-display font-bold text-white mb-4">Confirmar Compra</h2>
            <div className="bg-brand-surface border border-gray-700 rounded-xl p-4 mb-4">
              <p className="text-white font-bold">
                {buyTarget.item_name || `${ITEM_TYPE_LABELS[buyTarget.item_type]} #${buyTarget.item_id}`}
              </p>
              <p className="text-emerald-400 font-bold text-lg mt-1">{formatCurrency(buyTarget.price)}</p>
            </div>
            {buyError && (
              <div className="mb-4 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {buyError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBuyTarget(null)}
                disabled={buying}
                className="flex-1 bg-brand-surface border border-gray-600 hover:border-gray-400 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBuy}
                disabled={buying}
                className="flex-1 bg-brand-green hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                {buying ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Processando...
                  </>
                ) : (
                  'Confirmar Compra'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
