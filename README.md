# MIST — Multiplayer Instance for Steam-like Titles

O **MIST** é uma plataforma completa e distribuída inspirada no ecossistema da **Steam**, recriando de ponta a ponta a experiência de uma loja de jogos digitais, biblioteca com telemetria e execução nativa, rede social com mensagens e presença em tempo real, economia da comunidade (mercado e trocas diretas), inventário de cosméticos, cartas colecionáveis e insígnias com XP progressivo, conteúdos de comunidade (UGC: screenshots e workshop), fóruns, notificações push e agentes de inteligência artificial aplicados.

---

## 1. Comparação entre MIST e Steam

O MIST foi projetado para oferecer equivalência funcional em relação às principais capacidades da Steam:

| Funcionalidade | Steam (Proprietário) | MIST Ecosystem (Open Source) |
| :--- | :--- | :--- |
| **Arquitetura da Aplicação** | Cliente desktop C++ proprietário + Serviços em Nuvem | Web SPA React + TS + Arquitetura de Microsserviços Python/FastAPI |
| **Execução de Jogos** | Steam Client embutido + Motores 3D comerciais | **MIST Local Daemon** (HTTP `127.0.0.1:39090`) executando binários/scripts nativos no SO |
| **Jogos MIST Studios vs Importados** | Todos os jogos são binários pesados compilados | **MIST Studios:** Mini-jogos 100% funcionais em Python console (`Forca`, `Labirinto`, `Quiz`).<br>**Comerciais Importados:** Scripts wrappers leves que simulam sessão e telemetria via MIST SDK. |
| **Integração de Telemetria** | Steamworks C++ / C# SDK | **MIST SDK** (`mist_sdk.py`): módulo stdlib-only em Python (zero dependências `pip`) com auto-recuperação e suporte offline |
| **Loja & Economia** | Cartão/Pix, Carteira Steam, Wishlist, Recomendações | Carteira MIST Virtual com recarga simulada, Checkout Saga compensatório, Wishlist e Recomendações por IA |
| **Avaliações (Reviews)** | Recomendações em texto, % de aprovação, votos úteis | Reviews relacionais por jogo, score % automático de aprovação ("Muito Positivo"), horas jogadas e votos de utilidade |
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
- **API Gateway:** Gateway centralizado em FastAPI com validação de tokens JWT, eliminação de headers vulneráveis, injeção de cabeçalhos de identidade confiáveis (`X-User-Id`), tratamento de CORS e proxy reverso assíncrono para HTTP REST e WebSockets.
- **Bancos de Dados Desacoplados:** SQLite com 6 arquivos `.db` totalmente isolados por serviço (`auth.db`, `store.db`, `library.db`, `social.db`, `market.db`, `ugc.db`), prevenindo acoplamentos diretos no banco de dados.
- **Mensageria e Tempo Real:** WebSockets assíncronos nativos para chat 1:1, salas de chat de grupo, canais de notificação push e difusão de presença (*Online*, *Ausente*, *Jogando [Jogo]*, *Offline*).
- **Frontend SPA:** **React 18** com **TypeScript**, empacotado via **Vite**, estilizado com **Tailwind CSS**, Context API para estado global (autenticação, carrinho, tema) e ícones FontAwesome.
- **Jogos MIST Studios:** Mini-jogos interativos em terminal console (`forca.py`, `labirinto.py`, `quiz.py`) desenvolvidos em Python nativo (`stdlib-only`, zero dependências pip) com SDK client-side (`mist_sdk.py`) para telemetria de playtime e desbloqueio de conquistas.
- **Jogos Comerciais / Importados:** Wrappers/scripts executáveis leves que utilizam o `mist_sdk.py` para simular início de sessão, heartbeat (ping) de tempo de jogo e obtenção de conquistas/cartas sem demandar o hardware ou motores 3D comerciais pesados dos jogos reais na máquina local.
- **MIST Local Daemon:** Serviço HTTP em background (`runner/mist_daemon.py` rodando em `127.0.0.1:39090`) que transpõe o *sandbox* de segurança dos navegadores web. Permite que o clique no botão "Jogar" na SPA abra janelas de console nativas do SO com 1 clique (`iniciar_mist_daemon.bat`).
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
│                 API Gateway (:8000) [FastAPI]                     │
│   - Validação centralizada de JWT e injeção de X-User-Id          │
│   - Proxy reverso HTTP e tunelamento assíncrono de WebSockets     │
│   - Endpoints agregadores (Busca Global)                          │
└───────┬──────────┬──────────┬──────────┬──────────┬───────────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
┌────────────┐┌────────────┐┌────────────┐┌────────────┐┌────────────┐┌────────────┐
│Auth Service││Store Service││Library Svc ││Social Service││Market Svc ││UGC Service │
│  (:8001)   ││  (:8002)   ││  (:8003)   ││  (:8004)   ││  (:8005)   ││  (:8006)   │
│ [auth.db]  ││ [store.db] ││[library.db]││ [social.db]││ [market.db]││  [ugc.db]  │
└────────────┘└─────┬──────┘└─────▲──────┘└─────▲──────┘└────────────┘└────────────┘
                    │             │             │
                    │ Saga Checkout│ Telemetria  │ Atividades /
                    └─────────────┴─────────────┴ Presença
