import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, AuthLoginPayload, AuthRegisterPayload, AuthUserResponse, SESSION_EXPIRED_EVENT } from '../api/client';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionNotice: string | null;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (payload: AuthLoginPayload) => Promise<void>;
  register: (payload: AuthRegisterPayload) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  clearSessionNotice: () => void;
  updateUserBalance: (wallet?: number, points?: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapAuthUserToProfile(authUser: AuthUserResponse): UserProfile {
  return {
    username: authUser.username,
    realName: authUser.username,
    location: 'Brasil',
    level: authUser.level || 1,
    avatarText: authUser.username.slice(0, 2).toUpperCase(),
    avatarUrl: authUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${authUser.username}`,
    status: 'Online',
    walletBalance: authUser.wallet_balance ?? 200.0,
    pointsBalance: authUser.points_balance ?? 500,
    featuredBadge: {
      title: 'Pioneiro MIST',
      xp: 100,
      icon: 'fa-shield-halved',
    },
    recentPlaytimeWeeks: 0,
    recentGames: [],
    badges: [],
    stats: {
      gamesCount: 0,
      inventoryCount: 0,
      screenshotsCount: 0,
      videosCount: 0,
      workshopCount: 0,
      reviewsCount: 0,
    },
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('mist_token') : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const clearSessionNotice = useCallback(() => {
    setSessionNotice(null);
  }, []);

  const updateUserBalance = useCallback((wallet?: number, points?: number) => {
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        walletBalance: wallet !== undefined ? wallet : prev.walletBalance,
        pointsBalance: points !== undefined ? points : prev.pointsBalance,
      };
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentToken = typeof localStorage !== 'undefined' ? localStorage.getItem('mist_token') : null;
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const profile = await authApi.getMe();
      setUser(mapAuthUserToProfile(profile));
      setToken(currentToken);
    } catch {
      // Se falhar (ex: token inválido ou expirado), redefine para null
      setUser(null);
      setToken(null);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('mist_token');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (payload: AuthLoginPayload) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(payload);
      setToken(response.access_token);
      setUser(mapAuthUserToProfile(response.user));
      closeAuthModal();
      setSessionNotice(null);
    } finally {
      setIsLoading(false);
    }
  }, [closeAuthModal]);

  const register = useCallback(async (payload: AuthRegisterPayload) => {
    setIsLoading(true);
    try {
      const response = await authApi.register(payload);
      setToken(response.access_token);
      setUser(mapAuthUserToProfile(response.user));
      closeAuthModal();
      setSessionNotice(null);
    } finally {
      setIsLoading(false);
    }
  }, [closeAuthModal]);

  const logout = useCallback(() => {
    authApi.logout();
    setToken(null);
    setUser(null);
  }, []);

  // Escuta evento de 401 emitido pelo cliente HTTP
  useEffect(() => {
    const handleExpired = () => {
      setToken(null);
      setUser(null);
      setSessionNotice('Sua sessão expirou ou é inválida. Por favor, entre novamente.');
      openAuthModal('login');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
      return () => {
        window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
      };
    }
  }, [openAuthModal]);

  // Hidratação inicial
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    sessionNotice,
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
    refreshProfile,
    clearSessionNotice,
    updateUserBalance,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
