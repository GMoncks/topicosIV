import React, { useState, useEffect } from 'react';
import { PointsShopItem } from '../types';

interface PointsShopProps {
  initialPoints?: number;
  onPointsUpdate?: (newBalance: number) => void;
}

const mockPointsItems: PointsShopItem[] = [
  {
    id: 'p1',
    name: 'MARÉ CREPUSCULAR',
    category: 'Plano de fundo do perfil',
    itemType: 'background',
    pricePoints: 500,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    isOwned: false
  },
  {
    id: 'p2',
    name: ':CHICKEN_CRY:',
    category: 'Emoticon',
    itemType: 'emoticon',
    pricePoints: 100,
    image: 'https://images.unsplash.com/photo-1548247416-ec66f4900b2e?auto=format&fit=crop&w=600&q=80',
    isOwned: false
  },
  {
    id: 'p3',
    name: 'BANQUETE A BEIRA-MAR',
    category: 'Perfil de jogo',
    itemType: 'profile_bundle',
    pricePoints: 5000,
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80',
    isOwned: false
  },
  {
    id: 'p4',
    name: 'PARCEIROS DE PRAIA',
    category: 'Perfil de jogo',
    itemType: 'profile_bundle',
    pricePoints: 5000,
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    isOwned: false
  }
];

