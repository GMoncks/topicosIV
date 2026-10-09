# MIST — Multiplayer Instance for Steam-like Titles

O **MIST** é uma plataforma completa e distribuída inspirada no ecossistema da **Steam**, recriando de ponta a ponta a experiência de uma loja de jogos digitais, biblioteca com telemetria e execução nativa, rede social com mensagens e presença em tempo real, economia da comunidade (mercado e trocas diretas), inventário de cosméticos, cartas colecionáveis e insígnias com XP progressivo, conteúdos de comunidade (UGC: screenshots e workshop), fóruns, notificações push e agentes de inteligência artificial aplicados.

---

## 1. Comparação entre MIST e Steam

O MIST foi projetado para oferecer equivalência funcional em relação às principais capacidades da Steam:

| Funcionalidade | Steam (Proprietário) | MIST Ecosystem (Open Source) |
| :--- | :--- | :--- |
| **Arquitetura da Aplicação** | Cliente desktop C++ proprietário + Serviços em Nuvem | Web SPA React + TS + Arquitetura de Microsserviços Python/FastAPI |
| **Execução de Jogos** | Steam Client embutido + Motores 3D comerciais | **MIST Local Daemon** (HTTP `${DAEMON_HOST}:${PORT_DAEMON}`) executando binários/scripts nativos no SO |
| **Jogos MIST Studios vs Importados** | Todos os jogos são binários pesados compilados | **MIST Studios:** Mini-jogos 100% funcionais em Python console (`Forca`, `Labirinto`, `Quiz`).<br>**Comerciais Importados:** Scripts wrappers leves que simulam sessão e telemetria via MIST SDK. |
| **Integração de Telemetria** | Steamworks C++ / C# SDK | **MIST SDK** (`mist_sdk.py`): módulo stdlib-only em Python (zero dependências `pip`) com auto-recuperação e suporte offline |
| **Loja & Economia** | Cartão/Pix, Carteira Steam, Wishlist, Recomendações | Carteira MIST Virtual com recarga simulada, Checkout Saga compensatório, Wishlist e Recomendações por IA |
| **Avaliações (Reviews)** | Recomendações em texto, % de aprovação, votos úteis | Reviews relacionais por jogo, avaliações da plataforma MIST pela comunidade, horas jogadas e votos de utilidade |
| **Rede Social & Chat** | Amigos, Chat 1:1, Chat de Grupo, Status de Presença | Amigos reais, Chat 1:1 via WebSocket com emoticons animados inline, Chat de Grupo e Presença em Tempo Real (*Online*, *Jogando [Jogo]*, *Ausente*, *Offline*) |
| **Gamificação & XP** | Cartas, Drops por tempo de jogo, Crafting de Insígnias, Níveis | Drop probabilístico de cartas por pings de sessão, Quest Master por conquistas raras, Crafting de Insígnias e cálculo de Nível por $Level = \lfloor\sqrt{\text{total\_xp} / 100}\rfloor$ |
| **Mercado & Trocas** | Mercado da Comunidade + Trade Offers entre amigos | Mercado público de cosméticos/cartas em R$ + Ofertas de Troca Direta (Trade Offers) com trava atômica de segurança |
| **Loja de Pontos** | Molduras de avatar, planos de fundo, avatares e emoticons | Loja de Pontos alimentada por checkouts (100 pts / R$ 1,00) para compra e acoplamento direto no Perfil e Inventário |
| **Conteúdo de Comunidade (UGC)** | Screenshots com upload e Workshop de Mods/Skins | Galeria de screenshots com upload manual/SDK e curtidas + Workshop com upload de mods, busca por tags e subscrições |
| **Grupos & Fórum** | Grupos públicos/privados, salas de chat e Fórum de discussões | Grupos de comunidade com aba de membros, fórum de discussões (tópicos/respostas) e salas de chat WebSocket |
| **Agentes de IA** | Recomendadores algorítmicos clássicos | **MIST Curator** (vitrines personalizadas/tendências), **MIST Quest Master** (desafios) e **MIST Companion Bot** (amigo IA no chat) |

---

## 2. Decisões de Arquitetura e Stack Tecnológica

