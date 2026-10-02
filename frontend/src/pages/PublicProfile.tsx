import React, { useState, useEffect } from 'react';
import { PublicProfileResponse } from '../types';
import { publicProfileApi, socialApi } from '../api/client';
import { PrivacySettingsModal } from '../components/PrivacySettingsModal';

interface PublicProfileProps {
  username: string;
  onBack?: () => void;
  onNavigateToSocial?: () => void;
}

export const PublicProfile: React.FC<PublicProfileProps> = ({
  username,
  onBack,
  onNavigateToSocial,
}) => {
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [friendActionStatus, setFriendActionStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'jogos' | 'insignias'>('geral');
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    publicProfileApi
      .getPublicProfile(username)
      .then((data) => {
        if (isMounted) setProfile(data);
      })
      .catch((err) => {
        if (isMounted) setError(err?.message || 'Erro ao carregar perfil do usuário.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [username]);

  const handleSendFriendRequest = async () => {
    if (!profile) return;
    try {
      await socialApi.sendFriendRequest(profile.id);
      setFriendActionStatus('Solicitação de amizade enviada com sucesso!');
      setTimeout(() => setFriendActionStatus(null), 3500);
    } catch (err: any) {
      setFriendActionStatus(err?.message || 'Falha ao enviar solicitação.');
      setTimeout(() => setFriendActionStatus(null), 3500);
    }
  };

  const handleCopyId = () => {
    if (!profile) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(String(profile.id));
    }
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] text-gray-400 gap-3">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-brand-purple"></i>
        <span>Carregando perfil de {username}...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex-1 p-8 max-w-4xl mx-auto text-center" data-testid="public-profile-error">
        <div className="bg-brand-card border border-rose-800/40 rounded-3xl p-10 max-w-md mx-auto shadow-2xl">
          <i className="fa-solid fa-circle-exclamation text-4xl text-rose-500 mb-4"></i>
          <h2 className="text-xl font-bold text-white mb-2">Perfil Indisponível</h2>
          <p className="text-sm text-gray-400 mb-6">{error || 'Usuário não encontrado.'}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-5 py-2.5 bg-brand-surface hover:bg-gray-800 border border-gray-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    );
  }

  const relationship = profile.relationship;

  return (
    <div
      data-testid="public-profile-page"
      className="flex-1 overflow-y-auto bg-gradient-to-b from-[#180927] via-brand-bg to-brand-bg min-h-screen text-gray-100 p-6 lg:p-10 relative"
    >
      {/* Background Decorativo Customizado do Perfil */}
      {profile.profile_background_url && (
        <div
          data-testid="public-profile-custom-background"
          className="absolute top-0 left-0 right-0 h-96 bg-cover bg-center opacity-30 blur-[2px] pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${profile.profile_background_url})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#180927]/80 to-brand-bg"></div>
        </div>
      )}

      {/* Toast Feedback */}
      {friendActionStatus && (
        <div className="fixed top-20 right-8 z-50 bg-brand-surface border-2 border-brand-purple p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <i className="fa-solid fa-bell text-brand-purple text-lg"></i>
          <p className="text-sm font-bold text-white">{friendActionStatus}</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Barra superior de navegação */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition group cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left text-xs group-hover:-translate-x-1 transition-transform"></i>
            <span>Voltar</span>
          </button>
        )}

        {/* Header do Perfil Público */}
        <div className="bg-brand-surface/90 border border-purple-900/40 rounded-3xl p-6 lg:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            {/* Avatar, Nome e Badges de Relação */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div
                  className={`w-28 h-28 lg:w-32 lg:h-32 rounded-2xl relative flex items-center justify-center p-1.5 transition-all duration-300 ${
                    profile.avatar_frame_url
                      ? profile.avatar_frame_url.includes('1618005182384') || profile.avatar_frame_url.toLowerCase().includes('gold')
                        ? 'ring-4 ring-amber-400 border-2 border-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.85)]'
                        : 'ring-4 ring-cyan-400 border-2 border-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.7)]'
                      : 'border-4 border-amber-300/80 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                  }`}
                >
                  <img
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`}
                    alt={profile.username}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  {profile.avatar_frame_url && (
                    <div
                      className={`absolute inset-0 rounded-2xl pointer-events-none border-4 transition-all duration-300 ${
                        profile.avatar_frame_url.includes('1618005182384') || profile.avatar_frame_url.toLowerCase().includes('gold')
                          ? 'border-amber-400/90 ring-2 ring-amber-300/60 shadow-[inset_0_0_12px_rgba(245,158,11,0.4)]'
                          : 'border-cyan-400/90 ring-2 ring-cyan-300/60 shadow-[inset_0_0_12px_rgba(6,182,212,0.4)]'
                      }`}
                    />
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-brand-green border-2 border-brand-surface px-2 py-0.5 rounded-md text-[10px] font-black text-emerald-100 shadow">
                  Ω MIST
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl lg:text-3xl font-display font-black text-white">
                    {profile.username}
                  </h1>

                  {/* Badge de Relação (P-04) */}
                  {relationship === 'self' && (
                    <span
                      data-testid="profile-relation-badge-self"
                      className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-star text-[10px]"></i> Você mesmo
                    </span>
                  )}
                  {relationship === 'friend' && (
                    <span
                      data-testid="profile-relation-badge-friend"
                      className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-heart text-[10px]"></i> Amigo
                    </span>
                  )}
                  {relationship === 'group_member' && (
                    <span
                      data-testid="profile-relation-badge-group_member"
                      className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-shield text-[10px]"></i> Membro do Grupo
                    </span>
                  )}
                </div>

                {/* ID de Usuário para Adicionar Amigo */}
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    data-testid="profile-user-id"
                    className="text-xs bg-gray-900/90 text-gray-300 border border-gray-700/80 px-2.5 py-0.5 rounded-lg font-mono flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-hashtag text-[10px] text-brand-purple"></i>
                    ID: {profile.id}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    data-testid="btn-copy-user-id"
                    title="Copiar ID para envio e solicitação de amizade"
                    className="text-[11px] text-gray-400 hover:text-white transition px-2 py-0.5 rounded-md hover:bg-gray-800 flex items-center gap-1 border border-transparent hover:border-gray-700 cursor-pointer"
                  >
                    <i className={`fa-solid ${copiedId ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                    <span>{copiedId ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                <p className="text-xs lg:text-sm text-gray-300 mt-2 flex items-center gap-2">
                  <span>{profile.real_name || profile.username}</span>
                  <span>•</span>
                  <span className="text-gray-400">{profile.location || 'Brasil'}</span>
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {profile.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Nível e Ações Sociais */}
            <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
              {/* Nível MIST */}
              <div className="flex items-center gap-3 bg-brand-card/90 border border-brand-purple/40 p-3 rounded-2xl shadow-inner min-w-[190px]">
                <div className="w-10 h-10 rounded-full border-2 border-brand-purple flex items-center justify-center font-display font-black text-base text-white bg-brand-purple/20">
                  {profile.level}
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-300 block">Nível MIST</span>
                  <span className="text-[11px] text-gray-400 font-mono">{profile.total_xp} Total XP</span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 flex-wrap">
                {relationship === 'self' && (
                  <button
                    type="button"
                    onClick={() => setIsPrivacyModalOpen(true)}
                    data-testid="btn-privacy-settings"
                    className="px-4 py-2 bg-brand-surface hover:bg-gray-800 border border-gray-700 hover:border-brand-purple text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-lock text-brand-purple"></i>
                    Privacidade
                  </button>
                )}

                {relationship === 'none' && (
                  <button
                    type="button"
                    onClick={handleSendFriendRequest}
                    data-testid="btn-add-friend"
                    className="px-4 py-2 bg-brand-purple hover:bg-brand-purple-hover text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-purple-900/30 cursor-pointer"
                  >
                    <i className="fa-solid fa-user-plus"></i>
                    Adicionar Amigo
                  </button>
                )}

                {relationship === 'friend' && onNavigateToSocial && (
                  <button
                    type="button"
                    onClick={onNavigateToSocial}
                    data-testid="btn-send-message"
                    className="px-4 py-2 bg-gradient-to-r from-brand-purple to-purple-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <i className="fa-solid fa-comment"></i>
                    Mensagem
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Abas do Perfil Público */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
          <button
            onClick={() => setActiveTab('geral')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'geral'
                ? 'bg-brand-purple text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <i className="fa-solid fa-id-card text-xs"></i> Geral
          </button>
          <button
            onClick={() => setActiveTab('jogos')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'jogos'
                ? 'bg-brand-purple text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <i className="fa-solid fa-gamepad text-xs"></i> Jogos
          </button>
          <button
            onClick={() => setActiveTab('insignias')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'insignias'
                ? 'bg-brand-purple text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <i className="fa-solid fa-shield-halved text-xs"></i> Insígnias ({profile.badges?.length || 0})
          </button>
        </div>

        {/* Conteúdo das Seções com Verificação de Privacidade */}
        {activeTab === 'geral' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Seção Jogos & Horas */}
            <div data-testid="section-games" className="bg-brand-card/70 border border-gray-800/90 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <i className="fa-solid fa-gamepad text-brand-purple"></i> Jogos na Conta
                  </h3>
                  {!profile.games && (
                    <span data-testid="section-hidden-games" className="text-[11px] text-gray-500 font-semibold flex items-center gap-1">
                      <i className="fa-solid fa-lock text-[10px]"></i> Privado
                    </span>
                  )}
                </div>

                {!profile.games ? (
                  <p className="text-xs text-gray-500 italic py-4">Esta seção é privada pelo usuário.</p>
                ) : (
                  <div>
                    <span className="text-3xl font-display font-black text-white">{profile.games.length}</span>
                    <span className="text-xs text-gray-400 ml-1.5">jogos registrados</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-800">
                <span className="text-[11px] text-gray-400">Tempo de Jogo: </span>
                {profile.playtime_minutes === null ? (
                  <span data-testid="section-hidden-playtime" className="text-xs text-gray-500 italic">Oculto</span>
                ) : (
                  <span className="text-xs font-bold text-emerald-400">
                    {Math.round((profile.playtime_minutes || 0) / 60)} horas
                  </span>
                )}
              </div>
            </div>

            {/* Seção Conquistas */}
            <div data-testid="section-achievements" className="bg-brand-card/70 border border-gray-800/90 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <i className="fa-solid fa-trophy text-amber-400"></i> Conquistas
                  </h3>
                  {profile.achievements_count === null && (
                    <span data-testid="section-hidden-achievements" className="text-[11px] text-gray-500 font-semibold flex items-center gap-1">
                      <i className="fa-solid fa-lock text-[10px]"></i> Privado
                    </span>
                  )}
                </div>

                {profile.achievements_count === null ? (
                  <p className="text-xs text-gray-500 italic py-4">Esta seção é privada pelo usuário.</p>
                ) : (
                  <div>
                    <span className="text-3xl font-display font-black text-amber-300">{profile.achievements_count}</span>
                    <span className="text-xs text-gray-400 ml-1.5">desbloqueadas</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seção Inventário */}
            <div data-testid="section-inventory" className="bg-brand-card/70 border border-gray-800/90 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <i className="fa-solid fa-box-archive text-cyan-400"></i> Inventário
                  </h3>
                  {profile.inventory_count === null && (
                    <span data-testid="section-hidden-inventory" className="text-[11px] text-gray-500 font-semibold flex items-center gap-1">
                      <i className="fa-solid fa-lock text-[10px]"></i> Privado
                    </span>
                  )}
                </div>

                {profile.inventory_count === null ? (
                  <p className="text-xs text-gray-500 italic py-4">Esta seção é privada pelo usuário.</p>
                ) : (
                  <div>
                    <span className="text-3xl font-display font-black text-cyan-300">{profile.inventory_count}</span>
                    <span className="text-xs text-gray-400 ml-1.5">itens colecionados</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Seção de Jogos Completa */}
        {activeTab === 'jogos' && (
          <div className="bg-brand-card/50 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <i className="fa-solid fa-gamepad text-brand-purple"></i> Biblioteca de Jogos
            </h3>

            {!profile.games ? (
              <div className="p-8 text-center bg-brand-surface rounded-xl border border-gray-800">
                <i className="fa-solid fa-lock text-3xl text-gray-600 mb-2"></i>
                <p className="text-sm text-gray-400">A lista de jogos deste usuário está definida como privada.</p>
              </div>
            ) : profile.games.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nenhum jogo na biblioteca.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.games.map((g: any) => (
                  <div key={g.id || g.game_id} className="bg-brand-surface border border-gray-800 rounded-xl p-4 flex gap-3 items-center">
                    <img
                      src={g.banner_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=150&q=80"}
                      alt={g.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 truncate">
                      <h4 className="text-sm font-bold text-white truncate">{g.title}</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {Math.round((g.playtime_minutes || 0) / 60)}h jogadas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Seção de Insígnias */}
        {activeTab === 'insignias' && (
          <div data-testid="section-badges" className="bg-brand-card/50 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-brand-purple"></i> Insígnias Conquistadas
            </h3>

            {profile.badges.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-6 text-center">Nenhuma insígnia forjada por este usuário ainda.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {profile.badges.map((b: any) => (
                  <div key={b.id} className="bg-brand-surface border border-gray-800 rounded-xl p-4 flex flex-col items-center text-center gap-2">
                    <img src={b.icon_url} alt={b.name} className="w-14 h-14 rounded-full border border-brand-purple/40 shadow-inner" />
                    <h4 className="text-xs font-bold text-white line-clamp-1">{b.name}</h4>
                    <span className="text-[10px] text-amber-300 font-semibold">{b.rarity || 'Badge MIST'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Configurações de Privacidade */}
      <PrivacySettingsModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        initialSettings={profile.privacy_settings}
        onSaved={(updated) => {
          setProfile((prev) => (prev ? { ...prev, privacy_settings: updated } : null));
        }}
      />
    </div>
  );
};
