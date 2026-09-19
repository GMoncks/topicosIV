import React, { useState } from 'react';
import { UserProfile, GameActivity } from '../types';

interface ProfileProps {
  user?: UserProfile;
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

export const Profile: React.FC<ProfileProps> = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    username: 'ggtorres2001',
    realName: 'Gabriel Torres',
    location: 'Rio Grande do Sul, Brazil',
    level: 7,
    status: 'On-line',
    featuredBadge: {
      title: 'Acumulador Adepto',
      xp: 190,
      code: '10+'
    }
  });

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
                  {profileData.featuredBadge.code}
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
                <li className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/60 transition cursor-pointer text-gray-300 hover:text-white">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-wrench text-orange-400"></i> Itens da Oficina
                  </span>
                  <i className="fa-solid fa-chevron-right text-xs text-gray-600"></i>
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
    </div>
  );
};
