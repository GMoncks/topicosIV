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



