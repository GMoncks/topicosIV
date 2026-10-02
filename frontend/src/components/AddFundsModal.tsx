import React, { useState } from 'react';
import { walletApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 200];

export const AddFundsModal: React.FC<AddFundsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { updateUserBalance } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const effectiveAmount = isCustom ? parseFloat(customAmount) || 0 : selectedAmount;

  const handleRecharge = async () => {
    if (effectiveAmount < 1) {
      setErrorMsg('O valor mínimo para recarga é de R$ 1,00.');
      return;
    }
    if (effectiveAmount > 5000) {
      setErrorMsg('O valor máximo por transação é de R$ 5.000,00.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await walletApi.recharge(effectiveAmount);
      // Atualiza contexto
      updateUserBalance(res.new_balance);

      // Emite eventos de toast e wallet update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mist:wallet-updated', {
            detail: { new_balance: res.new_balance },
          })
        );
        window.dispatchEvent(
          new CustomEvent('mist:toast', {
            detail: {
              message: `R$ ${res.amount.toFixed(2)} adicionados com sucesso ao seu saldo!`,
              type: 'success',
            },
          })
        );
      }

      if (onSuccess) {
        onSuccess(res.new_balance);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar recarga de saldo. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      data-testid="add-funds-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface border border-purple-900/60 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <i className="fa-solid fa-wallet text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Adicionar Fundos à Carteira</h2>
              <p className="text-xs text-gray-400">Simulação de recarga direta da Carteira MIST</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="btn-close-funds-modal"
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Informação sobre simulação */}
        <div className="p-3 bg-emerald-950/30 border border-emerald-700/40 rounded-2xl flex items-start gap-3">
          <i className="fa-solid fa-circle-info text-emerald-400 mt-0.5 text-sm"></i>
          <p className="text-xs text-emerald-200/90 leading-relaxed">
            Esta é uma <strong>recarga instantânea simulada</strong>. O crédito é aprovado de imediato em sua conta sem cobrança bancária real.
          </p>
        </div>

        {/* Seleção de Valores */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-300">Escolha o valor a adicionar:</label>
          <div className="grid grid-cols-3 gap-2.5">
            {PRESET_AMOUNTS.map((amt) => {
              const selected = !isCustom && selectedAmount === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  data-testid={`btn-amount-${amt}`}
                  onClick={() => {
                    setIsCustom(false);
                    setSelectedAmount(amt);
                  }}
                  className={`p-3 rounded-2xl font-bold text-sm transition border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    selected
                      ? 'border-emerald-400 bg-emerald-950/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : 'border-gray-800 bg-brand-card/70 text-gray-300 hover:border-gray-700 hover:bg-gray-800/40'
                  }`}
                >
                  <span className="text-[10px] text-gray-400 font-normal">Adicionar</span>
                  <span>R$ {amt.toFixed(2)}</span>
                </button>
              );
            })}

            <button
              type="button"
              data-testid="btn-amount-custom"
              onClick={() => setIsCustom(true)}
              className={`p-3 rounded-2xl font-bold text-sm transition border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                isCustom
                  ? 'border-emerald-400 bg-emerald-950/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'border-gray-800 bg-brand-card/70 text-gray-300 hover:border-gray-700 hover:bg-gray-800/40'
              }`}
            >
              <span className="text-[10px] text-gray-400 font-normal">Outro</span>
              <span>Personalizado</span>
            </button>
          </div>

          {/* Campo de valor customizado */}
          {isCustom && (
            <div className="pt-2 animate-fade-in space-y-1.5">
              <label className="text-[11px] text-gray-400">Digite o valor desejado (R$):</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                  R$
                </span>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  step="0.01"
                  value={customAmount}
                  placeholder="0,00"
                  onChange={(e) => setCustomAmount(e.target.value)}
                  data-testid="input-custom-amount"
                  className="w-full bg-gray-950/80 border border-gray-700 focus:border-emerald-400 rounded-xl pl-10 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Rodapé e Botões */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
          <div className="text-left">
            <p className="text-[11px] text-gray-400">Total a ser creditado:</p>
            <p className="text-base font-black text-emerald-400">
              R$ {effectiveAmount > 0 ? effectiveAmount.toFixed(2) : '0,00'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRecharge}
              disabled={isLoading || effectiveAmount <= 0}
              data-testid="btn-confirm-recharge"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-950 font-black transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Creditando...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i>
                  Adicionar ao Saldo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
