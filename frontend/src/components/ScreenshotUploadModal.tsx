import React, { useState, useRef, useEffect } from 'react';
import { ugcApi, ScreenshotItem } from '../api/client';

interface ScreenshotUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (screenshot: ScreenshotItem) => void;
  defaultGameId?: number;
  defaultGameTitle?: string;
  availableGames?: { id: number; title: string }[];
}

export const ScreenshotUploadModal: React.FC<ScreenshotUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultGameId,
  defaultGameTitle,
  availableGames = [],
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gameId, setGameId] = useState<number>(defaultGameId || (availableGames[0]?.id ?? 1));
  const [gameTitle, setGameTitle] = useState<string>(defaultGameTitle || (availableGames[0]?.title ?? ''));
  const [caption, setCaption] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultGameId) {
      setGameId(defaultGameId);
    } else if (availableGames.length > 0) {
      setGameId(availableGames[0].id);
      setGameTitle(availableGames[0].title);
    }
    if (defaultGameTitle) {
      setGameTitle(defaultGameTitle);
    }
  }, [defaultGameId, defaultGameTitle, availableGames]);

  // Limpa o object URL ao desmontar ou trocar de arquivo
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setErrorMessage(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Formato inválido. Apenas imagens PNG, JPG ou WebP são permitidas.');
      return;
    }
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage('O arquivo excede o limite máximo permitido de 15 MB.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Selecione ou arraste uma captura de tela.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const newScreenshot = await ugcApi.uploadScreenshot({
        file: selectedFile,
        game_id: gameId,
        game_title: gameTitle || undefined,
        caption: caption.trim() || undefined,
      });

      handleRemoveFile();
      setCaption('');
      onSuccess(newScreenshot);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar captura de tela.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl p-6 text-zinc-100 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-cloud-arrow-up text-xl text-cyan-400"></i>
            <h2 id="upload-modal-title" className="text-xl font-bold tracking-tight text-white">
              Publicar Captura de Tela
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Fechar"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-sm">
            <i className="fa-solid fa-triangle-exclamation text-base text-red-400 shrink-0"></i>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Área de Drop / Preview */}
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-2">
              Arquivo da Imagem
            </label>
            {!previewUrl ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/20'
                    : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/50'
                }`}
              >
                <i className="fa-regular fa-image text-4xl text-zinc-500 mb-3"></i>
                <p className="text-sm font-medium text-zinc-200 text-center">
                  Arraste e solte sua captura aqui ou clique para selecionar
                </p>
                <p className="text-xs text-zinc-500 mt-1">PNG, JPG ou WebP (máx. 15 MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 group">
                <img
                  src={previewUrl}
                  alt="Pré-visualização da captura"
                  className="w-full max-h-60 object-contain mx-auto"
                />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  aria-label="Remover imagem selecionada"
                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-lg backdrop-blur transition cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
                <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/70 rounded-md text-xs text-zinc-300 backdrop-blur flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-check text-emerald-400"></i>
                  <span>{selectedFile?.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Seleção do Jogo */}
          <div>
            <label htmlFor="game-select" className="block text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-1.5">
              Jogo Associado
            </label>
            {availableGames.length > 0 ? (
              <select
                id="game-select"
                value={gameId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setGameId(id);
                  const found = availableGames.find((g) => g.id === id);
                  if (found) setGameTitle(found.title);
                }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400 transition"
              >
                {availableGames.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="game-select"
                type="text"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                placeholder="Título do Jogo (ex: Elden Ring)"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400 transition"
              />
            )}
          </div>

          {/* Legenda Opcional */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="caption-input" className="block text-xs font-semibold uppercase text-zinc-400 tracking-wider">
                Legenda (Opcional)
              </label>
              <span className="text-xs text-zinc-500">{caption.length}/255</span>
            </div>
            <textarea
              id="caption-input"
              rows={2}
              maxLength={255}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Descreva o momento marcante desta captura..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-400 transition resize-none"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-lg shadow-cyan-950/40 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  <span>Publicar Captura</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
