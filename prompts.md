# Histórico de prompts

Este arquivo registra os prompts usados para conduzir o desenvolvimento do projeto. Deve ser atualizado a cada novo prompt do usuário.

---

## 2026-08-14 — Prompt 1

**Prompt do usuário:**

> Eu quero criar um projeto POC (prova de conceito) de um sistema com as mesmas funcionalidades da Steam (Steam como ecossistema - Loja, social, biblioteca). Inicialmente, adicione uma estrutura de arquivos como placeholders e crie um arquivo README.md descrevendo os arquivos criados e para que servem, ainda não popule estes arquivos. Para a arquitetura e tecnologias utilizadas: me pergunte, utilizando as opções mais utilizadas no mercado. Ao final, salve este prompt em um arquivo prompts.md - Este arquivo sempre deverá ser modificado quando eu fizer outro prompt.

**Decisões tomadas em resposta (via perguntas ao usuário):**

- Arquitetura: Microsserviços
- Backend: Python + FastAPI
- Frontend: React + TypeScript
- Banco de dados: SQLite, localmente (um arquivo por serviço)

**Resultado:**

- Criada estrutura de pastas e arquivos placeholder (vazios) para: `gateway` (API Gateway), 4 microsserviços (`auth-service`, `store-service`, `library-service`, `social-service`), `frontend` (React + TS) e `docs/`.
- Criado `README.md` descrevendo a estrutura e o propósito de cada arquivo.
- Criado este arquivo `prompts.md`.

---

## 2026-08-31 — Prompt 2

**Prompt do usuário:**

> Análise técnica do estado atual do projeto e planejamento de um plano de ação estruturado para recriar o ecossistema Steam (MIST), considerando equipe de 3 pessoas, repositório GitHub público, GitHub Projects (tickets/épicos), desenvolvimento assistido por IA, integração de agentes de IA nos microsserviços, prazo de 1 a 2 meses e divisão de papéis.

**Decisões e Entregas em Resposta:**

- Avaliação arquitetural técnica (comunicação entre microsserviços, propagação de auth, banco de dados, storage simulado de arquivos de jogos).
- Definição da arquitetura de Agentes de IA (Recomendação Inteligente, Agente de Conquistas e Assistente de Comunidade).
- Estrutura de Épicos e Tickets para o GitHub Project.
- Divisão de papéis e responsabilidades para o trio de Engenharia da Computação.
- Cronograma detalhado em 4 Sprints (6 a 8 semanas).
- Fluxo de trabalho metodológico com IA (Spec-first, Prompting, Code Review & Test Generation).

---

## 2026-09-06 — Prompt 3

**Prompt do usuário:**

> Estou montando o frontend das páginas principais do sistema MIST (Multiplayer Instance for Steam-like Titles). Baseando-se no código HTML em anexo para a página principal (store_page), construa a página principal conforme a linguagem definida no architecture.md. Mude a cor secundária da #BFE7D2 para a #1F4D36

**Resultado:**

- Construída a estrutura completa da aplicação frontend em **React + TypeScript + Vite + Tailwind CSS**.
- Atualizada a cor secundária do sistema (`brand.green`) de `#BFE7D2` para `#1F4D36` em `tailwind.config.js` e em toda a estilização dos componentes.
- Componentizados e implementados:
  - `Sidebar.tsx`: Menu lateral com navegação, logo MIST e perfil do usuário (`GGTorres2001`).
  - `Header.tsx`: Cabeçalho da loja com abas (Destaques, Desejos, Promoções), campo de busca e saldo em `#1F4D36`.
  - `HeroBanner.tsx`: Banner imersivo de destaque da distribuidora (Focus Entertainment).
  - `GameCard.tsx`: Cards de exibição de jogos/DLCs com badges de promoção em `#1F4D36` e conversão de preços.
  - `DownloadBar.tsx`: Indicador flutuante de progresso de download pausável.
  - `Store.tsx`: Página principal da loja com filtros e busca dinâmicos.
  - Páginas de suporte `Library.tsx`, `Social.tsx`, `Login.tsx` e cliente de API `api/client.ts`.

---

## 2026-09-06 — Prompt 4

**Prompt do usuário:**

> Me ensine a simular o sistema para que eu possa visualizar as mudanças feitas e poder avaliar como o sistema ficou. Além disso, adicione todos esses prompts de entrada e um resumo da saída no arquivo prompts.md

**Resultado:**

- Documentadas e explicadas as formas de executar e simular a aplicação frontend (via Node.js/Vite e via Docker Compose).
- Atualizado o arquivo `prompts.md` contendo o registro histórico dos novos prompts e os resumos de suas respectivas saídas.

---

## 2026-09-06 — Prompt 5

**Prompt do usuário:**

> Gostei das mudanças. Antes de tudo, defina a nível de projeto que após qualquer prompt - seja ele feito em qualquer conversa existente dentro do projeto MIST - o prompt de entrada e o resumo da saída/modificações deve ser adicionado ao prompts.md
> Feito isso, vamos seguir criando as novas telas do frontend. Seguindo a ideia de manter um ambiente formal mas imersivo para gamers e as cores definidas para o sistema, e se inspirando nas telas em anexo retiradas da própria Steam, implemente as telas de:
> - Notícias (preparar uma conexão com notícias dos jogos que o usuário possui, mas por hora simulado)
> - Perfil do usuário
> - Loja de Pontos MIST

**Decisões e Entregas em Resposta:**

1. **Definição de Diretriz de Projeto Mandatória:**
   - Criados os arquivos `AGENTS.md` e `GEMINI.md` na raiz do projeto com a regra formal e perpétua para que todo agente e desenvolvedor registre o prompt de entrada e o resumo das saídas/modificações no `prompts.md`.

2. **Novas Telas do Frontend Implementadas:**
   - **Central de Notícias (`News.tsx`)**: Menu lateral de filtragem ("Para Você", "Eventos Futuros", "Da sua Biblioteca", "Destaques Globais", "MIST Oficial", Busca), feed organizado por linhas temporais ("EM BREVE", "SEXTA-FEIRA", "RECENTES"), cards com badges de relação com a biblioteca (`Na biblioteca`, `Na lista de desejos, Seguindo`), botão dinâmico de agendar lembrete e métricas de curtidas/comentários.
   - **Perfil do Usuário (`Profile.tsx`)**: Cabeçalho de perfil gamer completo com moldura de avatar estilizada, insígnia em destaque (`Acumulador Adepto - 190 XP`), círculo de Nível 7, indicador de status `On-line`, atividade recente com contagem de horas e barra de progresso de conquistas por jogo, vitrine com 4 insígnias e menu lateral de estatísticas (`Jogos 22`, `Inventário`, `Capturas de tela`, etc.).
   - **Loja de Pontos MIST (`PointsShop.tsx`)**: Saldo em Pontos MIST (`5.348`), menu de categorias (Destaques, Interface, Perfil), Hero Banner explicativo da Loja de Pontos e catálogo de cosméticos (Plano de Fundo `Maré Crepuscular`, Emoticon `:chicken_cry:`, Perfis de jogo `Banquete a Beira-Mar` e `Parceiros de Praia`) com fluxo interativo de resgate deduzindo pontos em tempo real.

