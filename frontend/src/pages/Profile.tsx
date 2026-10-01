import React, { useState, useEffect } from 'react';
import { UserProfile, GameActivity } from '../types';
import { ugcApi, WorkshopItem, getUgcImageUrl } from '../api/client';

interface ProfileProps {
  user?: UserProfile;
  onNavigate?: (tab: string) => void;
}

const defaultRecentGames: GameActivity[] = [
  {
    id: 'g1',
    title: 'Librarian: Tidy Up the Arcane Library!',
    banner: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=600&q=80',
    hoursPlayed: 15.7,
    lastPlayed: '30 de ago.',
    achievementsEarned: 4,
    achievementsTotal: 12,
    achievementIcons: ['fa-book', 'fa-wand-magic-sparkles', 'fa-scroll', 'fa-feather']
  },
  {
    id: 'g2',
    title: 'Marvel Rivals',
    banner: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80',
    hoursPlayed: 368,
    lastPlayed: '30 de ago.',
    achievementsEarned: 28,
    achievementsTotal: 49,
    achievementIcons: ['fa-shield-halved', 'fa-bolt', 'fa-fist-raised', 'fa-mask'],
    extraAchievementsCount: 23
  },
  {
    id: 'g3',
    title: 'Subnautica',
    banner: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
    hoursPlayed: 84.2,
    lastPlayed: '24 de ago.',
    achievementsEarned: 17,
    achievementsTotal: 17,
    achievementIcons: ['fa-water', 'fa-compass', 'fa-anchor', 'fa-fish']
  }
];