```

### Detalhamento dos Módulos:

1. **API Gateway (`gateway/`, porta `8000`):**
   - Roteamento central de `/api/*` para todos os microsserviços.
   - Proxy bidirecional de WebSockets em `/ws/chat/{room_id}`, `/ws/group/{group_id}/chat`, `/ws/presence` e `/ws/notifications`.
   - Sanitização de cabeçalhos externos e injeção do header verificado `X-User-Id`.
   - Busca Global agregada (`GET /api/search?q=...`) consultando serviços assincronamente.

2. **Auth Service (`services/auth-service/`, porta `8001`):**
   - Autenticação com cadastro, login JWT, hashing `bcrypt` e recarga instantânea de saldo na carteira (`POST /me/wallet/recharge`).
   - Gestão de Perfil: nome de usuário, nome real, bio, localização e foto de perfil (`AvatarSelectModal` com upload local ou avatares comprados).
   - Inventário do Usuário: guarda cosméticos, molduras de avatar, planos de fundo, avatares, emoticons, cartas colecionáveis e insígnias.
   - Engine de XP e Níveis: calculador de XP, progresso de nível e estatísticas.
   - Configurações Granulares de Privacidade (`PATCH /me/privacy`).

3. **Store Service (`services/store-service/`, porta `8002`):**
   - Catálogo de jogos com filtros por gênero/preço, ordenação e paginação (5, 10, 15, 25, 50).
   - Wishlist (Lista de Desejos) com gestão dinâmica sem recarregamento.
   - Avaliações (Reviews): nota % de aprovação ("Muito Positivo"), comentários, horas jogadas e votos de utilidade.
   - Checkout Saga: transação financeira compensatória com estorno automático de saldo se a concessão da licença falhar.
   - Agente **MIST AI Curator**: seções "Recomendado para Você", "Top Vendidos", "Em Alta" e "Alertas de Desconto".
   - Empacotador de downloads (.zip com executável Python, `mist_sdk.py` e `session.json`).

4. **Library Service (`services/library-service/`, porta `8003`):**
   - Validação de posse e licenças de jogos (`LibraryItem`).
   - Ciclo de vida de sessões (`/session/start`, `/session/ping`, `/session/end`) com acúmulo de tempo de jogo (*playtime*).
   - Sistema de Conquistas: persistência de conquistas desbloqueadas, notificações toast douradas, modal de detalhes com raridades e **MIST Quest Master** para troféus dinâmicos.
   - Algoritmo de drop de Trading Cards em pings de sessão de jogo.

5. **Social Service (`services/social-service/`, porta `8004`):**
   - Gestão de amizades reais e solicitações pendentes com ações de aceitar/recusar na interface.
   - Chat 1:1 via WebSocket com histórico persistido, indicador de digitação e parser de emoticons cosméticos animados inline.
   - Status de Presença em Tempo Real (*Online*, *Jogando [Jogo]*, *Ausente*, *Offline*).
   - Grupos e Fórums de Comunidade: criação de grupos, lista de membros, tópicos/respostas de discussão e salas de bate-papo de grupo via WebSocket (`/ws/group/{id}/chat`).
   - Agente **MIST Companion Bot**: amigo de IA interativo presente na lista de contatos.

6. **Market Service (`services/market-service/`, porta `8005`):**
   - Mercado da Comunidade: anunciar itens em R$ (`POST /market/list`), listar anúncios ativos (`GET /market/listings`), comprar com transação financeira compensatória e estorno de emergência (`POST /market/buy/{id}`) e cancelamento.
   - Ofertas de Troca Direta (Trade Offers): propor trocas de itens entre amigos (`POST /trades/offer`), aceitar (`POST /trades/{id}/accept`) com trava atômica de segurança nos itens de ambos os lados, ou recusar.
   - Extrato da Carteira (`GET /wallet/history`): histórico financeiro paginado com categorização de depósitos, compras na loja, compras no mercado, vendas e resgates.

7. **UGC Service (`services/ugc-service/`, porta `8006`):**
   - Showcase de Capturas de Tela: upload manual via drag-and-drop ou automático via SDK Python (`take_screenshot()`), galeria com lightbox e curtidas.
   - Workshop de Conteúdo: upload de mods e skins, tags, busca por popularidade, contagem de subscrições e downloads.

8. **MIST Local Daemon (`runner/mist_daemon.py`, porta `39090`):**
   - Servidor HTTP leve local em Python que recebe ordens da SPA web (`POST /launch`), descompacta o jogo em `~/.mist/installed/`, injeta o `session.json` e dispara o jogo em uma nova janela de terminal nativa (`iniciar_mist_daemon.bat`).

---

## 4. Como Rodar o Sistema Localmente

Você pode executar o MIST através de duas abordagens: **Docker Compose** (todos os serviços conteinerizados de uma só vez) ou **Modo Nativo** (executando os processos Python e Node no seu terminal).

### Opção 1: Via Docker Compose (Recomendado)

Esta é a maneira mais simples de inicializar todo o ecossistema com um único comando.

#### Pré-requisitos:
- [Docker](https://docs.docker.com/get-docker/) e Docker Compose instalados.

#### Passos:
1. Na raiz do projeto, suba todos os containers com build automático:
   ```bash
   docker compose up --build
   ```
2. Acesse as aplicações nos seguintes endereços:
   - **Frontend (Interface MIST):** [http://localhost:5173](http://localhost:5173) (ou [http://localhost:3000](http://localhost:3000) no Docker)
   - **API Gateway (Swagger / OpenAPI):** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Auth Service:** `http://localhost:8001`
   - **Store Service:** `http://localhost:8002`
   - **Library Service:** `http://localhost:8003`
   - **Social Service:** `http://localhost:8004`
   - **Market Service:** `http://localhost:8005`

3. **Para abrir os jogos nativos na sua máquina:**
   - Como os containers rodam isolados, inicie o daemon na sua máquina host (fora do Docker):
     ```bash
     # Windows (duplo-clique ou terminal):
     .\iniciar_mist_daemon.bat

     # Linux / macOS:
     python runner/mist_daemon.py
     ```
   - Agora, ao clicar em **"Jogar"** na Biblioteca web, o jogo abrirá nativamente no seu terminal!

---

### Opção 2: Modo Desenvolvimento Nativo (Sem Docker)

Ideal para desenvolvimento ativo com hot-reload imediato em todos os microsserviços.

#### Pré-requisitos:
- Python 3.10+ instalado e no PATH do sistema.
- Node.js 18+ e npm instalados.

#### 1. Configurar o Ambiente Virtual Python:
Na raiz do repositório:
```bash
# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependências de todos os microsserviços e ferramentas de teste
pip install -r requirements-dev.txt
```

#### 2. Iniciar os Microsserviços Backend:
Abra terminais para cada serviço com o ambiente virtual ativado:

```bash
# Terminal 1 — Auth Service (porta 8001)
uvicorn services.auth_service.app.main:app --port 8001 --reload

# Terminal 2 — Store Service (porta 8002)
uvicorn services.store_service.app.main:app --port 8002 --reload

# Terminal 3 — Library Service (porta 8003)
uvicorn services.library_service.app.main:app --port 8003 --reload

# Terminal 4 — Social Service (porta 8004)
uvicorn services.social_service.app.main:app --port 8004 --reload

# Terminal 5 — Market Service (porta 8005)
uvicorn services.market_service.app.main:app --port 8005 --reload

# Terminal 6 — API Gateway (porta 8000)
uvicorn gateway.app.main:app --port 8000 --reload
```

#### 3. Iniciar o Frontend SPA:
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```
A interface estará disponível em **[http://localhost:5173](http://localhost:5173)**.

#### 4. Iniciar o MIST Local Daemon (Para execução real dos jogos):
```bash
python runner/mist_daemon.py
```
*(Ou execute `.\iniciar_mist_daemon.bat` no Windows).*

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

 O histórico e decisões técnicas de cada instrução são registrados incrementalmente no diretório [`prompts/`](./prompts/) sob arquivos diários nomeados no padrão `<user_dayth>.md` (exemplo: `gabriel-T800_2nd.md`).
O histórico consolidado das etapas iniciais está preservado em [`prompts/legacy_prompts.md`](./prompts/legacy_prompts.md).
