import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DownloadBar } from './components/DownloadBar';
import { AuthModal } from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Store } from './pages/Store';
import { Library } from './pages/Library';
import { Social } from './pages/Social';
import { News } from './pages/News';
import { PointsShop } from './pages/PointsShop';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { NavigationTab, UserProfile } from './types';

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

  const { user, logout, openAuthModal, updateUserBalance, isAuthenticated } = useAuth();

  // Se autenticado, usa os dados reais do usuário; se visitante, usa perfil de demonstração com saldos zerados
  const currentUser: UserProfile = user || defaultGuestUser;
  const wishlistCount = 0; // TODO: buscar da API de wishlist

  const handlePointsUpdate = (newBalance: number) => {
    updateUserBalance(undefined, newBalance);
  };

  return (
    <div className="antialiased flex h-screen overflow-hidden bg-brand-bg text-gray-100 font-sans">
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
            />
          )}

          {activeTab === 'library' && <Library />}

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
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

