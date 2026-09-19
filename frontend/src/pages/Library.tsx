import React from 'react';

export const Library: React.FC = () => {
  return (
    <main className="p-8 pb-24 max-w-[1600px] mx-auto text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-black">Minha Biblioteca</h1>
          <p className="text-gray-400 text-sm">Seus jogos possuídos, conquistas e tempo de jogo.</p>
        </div>
        <div className="bg-brand-green/80 text-emerald-200 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-sm font-bold">
          12 Jogos
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-brand-card p-6 rounded-2xl border border-gray-800 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-brand-purple/20 border border-brand-purple flex items-center justify-center text-brand-purple text-2xl">
            <i className="fa-solid fa-gamepad"></i>
          </div>
          <div>
            <h3 className="font-bold text-lg">Space Marine 2</h3>
            <p className="text-xs text-gray-400">42 horas jogadas</p>
            <p className="text-xs text-emerald-400 mt-1 font-semibold">Pronto para Jogar</p>
          </div>
        </div>

        <div className="bg-brand-card p-6 rounded-2xl border border-gray-800 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-brand-green/30 border border-brand-green flex items-center justify-center text-emerald-300 text-2xl">
            <i className="fa-solid fa-trophy"></i>
          </div>
          <div>
            <h3 className="font-bold text-lg">Survivor</h3>
            <p className="text-xs text-gray-400">128 horas jogadas</p>
            <p className="text-xs text-brand-purple mt-1 font-semibold">18/24 Conquistas</p>
          </div>
        </div>

        <div className="bg-brand-card p-6 rounded-2xl border border-gray-800 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 text-2xl">
            <i className="fa-solid fa-download"></i>
          </div>
          <div>
            <h3 className="font-bold text-lg">Devil May Cry 5</h3>
            <p className="text-xs text-gray-400">15 horas jogadas</p>
            <p className="text-xs text-gray-500 mt-1 font-semibold">Não instalado</p>
          </div>
        </div>
      </div>
    </main>
  );
};