3. **Integração de Navegação e Tipos:**
   - Atualizados `types/index.ts`, `Sidebar.tsx` e `App.tsx` para permitir navegação fluida entre todas as 6 telas: Loja (`store`), Biblioteca (`library`), Comunidade (`social`), Notícias (`news`), Loja de Pontos (`points`) e Perfil (`profile`).

---

## 2026-09-06 — Prompt 6

**Prompt do usuário:**

> Antes de criar qualquer arquivo, leia `architecture.md` por completo** e extraia o que for relevante para testes: linguagens usadas em cada parte do sistema, frameworks, gerenciador de pacotes, e qualquer runner de teste já mencionado (pytest, jest, playwright, etc.). Resuma brevemente o que encontrou de relevante para testes antes de prosseguir, para que eu possa confirmar — não presuma nada que não esteja documentado ali.
> 
> Depois da leitura, crie os três artefatos abaixo, todos coerentes com a stack encontrada (ou com o registro de que a stack ainda não foi definida para determinada parte do sistema).
> 
> ## 1. TESTS.md (raiz do projeto)
> ## 2. Skill de projeto: `qa_writer`
> ## 3. Skill de projeto: `qa_tester`
> ## 4. resultados.json (raiz do projeto)

**Decisões Técnicas e Análise:**

- Leitura integral do arquivo `docs/architecture.md`.
- Extração estrita dos dados documentados sem presunções externas:
  - Frontend: React + TypeScript + Vite, SPA, comunicação via HTTP/REST e WebSocket.
  - Gateway: FastAPI (porta 8000), validação JWT, CORS, rate limiting.
  - Microsserviços: Auth (8001), Store (8002), Library (8003), Social (8004) - todos com SQLite individual e FastAPI.
  - Orquestração: Docker Compose.
  - Gerenciadores de pacote: **Não documentados** no arquivo de arquitetura.
  - Test runners: **Nenhum runner de teste mencionado** no `architecture.md`.
- Pausa mandatória para confirmação do usuário antes da criação dos arquivos `TESTS.md`, `resultados.json`, e das skills `.agents/skills/qa_writer` e `.agents/skills/qa_tester`.

**Resultado:**

- Síntese apresentada ao usuário para validação da stack identificada antes de prosseguir com a geração dos artefatos de teste.

---

## 2026-09-06 — Prompt 7

**Prompt do usuário:**

> De fato, os dados levantados estão de acordo. Como prefiro oficializar runners especificos, proponha os runners mais adequados para essa stack do projeto, antes de seguirmos com a criação dos demais arquivos. Dê preferencia por pytest e playwright, mas se julgar necessário mais runners pode me informar

**Decisões e Proposta:**

- Avaliação técnica da pirâmide de testes para microsserviços FastAPI e frontend SPA Vite/React:
  - `pytest`: Oficializado para o backend (Gateway + 4 microsserviços) devido ao suporte a testes assíncronos (`pytest-asyncio`) e clientes HTTP (`httpx`).
  - `playwright`: Oficializado para testes E2E e fluxos completos de integração, com suporte nativo a WebSockets e navegadores reais.
  - `vitest`: Adicionado para testes unitários e de componentes do frontend, garantindo execução leve e compartilhamento da configuração do Vite.

---

## 2026-09-06 — Prompt 8

**Prompt do usuário:**

> Pode seguir.
> Adicionalmente, modifique:
> - incrementalmente o docs/architecture.md para adicionar essa parte dos runners de testes e seus escopos de teste.
> - README para adicionar informações sobre esses runners de testes e quais suas dependencias para operação correta, seja diretamente pelas skills criadas para o projeto ou para operação manual pelo usuário

**Decisões e Entregas em Resposta:**

1. **Atualização Arquitetural (`docs/architecture.md`):**
   - Adicionada a seção "5. Runners de Testes e Estratégia de QA" detalhando `pytest`, `vitest` e `playwright`, camadas, escopos e justificativas.

2. **Atualização da Documentação Principal (`README.md`):**
   - Adicionada a seção "Testes e Automação de QA" com tabela de requisitos de runtime/pacotes (`pytest`, `vitest`, `playwright`), comandos de execução manual e operação via skills de agente.

3. **Catálogo Vivo de Testes (`TESTS.md`):**
   - Criado na raiz do projeto seguindo a hierarquia solicitada (`# TESTS.md`, `## Runners registrados`, `## <Categoria>`, `### <Funcionalidade>`, `#### <ID> — <título>`).
   - Mapeadas todas as categorias da pirâmide: Unitários, Integração, E2E / Sistema completo, Regressão e Smoke.
   - Casos iniciais registrados como `Status: planejado` e comandos vazios.

4. **Skill de Agente Antigravity `qa_writer` (`.agents/skills/qa_writer/SKILL.md`):**
   - Papel de curador técnico e mantenedor de `TESTS.md`.
   - Permissões estritas (leitura/escrita em `TESTS.md`, leitura em `resultados.json`, sem execução de testes).
   - Edição incremental obrigatória e validação pontual de testes via `qa_tester` (com marcação `"origem": "validacao"`).

5. **Skill de Agente Antigravity `qa_tester` (`.agents/skills/qa_tester/SKILL.md`):**
   - Motor de execução com invocação real dos runners mapeados.
   - Modos completo, por categoria e validação pontual (dry-run).
   - Normalização para o schema comum de `resultados.json`.
   - Garantia de escrita atômica via arquivo temporário + renomeação no SO.
   - Histórico FIFO limitado às últimas 5 execuções por ID de teste.
   - Implementado script auxiliar `scripts/runner_adapter.py`.

6. **Log Estruturado de Resultados (`resultados.json`):**
   - Criado vazio (`{}`) na raiz do projeto, pronto para consumo e gravação das skills.

---

## 2026-09-19 — Prompt 9

**Prompt do usuário:**

