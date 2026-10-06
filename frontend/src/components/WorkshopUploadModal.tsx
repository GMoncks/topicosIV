import React, { useState, useRef } from 'react';
import { ugcApi, WorkshopItem } from '../api/client';

interface WorkshopUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: WorkshopItem) => void;
  defaultGameId?: number;
  defaultGameTitle?: string;
  availableGames?: { id: number; title: string }[];
}

const CATEGORIES = ['Mod', 'Skin', 'Mapa', 'Tradução', 'Ferramenta', 'Outro'];

export const WorkshopUploadModal: React.FC<WorkshopUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultGameId,
  defaultGameTitle,
  availableGames = [],
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [gameId, setGameId] = useState<number>(defaultGameId || (availableGames[0]?.id ?? 11));
  const [gameTitle, setGameTitle] = useState(defaultGameTitle || (availableGames[0]?.title ?? ''));
  const [category, setCategory] = useState('Mod');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleModFileChange = (selected: File) => {
    setErrorMessage(null);
    const validExtensions = ['.zip', '.rar', '.7z', '.pak', '.mod', '.tar', '.gz', '.json'];
    const lowerName = selected.name.toLowerCase();
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));
    if (!isValid) {
      setErrorMessage('Formato de arquivo não suportado. Utilize arquivos compactados (.zip, .rar, .7z, .pak, .mod).');
      return;
    }
    if (selected.size > 50 * 1024 * 1024) {
      setErrorMessage('O arquivo excede o limite máximo permitido de 50 MB.');
      return;
    }
    setFile(selected);
  };

  const handlePreviewChange = (selected: File) => {
    if (!selected.type.startsWith('image/')) {
      setErrorMessage('A imagem de capa deve ser um arquivo de imagem (PNG, JPG, WebP).');
      return;
    }
    setPreviewFile(selected);
    setPreviewImgUrl(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Selecione o arquivo do mod para enviar.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Informe um título para sua criação.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const resolvedGame = availableGames.find((g) => g.id === gameId);
      const finalGameTitle = gameTitle || resolvedGame?.title || `Jogo #${gameId}`;

      const res = await ugcApi.uploadWorkshopItem({
        file,
        title: title.trim(),
        game_id: gameId,
        game_title: finalGameTitle,
        category,
        tags: tags.trim(),
        description: description.trim(),
        version: version.trim() || '1.0.0',
        preview_file: previewFile || undefined,
      });

      onSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao publicar item no Workshop.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-workshop-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-950/60 text-purple-400 border border-purple-800/60 rounded-xl">
              <i className="fa-solid fa-wrench text-base"></i>
            </div>
            <div>
              <h3 id="upload-workshop-title" className="text-base font-bold text-white tracking-tight">
                Publicar Item na Oficina MIST
              </h3>
              <p className="text-xs text-zinc-400">
                Compartilhe mods, skins, mapas ou traduções com a comunidade
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Formulário com Rolagem */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-sm shrink-0"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Upload do Arquivo do Mod */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Arquivo do Mod ou Skin (.zip, .pak, .rar) *
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleModFileChange(e.target.files[0])}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-purple-500/60 rounded-xl p-4 text-center cursor-pointer transition bg-zinc-900/40 hover:bg-zinc-900/80 flex flex-col items-center justify-center gap-2"
            >
              <i className="fa-solid fa-file-zipper text-2xl text-purple-400"></i>
              {file ? (
                <div>
                  <span className="font-semibold text-white block">{file.name}</span>
                  <span className="text-[10px] text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ) : (
                <div>
                  <span className="font-semibold text-zinc-300 block">Clique para selecionar o pacote do mod</span>
                  <span className="text-[10px] text-zinc-500">Suporta .zip, .rar, .7z, .pak até 50 MB</span>
                </div>
              )}
            </div>
          </div>

          {/* Título & Jogo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="mod-title-input" className="block text-zinc-300 font-semibold mb-1">
                Título do Item *
              </label>
              <input
                id="mod-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Seamless Co-op Reforged"
                required
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-white placeholder-zinc-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="mod-game-select" className="block text-zinc-300 font-semibold mb-1">
                Jogo Compatível *
              </label>
              <select
                id="mod-game-select"
                value={gameId}
                onChange={(e) => {
                  const id = parseInt(e.target.value, 10);
                  setGameId(id);
                  const found = availableGames.find((g) => g.id === id);
                  if (found) setGameTitle(found.title);
                }}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-white outline-none"
              >
                {availableGames.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Categoria & Versão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="mod-category-select" className="block text-zinc-300 font-semibold mb-1">
                Categoria
              </label>
              <select
                id="mod-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-white outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mod-version-input" className="block text-zinc-300 font-semibold mb-1">
                Versão do Mod
              </label>
              <input
                id="mod-version-input"
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-white outline-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="mod-tags-input" className="block text-zinc-300 font-semibold mb-1">
              Tags (separadas por vírgula)
            </label>
            <input
              id="mod-tags-input"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ex: Multiplayer, 4K, Gameplay, Overhaul"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-white placeholder-zinc-500 outline-none"
            />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="mod-desc-input" className="block text-zinc-300 font-semibold mb-1">
              Descrição Detalhada & Instruções de Instalação
            </label>
            <textarea
              id="mod-desc-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique o que o mod faz e como instalar no jogo..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl p-3 text-white placeholder-zinc-500 outline-none resize-none"
            />
          </div>

          {/* Imagem de Capa / Preview */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Imagem de Capa / Screenshot (Opcional)
            </label>
            <input
              type="file"
              accept="image/*"
              ref={previewInputRef}
              onChange={(e) => e.target.files?.[0] && handlePreviewChange(e.target.files[0])}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => previewInputRef.current?.click()}
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-image text-purple-400"></i>
                <span>Selecionar Imagem de Capa</span>
              </button>
              {previewImgUrl && (
                <div className="relative w-16 h-10 rounded-lg overflow-hidden border border-zinc-700">
                  <img src={previewImgUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file || !title.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-purple-950/40 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  <span>Publicar no Workshop</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
