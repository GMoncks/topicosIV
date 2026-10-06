import React, { useState, useEffect } from 'react';
import { PointsShopItem } from '../types';
import { pointsShopApi } from '../api/client';

interface PointsShopProps {
  initialPoints?: number;
  onPointsUpdate?: (newBalance: number) => void;
}

const fallbackPointsItems: PointsShopItem[] = [
  {
    id: 'frame_neon',
    name: 'Moldura Neon Cyberpunk',
    category: 'Moldura de avatar',
    itemType: 'avatar_frame',
    pricePoints: 1000,
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80',
    isOwned: false
  },
  {
    id: 'frame_gold',
    name: 'Moldura Mestre Dourada',
    category: 'Moldura de avatar',
    itemType: 'avatar_frame',
    pricePoints: 1500,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    isOwned: false
  },
  {
    id: 'frame_arcane',
    name: 'Moldura Arcana Cósmica',
    category: 'Moldura de avatar',
    itemType: 'avatar_frame',
    pricePoints: 1200,
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80',
    isOwned: false
  },
  {
    id: 'p1',
    name: 'Maré Crepuscular',
    category: 'Plano de fundo do perfil',
    itemType: 'background',
    pricePoints: 500,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    isOwned: false
  },
  {
    id: 'bg_synthwave',
    name: 'Metrópole Synthwave 1984',
    category: 'Plano de fundo do perfil',
    itemType: 'background',
    pricePoints: 800,
    image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80',
    isOwned: false
  },
  {
    id: 'bg_nebula',
    name: 'Nebulosa Abissal MIST',
    category: 'Plano de fundo do perfil',
    itemType: 'background',
    pricePoints: 1000,
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    isOwned: false
  },
  {
    id: 'p2',
    name: ':chicken_cry:',
    category: 'Emoticon',
    itemType: 'emoticon',
    pricePoints: 100,
    image: 'https://images.unsplash.com/photo-1548247416-ec66f4900b2e?auto=format&fit=crop&w=600&q=80',
    isOwned: false
  },
  {
    id: 'p3',
    name: 'Banquete à Beira-Mar',
    category: 'Perfil de jogo',
    itemType: 'profile_bundle',
    pricePoints: 2500,
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80',
    isOwned: false
  },
  {
    id: 'avatar_cyberpunk',
    name: 'Avatar Cyberpunk Operative',
    category: 'Foto de perfil',
    itemType: 'avatar',
    pricePoints: 800,
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80',
    isOwned: false
  },
  {
    id: 'avatar_arcane_mage',
    name: 'Avatar Mago Arcano',
    category: 'Foto de perfil',
    itemType: 'avatar',
    pricePoints: 800,
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
    isOwned: false
  },
  {
    id: 'avatar_valkyrie',
    name: 'Avatar Valquíria Cósmica',
    category: 'Foto de perfil',
    itemType: 'avatar',
    pricePoints: 1000,
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80',
    isOwned: false
  },
  {
    id: 'avatar_pixel_knight',
    name: 'Avatar Cavaleiro Pixel',
    category: 'Foto de perfil',
    itemType: 'avatar',
    pricePoints: 600,
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=400&q=80',
    isOwned: false
  },
  {
    id: 'avatar_mecha_bot',
    name: 'Avatar MIST Mecha',
    category: 'Foto de perfil',
    itemType: 'avatar',
    pricePoints: 700,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    isOwned: false
  },
  {
    id: 'avatar_mestre_dourado',
    name: 'Avatar Mestre Dourado',
    category: 'Foto de perfil',
    itemType: 'avatar',
    pricePoints: 1000,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    isOwned: false
  },
  {
    id: 'avatar_neon_cyberpunk',
    name: 'Avatar Neon Cyberpunk',
    category: 'Foto de perfil',
    itemType: 'avatar',
    pricePoints: 900,
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80',
    isOwned: false
  },
  {
    id: 'avatar_arcano_cosmico',
    name: 'Avatar Arcano Cósmico',
    category: 'Foto de perfil',
    itemType: 'avatar',
    pricePoints: 900,
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80',
    isOwned: false
  }
];

