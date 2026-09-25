import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { storeApi } from '../api/client';

interface CartDrawerProps {
  onNavigateToLibrary?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigateToLibrary }) => {
  const { cart, removeFromCart, clearCart, isCartOpen, closeCart, totalPrice, totalCount } = useCart();
  const { user, isAuthenticated, openAuthModal, updateUserBalance } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [purchasedCount, setPurchasedCount] = useState(0);

  if (!isCartOpen) return null;

  const walletBalance = user?.walletBalance ?? 0;
  const projectedBalance = walletBalance - totalPrice;
  const hasInsufficientFunds = walletBalance < totalPrice;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handleCheckoutCart = async () => {
    if (!isAuthenticated) {
      closeCart();
      openAuthModal('login');
      return;
    }

    if (cart.length === 0) return;

    try {
      setIsProcessing(true);
      setError(null);
      const gameIds = cart.map(item => Number(item.id));
      const res = await storeApi.checkout({ game_ids: gameIds });

      updateUserBalance(res.new_wallet_balance);
      setPurchasedCount(cart.length);
      clearCart();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mist:wishlist-updated'));
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Erro ao finalizar carrinho:', err);
      setError(err.message || 'Falha ao processar o carrinho. Verifique seu saldo ou se já possui algum dos itens.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setError(null);
    closeCart();
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-start bg-black/75 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop click dismiss */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Painel Gaveta Lateral */}
      <div 
        className="relative w-full max-w-md sm:max-w-lg bg-brand-surface border-r border-gray-800 shadow-2xl flex flex-col h-full z-10 animate-slideRight"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo do Carrinho */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-brand-bg/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/20 text-brand-purple flex items-center justify-center text-lg border border-brand-purple/30">
              <i className="fa-solid fa-cart-shopping"></i>
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-white">Carrinho de Compras</h3>
              <span className="text-xs text-gray-400">
                {totalCount} {totalCount === 1 ? 'item selecionado' : 'itens selecionados'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && !isSuccess && (
              <button
                type="button"
                onClick={clearCart}
                disabled={isProcessing}
                className="text-xs text-gray-400 hover:text-red-400 transition p-2 rounded-lg hover:bg-gray-800"
                title="Esvaziar carrinho"
              >
                Limpar
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-brand-card border border-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Fechar carrinho"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        {/* Corpo do Carrinho */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!isSuccess ? (
            cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-gray-400">
                <div className="w-20 h-20 rounded-full bg-brand-card flex items-center justify-center text-3xl text-gray-600 mb-4 border border-gray-800">
                  <i className="fa-solid fa-cart-arrow-down"></i>
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Seu carrinho está vazio</h4>
                <p className="text-xs text-gray-400 max-w-xs mb-6">
                  Explore o catálogo da loja MIST e adicione jogos ao carrinho ou compre diretamente.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="bg-brand-purple hover:bg-brand-purpleDark text-white font-bold py-2.5 px-6 rounded-xl text-sm transition shadow-md cursor-pointer"
                >
                  Explorar a Loja
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-brand-card border border-gray-800 hover:border-gray-700 rounded-xl p-3.5 flex items-center gap-3 transition group"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-12 object-cover rounded-lg border border-gray-800 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate group-hover:text-brand-purple transition">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] bg-brand-purple/20 text-brand-purple px-1.5 py-0.5 rounded font-medium">
                          {item.category}
                        </span>
                        {item.publisherOrParent && (
                          <span className="text-[11px] text-gray-400 truncate">
                            {item.publisherOrParent}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-sm text-emerald-400 block">
                        {formatCurrency(item.currentPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        disabled={isProcessing}
                        className="text-xs text-gray-500 hover:text-red-400 transition mt-1 p-1"
                        title="Remover do carrinho"
                      >
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Tela de Sucesso */
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-3xl mb-4 animate-bounce">
                <i className="fa-solid fa-check"></i>
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-2">Compra Concluída!</h3>
              <p className="text-sm text-gray-300 max-w-sm mb-6">
                Parabéns! Todos os <span className="font-bold text-white">{purchasedCount} títulos</span> foram adicionados à sua Biblioteca.
              </p>
              <div className="bg-brand-card border border-gray-800 rounded-xl p-4 w-full mb-6 text-xs text-gray-400">
                Novo saldo disponível na carteira:{' '}
                <span className="text-emerald-400 font-bold text-sm block mt-1">
                  {formatCurrency(walletBalance)}
                </span>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    if (onNavigateToLibrary) onNavigateToLibrary();
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-purple hover:bg-brand-purpleDark text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <i className="fa-solid fa-book-open"></i>
                  Ir para a Biblioteca
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 px-4 rounded-xl bg-brand-card hover:bg-gray-800 text-gray-300 hover:text-white font-medium text-sm transition border border-gray-700 cursor-pointer"
                >
                  Seguir adicionando mais jogos
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Extrato e Ações */}
        {cart.length > 0 && !isSuccess && (
          <div className="p-6 border-t border-gray-800 bg-brand-bg/80 space-y-4">
            {/* Extrato Financeiro */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal ({totalCount} itens):</span>
                <span className="font-bold text-white text-sm">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Saldo na Carteira MIST:</span>
                <span className="font-medium text-white">{formatCurrency(walletBalance)}</span>
              </div>
              <div className="border-t border-gray-800 pt-2 flex justify-between font-bold text-sm">
                <span className="text-white">Saldo restante:</span>
                <span className={projectedBalance < 0 ? 'text-red-400' : 'text-emerald-400'}>
                  {formatCurrency(projectedBalance)}
                </span>
              </div>
            </div>

            {/* Aviso de Saldo Insuficiente */}
            {hasInsufficientFunds && (
              <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 flex items-center gap-2.5 text-red-300 text-xs">
                <i className="fa-solid fa-triangle-exclamation text-red-400 shrink-0"></i>
                <span>Saldo insuficiente para o carrinho. Faltam {formatCurrency(totalPrice - walletBalance)}.</span>
              </div>
            )}

            {/* Mensagem de Erro de Requisição */}
            {error && (
              <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 text-red-300 text-xs">
                {error}
              </div>
            )}

            {/* Botões do Carrinho */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleCheckoutCart}
                disabled={isProcessing || hasInsufficientFunds}
                className="w-full py-3.5 px-4 rounded-xl bg-brand-green hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Processando Pedido...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-cart-shopping"></i>
                    Finalizar Compra ({formatCurrency(totalPrice)})
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white font-medium text-xs transition border border-gray-800 cursor-pointer"
              >
                Seguir adicionando mais jogos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