O sistema é estruturado como uma aplicação distribuída orientada a microsserviços, garantindo isolamento total de domínios, concorrência e independência de dados:

- **Backend:** Python 3.10+ / 3.12+ com **FastAPI**, **SQLAlchemy ORM** e **Pydantic v2**.
- **API Gateway:** Gateway centralizado em FastAPI com validação de tokens JWT (`${JWT_SECRET_KEY}`), eliminação de headers vulneráveis, injeção de cabeçalhos de identidade confiáveis (`X-User-Id`, `X-User-Username`), tratamento de CORS (`${CORS_ORIGINS}`) e proxy reverso assíncrono para HTTP REST e WebSockets.
- **Bancos de Dados Desacoplados:** SQLite com 6 arquivos `.db` totalmente isolados por serviço (`auth.db`, `store.db`, `library.db`, `social.db`, `market.db`, `ugc.db`), prevenindo acoplamentos diretos no banco de dados.
- **Mensageria e Tempo Real:** WebSockets assíncronos nativos para chat 1:1, salas de chat de grupo, canais de notificação push e difusão de presença (*Online*, *Ausente*, *Jogando [Jogo]*, *Offline*).
- **Frontend SPA:** **React 18** com **TypeScript**, empacotado via **Vite**, estilizado com **Tailwind CSS**, Context API para estado global (autenticação, carrinho, tema) e ícones FontAwesome.
- **Jogos MIST Studios:** Mini-jogos interativos em terminal console (`forca.py`, `labirinto.py`, `quiz.py`) desenvolvidos em Python nativo (`stdlib-only`, zero dependências pip) com SDK client-side (`mist_sdk.py`) para telemetria de playtime e desbloqueio de conquistas.
- **Jogos Comerciais / Importados:** Wrappers/scripts executáveis leves que utilizam o `mist_sdk.py` para simular início de sessão, heartbeat (ping) de tempo de jogo e obtenção de conquistas/cartas sem demandar o hardware ou motores 3D comerciais pesados dos jogos reais na máquina local.
- **MIST Local Daemon:** Serviço HTTP em background (`runner/mist_daemon.py` rodando em `${DAEMON_HOST}:${PORT_DAEMON}`) que transpõe o *sandbox* de segurança dos navegadores web. Permite que o clique no botão "Jogar" na SPA abra janelas de console nativas do SO com 1 clique (`iniciar_mist_daemon.bat`).
- **Automação de QA:** Pirâmide de testes completa com **Pytest** (backend), **Vitest** (frontend unitários/componentes), **Playwright** (E2E) e adaptador unificado de execução e relatórios (`runner_adapter.py` + `TESTS.md` + `resultados.json`).

---

## 3. Visão Geral dos Microsserviços e Componentes

```
┌───────────────────────────────────────────────────────────────────┐
│                    Frontend SPA (React 18 + TS + Vite)            │
└───────────────┬───────────────────────────────────▲───────────────┘
                │ HTTP REST /api/*                  │ WebSockets
                ▼                                   │ (Chat / Presença / Notificações)
┌───────────────────────────────────────────────────┴───────────────┐
│                 API Gateway (:${PORT_GATEWAY}) [FastAPI]          │
│   - Validação centralizada de JWT e injeção de X-User-Id          │
│   - Proxy reverso HTTP e tunelamento assíncrono de WebSockets     │
│   - Endpoints agregadores (Busca Global e Reviews do Sistema)     │
└───────┬──────────┬──────────┬──────────┬──────────┬───────────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
┌────────────┐┌────────────┐┌────────────┐┌────────────┐┌────────────┐┌────────────┐
│Auth Service││Store Service││Library Svc ││Social Service││Market Svc ││UGC Service │
│(:${PORT_AUTH})││(:${PORT_STORE})││(:${PORT_LIB}) ││(:${PORT_SOC}) ││(:${PORT_MKT}) ││(:${PORT_UGC}) │
│ [auth.db]  ││ [store.db] ││[library.db]││ [social.db]││ [market.db]││  [ugc.db]  │
└────────────┘└─────┬──────┘└─────▲──────┘└─────▲──────┘└────────────┘└────────────┘
                    │             │             │
                    │ Saga Checkout│ Telemetria  │ Atividades /
                    └─────────────┴─────────────┴ Presença
```

