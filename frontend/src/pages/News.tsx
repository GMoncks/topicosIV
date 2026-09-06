import React, { useState } from 'react';
import { NewsArticle } from '../types';

const mockNews: NewsArticle[] = [
  {
    id: 'n1',
    gameTitle: 'Call of Duty®: Modern Warfare 4',
    gameIcon: 'fa-shield-halved',
    libraryRelation: 'Na biblioteca',
    title: 'Announcing Call of Duty: Modern Warfare 4',
    dateLabel: '23 de out. — 01:00',
    timeframe: 'EM BREVE',
    content: 'This is Warfare Without Limits: Call of Duty®: Modern Warfare® 4 releases on Friday, October 23. Prepare for a worldwide campaign, next-gen multiplayer and the biggest warzone experience to date.',
    bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80',
    reminderScheduled: false,
    likesCount: 4911,
    commentsCount: 529
  },
  {
    id: 'n2',
    gameTitle: 'Hell is Us',
    gameIcon: 'fa-skull',
    libraryRelation: 'Na lista de desejos, Seguindo',
    title: 'Teaser Trailer - Major Update (10 New Hollow Walkers)',
    dateLabel: 'NOTÍCIAS 4 DE SET.',
    timeframe: 'SEXTA-FEIRA',
    content: "Today marks the first anniversary of Hell is Us, when you stepped into Hadea as Remi to fight the Calamity. In the last 12 months, we've been listening to community feedback to reshape our combat and exploration.",
    bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
    reminderScheduled: false,
    likesCount: 714,
    commentsCount: 46
  },
  {
    id: 'n3',
    gameTitle: 'Space Marine 2',
    gameIcon: 'fa-crosshairs',
    libraryRelation: 'Na biblioteca',
    title: 'Patch 4.0: Novo Modo Operações e Suporte a DLSS 3.5',
    dateLabel: 'ATUALIZAÇÃO 2 DE SET.',
    timeframe: 'RECENTES',
    content: 'O Imperador protege! O mais novo patch traz uma nova missão cooperativa nas profundezas da colmeia Avarax, ajustes no fuzil de plasma e correções de estabilidade no servidor multiplayer.',
    bannerImage: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=1000&q=80',
    reminderScheduled: true,
    likesCount: 1840,
    commentsCount: 230
  }
];