> /qa_writer faça um teste para validar a correta alternancia entre as páginas, sem corrupção do contexto esperado pelo fluxo. Por exemplo, se eu estiver migrando da Loja ou da Biblioteca para a Loja de Pontos, então a migração deve ser feita sem problemas, sem lentidão excessiva ou com acumulo de contexto desnecessário

**Decisões Arquiteturais e Técnicas:**

- **Ativação da Skill `qa_writer`**: Aplicação das regras de curadoria técnica do catálogo de testes do MIST (`TESTS.md`), com edição incremental estrita e sem execução direta de runners.
- **Enquadramento na Pirâmide de Testes**:
  - Classificado na camada **E2E / Sistema completo** utilizando o runner `playwright` oficializado no projeto, visto que a alternância entre páginas, avaliação de fluidez na SPA e verificação de desmontagem correta de componentes contextuais correspondem à interação direta do usuário no navegador.
- **Nomenclatura e Identificação**:
  - Atribuído o identificador `E2E-NAV-01` (domínio `NAV` para Navegação e Ciclo de Vida), respeitando a regra de numeração sequencial da categoria.
- **Ciclo de Vida do Teste**:
  - Registrado com `Status: planejado` e campo `Comando:` vazio, aguardando futura implementação de script de automação e validação via `qa_tester`.
- **Critérios de Validação Cobertos**:
  - Desmontagem limpa de cabeçalhos e estados voláteis da tela de origem (ex: input de busca da Loja).
  - Integridade dos dados e contexto da tela de destino (ex: saldo de 5.348 pontos e catálogo de cosméticos na Loja de Pontos).
  - Tempo de resposta e transição fluido (< 500ms), sem retenção de nós desnecessários no DOM ou vazamento de memória.

**Resultado e Modificações:**

- Atualização incremental do arquivo [`TESTS.md`](./TESTS.md) com a inclusão da subseção `### Navegação e Ciclo de Vida da Aplicação` contendo o caso `E2E-NAV-01 — Alternância entre páginas sem corrupção de contexto ou lentidão`.
- Atualização do arquivo [`prompts.md`](./prompts.md) com a documentação mandatória do prompt.

---

## 2026-09-19 — Prompt 10

**Prompt do usuário:**

> /qa_tester Realize o teste E2E-NAV-01

**Decisões Arquiteturais e Técnicas:**

- **Ativação da Skill `qa_tester`**: Invocação do motor de execução e gravação de resultados para o teste de ID `E2E-NAV-01`.
- **Tratamento de Estado `planejado`**:
  - De acordo com as diretrizes da skill `qa_tester`, testes em `Status: planejado` sem comando automatizado associado foram parseados a partir de `TESTS.md` e registrados com o status `pending` (não tratado como falha).
- **Suporte Cross-Platform**:
  - Implementado o adaptador em JavaScript/Node.js ([`runner_adapter.js`](./.agents/skills/qa_tester/scripts/runner_adapter.js)) compatível com o adaptador em Python, garantindo parsing, atomicidade via arquivo temporário e manutenção de histórico FIFO sem dependência exclusiva de runtime do ambiente.
- **Persistência Atômica**:
  - Resultado consolidado e salvo atomicamente no arquivo [`resultados.json`](./resultados.json).

**Resultado e Modificações:**

- Atualização de [`resultados.json`](./resultados.json) com o registro de execução para `E2E-NAV-01` (`status: pending`, `duracao_ms: 0`, `origem: execucao`).
- Inclusão do script adaptador complementar [`runner_adapter.js`](./.agents/skills/qa_tester/scripts/runner_adapter.js).
- Atualização do [`prompts.md`](./prompts.md) com a documentação mandatória deste prompt.

---

## 2026-09-19 — Prompt 11

**Prompt do usuário:**

> Ok. Validei o funcionamento dos agentes criados de forma básica. Entretanto, para poder testar de forma definitiva, necessito realizar a instalação e configuração dos runners básicos (pytest, vitest e playwrigth).
> /grill-me qual o melhor método de instalação e configuração local desses runners de forma a poder usar eles com o menor atrito possível pelos agentes. Minha preocupação é que esses runners devem estar prontos para:
> - Possuir uma configuração local (a nível do projeto) preparada para a escala do projeto mesmo em sua fase final.
> - Sua configuração deve ser facilmente gerenciada por uma IA, pois após a conclusão da configuração no meu computador, a configuração deverá ser documentada no README.md e no architecture.md de forma a ser reproduzível pelos meus colegas em seus respectivos computadores.

**Decisões Arquiteturais e Técnicas:**

- **Ativação da Dinâmica `/grill-me`**: Início da entrevista técnica estruturada (pergunta a pergunta) para definir o modelo de instalação e orquestração dos runners (`pytest`, `vitest`, `playwright`).
- **Foco nos Requisitos de Escala e Agentes de IA**:
  - Mapear a estratégia de runtime para execução local direta vs contêineres Docker para os microsserviços Python e frontend TypeScript.
  - Estruturar a configuração de forma reprodutível para equipe multiplataforma e documentável no `README.md` e `architecture.md`.

**Resultado e Modificações:**

- Atualização do `prompts.md` com a entrada do usuário e início da rodada de alinhamento arquitetural via `ask_question`.

---

## 2026-09-19 — Prompt 12

**Prompt do usuário:**

> Sim, pode seguir com os próximos passos. Para os passos de criação de testes e de atualização dos comandos de teste (passos 3 e 5) utilize a skill qa_writer. Valide a conclusão das suas tarefas ao chamar a skill qa_tester para rodar os testes E2E-NAV-01 e os demais que forem criados no passo 3

**Decisões Arquiteturais e Técnicas:**

1. **Configuração Centralizada do Backend:**
   - Criado `pyproject.toml` na raiz configurando o Pytest e a resolução automática de `pythonpath` para o API Gateway e todos os 4 microsserviços (`auth-service`, `store-service`, `library-service`, `social-service`).
   - Criado `requirements-dev.txt` na raiz contendo `pytest`, `pytest-asyncio`, `httpx`, `pytest-mock` e `coverage`.

2. **Configuração Unificada do Frontend & E2E:**
   - Atualizado `frontend/package.json` com devDependencies (`vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@playwright/test`) e scripts de teste (`test:unit`, `test:e2e`).
   - Criado `frontend/vitest.config.ts` com ambiente `jsdom` e setup file `frontend/src/test/setup.ts`.
   - Criado `frontend/playwright.config.ts` com orquestração automática do servidor Vite (porta 3000) e suporte cross-browser (Chromium, Firefox, WebKit).
   - Executada instalação de pacotes e download de navegadores (`npx playwright install`).