export const Profile: React.FC<ProfileProps> = ({ user, onNavigate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [userWorkshopItems, setUserWorkshopItems] = useState<WorkshopItem[]>([]);
  const [workshopTotal, setWorkshopTotal] = useState<number>(user?.stats?.workshopCount ?? 0);
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);
  const [isLoadingWorkshop, setIsLoadingWorkshop] = useState(false);

  useEffect(() => {
    async function loadUserWorkshop() {
      if (user?.id) {
        try {
          setIsLoadingWorkshop(true);
          const data = await ugcApi.getWorkshopItems({ author_id: user.id, size: 20 });
          setUserWorkshopItems(data.items);
          setWorkshopTotal(data.total);
        } catch (err) {
          console.error('Falha ao buscar itens da oficina do perfil:', err);
        } finally {
          setIsLoadingWorkshop(false);
        }
      }
    }
    loadUserWorkshop();
  }, [user?.id]);

  const totalDownloads = userWorkshopItems.reduce((acc, curr) => acc + (curr.downloads_count || 0), 0);
  const totalSubscriptions = userWorkshopItems.reduce((acc, curr) => acc + (curr.subscriptions_count || 0), 0);

  const profileData = {
    username: user?.username || 'ggtorres2001',
    realName: user?.realName || 'Gabriel Torres',
    location: user?.location || 'Rio Grande do Sul, Brazil',
    level: user?.level ?? 7,
    status: user?.status || 'On-line',
    featuredBadge: user?.featuredBadge || {
      title: 'Acumulador Adepto',
      xp: 190,
      code: '10+'
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#180927] via-brand-bg to-brand-bg min-h-screen text-gray-100 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header do Perfil */}
        <div className="bg-brand-surface/90 border border-purple-900/40 rounded-3xl p-6 lg:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            {/* Avatar e Dados Básicos */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-2xl overflow-hidden border-4 border-amber-300/80 shadow-[0_0_20px_rgba(251,191,36,0.3)] bg-gradient-to-br from-cyan-600 to-brand-green p-0.5">
                  <img
                    src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80"
                    alt="Avatar Perfil"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-brand-green border-2 border-brand-surface px-2 py-0.5 rounded-md text-[10px] font-black text-emerald-100 shadow">
                  Ω MIST
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl lg:text-3xl font-display font-black text-white">
                    {profileData.username}
                  </h1>
                  <i className="fa-solid fa-angle-down text-gray-400 text-sm cursor-pointer hover:text-white"></i>
                </div>
                <p className="text-xs lg:text-sm text-gray-300 mt-1 flex items-center gap-1.5">
                  <span>{profileData.realName}</span>
                  <span>🇧🇷</span>
                  <span className="text-gray-400">{profileData.location}</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {profileData.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Nível e Destaque da Insígnia */}
            <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-brand-card/80 border border-purple-800/40 px-4 py-2 rounded-2xl shadow-inner">
                  <span className="text-sm font-bold text-gray-300">Nível</span>
                  <span className="w-9 h-9 rounded-full border-2 border-brand-purple flex items-center justify-center font-display font-black text-lg text-white bg-brand-purple/20">
                    {profileData.level}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-brand-card/70 border border-gray-800 p-2.5 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center font-display font-black text-purple-300 text-sm shadow">
                  {(profileData.featuredBadge as any).code || <i className={`fa-solid ${(profileData.featuredBadge as any).icon || 'fa-certificate'}`}></i>}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white leading-tight">
                    {profileData.featuredBadge.title}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {profileData.featuredBadge.xp} XP
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-brand-purple/20 hover:bg-brand-purple/40 text-brand-purple hover:text-white border border-brand-purple/40 px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isEditing ? 'Salvar Perfil' : 'Editar perfil'}
              </button>
            </div>
          </div>
        </div>

        {/* Layout de Duas Colunas: Atividade Recente (Esq) e Status/Links (Dir) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Principal: Atividade Recente */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-brand-purple"></i> Atividade recente
              </h2>
              <span className="text-xs text-gray-400 font-medium">
                8,7 hora(s) nas 2 últimas semanas
              </span>
            </div>

            <div className="space-y-4">
              {defaultRecentGames.map(game => (
                <div
                  key={game.id}
                  className="bg-brand-surface/90 border border-gray-800/80 hover:border-purple-900/60 rounded-2xl p-5 transition-all duration-300 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={game.banner}
                        alt={game.title}
                        className="w-28 h-16 object-cover rounded-xl border border-gray-700 shadow"
                      />
                      <div>
                        <h3 className="font-bold text-white text-base hover:text-brand-purple transition cursor-pointer">
                          {game.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {game.hoursPlayed} horas registradas
                        </p>
                        <p className="text-[11px] text-gray-500">
                          jogado pela última vez em {game.lastPlayed}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Conquistas */}
                  <div className="mt-4 pt-3 border-t border-gray-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-brand-card/60 p-3 rounded-xl">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <span className="text-xs font-semibold text-gray-300 whitespace-nowrap">
                        Conquistas <span className="text-white">{game.achievementsEarned}</span> de {game.achievementsTotal}
                      </span>
                      <div className="w-32 bg-gray-800 h-2.5 rounded-full overflow-hidden border border-gray-700">
                        <div
                          className="h-full bg-gradient-to-r from-brand-purple to-purple-400 rounded-full"
                          style={{
                            width: `${(game.achievementsEarned / game.achievementsTotal) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Ícones de Conquistas */}
                    <div className="flex items-center gap-2">
                      {game.achievementIcons.map((icon, idx) => (
                        <div
                          key={idx}
                          className="w-7 h-7 rounded-lg bg-gray-800 border border-purple-700/50 flex items-center justify-center text-purple-300 text-xs shadow-inner"
                          title="Conquista desbloqueada"
                        >
                          <i className={`fa-solid ${icon}`}></i>
                        </div>
                      ))}
                      {game.extraAchievementsCount && (
                        <div className="w-7 h-7 rounded-lg bg-brand-purple/30 border border-brand-purple flex items-center justify-center font-bold text-white text-[10px]">
                          +{game.extraAchievementsCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna Lateral Direita: Insígnias e Navegação do Perfil */}
          <div className="lg:col-span-4 space-y-6">
            {/* Seção de Insígnias */}
            <div className="bg-brand-surface/90 border border-gray-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                  <i className="fa-solid fa-medal text-brand-purple"></i> Insígnias
                </h3>
                <span className="text-xs font-bold text-brand-purple bg-brand-purple/20 px-2 py-0.5 rounded-md">
                  4
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-brand-card rounded-xl border border-gray-700/60 flex flex-col items-center text-center group cursor-pointer hover:border-brand-purple transition">
                  <i className="fa-solid fa-certificate text-2xl text-slate-300 group-hover:scale-110 transition"></i>
                  <span className="text-[10px] text-gray-400 mt-1 truncate w-full">Fundador</span>
                </div>
                <div className="p-3 bg-brand-card rounded-xl border border-gray-700/60 flex flex-col items-center text-center group cursor-pointer hover:border-brand-purple transition">
                  <span className="font-display font-black text-purple-400 text-lg group-hover:scale-110 transition">10+</span>
                  <span className="text-[10px] text-gray-400 mt-1 truncate w-full">Anos MIST</span>
                </div>
                <div className="p-3 bg-brand-card rounded-xl border border-gray-700/60 flex flex-col items-center text-center group cursor-pointer hover:border-brand-purple transition">
                  <div className="w-6 h-6 rounded-md bg-blue-900 border border-blue-400 flex items-center justify-center font-bold text-blue-200 text-xs group-hover:scale-110 transition">
                    7
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 truncate w-full">Nível 7</span>
                </div>
                <div className="p-3 bg-brand-card rounded-xl border border-gray-700/60 flex flex-col items-center text-center group cursor-pointer hover:border-brand-purple transition">
                  <i className="fa-solid fa-gem text-2xl text-emerald-400 group-hover:scale-110 transition"></i>
                  <span className="text-[10px] text-gray-400 mt-1 truncate w-full">Colecionador</span>
                </div>
              </div>
            </div>

            {/* Menu de Estatísticas e Itens do Perfil */}
            <div className="bg-brand-surface/90 border border-gray-800 rounded-2xl p-5 shadow-xl">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/60 transition cursor-pointer text-gray-300 hover:text-white">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-gamepad text-brand-purple"></i> Jogos
                  </span>
                  <span className="font-bold text-white text-base">22</span>
                </li>
                <li className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/60 transition cursor-pointer text-gray-300 hover:text-white">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-box-open text-emerald-400"></i> Inventário
                  </span>
                  <i className="fa-solid fa-chevron-right text-xs text-gray-600"></i>
                </li>
                <li className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/60 transition cursor-pointer text-gray-300 hover:text-white">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-camera text-cyan-400"></i> Capturas de tela
                  </span>
                  <i className="fa-solid fa-chevron-right text-xs text-gray-600"></i>
                </li>
                <li className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/60 transition cursor-pointer text-gray-300 hover:text-white">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-video text-amber-400"></i> Vídeos
                  </span>
                  <i className="fa-solid fa-chevron-right text-xs text-gray-600"></i>
                </li>
                <li
                  onClick={() => setIsWorkshopModalOpen(true)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/60 transition cursor-pointer text-gray-300 hover:text-white group"
                >
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-wrench text-orange-400 group-hover:rotate-45 transition-transform"></i> Itens da Oficina
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{workshopTotal}</span>
                    <i className="fa-solid fa-chevron-right text-xs text-gray-600"></i>
                  </div>
                </li>
                <li className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/60 transition cursor-pointer text-gray-300 hover:text-white">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-star-half-stroke text-purple-400"></i> Análises
                  </span>
                  <i className="fa-solid fa-chevron-right text-xs text-gray-600"></i>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Criações da Oficina do Usuário (Ticket O-06) */}
      {isWorkshopModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
                  <i className="fa-solid fa-wrench text-sm"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Criações na Oficina • {profileData.username}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Gerenciamento de mods, skins e pacotes publicados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkshopModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                aria-label="Fechar modal"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Painel de Estatísticas Acumuladas */}
            <div className="grid grid-cols-3 gap-3 p-6 pb-2">
              <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl text-center">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Publicações
                </span>
                <span className="text-xl font-display font-black text-white mt-1 block">
                  {workshopTotal}
                </span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl text-center">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block">
                  Downloads
                </span>
                <span className="text-xl font-display font-black text-cyan-300 mt-1 block">
                  {totalDownloads}
                </span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl text-center">
                <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">
                  Inscritos
                </span>
                <span className="text-xl font-display font-black text-purple-300 mt-1 block">
                  {totalSubscriptions}
                </span>
              </div>
            </div>

            {/* Lista de Itens Criados */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {isLoadingWorkshop ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
                  <i className="fa-solid fa-spinner animate-spin text-2xl text-purple-400"></i>
                  <p className="text-xs">Carregando itens publicados...</p>
                </div>
              ) : userWorkshopItems.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl p-6">
                  <i className="fa-solid fa-wrench text-3xl text-zinc-600 mb-2"></i>
                  <p className="text-sm font-semibold text-zinc-300">Nenhum mod publicado ainda</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Crie mods ou skins personalizadas e compartilhe com toda a comunidade MIST.
                  </p>
                </div>
              ) : (
                userWorkshopItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-purple-600/40 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/60 shrink-0 border border-zinc-800">
                        {item.preview_url ? (
                          <img
                            src={getUgcImageUrl(item.preview_url)}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-orange-400">
                            <i className="fa-solid fa-wrench"></i>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-semibold">
                            {item.category}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">v{item.version}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white truncate mt-0.5">
                          {item.title}
                        </h4>
                        <p className="text-xs text-zinc-400 truncate">
                          {item.game_title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-xs">
                      <div className="hidden sm:flex flex-col items-end text-zinc-400 text-[11px]">
                        <span>{item.downloads_count} downloads</span>
                        <span>{item.subscriptions_count} inscritos</span>
                      </div>
                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsWorkshopModalOpen(false);
                            onNavigate('workshop');
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          Ver na Oficina
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Rodapé com Ações */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Oficina MIST • Compartilhe suas criações
              </span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    setIsWorkshopModalOpen(false);
                    onNavigate('workshop');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
                >
                  <i className="fa-solid fa-compass"></i>
                  <span>Ir para a Oficina</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
