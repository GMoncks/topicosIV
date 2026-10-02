import React, { useState } from 'react';
import { PrivacySettings } from '../types';
import { publicProfileApi } from '../api/client';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings?: PrivacySettings | null;
  onSaved?: (settings: PrivacySettings) => void;
}

const SECTIONS: { key: keyof PrivacySettings; label: string; icon: string; description: string }[] = [
  { key: 'privacy_games', label: 'Jogos da Biblioteca', icon: 'fa-gamepad', description: 'Visibilidade da sua lista de jogos possuídos' },
  { key: 'privacy_achievements', label: 'Conquistas', icon: 'fa-trophy', description: 'Visibilidade das conquistas que você desbloqueou' },
  { key: 'privacy_playtime', label: 'Horas de Jogo', icon: 'fa-clock', description: 'Tempo total e recente registrado em jogos' },
  { key: 'privacy_inventory', label: 'Inventário de Itens', icon: 'fa-box-archive', description: 'Cartas, cosméticos, emoticons e planos de fundo' },
  { key: 'privacy_screenshots', label: 'Capturas de Tela', icon: 'fa-camera', description: 'Screenshots enviadas para a comunidade' },
  { key: 'privacy_groups', label: 'Grupos e Guildas', icon: 'fa-users', description: 'Grupos em que você participa como membro' },
];

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  isOpen,
  onClose,
  initialSettings,
  onSaved,
}) => {
  const [settings, setSettings] = useState<PrivacySettings>({
    privacy_games: initialSettings?.privacy_games || 'Todos',
    privacy_achievements: initialSettings?.privacy_achievements || 'Todos',
    privacy_playtime: initialSettings?.privacy_playtime || 'Todos',
    privacy_inventory: initialSettings?.privacy_inventory || 'Todos',
    privacy_screenshots: initialSettings?.privacy_screenshots || 'Todos',
    privacy_groups: initialSettings?.privacy_groups || 'Todos',
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOptionChange = (key: keyof PrivacySettings, value: 'Todos' | 'Amigos' | 'Privado') => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await publicProfileApi.updatePrivacySettings(settings);
      setFeedback('Configurações salvas com sucesso!');
      if (onSaved) onSaved(updated);
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      setFeedback(err?.message || 'Falha ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-testid="privacy-modal"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div className="bg-brand-surface border border-purple-900/60 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-brand-card/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center text-brand-purple">
              <i className="fa-solid fa-user-shield text-lg"></i>
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-white">Privacidade do Perfil</h2>
              <p className="text-xs text-gray-400">Controle quem pode ver cada seção do seu perfil público</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition"
            aria-label="Fechar"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-purple-900/40 border border-purple-600/50 text-purple-200 text-xs flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-brand-green"></i>
            <span>{feedback}</span>
          </div>
        )}

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4">
          {SECTIONS.map((sec) => {
            const currentValue = settings[sec.key];
            return (
              <div
                key={sec.key}
                data-testid={`privacy-row-${sec.key}`}
                className="bg-brand-card/40 border border-gray-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-gray-300 text-sm shrink-0">
                    <i className={`fa-solid ${sec.icon}`}></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{sec.label}</h4>
                    <p className="text-[11px] text-gray-400">{sec.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-gray-900/80 p-1 rounded-xl border border-gray-800 shrink-0 w-full sm:w-auto justify-end">
                  {(['Todos', 'Amigos', 'Privado'] as const).map((opt) => {
                    const isSelected = currentValue === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleOptionChange(sec.key, opt)}
                        data-testid={`privacy-btn-${sec.key}-${opt}`}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? opt === 'Todos'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : opt === 'Amigos'
                              ? 'bg-brand-purple text-white shadow-sm'
                              : 'bg-rose-700 text-white shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        <i
                          className={`fa-solid ${
                            opt === 'Todos'
                              ? 'fa-globe'
                              : opt === 'Amigos'
                              ? 'fa-user-group'
                              : 'fa-lock'
                          } text-[10px]`}
                        ></i>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-brand-card/30 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            data-testid="btn-cancel-privacy"
            className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white text-sm font-semibold transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            data-testid="btn-save-privacy"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-purple-600 hover:from-purple-500 hover:to-brand-purple text-white text-sm font-bold shadow-lg shadow-purple-900/30 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs"></i> Salvando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-check text-xs"></i> Salvar Preferências
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