3. **Criação de Testes Automatizados Reais:**
   - **`FRONT-UNIT-01`**: Criado `frontend/src/components/GameCard.test.tsx` testando renderização, título, preço e badge de desconto do card de jogo.
   - **`REG-FRONT-01`**: Criado `frontend/src/test/theme.test.ts` validando que a cor secundária é estritamente `#1F4D36` e prevenindo regressão para `#BFE7D2`.
   - **`E2E-NAV-01`**: Criado `frontend/e2e/navigation.spec.ts` validando o fluxo de navegação entre Loja, Biblioteca e Loja de Pontos com preservação e isolamento de contexto.

4. **Documentação de Onboarding:**
   - Atualizados `README.md` e `docs/architecture.md` detalhando a arquitetura de desacoplamento, comandos de execução da raiz e instruções passo a passo para a equipe reproduzir o ambiente local.

5. **Operação via Skill `qa_writer`:**
   - Edição incremental de `TESTS.md` atualizando os comandos-base dos runners e promovendo os testes `FRONT-UNIT-01`, `REG-FRONT-01` e `E2E-NAV-01` para `Status: implementado` com comandos diretos via npm scripts.

6. **Validação via Skill `qa_tester`:**
   - Executados os testes através de `runner_adapter.js`.
   - Corrigido o analisador de comando para suportar argumentos com dois-pontos (ex: `test:e2e`).
   - Todos os testes foram executados contra os runners reais e aprovados com sucesso (`pass`), com persistência atômica no `resultados.json`.

**Resultado e Modificações:**

- Arquivos criados: `pyproject.toml`, `requirements-dev.txt`, `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`, `frontend/playwright.config.ts`, `frontend/src/components/GameCard.test.tsx`, `frontend/src/test/theme.test.ts`, `frontend/e2e/navigation.spec.ts`.
- Arquivos atualizados: `frontend/package.json`, `README.md`, `docs/architecture.md`, `TESTS.md`, `resultados.json`, `.agents/skills/qa_tester/scripts/runner_adapter.js`, `prompts.md`.
- Resultados no `resultados.json`:
  - `E2E-NAV-01`: PASS (Playwright cross-browser).
  - `FRONT-UNIT-01`: PASS (Vitest).
  - `REG-FRONT-01`: PASS (Vitest).

---

## 2026-09-19 — Prompt 13

**Prompt do usuário:**

> /grill-me planeja a implementação das seguintes features no projeto:
> - Implementar o gateway (FastAPI com httpx para proxy reverso de rotas e injeção do header seguro X-User-Id).
> - Implementar o auth-service (Registro, Login, Hashing de senha com bcrypt, emissão e validação de JWT, saldo inicial da carteira).
> - Criar o cliente HTTP (frontend/src/api/client.ts) centralizado com interceptor para injetar o JWT nas requisições do Gateway.
> - Criar tela/modal de Login e Registro conectada ao auth-service.
> - Implementar o Contexto Global de Autenticação (AuthContext) e estado do usuário (carteira, avatar, nível).

**Decisões Arquiteturais e Técnicas:**

- **Conclusão da Dinâmica `/grill-me`**: Realizada a entrevista técnica estruturada cobrindo toda a árvore de decisão do sistema de autenticação, gateway e estado global:
  1. **Apresentação Frontend**: Modelo híbrido — Modal interativo sobre a SPA (com alternância Login/Registro) para acesso rápido mantendo navegação livre (guest mode) para visitantes, somado à tela dedicada de autenticação.
  2. **Política de Novos Usuários**: Registro no `auth-service` com saldo inicial na carteira de R$ 150,00, 500 pontos MIST, Nível 1 e avatar gamer padrão.
  3. **Segurança e Proxy do Gateway**: Validação centralizada de JWT e sanitização estrita de headers (eliminação de `X-User-*` externos contra spoofing e injeção downstream dos headers confiáveis `X-User-Id`, `X-User-Email` e `X-User-Username`); bloqueio 401 em rotas protegidas sem token e repasse via `httpx.AsyncClient` reutilizável.
  4. **Gestão de Sessão no Cliente HTTP (`client.ts`) e `AuthContext`**: Interceptor de requisições injeta token JWT; interceptor de respostas detecta status 401, remove o token do `localStorage`, restaura o contexto para guest e dispara notificação com abertura do modal de sessão expirada.
  5. **Estratégia de Testes Automatizados**: Cobertura nos 3 runners oficiais (`pytest` para gateway e auth-service, `vitest` para componentes e client.ts, e `playwright` para o fluxo E2E de login/registro), com registro no `TESTS.md` via `qa_writer` e validação via `qa_tester`.

**Resultado e Modificações:**

- Atualização incremental do `prompts.md`.
- Elaboração do plano detalhado de implementação no artifact `implementation_plan.md`.

---

## 2026-09-19 — Prompt 14

**Prompt do usuário:**

> Comments on artifact URI: file:///c%3A/Users/Gabriel%20Torres/.gemini/antigravity/brain/82132158-3576-410f-ad01-b92101eb8d20/implementation_plan.md
> [Comentários: Alteração de saldo inicial de R$ 150,00 para R$ 200,00; Nomes dos testes a serem avaliados e definidos pelo próprio agente qa_writer]
> Pode implementar, considerando os comentários que fiz no Implementation Plan

**Decisões Arquiteturais e Técnicas:**

- **Ajuste de Saldo Inicial**: Atualizada a concessão de boas-vindas do `auth-service` para R$ 200,00 (default no modelo `User` e resposta de registro), mantendo 500 Pontos MIST e Nível 1.
- **Autonomia da Skill `qa_writer`**: Os nomes, categorias e IDs oficiais dos testes foram delegados à skill `qa_writer` para manter estrita conformidade com a taxonomia do `TESTS.md`.
- **Início da Execução**:
  1. Implementação do `auth-service` (FastAPI, SQLite com SQLAlchemy, bcrypt, JWT, endpoints de registro/login/me).
  2. Implementação do API Gateway (FastAPI, `httpx`, validação JWT, expurgo de spoofing de headers, proxy reverso).
  3. Implementação do Cliente HTTP (`frontend/src/api/client.ts`), interceptores e métodos `authApi`.
  4. Implementação do `AuthContext` e integração na SPA (estado global de usuário, carteira, nível, avatar).
  5. Criação do `AuthModal` (alternância Login/Registro, tema gamer MIST, animações) e adaptação de `Login.tsx`, `Header.tsx`, `Sidebar.tsx` e `App.tsx`.
  6. Catálogo e criação de testes automatizados com `qa_writer` e execução via `qa_tester`.

