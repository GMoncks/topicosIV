import React from 'react';

export const About: React.FC = () => {
  return (
    <div className="min-h-full bg-[#0a0f14] text-gray-200 p-6 md:p-10 max-w-6xl mx-auto space-y-10">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-950/30 to-purple-950/20 border border-blue-500/30 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-400 text-xs font-semibold tracking-wide">
              <i className="fa-solid fa-graduation-cap"></i>
              Projeto Acadêmico — Tópicos em Inteligência Artificial
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white flex items-center gap-3">
              MIST
              <span className="text-xl md:text-2xl font-light text-blue-300">
                Multiplayer Instance for Steam-like Titles
              </span>
            </h1>
            <p className="text-gray-300 text-sm md:text-base max-w-2xl leading-relaxed">
              Plataforma distribuída orientada a microsserviços inspirada no ecossistema da Steam,
              unindo mensageria em tempo real, execução de jogos nativos, economia descentralizada e agentes de inteligência artificial.
            </p>
          </div>

          {/* GitHub CTA Button */}
          <div className="shrink-0 flex flex-col gap-2">
            <a
              href="https://github.com/GMoncks/topicosIV"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-white text-gray-900 hover:bg-gray-100 hover:shadow-lg hover:shadow-white/10 font-bold px-6 py-3.5 rounded-xl transition duration-200 cursor-pointer"
              data-testid="about-github-button"
            >
              <i className="fa-brands fa-github text-xl"></i>
              <span>Repositório GitHub</span>
              <i className="fa-solid fa-arrow-up-right-from-square text-xs text-gray-500"></i>
            </a>
            <span className="text-[11px] text-gray-400 text-center">
              Código aberto e documentação
            </span>
          </div>
        </div>
      </div>

      {/* 1. Comparação entre MIST e Steam */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
          <i className="fa-solid fa-scale-balanced text-blue-400 text-xl"></i>
          <h2 className="text-2xl font-bold text-white">1. Comparação Funcional: MIST vs Steam</h2>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">
          O MIST foi arquitetado para fornecer equivalência funcional em relação aos pilares do ecossistema Steam:
        </p>

        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#101822]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#172433] text-gray-300 font-semibold uppercase text-xs tracking-wider border-b border-gray-700">
              <tr>
                <th className="py-3 px-4">Funcionalidade</th>
                <th className="py-3 px-4">Steam (Proprietário)</th>
                <th className="py-3 px-4">MIST Ecosystem (Open Source)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80 text-gray-300">
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3 px-4 font-semibold text-white">Arquitetura</td>
                <td className="py-3 px-4">Cliente C++ desktop + Nuvem</td>
                <td className="py-3 px-4 text-blue-300">Web SPA React 18 + TS + Microsserviços Python/FastAPI</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3 px-4 font-semibold text-white">Execução de Jogos</td>
                <td className="py-3 px-4">Steam Client embutido</td>
                <td className="py-3 px-4 text-emerald-400 font-mono text-xs">MIST Local Daemon (${'{DAEMON_HOST}:${PORT_DAEMON}'}) nativo no SO</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3 px-4 font-semibold text-white">Jogos MIST Studios vs Importados</td>
                <td className="py-3 px-4">Binários pesados compilados</td>
                <td className="py-3 px-4">
                  <span className="text-yellow-300 font-semibold">MIST Studios:</span> Mini-jogos Python puro (Forca, Labirinto, Quiz).<br/>
                  <span className="text-indigo-300 font-semibold">Comerciais:</span> Wrappers leves com simulação de sessão via MIST SDK.
                </td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3 px-4 font-semibold text-white">Telemetria & SDK</td>
                <td className="py-3 px-4">Steamworks SDK (C++/C#)</td>
                <td className="py-3 px-4 font-mono text-xs text-blue-300">mist_sdk.py (stdlib-only, zero pip, resiliente offline)</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3 px-4 font-semibold text-white">Loja & Economia</td>
                <td className="py-3 px-4">Cartão/Pix, Carteira, Wishlist</td>
                <td className="py-3 px-4">Carteira Virtual simulada, Saga Checkout compensatório e Wishlist</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3 px-4 font-semibold text-white">Rede Social & Chat</td>
                <td className="py-3 px-4">Amigos, Chat 1:1, Grupos, Status</td>
                <td className="py-3 px-4">Chat 1:1 WebSocket com emoticons, Presença em tempo real e Grupos</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3 px-4 font-semibold text-white">Gamificação & XP</td>
                <td className="py-3 px-4">Cartas, Drops, Insígnias, Níveis</td>
                <td className="py-3 px-4">Drop probabilístico de cartas por ping, Crafting de Insígnias e XP progressivo</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3 px-4 font-semibold text-white">Mercado & UGC</td>
                <td className="py-3 px-4">Mercado da Comunidade + Workshop</td>
                <td className="py-3 px-4">Mercado em R$ com travas atômicas + Trades + UGC Screenshots e Mods</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3 px-4 font-semibold text-white">Agentes de IA</td>
                <td className="py-3 px-4">Algoritmos de recomendação clássicos</td>
                <td className="py-3 px-4 text-purple-300">MIST Curator, MIST Quest Master e MIST Companion Bot</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Decisões de Arquitetura e Stack Tecnológica */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
          <i className="fa-solid fa-cubes text-indigo-400 text-xl"></i>
          <h2 className="text-2xl font-bold text-white">2. Stack Tecnológica & Decisões Arquiteturais</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-bold">
              <i className="fa-brands fa-python text-lg"></i>
              <span>Backend Python & FastAPI</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              FastAPI assíncrono com SQLAlchemy ORM, validação Pydantic v2 e bancos de dados SQLite desacoplados por microsserviço.
            </p>
          </div>

          <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <i className="fa-brands fa-react text-lg"></i>
              <span>Frontend React 18 + TS</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              SPA com Vite, TypeScript rigoroso, estilização com Tailwind CSS, Context API e ícones FontAwesome.
            </p>
          </div>

          <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-2">
            <div className="flex items-center gap-2 text-green-400 font-bold">
              <i className="fa-solid fa-network-wired text-lg"></i>
              <span>API Gateway Centralizado</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Ponto único de entrada, sanitização de headers, injeção de identidade confiável, proxy reverso e tunelamento WebSocket.
            </p>
          </div>

          <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-2">
            <div className="flex items-center gap-2 text-yellow-400 font-bold">
              <i className="fa-solid fa-gamepad text-lg"></i>
              <span>MIST Local Daemon</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Servidor HTTP leve local que supera o sandbox dos navegadores web para lançar subprocessos e jogos nativos do SO.
            </p>
          </div>

          <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold">
              <i className="fa-solid fa-robot text-lg"></i>
              <span>Agentes de Inteligência Artificial</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Integração multimodelo (Gemini, OpenAI, Groq ou Mock determinístico local) para vitrines e assistente interativo.
            </p>
          </div>

          <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <i className="fa-solid fa-shield-halved text-lg"></i>
              <span>Qualidade & Pirâmide de QA</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Pytest para backend, Vitest para componentes React, Playwright para fluxos E2E e consolidação em TESTS.md.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Microsserviços e Domínios */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
          <i className="fa-solid fa-server text-emerald-400 text-xl"></i>
          <h2 className="text-2xl font-bold text-white">3. Microsserviços e Domínios</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-1.5">
            <h3 className="text-white font-bold flex items-center justify-between">
              <span>Auth Service</span>
              <span className="text-xs font-mono text-gray-400">${'{PORT_AUTH}'}</span>
            </h3>
            <p className="text-xs text-gray-400">
              Autenticação JWT, perfis customizáveis, carteira virtual, inventário unificado e cálculo de XP / níveis.
            </p>
          </div>

          <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-1.5">
            <h3 className="text-white font-bold flex items-center justify-between">
              <span>Store Service</span>
              <span className="text-xs font-mono text-gray-400">${'{PORT_STORE}'}</span>
            </h3>
            <p className="text-xs text-gray-400">
              Catálogo de títulos, wishlist dinâmica, Saga de checkout com compensação, curadoria por IA e avaliações de jogos e da plataforma.
            </p>
          </div>

          <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-1.5">
            <h3 className="text-white font-bold flex items-center justify-between">
              <span>Library Service</span>
              <span className="text-xs font-mono text-gray-400">${'{PORT_LIBRARY}'}</span>
            </h3>
            <p className="text-xs text-gray-400">
              Gestão de licenças adquiridas, telemetria de sessões e playtime, desbloqueio de conquistas e drop de trading cards.
            </p>
          </div>

          <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-1.5">
            <h3 className="text-white font-bold flex items-center justify-between">
              <span>Social Service</span>
              <span className="text-xs font-mono text-gray-400">${'{PORT_SOCIAL}'}</span>
            </h3>
            <p className="text-xs text-gray-400">
              Amizades bilaterais, chat 1:1 e de grupos via WebSockets, presença em tempo real, fóruns e MIST Companion Bot.
            </p>
          </div>

          <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-1.5">
            <h3 className="text-white font-bold flex items-center justify-between">
              <span>Market Service</span>
              <span className="text-xs font-mono text-gray-400">${'{PORT_MARKET}'}</span>
            </h3>
            <p className="text-xs text-gray-400">
              Mercado da comunidade com compra/venda em R$, propostas de trade direto entre amigos com trava atômica e extrato.
            </p>
          </div>

          <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-1.5">
            <h3 className="text-white font-bold flex items-center justify-between">
              <span>UGC Service</span>
              <span className="text-xs font-mono text-gray-400">${'{PORT_UGC}'}</span>
            </h3>
            <p className="text-xs text-gray-400">
              Galeria de capturas de tela com curtidas e Workshop de modificações (mods/skins) com contagem de downloads e subscrições.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Topologia e Deploy */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
          <i className="fa-solid fa-cloud-arrow-up text-sky-400 text-xl"></i>
          <h2 className="text-2xl font-bold text-white">4. Execução Local & Deploy em VPS / Home-Server</h2>
        </div>

        <div className="space-y-4 text-sm text-gray-300">
          <p className="leading-relaxed">
            O sistema suporta execução local ágil via Docker Compose e também deploy automatizado em servidores residenciais (Home-Servers com CasaOS) ou VPS:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-laptop-code text-blue-400"></i>
                Modo Local (Dev)
              </h4>
              <p className="text-xs text-gray-400">
                Executado com compose local ou processos nativos via <code>.venv</code> e <code>npm run dev</code>. Mapeamento de porta restrito ao loopback seguro para evitar exposição.
              </p>
            </div>

            <div className="bg-[#121a24] p-5 rounded-xl border border-gray-800 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-shield-virus text-emerald-400"></i>
                Modo Produção (VPS / CasaOS)
              </h4>
              <p className="text-xs text-gray-400">
                Utiliza imagens publicadas no GitHub Container Registry (GHCR), auto-update contínuo com Watchtower e publicação externa com <strong>Cloudflare Tunnel Zero Trust</strong> sem portas abertas no roteador.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
