import React from 'react';

interface HeroBannerProps {
  onViewOffers?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onViewOffers }) => {
  return (
    <div className="relative w-full h-[50vh] min-h-[350px] rounded-3xl overflow-hidden mb-12 shadow-2xl shadow-brand-purple/10 group cursor-pointer">
      <img
        src="https://placehold.co/1600x800/1F4D36/fff?text=FOCUS+ENTERTAINMENT"
        alt="Focus Promo"
        className="absolute inset-0 w-full h-full object-cover transition duration-1000 group-hover:scale-105 opacity-60 group-hover:opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-brand-bg via-brand-bg/60 to-transparent"></div>

      <div className="absolute bottom-10 left-10 z-20 max-w-2xl">
        <div className="bg-white text-black text-xs font-bold px-2.5 py-1 rounded mb-3 inline-block uppercase tracking-wider shadow">
          Promoção da Distribuidora
        </div>
        <h1 className="text-5xl lg:text-7xl font-display font-black text-white mb-4 leading-none">
          FOCUS<br />
          <span className="text-brand-purple text-4xl lg:text-5xl">ENTERTAINMENT</span>
        </h1>
        <p className="text-gray-300 text-lg mb-6 max-w-md">
          Descubra aventuras épicas com descontos de até 80% em títulos selecionados.
        </p>
        <button
          onClick={onViewOffers}
          className="bg-brand-purple hover:bg-brand-purpleDark text-white font-bold py-3 px-8 rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(160,32,240,0.5)]"
        >
          Ver Ofertas <i className="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
};