### Detalhamento dos Módulos:

1. **API Gateway (`gateway/`, porta `${PORT_GATEWAY}`):**
   - Roteamento central de `/api/*` para todos os microsserviços.
   - Proxy bidirecional de WebSockets em `/ws/chat/{room_id}`, `/ws/group/{group_id}/chat`, `/ws/presence` e `/ws/notifications`.
   - Sanitização de cabeçalhos externos e injeção dos headers verificados `X-User-Id` e `X-User-Username`.
   - Busca Global agregada (`GET /api/search?q=...`) e canal unificado de avaliações do sistema (`/api/system-reviews`).

2. **Auth Service (`services/auth-service/`, porta `${PORT_AUTH}`):**
   - Autenticação com cadastro, login JWT, hashing `bcrypt` e recarga instantânea de saldo na carteira (`POST /me/wallet/recharge`).
   - Gestão de Perfil: nome de usuário, nome real, bio, localização e foto de perfil (`AvatarSelectModal` com upload local ou avatares comprados).
   - Inventário do Usuário: guarda cosméticos, molduras de avatar, planos de fundo, avatares, emoticons, cartas colecionáveis e insígnias.
   - Engine de XP e Níveis: calculador de XP, progresso de nível e estatísticas.
   - Configurações Granulares de Privacidade (`PATCH /me/privacy`).

3. **Store Service (`services/store-service/`, porta `${PORT_STORE}`):**
   - Catálogo de jogos com filtros por gênero/preço, ordenação e paginação (5, 10, 15, 25, 50).
   - Wishlist (Lista de Desejos) com gestão dinâmica sem recarregamento.
   - Avaliações (Reviews): avaliações de jogos e avaliações gerais da plataforma MIST pela comunidade (`system_reviews`).
   - Checkout Saga: transação financeira compensatória com estorno automático de saldo se a concessão da licença falhar.
   - Agente **MIST AI Curator**: seções "Recomendado para Você", "Top Vendidos", "Em Alta" e "Alertas de Desconto".
   - Empacotador de downloads (.zip com executável Python, `mist_sdk.py` e `session.json`).

4. **Library Service (`services/library-service/`, porta `${PORT_LIBRARY}`):**
   - Validação de posse e licenças de jogos (`LibraryItem`).
   - Ciclo de vida de sessões (`/session/start`, `/session/ping`, `/session/end`) com acúmulo de tempo de jogo (*playtime*).
   - Sistema de Conquistas: persistência de conquistas desbloqueadas, notificações toast douradas, modal de detalhes com raridades e **MIST Quest Master** para troféus dinâmicos.
   - Algoritmo de drop de Trading Cards em pings de sessão de jogo.

5. **Social Service (`services/social-service/`, porta `${PORT_SOCIAL}`):**
   - Gestão de amizades reais e solicitações pendentes com ações de aceitar/recusar na interface.
   - Chat 1:1 via WebSocket com histórico persistido, indicador de digitação e parser de emoticons cosméticos animados inline.
   - Status de Presença em Tempo Real (*Online*, *Jogando [Jogo]*, *Ausente*, *Offline*).
   - Grupos e Fórums de Comunidade: criação de grupos, lista de membros, tópicos/respostas de discussão e salas de bate-papo de grupo via WebSocket (`/ws/group/{id}/chat`).
   - Agente **MIST Companion Bot**: amigo de IA interativo presente na lista de contatos.

6. **Market Service (`services/market-service/`, porta `${PORT_MARKET}`):**
   - Mercado da Comunidade: anunciar itens em R$ (`POST /market/list`), listar anúncios ativos (`GET /market/listings`), comprar com transação financeira compensatória e estorno de emergência (`POST /market/buy/{id}`) e cancelamento.
   - Ofertas de Troca Direta (Trade Offers): propor trocas de itens entre amigos (`POST /trades/offer`), aceitar (`POST /trades/{id}/accept`) com trava atômica de segurança nos itens de ambos os lados, ou recusar.
   - Extrato da Carteira (`GET /wallet/history`): histórico financeiro paginado com categorização de depósitos, compras na loja, compras no mercado, vendas e resgates.

