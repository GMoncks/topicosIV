import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { CartProvider, useCart } from './CartContext';
import { GameItem } from '../types';

describe('CartContext (Shopping Cart Unit Tests)', () => {
  const mockGame1: GameItem = {
    id: '1',
    title: 'Hollow Knight',
    category: 'JOGO',
    currentPrice: 46.99,
    image: 'http://img1.jpg',
  };

  const mockGame2: GameItem = {
    id: '2',
    title: 'Celeste',
    category: 'JOGO',
    currentPrice: 36.90,
    image: 'http://img2.jpg',
  };

  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  it('deve inicializar com carrinho vazio e total zero', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.cart).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
    expect(result.current.isCartOpen).toBe(false);
  });

  it('deve adicionar jogos ao carrinho e calcular total acumulado', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockGame1);
    });

    expect(result.current.totalCount).toBe(1);
    expect(result.current.isInCart('1')).toBe(true);
    expect(result.current.totalPrice).toBe(46.99);

    act(() => {
      result.current.addToCart(mockGame2);
    });

    expect(result.current.totalCount).toBe(2);
    expect(result.current.isInCart('2')).toBe(true);
    expect(result.current.totalPrice).toBeCloseTo(83.89, 2);
  });

  it('deve alternar itens via toggleCart (adicionar e remover)', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    // 1º toggle -> adiciona
    act(() => {
      result.current.toggleCart(mockGame1);
    });
    expect(result.current.isInCart('1')).toBe(true);

    // 2º toggle -> remove
    act(() => {
      result.current.toggleCart(mockGame1);
    });
    expect(result.current.isInCart('1')).toBe(false);
    expect(result.current.totalCount).toBe(0);
  });

  it('deve abrir e fechar a gaveta do carrinho', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.openCart();
    });
    expect(result.current.isCartOpen).toBe(true);

    act(() => {
      result.current.closeCart();
    });
    expect(result.current.isCartOpen).toBe(false);
  });

  it('deve esvaziar carrinho com clearCart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockGame1);
      result.current.addToCart(mockGame2);
    });
    expect(result.current.totalCount).toBe(2);

    act(() => {
      result.current.clearCart();
    });
    expect(result.current.totalCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });
});