export const PointsShop: React.FC<PointsShopProps> = ({
  initialPoints = 0,
  onPointsUpdate
}) => {
  const [points, setPoints] = useState<number>(initialPoints);
  const [items, setItems] = useState<PointsShopItem[]>(mockPointsItems);
  const [activeCategory, setActiveCategory] = useState<string>('destaques');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setPoints(initialPoints);
  }, [initialPoints]);

  const handlePurchase = (item: PointsShopItem) => {
    if (item.isOwned) return;

    if (points < item.pricePoints) {
      setNotification(`Saldo insuficiente de Pontos MIST para resgatar ${item.name}!`);
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    const newBalance = points - item.pricePoints;
    setPoints(newBalance);
    if (onPointsUpdate) {
      onPointsUpdate(newBalance);
    }

    setItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, isOwned: true } : i))
    );

    setNotification(`Sucesso! ${item.name} foi adicionado ao seu inventário.`);
    setTimeout(() => setNotification(null), 3500);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-brand-bg text-gray-100">
      {/* Toast de Notificação */}
      {notification && (
        <div className="fixed top-20 right-8 z-50 bg-brand-surface border-2 border-brand-purple p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <i className="fa-solid fa-sparkles text-brand-purple text-lg"></i>
          <p className="text-sm font-bold text-white">{notification}</p>
        </div>
      )}

      {/* Menu Lateral da Loja de Pontos */}
      <aside className="w-64 lg:w-72 bg-brand-surface/90 border-r border-gray-800 flex flex-col p-6 overflow-y-auto shrink-0 select-none">
        {/* Card de Saldo de Pontos MIST */}
        <div className="bg-gradient-to-br from-brand-card to-brand-surface p-4 rounded-2xl border border-gray-800 shadow-xl mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-300 text-xl shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <i className="fa-solid fa-coins"></i>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Saldo de Pontos
            </span>
            <p className="text-xl font-display font-black text-white">
              {points.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Destaques */}
        <div className="mb-6">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Destaques
          </span>
          <div className="space-y-1">
            <button
              onClick={() => setActiveCategory('destaques')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeCategory === 'destaques'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>Destaques</span>
              <i className="fa-solid fa-star text-[10px] text-brand-purple"></i>
            </button>
            <button
              onClick={() => setActiveCategory('seus_jogos')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeCategory === 'seus_jogos'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>Dos seus Jogos</span>
            </button>
            <button
              onClick={() => setActiveCategory('promocoes')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeCategory === 'promocoes'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>De promoções e eventos</span>
            </button>
            <button
              onClick={() => setActiveCategory('conjuntos')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeCategory === 'conjuntos'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>Conjuntos</span>
            </button>
          </div>
        </div>

        {/* Interface */}
        <div className="mb-6">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Interface
          </span>
          <div className="space-y-1">
            <button className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 flex items-center gap-2">
              <i className="fa-solid fa-keyboard text-gray-500"></i> Teclados
            </button>
            <button className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 flex items-center gap-2">
              <i className="fa-solid fa-film text-gray-500"></i> Vídeos de Inicialização
            </button>
          </div>
        </div>

        {/* Perfil */}
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Perfil
          </span>
          <div className="space-y-1">
            <button className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 flex items-center gap-2">
              <i className="fa-solid fa-user-astronaut text-purple-400"></i> Avatares
            </button>
            <button className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 flex items-center gap-2">
              <i className="fa-solid fa-image text-emerald-400"></i> Planos de fundo
            </button>
            <button className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 flex items-center gap-2">
              <i className="fa-solid fa-award text-amber-400"></i> Prêmios da comunidade
            </button>
            <button className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 flex items-center gap-2">
              <i className="fa-solid fa-star text-yellow-400"></i> Insígnia sazonal ★
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto p-8 max-w-6xl">
        {/* Hero Banner da Loja de Pontos */}
        <div className="relative rounded-3xl p-8 lg:p-10 mb-10 overflow-hidden bg-gradient-to-r from-[#0d172b] via-[#1a0f2e] to-[#0d172b] border border-purple-900/40 shadow-2xl text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-brand-purple/20 border-2 border-brand-purple flex items-center justify-center text-brand-purple text-3xl mb-4 shadow-[0_0_25px_rgba(160,32,240,0.5)]">
            <i className="fa-solid fa-shapes"></i>
          </div>

          <h1 className="text-3xl lg:text-5xl font-display font-black text-white mb-2 tracking-wide">
            A LOJA DE PONTOS
          </h1>
          <p className="text-sm lg:text-base text-gray-300 max-w-xl font-medium mb-1">
            Compre jogos, ganhe pontos.
          </p>
          <p className="text-xs lg:text-sm text-gray-400 max-w-xl mb-6">
            Personalize a sua experiência no MIST com itens exclusivos da loja de pontos.
          </p>

          <button
            onClick={() =>
              alert(
                'Como os pontos funcionam: Para cada R$ 1,00 gasto na loja MIST, você recebe 100 Pontos MIST para personalizar seu perfil e comunidade!'
              )
            }
            className="bg-brand-surface hover:bg-gray-800 text-gray-200 border border-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow"
          >
            <i className="fa-solid fa-circle-question text-brand-purple"></i> Como os pontos funcionam?
          </button>
        </div>

        {/* Grade de Itens da Promoção */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              Itens de Promoção de Férias de 2026
            </h2>
            <button className="bg-brand-surface hover:bg-gray-800 text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-700 transition">
              Ver tudo
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map(item => (
              <div
                key={item.id}
                className="bg-brand-card/90 rounded-2xl border border-gray-800 hover:border-brand-purple transition-all duration-300 overflow-hidden flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="relative h-44 overflow-hidden bg-brand-surface/80 flex items-center justify-center p-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-xl transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-gray-700 flex items-center gap-1">
                      <i className="fa-solid fa-sparkles text-cyan-400"></i>
                      <span>MIST</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h4 className="font-bold text-sm text-white mb-1 truncate group-hover:text-brand-purple transition">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <i className="fa-solid fa-palette text-[10px] text-gray-500"></i>
                      <span>{item.category}</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="border-t border-gray-800/80 pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-1 rounded-lg">
                      <i className="fa-solid fa-coins text-[11px]"></i>
                      <span>{item.pricePoints.toLocaleString('pt-BR')}</span>
                    </div>

                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={item.isOwned}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        item.isOwned
                          ? 'bg-brand-green/80 text-emerald-200 border border-emerald-500/40 cursor-default'
                          : 'bg-brand-purple hover:bg-brand-purpleDark text-white shadow-[0_0_10px_rgba(160,32,240,0.4)]'
                      }`}
                    >
                      {item.isOwned ? (
                        <>
                          <i className="fa-solid fa-check text-xs"></i> Adquirido
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-cart-arrow-down text-xs"></i> Resgatar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
