import React from 'react';
import { GameItem } from '../types';

interface GameCardProps {
  game: GameItem;
  onSelect?: (game: GameItem) => void;
  isWishlisted?: boolean;
  isOwned?: boolean;
  onToggleWishlist?: (gameId: number, nextState: boolean) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onSelect,
  isWishlisted = false,
  isOwned = false,
  onToggleWishlist,
}) => {
  const formattedCurrentPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(game.currentPrice);

  const formattedOriginalPrice = game.originalPrice
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(game.originalPrice)
    : null;

  return (
    <div
      onClick={() => onSelect && onSelect(game)}
      className="bg-brand-card rounded-2xl overflow-hidden hover:ring-2 ring-brand-purple transition-all duration-300 group cursor-pointer shadow-lg flex flex-col justify-between"
    >
      <div>
        <div className="relative h-40 overflow-hidden">
          <img
            src={game.image}
            alt={game.title}
            className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
          />
          {game.category === 'DESEJO' ? (
            <div className="absolute top-2 left-2 bg-brand-purple/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-brand-purple flex items-center gap-1">
              <i className="fa-solid fa-heart"></i> DESEJO
            </div>
          ) : (
            <div className="absolute top-2 left-2 bg-brand-green/90 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-emerald-200 border border-emerald-500/40">
              {game.category}
            </div>
          )}

          {/* Botão Flutuante de Wishlist (C-10) */}
          {onToggleWishlist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWishlist(Number(game.id), !isWishlisted);
              }}
              className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 backdrop-blur-md cursor-pointer ${
                isWishlisted
                  ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/40 scale-105'
                  : 'bg-black/50 text-gray-300 hover:text-white hover:bg-black/70 hover:scale-110'
              }`}
              title={isWishlisted ? "Remover da Lista de Desejos" : "Adicionar à Lista de Desejos"}
              aria-label={isWishlisted ? "Remover da Lista de Desejos" : "Adicionar à Lista de Desejos"}
            >
              <i className={isWishlisted ? "fa-solid fa-heart text-xs" : "fa-regular fa-heart text-xs"}></i>
            </button>
          )}
        </div>

        <div className="p-4">
          <h4 className="font-bold text-lg mb-1 truncate text-white group-hover:text-brand-purple transition">
            {game.title}
          </h4>
          <p className="text-xs text-gray-400 mb-4 truncate">
            {game.publisherOrParent
              ? `Para: ${game.publisherOrParent}`
              : game.tags || 'Jogo em Destaque'}
          </p>
        </div>
      </div>

      <div className="p-4 pt-0">
        <div className="flex justify-between items-center border-t border-gray-800/60 pt-3">
          <div className="flex items-center gap-2">
            {isOwned ? (
              <span className="bg-emerald-600/90 text-white font-bold text-[11px] px-2.5 py-1 rounded border border-emerald-400/50 shadow-sm flex items-center gap-1.5">
                <i className="fa-solid fa-check text-[10px]"></i>
                <span>Adquirido</span>
              </span>
            ) : game.discountPercentage ? (
              <div className="bg-brand-green text-white font-bold text-xs px-2.5 py-1 rounded border border-emerald-600/40 shadow-sm">
                -{game.discountPercentage}%
              </div>
            ) : null}
          </div>

          <div className="text-right">
            {formattedOriginalPrice && (
              <span className="text-[10px] text-gray-500 line-through mr-1 block">
                {formattedOriginalPrice}
              </span>
            )}
            <span className="font-bold text-white">{formattedCurrentPrice}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