export const PointsShop: React.FC<PointsShopProps> = ({
  initialPoints = 0,
  onPointsUpdate
}) => {
  const [points, setPoints] = useState<number>(initialPoints);
  const [items, setItems] = useState<PointsShopItem[]>(fallbackPointsItems);
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [notification, setNotification] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  useEffect(() => {
    setPoints(initialPoints);
  }, [initialPoints]);

  useEffect(() => {
    const handlePointsEvent = (e: CustomEvent<{ points: number }>) => {
      if (e.detail && typeof e.detail.points === 'number') {
        setPoints(e.detail.points);
      }
    };
    window.addEventListener('mist:points-updated' as any, handlePointsEvent);
    return () => {
      window.removeEventListener('mist:points-updated' as any, handlePointsEvent);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadCatalog = async () => {
      try {
        const apiItems = await pointsShopApi.getItems();
        if (isMounted && Array.isArray(apiItems) && apiItems.length > 0) {
          setItems(apiItems.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category as any,
            itemType: item.item_type as any,
            pricePoints: item.price_points,
            image: item.asset_url,
            isOwned: item.is_owned
          })));
        }
      } catch {
        // Degradação graciosa
      }
    };
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePurchase = async (item: PointsShopItem) => {
    if (item.isOwned) return;

    if (points < item.pricePoints) {
      setNotification(`Saldo insuficiente de Pontos MIST para resgatar ${item.name}!`);
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    setIsPurchasing(item.id);
    try {
      const res = await pointsShopApi.purchase(item.id);
      setPoints(res.new_points_balance);
      if (onPointsUpdate) {
        onPointsUpdate(res.new_points_balance);
      }

      setItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, isOwned: true } : i))
      );

      setNotification(`Sucesso! ${item.name} foi adicionado ao seu inventário.`);
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      const msg = err?.message || 'Falha ao resgatar cosmético na Loja de Pontos.';
      setNotification(msg);
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsPurchasing(null);
    }
  };

  const filteredItems = items.filter(item => {
    if (activeCategory === 'todos' || activeCategory === 'destaques') return true;
    if (activeCategory === 'avatar') return item.itemType === 'avatar';
    if (activeCategory === 'avatar_frame') return item.itemType === 'avatar_frame';
    if (activeCategory === 'background') return item.itemType === 'background';
    if (activeCategory === 'emoticon') return item.itemType === 'emoticon';
    if (activeCategory === 'conjuntos') return item.itemType === 'profile_bundle';
    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-brand-bg text-gray-100">
      {/* Toast de Notificação */}
      {notification && (
        <div className="fixed top-20 right-8 z-50 bg-brand-surface border-2 border-brand-purple p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in">
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
            <p data-testid="points-shop-balance" className="text-xl font-display font-black text-white">
              {points.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Categorias Principais */}
        <div className="mb-6">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Categorias
          </span>
          <div className="space-y-1">
            <button
              onClick={() => setActiveCategory('todos')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeCategory === 'todos'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>Todos os Cosméticos</span>
              <i className="fa-solid fa-shapes text-[10px] text-brand-purple"></i>
            </button>
            <button
              onClick={() => setActiveCategory('avatar')}
              data-testid="category-avatars"
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeCategory === 'avatar'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>Fotos de Perfil</span>
              <i className="fa-solid fa-user-circle text-[10px] text-purple-400"></i>
            </button>
            <button
              onClick={() => setActiveCategory('avatar_frame')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeCategory === 'avatar_frame'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>Molduras de Avatar</span>
              <i className="fa-solid fa-circle-user text-[10px] text-cyan-400"></i>
            </button>
            <button
              onClick={() => setActiveCategory('background')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeCategory === 'background'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>Planos de Fundo</span>
              <i className="fa-solid fa-image text-[10px] text-emerald-400"></i>
            </button>
            <button
              onClick={() => setActiveCategory('emoticon')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeCategory === 'emoticon'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>Emoticons</span>
              <i className="fa-solid fa-face-smile text-[10px] text-yellow-400"></i>
            </button>
            <button
              onClick={() => setActiveCategory('conjuntos')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeCategory === 'conjuntos'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>Conjuntos de Perfil</span>
              <i className="fa-solid fa-box-archive text-[10px] text-purple-400"></i>
            </button>
          </div>
        </div>

        {/* Informação sobre pontos */}
        <div className="mt-auto p-4 bg-brand-card/60 border border-gray-800/70 rounded-2xl text-xs text-gray-400">
          <p className="font-bold text-gray-300 mb-1 flex items-center gap-1.5">
            <i className="fa-solid fa-circle-info text-cyan-400"></i> Acúmulo de Pontos
          </p>
          <p className="text-[11px] leading-relaxed">
            A cada R$ 1,00 gasto em jogos no MIST, você ganha 100 Pontos MIST para resgatar cosméticos permanentes!
          </p>
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
            Loja de MIST Points
          </h1>
          <p className="text-sm lg:text-base text-gray-300 max-w-xl font-medium mb-4">
            Personalize a sua experiência no MIST com molduras de avatar, planos de fundo exclusivos, e muito mais.
          </p>
        </div>

        {/* Grade de Itens */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-fire text-amber-400"></i> Cosméticos Disponíveis
            </h2>
            <span className="text-xs text-gray-400 bg-brand-surface px-3 py-1.5 rounded-lg border border-gray-700">
              {filteredItems.length} item(s) exibidos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-brand-card/90 rounded-2xl border border-gray-800 hover:border-brand-purple transition-all duration-300 overflow-hidden flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="relative h-44 overflow-hidden bg-brand-surface/80 flex items-center justify-center p-3">
                    {item.itemType === 'avatar_frame' ? (
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <img
                          src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=200&q=80"
                          alt="Avatar Demo"
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                        {(() => {
                          const isGold = item.id === 'frame_gold' || 
                            (item.image && (item.image.includes('1618005182384') || item.image.includes('gold'))) || 
                            (item.name && item.name.toLowerCase().includes('dourad'));
                          return (
                            <div
                              className={`absolute inset-0 rounded-2xl pointer-events-none border-4 transition-all duration-300 ${
                                isGold
                                  ? 'border-amber-400 ring-2 ring-amber-300/80 shadow-[0_0_25px_rgba(245,158,11,0.85)]'
                                  : 'border-cyan-400 ring-2 ring-cyan-300/80 shadow-[0_0_20px_rgba(6,182,212,0.7)]'
                              }`}
                            ></div>
                          );
                        })()}
                      </div>
                    ) : item.itemType === 'avatar' ? (
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-brand-purple/70 p-0.5 shadow-lg">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-full transition duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-xl transition duration-500 group-hover:scale-105"
                      />
                    )}
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
                      disabled={item.isOwned || isPurchasing === item.id}
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
                      ) : isPurchasing === item.id ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin text-xs"></i> Resgatando
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
