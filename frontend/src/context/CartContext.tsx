import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { GameItem } from '../types';

interface CartContextType {
  cart: GameItem[];
  addToCart: (game: GameItem) => void;
  removeFromCart: (gameId: string | number) => void;
  clearCart: () => void;
  toggleCart: (game: GameItem) => void;
  isInCart: (gameId: string | number) => boolean;
  totalPrice: number;
  totalCount: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'mist_shopping_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<GameItem[]>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sincroniza com localStorage
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } catch (err) {
        console.error('Erro ao persistir carrinho no localStorage:', err);
      }
    }
  }, [cart]);

  const isInCart = useCallback((gameId: string | number) => {
    const idStr = String(gameId);
    return cart.some(item => String(item.id) === idStr);
  }, [cart]);

  const addToCart = useCallback((game: GameItem) => {
    setCart(prev => {
      const exists = prev.some(item => String(item.id) === String(game.id));
      if (exists) return prev;
      return [...prev, game];
    });
  }, []);

  const removeFromCart = useCallback((gameId: string | number) => {
    const idStr = String(gameId);
    setCart(prev => prev.filter(item => String(item.id) !== idStr));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleCart = useCallback((game: GameItem) => {
    const idStr = String(game.id);
    setCart(prev => {
      const exists = prev.some(item => String(item.id) === idStr);
      if (exists) {
        return prev.filter(item => String(item.id) !== idStr);
      } else {
        return [...prev, game];
      }
    });
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const totalPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.currentPrice || 0), 0);
  }, [cart]);

  const totalCount = cart.length;

  const value: CartContextType = {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    toggleCart,
    isInCart,
    totalPrice,
    totalCount,
    isCartOpen,
    openCart,
    closeCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser utilizado dentro de um CartProvider');
  }
  return context;
};
