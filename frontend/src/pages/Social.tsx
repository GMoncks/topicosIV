import React from 'react';

export const Social: React.FC = () => {
  return (
    <main className="p-8 pb-24 max-w-[1600px] mx-auto text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-black">Comunidade MIST</h1>
          <p className="text-gray-400 text-sm">Amigos, feed de atividades e chat de jogadores.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-card p-6 rounded-2xl border border-gray-800">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <i className="fa-solid fa-rss text-brand-purple"></i> Feed de Atividades
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-brand-surface rounded-xl border border-gray-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-green/80 border border-brand-green flex items-center justify-center font-bold text-white">
                  GG
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    <span className="text-white">GGTorres2001</span> desbloqueou uma nova conquista em <span className="text-brand-purple font-bold">Space Marine 2</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Há 15 minutos</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-brand-card p-6 rounded-2xl border border-gray-800">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <i className="fa-solid fa-user-group text-emerald-400"></i> Amigos Online (3)
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800/60 transition">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-green"></div>
                  <span className="font-semibold">CyberKnight</span>
                </div>
                <span className="text-xs text-gray-400">Jogando Helldivers 2</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800/60 transition">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-green"></div>
                  <span className="font-semibold">Valkyrie</span>
                </div>
                <span className="text-xs text-gray-400">Online</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
};