**Resultado e Modificações:**

1. **Auth Service (`services/auth-service`):**
   - Configurada persistência SQLite em `app/db/database.py` e modelo ORM `User` em `app/models/user.py` com saldo inicial padrão de R$ 200,00, 500 pontos MIST e nível 1.
   - Implementado serviço de hashing com bcrypt e geração/validação de tokens JWT em `app/services/auth_service.py`.
   - Implementados endpoints `/register`, `/login`, `/me` e `/health` em `app/api/routes.py`, com suporte a injeção do cabeçalho `X-User-Id` e extração de Bearer token.
   - Criada suíte de testes unitários e de integração `services/auth-service/tests/test_auth.py` com banco SQLite em memória.

2. **API Gateway (`gateway`):**
   - Configurações centralizadas em `app/config.py` e cliente `httpx.AsyncClient` compartilhado via lifespan em `app/main.py`.
   - Proxy reverso em `/api/auth/{path:path}` com sanitização obrigatória de headers `x-user-*` (prevenção contra spoofing), validação de JWT e injeção dos headers de identidade downstream (`X-User-Id`, `X-User-Email`, `X-User-Username`).
   - Criada suíte de testes de integração `gateway/tests/test_gateway.py`.

3. **Cliente HTTP e Contexto Global (`frontend/src`):**
   - Atualizado `api/client.ts` com interceptor de requisição (token Bearer) e interceptor de resposta 401 (limpeza de storage e emissão do evento `mist:session-expired`).
   - Criado `context/AuthContext.tsx` provendo estado reativo de autenticação (`user`, `token`, `isAuthenticated`, `isLoading`, `sessionNotice`, `openAuthModal`, etc.), hidratação automática ao iniciar e atualização dinâmica do saldo da carteira e pontos.
   - Criada suíte de testes unitários `src/api/client.test.ts`.

4. **Componentes e Telas de UI (`frontend/src`):**
   - Criado `components/AuthModal.tsx` com alternância fluida entre abas "Entrar" e "Criar Conta", mensagem promocional de R$ 200,00 e 500 pontos, feedback de carregamento e atalho de fechamento via Esc/backdrop.
   - Atualizado `pages/Login.tsx` com modo dedicado e conectado ao `useAuth()`.
   - Atualizados `components/Sidebar.tsx`, `components/Header.tsx` e `App.tsx` para sincronização com o `AuthContext` e suporte à navegação tanto de visitantes quanto de usuários autenticados.
   - Criada suíte de testes de componente `src/components/AuthModal.test.tsx` e teste ponta a ponta `e2e/auth.spec.ts`.

5. **Catálogo de Testes e Execução (`TESTS.md` e `resultados.json`):**
   - Atualizado `TESTS.md` via taxonomia oficial da skill `qa_writer`, registrando e promovendo para `Status: aprovado`:
     - `AUTH-UNIT-01` (Pytest): Hashing bcrypt e validação de JWT.
     - `FRONT-UNIT-02` (Vitest): Interceptor de requisições e captura de 401 no `client.ts`.
     - `FRONT-UNIT-03` (Vitest): Renderização e alternância de abas do `AuthModal`.
     - `GATEWAY-INT-01` (Pytest): Encaminhamento do Gateway e injeção do `X-User-Id` com bloqueio de spoofing.
     - `AUTH-INT-01` (Pytest): Registro com saldo de R$ 200,00, persistência SQLite e login com JWT.
     - `E2E-AUTH-01` (Playwright cross-browser): Fluxo completo de cadastro, reflexão do saldo na UI e encerramento de sessão.
   - Execução integral via `qa_tester` com registro atômico em `resultados.json` (100% de aprovação nos testes implementados).

---

## 2026-09-19 — Prompt 15

**Prompt do usuário:**

> Ajustes que devem ser feitos:
> - A mensagem "Ganhe R$ 200,00 na carteira ..." deve ficar mais vísivel, pois está com baixo contraste ou com baixa transparencia
> - A senha cadastrada necessariamente deve ter um mínimo de 8 caracteres e conter caracteres dos tipos maiusculo, minusculo, número e símbolo
> - Deve haver um botão de olho para "ver/ocultar" a senha digitada tanto no cadastro quanto no login
> - Notei que- rodando apenas o frontend - em ações de cadastro/login de usuário, aparece uma mensagem de "Failed to fetch". Imagino que essa seja uma mensagem de erro padrão pela desconexão com o backend, mas peço que intercepte essa mensagm e mude a mensagem para algo mais amigável ao usuário brasileiro, como "Falha no processo de login" e "Falha no processo de cadastro".
> - Contexto de simulação incongruente: A lista de desejos aparece com 32 jogos (apesar de ter somente 2), os amigos online aparecem como sendo 3 apesar de mostrar somente 2. Mesmo que ainda não haja implementações definitivas desses recursos, já podemos tornar mais inteligente a contagem dos valores
> - Zere os saldos de pontos MIST e de dinheiro, que no dev são inicializados com valores diferentes de 0.
> 
> Depois desses ajustes, qa_writer deve criar novos testes baseados no botão de visualizar/ocultar senha e da requisição de que a senha seja conforme o padrão exigido.
> 
> Por fim, me ensine como devo rodar o sistema completo, em vez de rodar somente o frontend como fiz

**Decisões Arquiteturais e Técnicas:**

- **UI & Acessibilidade**: Aumento do contraste do banner promocional com gradiente escuro de alto contraste (`bg-gradient-to-r from-emerald-950 via-[#1F4D36]/80 to-emerald-950`), bordas brilhantes e tipografia em `text-emerald-200`.
- **Segurança de Credenciais**:
  - Frontend: Validação regex estrita de senha (>= 8 caracteres, maiúscula, minúscula, número e símbolo) com feedback prévio.
  - Backend: Validador Pydantic no schema `UserRegisterRequest` garantindo consistência em toda a API.
  - UI de Senha: Adição do botão de alternância de visibilidade (ícone de olho `fa-eye`/`fa-eye-slash`) nos campos de senha de login e cadastro.
- **Resiliência e Mensagens Amigáveis**: Interceptação de falhas de rede (`Failed to fetch`/`TypeError`) no `client.ts` e formulários com mensagens localizadas: "Falha no processo de login: não foi possível conectar ao servidor" e "Falha no processo de cadastro: não foi possível conectar ao servidor".
- **Consistência de Dados de Demonstração**:
  - Contagem dinâmica de itens na Lista de Desejos a partir de `mockGames.filter(g => g.category === 'DESEJO' || g.isWishlist).length` (total 2).
  - Contagem dinâmica de Amigos Online a partir de `mockFriends.filter(f => f.status === 'online').length` (total 2).
  - Inicialização dos saldos em desenvolvimento como `0.00` de carteira e `0` pontos MIST para o perfil visitante/convidado em `App.tsx` e `PointsShop.tsx`.
