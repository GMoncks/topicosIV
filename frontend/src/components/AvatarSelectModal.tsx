import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem } from '../types';
import { profileApi } from '../api/client';

interface AvatarSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAvatar: (avatarUrl: string) => void;
  currentAvatarUrl?: string;
  onNavigateToShop?: () => void;
}

export const AvatarSelectModal: React.FC<AvatarSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectAvatar,
  currentAvatarUrl,
  onNavigateToShop,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'upload'>('inventory');
  const [inventoryAvatars, setInventoryAvatars] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchAvatars() {
      setIsLoading(true);
      try {
        const data = await profileApi.getInventory();
        if (data && Array.isArray(data.items)) {
          const avatars = data.items.filter((item) => item.item_type === 'avatar');
          setInventoryAvatars(avatars);
        }
      } catch (err) {
        console.error('Falha ao carregar avatares do inventário:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAvatars();
    setPreviewUrl(null);
    setUploadError(null);
    setCustomUrlInput('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor, selecione um arquivo de imagem válido (JPG, PNG, GIF, WEBP).');
      return;
    }

    // Limite de 5MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('A imagem deve ter no máximo 5MB.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustom = () => {
    const targetUrl = previewUrl || customUrlInput.trim();
    if (targetUrl) {
      onSelectAvatar(targetUrl);
      onClose();
    }
  };

  return (
    <div
      data-testid="avatar-select-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface border border-purple-900/60 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center text-brand-purple">
              <i className="fa-solid fa-camera-rotate text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Alterar Foto de Perfil</h2>
              <p className="text-xs text-gray-400">Escolha uma foto do seu inventário ou envie sua própria imagem</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="btn-close-avatar-modal"
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            data-testid="tab-avatar-inventory"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-brand-purple text-white shadow-[0_0_12px_rgba(160,32,240,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <i className="fa-solid fa-gem text-purple-400"></i> Avatares Adquiridos ({inventoryAvatars.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            data-testid="tab-avatar-upload"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-brand-purple text-white shadow-[0_0_12px_rgba(160,32,240,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <i className="fa-solid fa-upload text-cyan-400"></i> Upload de Foto
          </button>
        </div>

        {/* Conteúdo Aba 1: Inventário */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="py-12 text-center text-gray-400">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-brand-purple mb-2"></i>
                <p className="text-xs">Carregando avatares do inventário...</p>
              </div>
            ) : inventoryAvatars.length === 0 ? (
              <div className="py-10 text-center space-y-4 bg-gray-900/40 rounded-2xl border border-gray-800/80 p-6">
                <div className="w-14 h-14 rounded-full bg-purple-950/60 border border-purple-800/50 flex items-center justify-center mx-auto text-brand-purple">
                  <i className="fa-solid fa-user-astronaut text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-200">Nenhum avatar adquirido ainda</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Você pode adquirir fotos de perfil exclusivas na Loja de Pontos com seus pontos acumulados.
                  </p>
                </div>
                {onNavigateToShop && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToShop();
                    }}
                    className="bg-brand-purple hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg inline-flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-store"></i> Ir para Loja de Pontos
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                {inventoryAvatars.map((item) => {
                  const isCurrent = currentAvatarUrl === item.asset_url;
                  return (
                    <div
                      key={item.id}
                      data-testid={`inventory-avatar-${item.id}`}
                      onClick={() => {
                        onSelectAvatar(item.asset_url);
                        onClose();
                      }}
                      className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-2.5 text-center ${
                        isCurrent
                          ? 'border-brand-green bg-brand-green/10 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : 'border-gray-800 bg-brand-card/80 hover:border-brand-purple/80 hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-700/80 group-hover:border-brand-purple transition">
                        <img src={item.asset_url} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="w-full">
                        <p className="text-xs font-bold text-white truncate">{item.name}</p>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{item.rarity || 'Comum'}</span>
                      </div>
                      {isCurrent ? (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <i className="fa-solid fa-circle-check"></i> Em Uso
                        </span>
                      ) : (
                        <span className="text-[10px] text-brand-purple font-bold opacity-0 group-hover:opacity-100 transition">
                          Selecionar
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo Aba 2: Upload de Foto Própria */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              data-testid="avatar-file-input"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 hover:border-brand-purple/80 rounded-2xl p-6 text-center cursor-pointer bg-brand-card/50 hover:bg-gray-800/40 transition group"
            >
              {previewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-brand-purple shadow-xl">
                    <img src={previewUrl} alt="Prévia" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-brand-purple font-bold group-hover:underline">
                    Clique para escolher outro arquivo
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-brand-purple/10 border border-brand-purple/30 text-brand-purple flex items-center justify-center mx-auto group-hover:scale-110 transition">
                    <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                  </div>
                  <p className="text-xs font-bold text-white">Clique para selecionar uma imagem do computador</p>
                  <p className="text-[11px] text-gray-400">Suporta JPG, PNG, GIF ou WEBP (máx. 5MB)</p>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
                <i className="fa-solid fa-circle-exclamation"></i> {uploadError}
              </p>
            )}

            {/* Ou por URL direta */}
            <div className="space-y-1.5 pt-2 border-t border-gray-800">
              <label className="text-[11px] font-bold text-gray-300">Ou cole a URL de uma imagem da web:</label>
              <input
                type="url"
                placeholder="https://exemplo.com/minha-foto.png"
                value={customUrlInput}
                onChange={(e) => {
                  setCustomUrlInput(e.target.value);
                  if (e.target.value.trim()) setPreviewUrl(e.target.value.trim());
                }}
                data-testid="input-avatar-url"
                className="w-full bg-gray-950/80 border border-gray-700 focus:border-brand-purple rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!previewUrl && !customUrlInput.trim()}
                data-testid="btn-apply-custom-avatar"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-purple hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-lg cursor-pointer"
              >
                Aplicar Esta Foto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