7. **UGC Service (`services/ugc-service/`, porta `${PORT_UGC}`):**
   - Showcase de Capturas de Tela: upload manual via drag-and-drop ou automático via SDK Python (`take_screenshot()`), galeria com lightbox e curtidas.
   - Workshop de Conteúdo: upload de mods e skins, tags, busca por popularidade, contagem de subscrições e downloads.

8. **MIST Local Daemon (`runner/mist_daemon.py`, porta `${PORT_DAEMON}`):**
   - Servidor HTTP leve local em Python que recebe ordens da SPA web (`POST /launch`), descompacta o jogo em `~/.mist/installed/`, injeta o `session.json` e dispara o jogo em uma nova janela de terminal nativa (`iniciar_mist_daemon.bat`).

---

## 4. Como Rodar o Sistema (Localmente ou em VPS / Home-Server)

O ecossistema MIST oferece suporte tanto para desenvolvimento local ágil quanto para implantação em produção em uma **VPS** ou **Home-Server** (ex: CasaOS / Docker) com segurança Zero Trust.

---

### Opção 1: Execução Local via Docker Compose

Ideal para inicializar o cluster de microsserviços completo com um único comando.

#### Pré-requisitos:
- Docker e Docker Compose instalados.

#### Passos:
1. Copie o arquivo de variáveis de ambiente de exemplo:
   ```bash
   cp .env.example .env
   ```
2. Inicialize todos os containers:
   ```bash
   docker compose up --build
   ```
3. Acesse as aplicações nos pontos de terminação configurados:
   - **Frontend (Interface Web):** `http://${DAEMON_HOST}:${PORT_FRONTEND}`
   - **API Gateway (Swagger / OpenAPI):** `http://${DAEMON_HOST}:${PORT_GATEWAY}/docs`
   - **Auth Service:** `http://${DAEMON_HOST}:${PORT_AUTH}`
   - **Store Service:** `http://${DAEMON_HOST}:${PORT_STORE}`
   - **Library Service:** `http://${DAEMON_HOST}:${PORT_LIBRARY}`
   - **Social Service:** `http://${DAEMON_HOST}:${PORT_SOCIAL}`
   - **Market Service:** `http://${DAEMON_HOST}:${PORT_MARKET}`
   - **UGC Service:** `http://${DAEMON_HOST}:${PORT_UGC}`

4. **Para abrir os jogos nativos na sua máquina:**
   - Inicie o daemon na sua máquina host (fora do Docker):
     ```bash
     # Windows:
     .\iniciar_mist_daemon.bat

     # Linux / macOS:
     python runner/mist_daemon.py
     ```
   - Ao clicar em **"Jogar"** na Biblioteca web, o jogo abrirá nativamente no console!

---

### Opção 2: Modo Desenvolvimento Nativo (Sem Docker)

Ideal para desenvolvimento ativo com hot-reload rápido.

#### Pré-requisitos:
- Python 3.10+ e Node.js 18+ com npm.

#### 1. Configurar o Ambiente Virtual Python:
```bash
# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependências
pip install -r requirements-dev.txt
```

#### 2. Iniciar os Microsserviços Backend:
Execute cada serviço em terminais dedicados com o `.venv` ativo:
```bash
# Auth Service
uvicorn services.auth_service.app.main:app --port ${PORT_AUTH} --reload

# Store Service
uvicorn services.store_service.app.main:app --port ${PORT_STORE} --reload

# Library Service
uvicorn services.library_service.app.main:app --port ${PORT_LIBRARY} --reload

# Social Service
uvicorn services.social_service.app.main:app --port ${PORT_SOCIAL} --reload

# Market Service
uvicorn services.market_service.app.main:app --port ${PORT_MARKET} --reload

# API Gateway
uvicorn gateway.app.main:app --port ${PORT_GATEWAY} --reload
```

