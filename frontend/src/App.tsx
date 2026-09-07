import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DownloadBar } from './components/DownloadBar';
import { Store } from './pages/Store';
import { Library } from './pages/Library';
import { Social } from './pages/Social';
import { News } from './pages/News';
import { PointsShop } from './pages/PointsShop';
import { Profile } from './pages/Profile';
import { NavigationTab, UserProfile } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('store');
  const [activeSubTab, setActiveSubTab] = useState<string>('destaques');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [user, setUser] = useState<UserProfile>({
    username: 'ggtorres2001',
    realName: 'Gabriel Torres',
    location: 'Rio Grande do Sul, Brazil',
    level: 7,
    avatarText: 'GG',
    avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=100&q=80',
    status: 'Online',
    walletBalance: 145.00,
    pointsBalance: 5348,
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
  });

  const handlePointsUpdate = (newBalance: number) => {
    setUser(prev => ({ ...prev, pointsBalance: newBalance }));
  };

  return (
    <div className="antialiased flex h-screen overflow-hidden bg-brand-bg text-gray-100 font-sans">
      {/* Sidebar Lateral Esquerdo com todas as opções */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
      />

      {/* Área Principal Scrollável */}
      <div className="flex-1 overflow-y-auto relative flex flex-col justify-between">
        <div>
          {/* Header Superior da Loja (exibido na Store e abas relevantes) */}
          {activeTab === 'store' && (
            <Header
              wishlistCount={32}
              walletBalance={user.walletBalance}
              onSearch={setSearchQuery}
              activeSubTab={activeSubTab}
              onSelectSubTab={setActiveSubTab}
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
              initialPoints={user.pointsBalance}
              onPointsUpdate={handlePointsUpdate}
            />
          )}

          {activeTab === 'profile' && <Profile user={user} />}
        </div>

        {/* Componente Flutuante de Download */}
        <DownloadBar />
      </div>
    </div>
  );
}