- **QA e Automação**:
  - Invocação da skill `qa_writer` para adicionar testes para o botão de ver/ocultar senha e validação de requisitos de senha.
  - Execução via `qa_tester` e persistência em `resultados.json`.
- **Instruções Operacionais**: Elaboração de guia detalhado no final da resposta ensinando como rodar o sistema completo tanto via Docker Compose quanto localmente via terminals dedicados.

**Resultado e Modificações:**

1. **Backend Auth Service (`services/auth-service`):**
   - [`app/schemas/user.py`](./services/auth-service/app/schemas/user.py): Adicionado validador `validate_password_complexity` no `UserRegisterRequest` exigindo no mínimo 8 caracteres, letra maiúscula, letra minúscula, número e símbolo especial (`!@#$%^&*()_+-=[]{};':"|,.<>/?~` e correlatos).
   - [`tests/test_auth.py`](./services/auth-service/tests/test_auth.py): Atualizadas credenciais de teste para `Senha@Segura123!` e implementado o caso de teste unitário `test_password_strength_validation_rejections`.

2. **API Gateway (`gateway`):**
   - [`tests/test_gateway.py`](./gateway/tests/test_gateway.py): Aprimorado isolamento de patching via `patch.object(gateway_main.http_client, "request")`, prevenindo colisões de módulos entre microsserviços.

3. **Frontend API Client (`frontend/src/api/client.ts`):**
   - Adicionada função utilitária `isNetworkError` para detecção robusta de erros de conexão HTTP/Fetch.
   - Envolvidas as chamadas de `authApi.login` e `authApi.register` em blocos `try/catch` que interceptam `TypeError`/`Failed to fetch` e lançam mensagens amigáveis em português: *"Falha no processo de login: não foi possível conectar ao servidor."* e *"Falha no processo de cadastro: não foi possível conectar ao servidor."*.

4. **Componentes e Telas de Autenticação (`frontend/src`):**
   - [`components/AuthModal.tsx`](./frontend/src/components/AuthModal.tsx):
     - Atualizado banner promocional de boas-vindas com gradiente profundo de alto contraste (`bg-gradient-to-r from-emerald-950 via-[#133824] to-emerald-950 border border-emerald-400/80 text-emerald-100`), garantindo legibilidade imediata no tema escuro.
     - Adicionado estado e botões de olho (`fa-eye`/`fa-eye-slash`) para ver/ocultar senha no Login e Cadastro (senha e confirmação).
     - Exportada a função `isPasswordStrong` e implementada validação de complexidade com checklist visual dinâmico antes do envio.
   - [`pages/Login.tsx`](./frontend/src/pages/Login.tsx):
     - Aplicadas as mesmas melhorias de contraste no banner promocional, botões de alternância de visibilidade da senha e validação rigorosa de credenciais.

5. **Correção de Incongruências de Simulação e Saldos Zerados:**
   - [`pages/Store.tsx`](./frontend/src/pages/Store.tsx): Exportado `mockGames`.
   - [`pages/Social.tsx`](./frontend/src/pages/Social.tsx): Criada a lista tipada `mockFriends` e calculada dinamicamente a contagem de amigos online (`onlineFriends.length` = 2).
   - [`App.tsx`](./frontend/src/App.tsx): Importado `mockGames` e calculado dinamicamente o total de itens na lista de desejos (`wishlistCount` = 2) no Header; zerados os saldos padrão de visitante para `walletBalance: 0.00` e `pointsBalance: 0`.
   - [`pages/PointsShop.tsx`](./frontend/src/pages/PointsShop.tsx): Alterado `initialPoints` padrão para `0` e adicionado `useEffect` para sincronização reativa com props.

6. **Catálogo de Testes e Execução QA (`TESTS.md` e `resultados.json`):**
   - Registrados no [`TESTS.md`](./TESTS.md) via `qa_writer`:
     - `AUTH-UNIT-02`: Validação de regras estritas de complexidade de senha no backend.
     - `FRONT-UNIT-04`: Alternância de visibilidade da senha digitada (Show/Hide) no frontend.
     - `FRONT-UNIT-05`: Validação de requisitos de senha e bloqueio de envio no frontend.
     - `FRONT-UNIT-06`: Interceptação amigável de erro de conexão com o backend.
   - Atualizados [`frontend/e2e/auth.spec.ts`](./frontend/e2e/auth.spec.ts) e [`frontend/e2e/navigation.spec.ts`](./frontend/e2e/navigation.spec.ts) para refletir senhas seguras e saldos zerados de visitantes.
   - Executados os testes via `qa_tester` (`runner_adapter.js`), com 100% de aprovação e histórico gravado atomicamente em [`resultados.json`](./resultados.json).

---

## 2026-09-19 — Prompt 16

**Prompt do usuário:**

> Tentei rodar a opção A, mas não funcionou. Imagino que seja porque o docker-compose.yaml esteja vazio no projeto. Escreva nele o que for necessário para a operação do projeto até o momento

**Decisões Arquiteturais e Técnicas:**

- **Definição dos Serviços Ativos**: Identificados os serviços atualmente implementados e operacionais no ecossistema MIST:
  - `auth-service` (microsserviço FastAPI na porta interna 8001).
  - `gateway` (API Gateway FastAPI na porta 8000).
  - `frontend` (SPA React/Vite servida por Nginx na porta 3000).
- **Padronização de Dockerfiles**:
  - `services/auth-service/Dockerfile`: Imagem `python:3.11-slim`, instalação de requisitos e inicialização do Uvicorn na porta 8001.
  - `gateway/Dockerfile`: Imagem `python:3.11-slim`, instalação de requisitos e inicialização do Uvicorn na porta 8000.
  - `frontend/Dockerfile`: Multi-stage build utilizando `node:20-alpine` para compilação estática (`npm run build`) e `nginx:alpine` para entrega dos assets web.
- **Roteamento e Servidor Web SPA (`nginx.conf`)**:
  - Configuração do Nginx com diretiva `try_files $uri $uri/ /index.html;` para suportar navegação client-side na SPA. Arquivo gerado em UTF-8 sem BOM para evitar erros de interpretação de diretiva.
