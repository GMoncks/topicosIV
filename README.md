# MIST — Multiplayer Instance for Steam-like Titles
Prova de conceito de um sistema inspirado no ecossistema da Steam, cobrindo três frentes principais:

- **Loja**: catálogo e compra de jogos.
- **Social**: amigos, mensagens e feed de atividade.
- **Biblioteca**: jogos possuídos pelo usuário.

## Decisões de arquitetura e stack

- **Arquitetura**: Microsserviços, com um API Gateway centralizando o acesso do frontend aos serviços.
- **Backend**: Python + FastAPI (um serviço por domínio).
- **Frontend**: React + TypeScript.
- **Dados**: SQLite local, um arquivo de banco por serviço (sem servidor de banco compartilhado).

## Estrutura do projeto

```
topicosIV/
├── docs/
│   └── architecture.md        # Descrição da arquitetura geral, decisões e diagramas do sistema.
├── docker-compose.yml         # Orquestração local de todos os serviços e do frontend.
├── gateway/                   # API Gateway: ponto único de entrada do frontend para os microsserviços.
│   ├── Dockerfile             # Imagem Docker do gateway.
│   ├── requirements.txt       # Dependências Python do gateway.
│   └── app/
│       ├── main.py            # Ponto de entrada da aplicação FastAPI do gateway (roteamento entre serviços).
│       └── config.py          # Configurações do gateway (URLs dos serviços, variáveis de ambiente).
│
├── services/
│   ├── auth-service/          # Serviço de autenticação e contas de usuário.
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   ├── app/
│   │   │   ├── main.py            # Ponto de entrada da aplicação FastAPI.
│   │   │   ├── api/routes.py      # Endpoints HTTP (login, registro, sessão).
│   │   │   ├── models/user.py     # Modelo de dados do usuário (ORM).
│   │   │   ├── schemas/user.py    # Schemas de request/response (Pydantic).
│   │   │   ├── services/auth_service.py  # Regras de negócio de autenticação.
│   │   │   └── db/database.py     # Conexão e sessão com o banco SQLite do serviço.
│   │   └── data/.gitkeep          # Local onde o arquivo SQLite do serviço será criado.
│   │
│   ├── store-service/         # Serviço da loja: catálogo de jogos e compras.
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── api/routes.py       # Endpoints de catálogo e compra de jogos.
│   │   │   ├── models/game.py      # Modelo de dados de um jogo do catálogo.
│   │   │   ├── models/purchase.py  # Modelo de dados de uma compra.
│   │   │   ├── schemas/game.py     # Schemas de request/response de jogos.
│   │   │   ├── schemas/purchase.py # Schemas de request/response de compras.
│   │   │   ├── services/store_service.py  # Regras de negócio da loja.
│   │   │   └── db/database.py
│   │   └── data/.gitkeep
│   │
│   ├── library-service/       # Serviço de biblioteca: jogos que o usuário possui.
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── api/routes.py       # Endpoints de consulta e gestão da biblioteca do usuário.
│   │   │   ├── models/library_item.py  # Modelo de dados de um item na biblioteca.
│   │   │   ├── schemas/library_item.py # Schemas de request/response.
│   │   │   ├── services/library_service.py  # Regras de negócio da biblioteca.
│   │   │   └── db/database.py
│   │   └── data/.gitkeep
│   │
│   └── social-service/        # Serviço social: amigos, mensagens e atividade.
│       ├── Dockerfile
│       ├── requirements.txt
│       ├── app/
│       │   ├── main.py
│       │   ├── api/routes.py       # Endpoints de amizade, mensagens e feed de atividade.
│       │   ├── models/friend.py    # Modelo de dados de relação de amizade.
│       │   ├── models/message.py   # Modelo de dados de mensagem entre usuários.
│       │   ├── models/activity.py  # Modelo de dados de evento de atividade (ex.: "jogando X").
│       │   ├── schemas/friend.py   # Schemas de request/response de amizade.
│       │   ├── schemas/message.py  # Schemas de request/response de mensagens.
│       │   ├── services/social_service.py  # Regras de negócio do módulo social.
│       │   └── db/database.py
│       └── data/.gitkeep
│
└── frontend/                  # Aplicação React + TypeScript.
    ├── package.json           # Dependências e scripts do frontend.
    ├── tsconfig.json          # Configuração do TypeScript.
    ├── index.html             # HTML raiz da aplicação.
    ├── vite.config.ts         # Configuração do bundler (Vite).
    └── src/
        ├── main.tsx           # Ponto de entrada da aplicação React.
        ├── App.tsx            # Componente raiz e definição de rotas.
        ├── api/client.ts      # Cliente HTTP para comunicação com o API Gateway.
        ├── pages/
        │   ├── Store.tsx      # Página da loja (catálogo e compra).
        │   ├── Library.tsx    # Página da biblioteca do usuário.
        │   ├── Social.tsx     # Página social (amigos, mensagens, atividade).
        │   └── Login.tsx      # Página de login/registro.
        ├── components/
        │   └── Navbar.tsx     # Barra de navegação compartilhada entre páginas.
        └── styles/
            └── global.css     # Estilos globais da aplicação.
```

> Todos os arquivos acima foram criados como placeholders vazios. O conteúdo será implementado nas próximas etapas.

## Testes e Automação de QA

O projeto adota uma pirâmide de testes distribuída entre três runners específicos, gerenciados pelo catálogo [`TESTS.md`](./TESTS.md), pelo log unificado de resultados [`resultados.json`](./resultados.json) e pelas Agent Skills do Antigravity (`qa_writer` e `qa_tester`).

### Runners Oficiais e Dependências

| Runner | Escopo | Requisitos / Dependências | Execução Manual |
| :--- | :--- | :--- | :--- |
| **`pytest`** | Backend (Gateway e Microsserviços Python) | Python 3.10+<br>`pip install pytest pytest-asyncio httpx` nos ambientes/requirements de cada serviço | `pytest services/auth-service`<br>`pytest gateway` |
| **`vitest`** | Frontend (Unitários e Componentes React) | Node.js 18+<br>`npm install -D vitest @testing-library/react jsdom` no diretório `frontend/` | `cd frontend && npx vitest run` |
| **`playwright`** | Sistema Completo (E2E e Smoke de integração) | Node.js 18+<br>`npm install -D @playwright/test`<br>`npx playwright install` (para binários dos navegadores) | `npx playwright test` |

### Operação via Skills de Agente

- **`qa_writer`**: Responsável por manter o arquivo [`TESTS.md`](./TESTS.md) atualizado com novos cenários (Dado/Quando/Então), mapeando IDs e atribuindo os runners correspondentes.
- **`qa_tester`**: Executa os comandos reais mapeados no `TESTS.md` (modo completo ou por categoria), realiza a normalização atômica dos dados e preserva as últimas 5 execuções no [`resultados.json`](./resultados.json).

## Histórico de prompts

O histórico de prompts usados para conduzir este projeto está em [`prompts.md`](./prompts.md).

