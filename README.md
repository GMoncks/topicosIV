# MIST — Multiplayer Instance for Steam-like Titles

O **MIST** é uma plataforma completa inspirada no ecossistema da Steam, integrando loja de jogos, biblioteca com telemetria, rede social com mensagens e presença em tempo real, execução nativa de mini-jogos e inteligência artificial aplicada.

---

## 1. Decisões de Arquitetura e Stack Tecnológica

O sistema foi arquitetado como uma aplicação distribuída orientada a microsserviços, com isolamento de responsabilidades e bancos de dados desacoplados:

- **Backend:** Python 3.10+ / 3.12+ com **FastAPI** e **SQLAlchemy ORM**.
- **API Gateway:** Gateway centralizado em FastAPI com validação de tokens JWT, injeção de cabeçalhos de identidade seguros (`X-User-Id`), tratamento de CORS e proxy reverso para HTTP e WebSockets.
- **Banco de Dados:** SQLite com arquivos isolados por serviço (`auth.db`, `store.db`, `library.db`, `social.db`), garantindo independência total de dados.
- **Mensageria e Tempo Real:** WebSockets assíncronos nativos para chat 1:1 e difusão de presença (*Online*, *Ausente*, *Jogando*).
- **Frontend SPA:** **React 18** com **TypeScript**, empacotado via **Vite**, estilizado com **Tailwind CSS**, Context API para estado global (autenticação, carrinho) e ícones FontAwesome.
- **Jogos Nativos MIST:** Jogos interativos em terminal (`forca.py`, `labirinto.py`, `quiz.py`) desenvolvidos em Python puro (`stdlib-only`, zero dependências pip) com SDK client-side (`mist_sdk.py`) para telemetria de playtime e desbloqueio de conquistas.
- **MIST Local Daemon:** Serviço leve em background (`runner/mist_daemon.py` em `127.0.0.1:39090`) que transpõe o *sandbox* do navegador e permite que o botão "Jogar" abra jogos nativos em novas janelas do sistema operacional com 1 clique (`iniciar_mist_daemon.bat`).
- **Automação de QA:** Pirâmide de testes completa com **Pytest** (backend), **Vitest** (frontend unitários/componentes), **Playwright** (E2E) e adaptador unificado de execução e relatórios (`runner_adapter.py` + `TESTS.md` + `resultados.json`).

---

## 2. Visão Geral dos Microsserviços e Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend SPA (React + Vite)                 │
└───────────────┬─────────────────────────────▲───────────────┘
                │ HTTP REST                   │ WebSockets
                ▼                             │ (Chat / Presença)
┌─────────────────────────────────────────────┴───────────────┐
│              API Gateway (:8000) [FastAPI]                  │
│   - Validação centralizada de JWT e injeção de X-User-Id    │
│   - Roteamento reverso e proxy bidirecional de WebSockets   │
└───────┬──────────────┬──────────────┬──────────────┬────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│ Auth Service ││Store Service ││Library Svc   ││Social Service│
│   (:8001)    ││   (:8002)    ││   (:8003)    ││   (:8004)    │
│  [auth.db]   ││  [store.db]  ││ [library.db] ││ [social.db]  │
└──────────────┘└──────┬───────┘└──────▲───────┘└──────▲───────┘
                       │               │               │
                       │ Compra / Saga │ Telemetria /  │ Atividades /
                       └───────────────┘ Presença      │ Presença
                                       └───────────────┘