- **Orquestração de Rede e Volumes (`docker-compose.yml`)**:
  - Rede isolada tipo bridge `mist-network`.
  - Volume persistente `auth_data` para manter os dados do SQLite (`auth.db`) mesmo após paradas ou recriações de contêineres.
  - Variáveis de ambiente configuradas para resolução DNS interna (`AUTH_SERVICE_URL: http://auth-service:8001`).
  - Dependências encadeadas com `depends_on`.
- **Ajustes de TypeScript no Frontend**:
  - Adicionado `src/vite-env.d.ts` e ajustado `tsconfig.json` para exclusão de testes durante o build de produção (`tsc && vite build`).

**Resultado e Modificações:**

1. **[`docker-compose.yml`](./docker-compose.yml)**: Orquestração completa dos serviços `auth-service`, `gateway` e `frontend`, com rede bridge e volume persistente.
2. **[`services/auth-service/Dockerfile`](./services/auth-service/Dockerfile)**: Container Python 3.11 com Uvicorn para o serviço de autenticação.
3. **[`gateway/Dockerfile`](./gateway/Dockerfile)**: Container Python 3.11 com Uvicorn para o API Gateway.
4. **[`frontend/Dockerfile`](./frontend/Dockerfile)** & **[`frontend/nginx.conf`](./frontend/nginx.conf)**: Multi-stage build Node + Nginx servindo a SPA na porta 3000.
5. **[`frontend/src/vite-env.d.ts`](./frontend/src/vite-env.d.ts)** & **[`frontend/tsconfig.json`](./frontend/tsconfig.json)**: Configuração de tipos de ambiente Vite e compilação limpa para produção.
6. **Validação Operacional**: Imagens construídas com `docker compose build`, contêineres iniciados com `docker compose up -d` e pipeline de registro/login testado com sucesso via HTTP real.

---

## 2026-09-19 — Prompt 17

**Prompt do usuário:**

> Obrigado por mais esse auxilio. Agora pude validar mais alguns ajustes que devem ser feitos:
> - Após falhar em fazer login, tanto a mensagem de usuário/senha inválida (correto) quanto a de que a minha "sessão expirou ou é inválida" apareceram. Essa mensagem em amarelo não deveria aparecer nesse fluxo de falha de login.
> - A modal de criação da conta está comprida demais verticalmente, e não há scroll atualmente. Aplique a possibilidade de haver um scroll quando a tela tiver um pequeno espaço vertical, além de reduzir a fonte da mensagem de benefícios do cadastro de modo à mensagem caber em somente uma linha. Para ajudar nesse objetivo, mude a mensagem para "Ganhe R$ 200,00 e 500 Pontos MIST ao se cadastrar!"

**Decisões Arquiteturais e Técnicas:**

- **Isolamento de Erro 401 de Autenticação Primária**:
  - O interceptor de respostas HTTP em `frontend/src/api/client.ts` capturava qualquer código `401 Unauthorized` indistintamente e emitia o evento global `SESSION_EXPIRED_EVENT`.
  - Como o backend responde `401` ao receber credenciais inválidas em `/api/auth/login`, o evento global disparava o aviso amarelo de sessão expirada no `AuthContext` simultaneamente ao erro vermelho de credenciais inválidas.
  - Implementada checagem `isAuthRoute` para ignorar a emissão do evento em rotas de autenticação primária (`/api/auth/login` e `/api/auth/register`), reservando o aviso de sessão expirada exclusivamente para expiração de tokens em chamadas protegidas da aplicação. Adicionada também chamada explícita para limpar qualquer aviso prévio de sessão ao submeter o formulário de login.
- **Scroll Responsivo e Densidade Vertical no Modal**:
  - Adicionado `max-h-[90vh] overflow-y-auto` ao card principal do `AuthModal` com rolagem vertical suave para telas de baixa altura ou dispositivos menores.
  - Redesenho do banner promocional para uma linha única horizontal (`text-[11px] sm:text-xs leading-tight whitespace-nowrap truncate`), adotando o texto exato solicitado: `"Ganhe R$ 200,00 e 500 Pontos MIST ao se cadastrar!"`.
  - Atualização correspondente na tela `Login.tsx` para consistência visual.

**Resultado e Modificações:**

1. **[`frontend/src/api/client.ts`](./frontend/src/api/client.ts)**:
   - Adicionada condicional no interceptor para que endpoints de login/cadastro não emitam o evento global `SESSION_EXPIRED_EVENT`.
2. **[`frontend/src/components/AuthModal.tsx`](./frontend/src/components/AuthModal.tsx)**:
   - Adicionado scroll vertical responsivo (`max-h-[90vh] overflow-y-auto`).
   - Reduzido o banner de benefícios para uma linha única compacta com o texto `"Ganhe R$ 200,00 e 500 Pontos MIST ao se cadastrar!"`.
   - Invocação de `clearSessionNotice()` antes do submit de login.
3. **[`frontend/src/pages/Login.tsx`](./frontend/src/pages/Login.tsx)**:
   - Atualizado o banner de benefícios com o mesmo texto em linha única.
4. **[`frontend/src/api/client.test.ts`](./frontend/src/api/client.test.ts)**:
   - Adicionado caso de teste unitário verificando que status 401 em `/api/auth/login` não emite `SESSION_EXPIRED_EVENT`.
5. **Reconstrução Docker**:
   - Reconstrução e reinicialização bem-sucedidas do contêiner `mist-frontend` via `docker compose up -d --build frontend`.

---

## 2026-09-19 — Prompt 18

**Prompt do usuário:**

> Remova o scroll lateral da modal de login/registro. Apenas o scroll vertical é necessário

**Decisões Arquiteturais e Técnicas:**

- **Supressão Estrita de Overflow Horizontal**:
  - No CSS padrão, quando uma dimensão define `overflow-y: auto` e `overflow-x` permanece padrão (`visible`), os navegadores automaticamente computam `overflow-x: auto`. Havendo elementos com posicionamento absoluto excedendo as laterais (ex.: os elementos decorativos de glow `-right-24` e `-left-24`) ou texto `whitespace-nowrap`, uma barra de rolagem horizontal indesejada era acionada no container.
  - Aplicada a combinação explícita `overflow-y-auto overflow-x-hidden` no card do `AuthModal`.
  - Adicionado `min-w-0 overflow-hidden` nos elementos flex do banner de boas-vindas para impedir que textos ou tags internas empurrem o container lateralmente em qualquer resolução.

**Resultado e Modificações:**

1. **[`frontend/src/components/AuthModal.tsx`](./frontend/src/components/AuthModal.tsx)**:
   - Card principal atualizado com `overflow-y-auto overflow-x-hidden`.
   - Elemento do banner atualizado com `min-w-0 overflow-hidden`.
