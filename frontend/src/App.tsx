import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DownloadBar } from './components/DownloadBar';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Store } from './pages/Store';
import { Library } from './pages/Library';
import { Social } from './pages/Social';
import { News } from './pages/News';
import { PointsShop } from './pages/PointsShop';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { NavigationTab, UserProfile } from './types';
import { storeApi, libraryApi } from './api/client';


const defaultGuestUser: UserProfile = {
  username: 'ggtorres2001',
  realName: 'Gabriel Torres',
  location: 'Rio Grande do Sul, Brazil',
  level: 7,
  avatarText: 'GG',
  avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=100&q=80',
  status: 'Online',
  walletBalance: 0.00,
  pointsBalance: 0,
  featuredBadge: {
    title: 'Acumulador Adepto',
    xp: 190,
    icon: 'fa-certificate'
  },
  recentPlaytimeWeeks: 8.7,
  recentGames: [],
  badges: [],
  stats: {
    gamesCount: 22,
    inventoryCount: 45,
    screenshotsCount: 18,
    videosCount: 3,
    workshopCount: 1,
    reviewsCount: 12
  }
};

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('store');
  const [activeSubTab, setActiveSubTab] = useState<string>('destaques');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [achievementToast, setAchievementToast] = useState<{
    achievement_id: string;
    name: string;
    description?: string;
    rarity?: string;
  } | null>(null);
  const seenAchievementsRef = useRef<Set<string>>(new Set());
  const lastAchievementCheckRef = useRef<string>(new Date().toISOString());

  const { user, logout, openAuthModal, updateUserBalance, isAuthenticated } = useAuth();

  const fetchWishlistCount = useCallback(async () => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mist_token') : null;
    if (!token) {
      setWishlistCount(0);
      return;
    }
    try {
      const items = await storeApi.getWishlist();
      if (Array.isArray(items)) {
        setWishlistCount(items.length);
      }
    } catch {
      setWishlistCount(0);
    }
  }, []);

  useEffect(() => {
    fetchWishlistCount();
    const handleUpdate = () => fetchWishlistCount();
    window.addEventListener('mist:wishlist-updated', handleUpdate);
    return () => window.removeEventListener('mist:wishlist-updated', handleUpdate);
  }, [fetchWishlistCount, isAuthenticated]);

  // Listener para toasts globais (ex: 'Usuário não autenticado. Realize o login') com auto-dismiss em 5s
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleToast = (e: CustomEvent<string>) => {
      setToastMessage(e.detail);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    };

    window.addEventListener('mist:toast' as any, handleToast);
    return () => {
      window.removeEventListener('mist:toast' as any, handleToast);
      clearTimeout(timer);
    };
  }, []);

  // Polling leve e listener para Conquistas Desbloqueadas (E-07)
  useEffect(() => {
    let dismissTimer: NodeJS.Timeout;
    const showAchievementToast = (ach: { achievement_id: string; name: string; description?: string; rarity?: string }) => {
      setAchievementToast(ach);
      clearTimeout(dismissTimer);
      dismissTimer = setTimeout(() => {
        setAchievementToast(null);
      }, 6000);
    };

    // Escuta evento customizado de conquista desbloqueada disparado no frontend
    const handleLocalUnlock = (e: CustomEvent<{ achievement_id: string; name: string; description?: string; rarity?: string }>) => {
      if (e.detail && e.detail.achievement_id) {
        seenAchievementsRef.current.add(e.detail.achievement_id);
        showAchievementToast(e.detail);
      }
    };
    window.addEventListener('mist:achievement-unlocked' as any, handleLocalUnlock);

    // Polling leve a cada 6 segundos se o usuário estiver autenticado
    const interval = setInterval(async () => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mist_token') : null;
      if (!token && !isAuthenticated) return;

      try {
        const recent = await libraryApi.getRecentAchievements(lastAchievementCheckRef.current);
        if (Array.isArray(recent) && recent.length > 0) {
          for (const ach of recent) {
            if (!seenAchievementsRef.current.has(ach.achievement_id)) {
              seenAchievementsRef.current.add(ach.achievement_id);
              showAchievementToast(ach);
              window.dispatchEvent(
                new CustomEvent('mist:achievement-unlocked', { detail: ach })
              );
            }
          }
        }
        lastAchievementCheckRef.current = new Date().toISOString();
      } catch {
        // Degradação graciosa e silenciosa de rede
      }
    }, 6000);

    return () => {
      window.removeEventListener('mist:achievement-unlocked' as any, handleLocalUnlock);
      clearInterval(interval);
      clearTimeout(dismissTimer);
    };
  }, [isAuthenticated]);

  // Se autenticado, usa os dados reais do usuário; se visitante, usa perfil de demonstração com saldos zerados
  const currentUser: UserProfile = user || defaultGuestUser;

  const handlePointsUpdate = (newBalance: number) => {
    updateUserBalance(undefined, newBalance);
  };

  return (
    <div className="antialiased flex h-screen overflow-hidden bg-brand-bg text-gray-100 font-sans">
      {/* Toast de Notificação Global no canto superior direito */}
      {toastMessage && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed top-6 right-6 z-[200] max-w-sm bg-brand-surface/95 border border-amber-500/50 text-amber-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in transition-all duration-300"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-circle-exclamation text-base"></i>
          </div>
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
          <button 
            type="button"
            onClick={() => setToastMessage(null)} 
            className="text-amber-400/60 hover:text-white transition ml-auto p-1 cursor-pointer"
            aria-label="Fechar notificação"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      )}

      {/* Toast exclusivo de Conquista Desbloqueada (E-07) */}
      {achievementToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-6 z-[200] max-w-md bg-brand-surface/95 border-2 border-yellow-500/70 text-yellow-100 px-4 py-3.5 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.35)] backdrop-blur-md flex items-center gap-3.5 animate-fade-in transition-all duration-300"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-500/30 to-amber-600/30 border border-yellow-400/40 text-yellow-300 flex items-center justify-center shrink-0 shadow-inner text-xl">
            <i className="fa-solid fa-trophy"></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-wider font-extrabold uppercase bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/30">
                Conquista Desbloqueada
              </span>
              {achievementToast.rarity && (
                <span className="text-[10px] text-gray-400 font-semibold">
                  • {achievementToast.rarity}
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white truncate mt-0.5">
              {achievementToast.name}
            </h4>
            {achievementToast.description && (
              <p className="text-xs text-gray-300 truncate">
                {achievementToast.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAchievementToast(null)}
            className="text-yellow-400/60 hover:text-white transition ml-auto p-1 cursor-pointer"
            aria-label="Fechar notificação de conquista"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      )}


      {/* Modal global de autenticação (Login e Cadastro com R$ 200 de boas-vindas) */}
      <AuthModal />

      {/* Sidebar Lateral Esquerdo */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onOpenAuth={() => openAuthModal('login')}
        onLogout={logout}
      />

      {/* Área Principal Scrollável */}
      <div className="flex-1 overflow-y-auto relative flex flex-col justify-between">
        <div>
          {/* Header Superior da Loja */}
          {activeTab === 'store' && (
            <Header
              wishlistCount={wishlistCount}
              walletBalance={currentUser.walletBalance}
              onSearch={setSearchQuery}
              activeSubTab={activeSubTab}
              onSelectSubTab={setActiveSubTab}
              isGuest={!isAuthenticated}
              onOpenAuth={() => openAuthModal('login')}
            />
          )}

          {/* Renderização das Telas MIST */}
          {activeTab === 'store' && (
            <Store
              searchQuery={searchQuery}
              activeSubTab={activeSubTab}
              onNavigateToLibrary={() => setActiveTab('library')}
            />
          )}

          {activeTab === 'library' && (
            <Library onNavigateToStore={() => setActiveTab('store')} />
          )}

          {activeTab === 'social' && <Social />}

          {activeTab === 'news' && <News />}

          {activeTab === 'points' && (
            <PointsShop
              initialPoints={currentUser.pointsBalance}
              onPointsUpdate={handlePointsUpdate}
            />
          )}

          {activeTab === 'profile' && <Profile user={currentUser} />}

          {activeTab === 'login' && (
            <Login onLoginSuccess={() => setActiveTab('store')} />
          )}
        </div>

        {/* Componente Flutuante de Download */}
        <DownloadBar />

        {/* Gaveta do Carrinho de Compras */}
        <CartDrawer onNavigateToLibrary={() => setActiveTab('library')} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}