export const News: React.FC = () => {
  const [newsList, setNewsList] = useState<NewsArticle[]>(mockNews);
  const [activeFilter, setActiveFilter] = useState<string>('para_voce');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const toggleReminder = (id: string) => {
    setNewsList(prev =>
      prev.map(item =>
        item.id === id ? { ...item, reminderScheduled: !item.reminderScheduled } : item
      )
    );
  };

  const handleLike = (id: string) => {
    setNewsList(prev =>
      prev.map(item =>
        item.id === id ? { ...item, likesCount: item.likesCount + 1 } : item
      )
    );
  };

  const filteredNews = newsList.filter(item => {
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchGame = item.gameTitle.toLowerCase().includes(q);
      const matchContent = item.content.toLowerCase().includes(q);
      if (!matchTitle && !matchGame && !matchContent) return false;
    }

    if (activeFilter === 'futuros') {
      return item.timeframe === 'EM BREVE' || item.reminderScheduled;
    }
    if (activeFilter === 'biblioteca') {
      return item.libraryRelation === 'Na biblioteca';
    }

    return true;
  });

  const timeframes: ('EM BREVE' | 'SEXTA-FEIRA' | 'RECENTES')[] = ['EM BREVE', 'SEXTA-FEIRA', 'RECENTES'];

  return (
    <div className="flex-1 flex overflow-hidden bg-brand-bg text-gray-100">
      {/* Menu Lateral da Central de Notícias */}
      <aside className="w-64 lg:w-72 bg-brand-surface/80 border-r border-gray-800 flex flex-col p-6 overflow-y-auto shrink-0 select-none">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-800">
          <h2 className="text-xl font-display font-black tracking-wider text-white">
            CENTRAL DE NOTÍCIAS DO MIST
          </h2>
          <i className="fa-solid fa-angles-left text-gray-500 text-sm cursor-pointer hover:text-white transition"></i>
        </div>

        {/* Grupo 1: Seus Eventos e Notícias */}
        <div className="mb-6">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Seus eventos e notícias
          </span>
          <div className="space-y-1">
            <button
              onClick={() => setActiveFilter('para_voce')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeFilter === 'para_voce'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <div>
                <p className="font-bold">PARA VOCÊ</p>
                <p className="text-[10px] text-gray-400 font-normal">Personalizado</p>
              </div>
              <i className="fa-solid fa-sparkles text-brand-purple text-xs"></i>
            </button>

            <button
              onClick={() => setActiveFilter('futuros')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeFilter === 'futuros'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <div>
                <p className="font-bold">SEUS EVENTOS FUTUROS</p>
                <p className="text-[10px] text-gray-400 font-normal">Personalizado</p>
              </div>
              <span className="bg-brand-purple text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                1
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('biblioteca')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeFilter === 'biblioteca'
                  ? 'bg-brand-green/30 text-emerald-200 border-l-4 border-brand-green'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <div>
                <p className="font-bold">DA SUA BIBLIOTECA</p>
                <p className="text-[10px] text-gray-400 font-normal">Jogos que você possui</p>
              </div>
              <i className="fa-solid fa-gamepad text-emerald-400 text-xs"></i>
            </button>
          </div>
        </div>

        {/* Grupo 2: Notícias Globais */}
        <div className="mb-6">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Notícias e eventos globais
          </span>
          <div className="space-y-1">
            <button
              onClick={() => setActiveFilter('destaques')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeFilter === 'destaques'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <div>
                <p className="font-bold">DESTAQUES</p>
                <p className="text-[10px] text-gray-400 font-normal">Fontes mais populares</p>
              </div>
              <i className="fa-solid fa-fire text-orange-400 text-xs"></i>
            </button>

            <button
              onClick={() => setActiveFilter('mist_blog')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeFilter === 'mist_blog'
                  ? 'bg-brand-purple/20 text-white border-l-4 border-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <div>
                <p className="font-bold">MIST OFICIAL</p>
                <p className="text-[10px] text-gray-400 font-normal">Blog e notas de atualização</p>
              </div>
              <i className="fa-solid fa-bullhorn text-brand-purple text-xs"></i>
            </button>
          </div>
        </div>

        {/* Grupo 3: Busca */}
        <div className="mb-6">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Buscar notícias
          </span>
          <div className="bg-brand-card rounded-xl flex items-center px-3 py-2 border border-gray-700 focus-within:border-brand-purple">
            <i className="fa-solid fa-search text-gray-500 text-xs"></i>
            <input
              type="text"
              placeholder="Nome do jogo ou tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white ml-2 w-full"
            />
          </div>
        </div>

        {/* Grupo 4: Descobrir */}
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Descobrir
          </span>
          <div className="space-y-1">
            <button className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 flex items-center gap-2">
              <i className="fa-solid fa-users-viewfinder text-brand-purple"></i> Curadores
            </button>
            <button className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 flex items-center gap-2">
              <i className="fa-solid fa-ticket text-brand-green"></i> Eventos Promocionais
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal do Feed de Notícias */}
      <main className="flex-1 overflow-y-auto p-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-black text-white flex items-center gap-3">
            <i className="fa-solid fa-newspaper text-brand-purple"></i> Central de Notícias MIST
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Atualizações, lançamentos futuros e novidades dos jogos da sua biblioteca e lista de desejos.
          </p>
        </div>

        {timeframes.map(timeframe => {
          const itemsInTimeframe = filteredNews.filter(n => n.timeframe === timeframe);
          if (itemsInTimeframe.length === 0) return null;

          return (
            <div key={timeframe} className="mb-12">
              <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-800">
                <span className="text-xs font-display font-black tracking-widest text-brand-purple uppercase">
                  {timeframe}
                </span>
                <div className="flex-1 h-px bg-gray-800"></div>
              </div>

              <div className="space-y-8">
                {itemsInTimeframe.map(news => (
                  <article
                    key={news.id}
                    className="bg-brand-card/90 rounded-2xl border border-gray-800 overflow-hidden hover:border-brand-purple/50 transition-all duration-300 shadow-xl"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
                      {/* Banner do Jogo */}
                      <div className="md:col-span-5 relative rounded-xl overflow-hidden min-h-[190px]">
                        <img
                          src={news.bannerImage}
                          alt={news.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      </div>

                      {/* Informações da Notícia */}
                      <div className="md:col-span-7 flex flex-col justify-between">
                        <div>
                          {/* Relação com a Biblioteca */}
                          <div className="flex items-center gap-2 mb-2">
                            <i className={`fa-solid ${news.gameIcon || 'fa-gamepad'} text-xs text-gray-400`}></i>
                            <span className="text-xs font-bold text-gray-300">{news.gameTitle}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                news.libraryRelation === 'Na biblioteca'
                                  ? 'bg-brand-green/80 text-emerald-200 border border-emerald-500/40'
                                  : 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30'
                              }`}
                            >
                              {news.libraryRelation}
                            </span>
                          </div>

                          {/* Título & Data */}
                          <h3 className="text-xl font-display font-black text-white hover:text-brand-purple cursor-pointer transition mb-1">
                            {news.title}
                          </h3>
                          <p className="text-xs font-semibold text-cyan-400 mb-3">{news.dateLabel}</p>

                          {/* Descrição */}
                          <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
                            {news.content}
                          </p>
                        </div>

                        {/* Ações e Métricas */}
                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-800/80">
                          {news.timeframe === 'EM BREVE' ? (
                            <button
                              onClick={() => toggleReminder(news.id)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                                news.reminderScheduled
                                  ? 'bg-brand-green text-emerald-100 border border-emerald-500'
                                  : 'bg-brand-purple hover:bg-brand-purpleDark text-white shadow-[0_0_10px_rgba(160,32,240,0.4)]'
                              }`}
                            >
                              <i className={`fa-solid ${news.reminderScheduled ? 'fa-check' : 'fa-bell'}`}></i>
                              {news.reminderScheduled ? 'Lembrete Agendado' : 'Agendar lembrete'}
                            </button>
                          ) : (
                            <button className="text-xs font-bold text-brand-purple hover:underline flex items-center gap-1.5">
                              Ler artigo completo <i className="fa-solid fa-arrow-right text-[10px]"></i>
                            </button>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <button
                              onClick={() => handleLike(news.id)}
                              className="flex items-center gap-1.5 hover:text-white transition"
                              title="Curtir"
                            >
                              <i className="fa-regular fa-thumbs-up"></i>
                              <span>{news.likesCount.toLocaleString('pt-BR')}</span>
                            </button>
                            <span className="flex items-center gap-1.5">
                              <i className="fa-regular fa-comment"></i>
                              <span>{news.commentsCount}</span>
                            </span>
                            <button className="hover:text-white transition" title="Compartilhar">
                              <i className="fa-solid fa-share-nodes"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}

        {filteredNews.length === 0 && (
          <div className="text-center py-16 bg-brand-card/40 rounded-2xl border border-gray-800">
            <i className="fa-solid fa-newspaper text-4xl text-gray-600 mb-3"></i>
            <p className="text-gray-400 font-medium">Nenhuma notícia encontrada para os filtros selecionados.</p>
          </div>
        )}
      </main>
    </div>
  );
};