#### 3. Iniciar o Frontend SPA:
```bash
cd frontend
npm install
npm run dev
```
Acesse em: `http://${DAEMON_HOST}:${PORT_FRONTEND_DEV}`.

#### 4. Iniciar o MIST Local Daemon:
```bash
python runner/mist_daemon.py
```

---

### Opção 3: Deploy em Servidor / VPS / Home-Server (CasaOS)

Esta abordagem permite publicar o MIST na internet de forma segura, com atualização automática de imagens via **Watchtower** e publicação via **Cloudflare Tunnel Zero Trust** sem expor portas do host nem configurar NAT no roteador.

#### Arquitetura de Deploy:
- **Imagens GHCR:** O GitHub Actions gera as imagens `ghcr.io/gmoncks/topicosiv/mist-*:latest`.
- **Zero Port Exposure:** O container `cloudflared` conecta à rede `${MIST_NETWORK}` e roteia as requisições HTTPS diretamente para o `mist-frontend`, garantindo que nenhuma porta fique aberta na WAN.
- **Auto-Update Contínuo:** O container `mist-watchtower` realiza pull contínuo de novas imagens do GHCR e reinicia os serviços de forma autônoma.

#### Passos de Implantação:
1. No seu servidor/host CasaOS, crie a rede Docker isolada:
   ```bash
   docker network create mist-network
   ```
2. Configure o arquivo de ambiente `.env` com suas chaves:
   ```bash
   ENVIRONMENT=production
   TUNNEL_TOKEN=${TUNNEL_TOKEN}
   JWT_SECRET_KEY=${JWT_SECRET_KEY}
   CORS_ORIGINS=${CORS_ORIGINS}
   ```
3. Inicie o stack com o compose de produção:
   ```bash
   docker compose -f docker-compose.yml up -d
   ```
4. Configure o túnel no painel do Cloudflare Zero Trust apontando para o hostname interno do frontend:
   - **Service Type:** HTTP
   - **URL:** `mist-frontend:80` (ou IP local do servidor `${DAEMON_HOST}:${PORT_FRONTEND}`)

---

## 5. Testes e Automação de QA

O projeto implementa uma taxonomia rigorosa da pirâmide de testes catalogada em [`TESTS.md`](./TESTS.md) e normalizada atomicamente em [`resultados.json`](./resultados.json).

### Execução dos Testes Automatizados

Com o ambiente virtual ativado e a partir da raiz do repositório:

| Escopo | Runner | Comando |
| :--- | :--- | :--- |
| **Backend Completo** | `pytest` | `pytest` |
| **Auth Service** | `pytest` | `pytest services/auth-service/tests` |
| **Store Service** | `pytest` | `pytest services/store-service/tests` |
| **Library Service** | `pytest` | `pytest services/library-service/tests` |
| **Social Service** | `pytest` | `pytest services/social-service/tests` |
| **Market Service** | `pytest` | `pytest services/market-service/tests` |
| **API Gateway** | `pytest` | `pytest gateway/tests` |
| **Frontend Unitários & Componentes** | `vitest` | `npm --prefix frontend run test:unit` |
| **Sistema Completo (E2E)** | `playwright` | `npm --prefix frontend run test:e2e` |

### Execução via Runner Adapter (Skills de QA)
O script [`runner_adapter.py`](./.agents/skills/qa_tester/scripts/runner_adapter.py) grava atômica e automaticamente as métricas em `resultados.json`:

```bash
# Executar todos os testes catalogados
python .agents/skills/qa_tester/scripts/runner_adapter.py

# Executar por categoria
python .agents/skills/qa_tester/scripts/runner_adapter.py --categoria "Unitários"
python .agents/skills/qa_tester/scripts/runner_adapter.py --categoria "Integração"
```

---

## 6. Rastreamento Perpétuo de Prompts

O histórico e decisões técnicas de cada instrução são registrados incrementalmente no diretório [`prompts/`](./prompts/) sob arquivos diários nomeados no padrão `<user_dayth>.md` (exemplo: `gabriel-T800_2nd.md` ou `Gabriel_T_08th.md`).
O histórico consolidado das etapas iniciais está preservado em [`prompts/legacy_prompts.md`](./prompts/legacy_prompts.md).