```

### Detalhamento dos Módulos:
1. **API Gateway (`gateway/`, porta `8000`):**
   - Roteamento central de `/api/*` para os microsserviços.
   - Proxy de WebSockets em `/ws/chat/{room_id}` e `/ws/presence`.
   - Bloqueio de spoofing e injeção do header confiável `X-User-Id`.
2. **Auth Service (`services/auth-service/`, porta `8001`):**
   - Cadastro com validação estrita de senha e bônus de boas-vindas de **R$ 200,00**.
   - Emissão de tokens JWT e gestão de sessão.
   - Carteira virtual MIST (`wallet`): débito atômico, crédito compensatório e consulta de saldo.
   - Endpoint de perfil de usuário (`GET /users/{user_id}`).
3. **Store Service (`services/store-service/`, porta `8002`):**
   - Catálogo de jogos com busca, filtros por gênero/preço e paginação configurável (5, 10, 15, 25, 50).
   - Lista de Desejos (Wishlist) com alternância idempotente e sem flickering.
   - Checkout unitário e em lote (Carrinho) com **Transação Compensatória Saga** (estorno garantido em caso de falha de concessão).
   - Empacotador dinâmico de downloads (.zip com `game.py`, `mist_sdk.py` e `session.json`).
4. **Library Service (`services/library-service/`, porta `8003`):**
   - Posse e validação de licenças adquiridas.
   - Ciclo de vida de sessões de jogo (`/session/start`, `/session/ping`, `/session/end`) com acúmulo de playtime.
   - Desbloqueio e persistência de conquistas relacionais.
   - Polling de conquistas recentes (`GET /achievements/recent`) e sincronização de presença com o `social-service`.
5. **Social Service (`services/social-service/`, porta `8004`):**
   - Gestão bilateral de amizades (solicitar, aceitar, recusar, remover).
   - Chat 1:1 em tempo real com indicador de digitação (*typing indicator*) e histórico persistido.
   - Presença em tempo real com WebSocket e snapshot de status (*Online*, *Jogando [Jogo]*, *Ausente*, *Offline*).
   - Feed agregador multi-domínio (`GET /feed`) com compras, conquistas e progressão.
6. **MIST Local Daemon (`runner/mist_daemon.py`, porta `39090`):**
   - Servidor HTTP leve local em Python que ouve requisições da interface web e dispara jogos em novas janelas do sistema operacional.

---

## 3. Como Rodar o Sistema Localmente

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
   - **Frontend (Interface MIST):** [http://localhost:5173](http://localhost:5173)
   - **API Gateway (Swagger / OpenAPI):** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Auth Service:** `http://localhost:8001`
   - **Store Service:** `http://localhost:8002`
   - **Library Service:** `http://localhost:8003`
   - **Social Service:** `http://localhost:8004`

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
Abra terminais para cada serviço (ou use abas no terminal) com o ambiente virtual ativado:

```bash
# Terminal 1 — Auth Service (porta 8001)
uvicorn services.auth_service.app.main:app --port 8001 --reload

# Terminal 2 — Store Service (porta 8002)
uvicorn services.store_service.app.main:app --port 8002 --reload

# Terminal 3 — Library Service (porta 8003)
uvicorn services.library_service.app.main:app --port 8003 --reload

# Terminal 4 — Social Service (porta 8004)
uvicorn services.social_service.app.main:app --port 8004 --reload

# Terminal 5 — API Gateway (porta 8000)
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

#### 4. Iniciar o MIST Local Daemon (Opcional, para execução real dos jogos):
```bash
python runner/mist_daemon.py
```
*(Ou execute `.\iniciar_mist_daemon.bat` no Windows).*

---

## 4. Testes e Automação de QA

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
| **API Gateway** | `pytest` | `pytest gateway/tests` |
| **Frontend Unitários & Componentes** | `vitest` | `npm --prefix frontend run test:unit` |
| **Sistema Completo (E2E)** | `playwright` | `npm --prefix frontend run test:e2e` |

### Execução via Runner Adapter (Skills de QA)
O projeto conta com o script utilitário [`runner_adapter.py`](./.agents/skills/qa_tester/scripts/runner_adapter.py) para execução padronizada com gravação atômica em `resultados.json`:

```bash
# Executar todos os testes catalogados
python .agents/skills/qa_tester/scripts/runner_adapter.py

# Executar por categoria
python .agents/skills/qa_tester/scripts/runner_adapter.py --categoria "Unitários"
python .agents/skills/qa_tester/scripts/runner_adapter.py --categoria "Integração"

# Validação pontual (dry-run) de um teste específico
python .agents/skills/qa_tester/scripts/runner_adapter.py --id "SOCIAL-INT-02" --origem "validacao"
```

---

## 5. Rastreamento Perpétuo de Prompts

O histórico e decisões técnicas de cada instrução são registrados incrementalmente no diretório [`prompts/`](./prompts/) sob arquivos diários nomeados no padrão `<user_dayth>.md` (exemplo: `gabriel-T800_26th.md`).
O histórico consolidado das etapas iniciais está preservado em [`prompts/legacy_prompts.md`](./prompts/legacy_prompts.md).