2. **Testes Unitários**:
   - Suíte de testes do frontend executada com sucesso (14/14 aprovados no Vitest).
3. **Reconstrução Docker**:
   - Contêiner `mist-frontend` reconstruído e recriado com sucesso via `docker compose up -d --build frontend`.

---

## 2026-09-19 — Prompt 19

**Prompt do usuário:**

> Com base no contexto de tarefas realizadas nessa conversa, há necessidade de atualizar o gitignore com algum arquivo ou diretório? Além disso, é necessário ocultar dados de maneira mais segura, de modo a não haver vazamento de senhas dos usuários ou até mesmo de dados do próprio código?

**Decisões Arquiteturais e Técnicas:**

- **Auditoria do `.gitignore`**:
  - Constatado que o arquivo `.gitignore` raiz continha apenas regras para o ecossistema Python tradicional, deixando desprotegidos:
    1. Bancos de dados locais SQLite (`auth.db`, `services/auth-service/app/data/*.db`), expondo hashes de senhas e dados cadastrais caso comitados.
    2. Ecossistema Frontend Node/Vite (`node_modules/`, `frontend/dist/`, `.vite/`, relatórios do Vitest/Playwright). Identificado inclusive que arquivos de cache e dependências sob `frontend/node_modules` haviam sido indexados em commits prévios.
    3. Variáveis de ambiente e segredos locais (`.env`, `.env.*.local`, chaves criptográficas).
- **Auditoria de Segurança de Credenciais e Segredos**:
  - *Senhas de Usuários*: O uso de bcrypt com salt dinâmico está tecnicamente correto e os schemas Pydantic omitem o hash. O principal ponto de atenção reside em evitar o commit de bases SQLite locais e garantir que logs HTTP não registrem os corpos das requisições de login/registro.
  - *Segredos da Aplicação (`JWT_SECRET_KEY`)*: Atualmente existe uma chave padrão de desenvolvimento hardcoded no código e no `docker-compose.yml`. Em produção, isso permite forja de tokens JWT. É mandatório adotar segregação via variáveis de ambiente (`.env` fora do Git + `.env.example` documentado) e validação de inicialização para impedir chave padrão em produção.
  - *Isolamento de Rede dos Microsserviços*: Serviços internos (`auth-service`) não devem expor portas públicas no Docker em produção, operando apenas através da rede interna `mist-network` roteada pelo Gateway.

**Resultado e Modificações:**

- Elaborada análise técnica diagnóstica e plano de ação estruturado com recomendações práticas para `.gitignore`, blindagem de senhas, gestão de segredos (`.env`) e arquitetura de portas do Docker.

---

## 2026-09-19 — Prompt 20

**Prompt do usuário:**

> /goal Faça todos os ajustes de segurança necessários

**Decisões Arquiteturais e Técnicas:**

- **Blindagem Completa do `.gitignore`**:
  - Inseridas regras abrangentes para supressão de arquivos de banco de dados SQLite (`*.db`, `*.sqlite`, `*.sqlite3`, `app/data/`, `auth_data/`), prevenindo o commit acidental de tabelas de usuários e hashes de senhas.
  - Inseridas regras para dependências Node.js, compilações estáticas e caches (`node_modules/`, `frontend/dist/`, `.vite/`). Executado `git rm -r --cached frontend/node_modules/` para desindexar dependências antigas rastreadas acidentalmente.
  - Inseridas regras para variáveis de ambiente e chaves sensíveis (`.env`, `.env.*`, `!.env.example`, `*.pem`, `*.key`, `*.cert`).
- **Gestão de Segredos e Validação Estrita em Produção**:
  - Criado o arquivo template [`./.env.example`](./.env.example) e gerado o [`.env`](./.env) local (ignorado pelo Git).
  - Atualizados [`services/auth-service/app/services/auth_service.py`](./services/auth-service/app/services/auth_service.py) e [`gateway/app/config.py`](./gateway/app/config.py) com lógica *crash-fast*: se `ENVIRONMENT == "production"` e `JWT_SECRET_KEY` for a chave padrão ou menor que 32 caracteres, a aplicação recusa a inicialização com `RuntimeError`.
- **Isolamento de Portas e CORS Controlado**:
  - Atualizado [`docker-compose.yml`](./docker-compose.yml) com interpolação dinâmica de variáveis de ambiente (`${JWT_SECRET_KEY}`, etc.) e restrição de porta do `auth-service` para `127.0.0.1:8001:8001`, impedindo acesso direto pela rede externa/LAN.
  - Substituída a configuração de CORS permissivo (`*` com `allow_credentials=True`) por origens permitidas controladas via variável de ambiente `CORS_ORIGINS` no Gateway e Auth Service.
- **Automação de Testes e QA**:
  - Criado o teste unitário de segurança `AUTH-UNIT-03` em `services/auth-service/tests/test_auth.py`, registrado e aprovado no [`TESTS.md`](./TESTS.md).
  - Execução da suíte completa de testes via `runner_adapter.js` com registro atômico em [`resultados.json`](./resultados.json) (100% de aprovação nos testes implementados).

**Resultado e Modificações:**

1. **[`.gitignore`](./.gitignore)**: Adicionadas seções para bancos de dados, ecossistema Node/Vite, segredos `.env` e relatórios de testes.
2. **[`git rm -r --cached frontend/node_modules`](./frontend/node_modules)**: Desindexadas mais de 3.600 dependências do histórico do repositório.
3. **[`.env.example`](./.env.example)** & **[`.env`](./.env)**: Criados template documentado e arquivo local de ambiente.
4. **[`services/auth-service/app/services/auth_service.py`](./services/auth-service/app/services/auth_service.py)** & **[`gateway/app/config.py`](./gateway/app/config.py)**: Validação obrigatória de segurança da chave JWT em produção.
5. **[`gateway/app/main.py`](./gateway/app/main.py)** & **[`services/auth-service/app/main.py`](./services/auth-service/app/main.py)**: Configuração de CORS com origens restritas e seguras.
6. **[`docker-compose.yml`](./docker-compose.yml)**: Portas protegidas e injeção limpa de variáveis de ambiente.
7. **[`services/auth-service/tests/test_auth.py`](./services/auth-service/tests/test_auth.py)** & **[`TESTS.md`](./TESTS.md)** & **[`resultados.json`](./resultados.json)**: Catalogado e validado o teste `AUTH-UNIT-03`.
8. **Reconstrução Docker**: Todos os contêineres reconstruídos e ativos (`docker compose up -d --build`).




