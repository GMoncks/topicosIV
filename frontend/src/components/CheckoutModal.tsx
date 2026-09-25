import React, { useState } from 'react';
import { GameItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { storeApi } from '../api/client';

interface CheckoutModalProps {
  game: GameItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
  onNavigateToLibrary?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  game,
  isOpen,
  onClose,
  onSuccess,
  onNavigateToLibrary,
}) => {
  const { user, isAuthenticated, openAuthModal, updateUserBalance } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [purchasedTitle, setPurchasedTitle] = useState('');

  if (!isOpen || !game) return null;

  const walletBalance = user?.walletBalance ?? 0;
  const gamePrice = game.currentPrice || 0;
  const projectedBalance = walletBalance - gamePrice;
  const hasInsufficientFunds = walletBalance < gamePrice;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handleConfirmPurchase = async () => {
    if (!isAuthenticated) {
      onClose();
      openAuthModal('login');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      const res = await storeApi.checkout({ game_id: Number(game.id) });
      
      updateUserBalance(res.new_wallet_balance);
      if (onSuccess) onSuccess(res.new_wallet_balance);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mist:wishlist-updated'));
      }

      setPurchasedTitle(game.title);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Erro no checkout unitário:', err);
      setError(err.message || 'Falha ao processar compra. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-brand-card border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar X */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-brand-surface/80 border border-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          aria-label="Fechar modal de compra"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        {!isSuccess ? (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-green/20 text-emerald-400 flex items-center justify-center text-lg border border-emerald-500/30">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-white">Comprar agora</h3>
                <p className="text-xs text-gray-400">Finalização imediata com Saldo MIST</p>
              </div>
            </div>

            {/* Resumo do Jogo */}
            <div className="bg-brand-surface border border-gray-700 rounded-xl p-4 flex gap-4 items-center mb-6">
              <img
                src={game.image}
                alt={game.title}
                className="w-20 h-16 object-cover rounded-lg border border-gray-700 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-base truncate">{game.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded font-semibold border border-brand-purple/30">
                    {game.category}
                  </span>
                  {game.publisherOrParent && (
                    <span className="text-xs text-gray-400 truncate">
                      {game.publisherOrParent}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-gray-400 block">Preço</span>
                <span className="font-bold text-lg text-emerald-300">
                  {formatCurrency(gamePrice)}
                </span>
              </div>
            </div>

            {/* Extrato Financeiro da Carteira */}
            <div className="bg-brand-surface/60 border border-gray-700/60 rounded-xl p-4 space-y-2.5 mb-6 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Saldo atual na carteira:</span>
                <span className="font-medium text-white">{formatCurrency(walletBalance)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Valor a ser debitado:</span>
                <span className="font-medium text-red-400">- {formatCurrency(gamePrice)}</span>
              </div>
              <div className="border-t border-gray-700/60 pt-2 flex justify-between font-bold">
                <span className="text-white">Saldo restante:</span>
                <span className={projectedBalance < 0 ? 'text-red-400' : 'text-emerald-400'}>
                  {formatCurrency(projectedBalance)}
                </span>
              </div>
            </div>

            {/* Alerta de Saldo Insuficiente */}
            {hasInsufficientFunds && (
              <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 mb-6 flex items-center gap-3 text-red-300 text-xs">
                <i className="fa-solid fa-triangle-exclamation text-base text-red-400 shrink-0"></i>
                <div>
                  <span className="font-bold block">Saldo insuficiente!</span>
                  Você precisa de mais {formatCurrency(gamePrice - walletBalance)} para concluir esta compra.
                </div>
              </div>
            )}

            {/* Mensagem de Erro de Requisição */}
            {error && (
              <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 mb-6 text-red-300 text-xs">
                {error}
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium text-sm transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={isProcessing || hasInsufficientFunds}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-green hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Processando...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    Confirmar Compra
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Estado de Sucesso */
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
              <i className="fa-solid fa-check"></i>
            </div>

            <h3 className="text-2xl font-display font-bold text-white mb-2">Compra Realizada!</h3>
            <p className="text-sm text-gray-300 mb-6">
              Parabéns! <span className="font-bold text-white">{purchasedTitle}</span> já foi adicionado à sua Biblioteca.
            </p>

            <div className="bg-brand-surface border border-gray-700 rounded-xl p-3 mb-6 text-xs text-gray-400">
              Novo saldo disponível: <span className="text-emerald-400 font-bold">{formatCurrency(projectedBalance)}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  if (onNavigateToLibrary) onNavigateToLibrary();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-purple hover:bg-brand-purpleDark text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <i className="fa-solid fa-book-open"></i>
                Ir para a Biblioteca
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-surface hover:bg-gray-700 text-gray-300 hover:text-white font-medium text-sm transition border border-gray-700 cursor-pointer"
              >
                Continuar na Loja
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
