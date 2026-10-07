# Registro de Prompts — mkritli (2nd)

Arquivo diário de rastreamento de prompts e decisões técnicas para a sessão do desenvolvedor **mkritli** (Trilha 3 — Dev 3: Social, UGC, Notificações e Gateway) no dia **02 de Outubro**.

---

## 2026-10-02 — Prompt 1

**Prompt do usuário:**

> /plan vc consegue ler o codigo e implementar testes automatizados usando plawyright? ou necessita instalar algo?

**Decisões arquiteturais e técnicas:**

1. **Mudança de Dia Operacional (Mandatório por `AGENTS.md` e `GEMINI.md`):**
   - Transição do dia 01 de Outubro (`mkritli_1st.md`) para 02 de Outubro (`mkritli_2nd.md`).
   - Confirmação do usuário ativo como `mkritli` com base nas variáveis de ambiente e histórico do repositório.

2. **Diagnóstico Completo de Ambiente e Runtime:**
   - **Node.js e npm**: Verificada a presença local de Node.js `v20.20.2` e npm `10.8.2` já instalados via `fnm` (`~/.local/share/fnm/`).
   - **Playwright**: `@playwright/test` `^1.63.0` já presente em `frontend/node_modules/`.
   - **Binários dos Navegadores**: Binários de `chromium-1243`, `firefox-1543`, `webkit-2359` e `ffmpeg-1011` já pré-baixados no cache do usuário em `~/.cache/ms-playwright/`.
   - **Conclusão**: **Nenhuma instalação ou download externo da internet é necessário.**

3. **Diagnóstico de Configuração e Ajustes Necessários:**
   - O arquivo `frontend/playwright.config.ts` apontava para `testDir: './tests'` (pasta vazia) enquanto os testes residem em `frontend/e2e/`.
   - As opções de `baseURL` e `webServer` no Playwright estavam comentadas, exigindo configuração para inicializar o servidor Vite (`port: 3000`) de forma automatizada durante os testes.
   - O PATH de subshells não-interativas precisa incluir o diretório de binários do Node via `fnm` para execução limpa pelo adaptador de testes (`runner_adapter.py`).

4. **Elaboração do Plano de Implementação (`/plan`):**
   - Criação do artefato de design e planejamento técnico detalhando a arquitetura de testes E2E, a estratégia híbrida de mocking de endpoints (`page.route()`) para rapidez e determinismo da SPA, e a cobertura das páginas principais (Loja, Biblioteca, Mercado, Oficina).
   - Mapeamento das pendências no catálogo formal [`TESTS.md`](../TESTS.md).

**Resumo das saídas:**

- Arquivos criados:
  - `prompts/mkritli_2nd.md` (Registro diário obrigatório de 02 de Outubro para o usuário `mkritli`)
  - Artefato de plano: `playwright_implementation_plan.md`

---

## 2026-10-02 — Prompt 2

**Prompt do usuário:**

> otimo, leia os prompts do projeto para definir scenarios de testes automatizados com plawyright antes de implementar, como se estivesse planejando os testes com metodologia TDD

**Decisões arquiteturais e técnicas:**

1. **Varredura e Consolidação Histórica dos Prompts (`prompts/`):**
   - Análise de `legacy_prompts.md`, `mkritli_30th.md`, `gabriel-T800_1st.md`, `gabriel-T800_2nd.md` e `development_schedule.md`.
   - Mapeamento das funcionalidades críticas entregues nas 3 trilhas:
     - **Trilha 1**: Catálogo de jogos, AI Curator, Wishlist, Reviews comunitárias, Checkout e posse na biblioteca.
     - **Trilha 2**: Loja de Pontos, inventário de cosméticos (molduras/avatares), edição de perfil, recarga de carteira (`AddFundsModal`) e Mercado da Comunidade.
     - **Trilha 3**: Social e solicitações de amizade reais, Chat em tempo real (WebSocket), Grupos e fóruns, Showcase de Screenshots (UGC) e Oficina de Mods (Workshop).

2. **Planejamento de Testes E2E com Metodologia TDD (Specification-First):**
   - Aplicação do ciclo **Red-Green-Refactor** no nível de integração de sistema (End-to-End):
     - **Fase RED (Especificação)**: Escrita do teste formal com critérios Given/When/Then, seletores semânticos e contratos de API mockados antes da codificação/ajuste das telas.
     - **Fase GREEN (Passagem)**: Execução real no Playwright via headless browser confirmando que a interface e eventos reagem exatamente às asserções.
     - **Fase REFACTOR (Manutenibilidade)**: Extração de Page Objects / helpers compartilhados (`AuthHelper`, `StoreHelper`) para evitar duplicação de locators.
   - Isolamento determinístico: Uso de contratos fiéis às rotas do FastAPI via `page.route()`, assegurando execução instantânea (< 5s por suíte), sem dependência de containers externos e sem flaky tests.

3. **Matriz de 6 Suítes E2E Estruturadas:**
   - **Suíte 1 — Autenticação e Gestão Financeira (`auth_wallet.spec.ts`):** `E2E-AUTH-01` (Cadastro e bônus) e `E2E-WALLET-01` (Recarga de carteira instantânea).
   - **Suíte 2 — Loja, Descoberta e AI Curator (`store_curator.spec.ts`):** `E2E-FLOW-01` (Busca e detalhes do jogo) e `E2E-CURATOR-01` (Abas do AI Curator e alerta de Wishlist).
   - **Suíte 3 — Checkout de Compra e Biblioteca (`purchase_library.spec.ts`):** `E2E-PURCHASE-01` (Compra com saldo, crédito de pontos e transição) e `E2E-LIB-01` (Visualização da posse e estatísticas).
   - **Suíte 4 — Social, Amizades e Chat (`social_chat.spec.ts`):** `E2E-SOC-01` (Solicitação e aceitação de amizade) e `E2E-CHAT-01` (Envio de mensagem e histórico).
   - **Suíte 5 — Economia de Pontos, Cosméticos e Mercado (`points_market.spec.ts`):** `E2E-POINTS-01` (Resgate de cosmético na Loja de Pontos) e `E2E-MKT-01` (Listagem e compra no Mercado).
   - **Suíte 6 — Conteúdo Comunitário UGC e Workshop (`ugc_workshop.spec.ts`):** `E2E-UGC-01` (Curtir screenshot) e `E2E-WKS-01` (Inscrição reativa em mod).

**Resumo das saídas:**

- Arquivo atualizado: `prompts/mkritli_2nd.md`
- Definição completa dos cenários de teste TDD documentada na resposta técnica e no catálogo de QA.

---

## 2026-10-02 — Prompt 3

**Prompt do usuário:**

> quanto cenarios automatizados com playwright ficara no total?

**Decisões arquiteturais e técnicas:**

1. **Quantificação e Dimensionamento das Suítes E2E:**
   - Consolidação de **16 cenários de teste automatizados E2E** distribuídos em 6 suítes funcionais:
     - **Suíte 1: Autenticação e Carteira (3 cenários)**: `E2E-AUTH-01`, `E2E-AUTH-02`, `E2E-WALLET-01`.
     - **Suíte 2: Navegação, Loja e AI Curator (4 cenários)**: `E2E-NAV-01`, `E2E-FLOW-01`, `E2E-CURATOR-01`, `E2E-WISHLIST-01`.
     - **Suíte 3: Compra e Biblioteca (2 cenários)**: `E2E-PURCHASE-01`, `E2E-LIB-01`.
     - **Suíte 4: Social, Amigos e Chat (3 cenários)**: `E2E-SOC-01`, `E2E-CHAT-01`, `E2E-GROUPS-01`.
     - **Suíte 5: Loja de Pontos e Mercado (2 cenários)**: `E2E-POINTS-01`, `E2E-MKT-01`.
     - **Suíte 6: UGC e Workshop Comunitário (2 cenários)**: `E2E-UGC-01`, `E2E-WKS-01`.
   - Distribuição de status em relação ao repositório:
     - 2 cenários pré-existentes (`E2E-AUTH-01` e `E2E-NAV-01`) que serão atualizados e integrados.
     - 1 cenário planejado pendente em `TESTS.md` (`E2E-FLOW-01`).
     - 13 novos cenários cobrindo o restante da SPA MIST.

**Resumo das saídas:**

- Arquivo atualizado: `prompts/mkritli_2nd.md`
- Apresentação da contagem detalhada e tabela consolidada de cenários ao usuário.

---

## 2026-10-02 — Prompt 4

**Prompt do usuário:**

> na criacao dos cenarios para playwright usando metodologia TDD considere ticket a ticket nomeado no arquivo @development_schedule.md . Recrie os scenarios com esta nova configuracao e me diga quantos testes existirao no final
> usando oq aprendeu ate agora na criacao dos cenarios para playwright usando metodologia TDD, amplie e revise os testes considerando ticket a ticket nomeado no arquivo @development_schedule.md

**Decisões arquiteturais e técnicas:**

1. **Rastreabilidade Fina Ticket a Ticket (`development_schedule.md`):**
   - Mapeamento exaustivo de cada bloco e ticket de funcionalidade de frontend (`[F]`) e integração full-stack (`[B] + [F]`) para cenários Playwright TDD dedicados.
   - Cobertura completa das 3 Trilhas (Dev 1, Dev 2, Dev 3) e dos Blocos Fundamentais (B, C, D, F):
     - **Bloco B**: `E2E-AUTH-01`, `E2E-AUTH-02`, `E2E-PROF-01`, `E2E-WALLET-01`.
     - **Bloco C & D**: `E2E-NAV-01`, `E2E-STORE-01`, `E2E-STORE-02`, `E2E-LIB-01`.
     - **Bloco H (Reviews)**: `E2E-REV-01`, `E2E-REV-02`.
     - **Bloco T (Extrato de Carteira)**: `E2E-WAL-02`.
     - **Bloco L (Mercado & Trocas)**: `E2E-MKT-01`, `E2E-MKT-02`, `E2E-TRD-01`.
     - **Bloco I (Loja de Pontos)**: `E2E-PTS-01`, `E2E-PTS-02`.
     - **Bloco J (Inventário)**: `E2E-INV-01`, `E2E-INV-02`.
     - **Bloco K (Cards, Badges & XP)**: `E2E-XP-01`, `E2E-CRF-01`.
     - **Bloco P (Perfil Público & Privacidade)**: `E2E-PUB-01`, `E2E-PRV-01`.
     - **Bloco M (Grupos, Fórum & Chat de Grupo)**: `E2E-GRP-01`, `E2E-FRM-01`, `E2E-GCHT-01`.
     - **Bloco N (Showcase de Screenshots UGC)**: `E2E-UGC-01`, `E2E-UGC-02`.
     - **Bloco O (Workshop de Mods e Skins)**: `E2E-WKS-01`, `E2E-WKS-02`.
     - **Bloco Q (Sistema de Notificações)**: `E2E-NOT-01`, `E2E-NOT-02`.
     - **Bloco R (Busca Global)**: `E2E-SCH-01`.
     - **Bloco S (AI Curator Avançado)**: `E2E-CUR-01`, `E2E-CUR-02`.
     - **Bloco F (Social & Amizades Base)**: `E2E-SOC-01`, `E2E-SOC-02`.
     - **Fase 5 (Dia 13 — Fluxo Mestre Integrado)**: `E2E-INTEG-01` (Compra → SDK/Conquista → Drop de Carta → Venda no Mercado → Trade → Workshop).

2. **Quantificação Final:**
   - **Total de 37 testes automatizados E2E com Playwright**, garantindo 100% de rastreabilidade com a matriz de tickets do projeto.

**Resumo das saídas:**

- Arquivo atualizado: `prompts/mkritli_2nd.md`
- Apresentação da matriz completa ticket a ticket, critérios BDD/TDD e contagem final ao usuário.

---

## 2026-10-02 — Prompt 5

**Prompt do usuário:**

> otimo, agora implemente os testes, lembre te especificar estes testes nos arquivos de documentacao dos testes

**Decisões arquiteturais e técnicas:**

1. **Ativação da Branch Dedicada de Testes:**
   - Trabalho iniciado na branch `E2E_tests` criada pelo usuário.

2. **Configuração da Infraestrutura Playwright e Vite (`playwright.config.ts`):**
   - Configuração de `testDir: './e2e'`, `baseURL: 'http://localhost:3000'` e bloco `webServer` com `npm run dev` na porta 3000 reutilizando o servidor se ativo.
   - Ajuste de projetos de navegador para execução focada no Chromium por padrão com suporte a Firefox e WebKit.

3. **Resolução de PATH/fnm no Runner Adapter (`runner_adapter.py`):**
   - Inclusão do diretório de binários do Node (`~/.local/share/fnm/current/bin`) no PATH de subprocessos para execução uniforme via terminal e skill `qa_tester`.

4. **Implementação Modular dos 37 Testes E2E com Metodologia TDD:**
   - Criação de arquivos de teste modulares em `frontend/e2e/` cobrindo todos os fluxos dos tickets.
   - Uso de `page.route()` para mockar contratos de API garantindo velocidade (< 1s por teste), resiliência e ausência de flakiness.

5. **Atualização Incremental da Documentação (`TESTS.md`):**
   - Especificação de todos os 37 testes com os campos obrigatórios da skill `qa_writer`: Prioridade, Status, Runner, Comando, Pré-condições, Passos (Dado/Quando/Então), Resultado esperado e Rastreabilidade.

6. **Execução e Gravação de Resultados:**
   - Execução dos testes e validação com gravação em `resultados.json`.

**Resumo das saídas:**

- **Infraestrutura e Configuração:**
  - `frontend/playwright.config.ts`: Configuração completa do Playwright E2E integrado ao Vite dev server (`http://localhost:3000`).
  - `.agents/skills/qa_tester/scripts/runner_adapter.py`: Patch para injeção automática de caminhos do runtime Node (`fnm`) no `PATH` de subprocessos.
- **Módulos de Testes E2E Criados (`frontend/e2e/`):**
  - `helpers.ts`: Funções utilitárias de setup de sessão e mocks de APIs recorrentes (`setupAuthenticatedSession`).
  - `auth.spec.ts`: `E2E-AUTH-01`, `E2E-AUTH-02`, `E2E-PROF-01`, `E2E-WALLET-01`.
  - `navigation.spec.ts`: `E2E-NAV-01`.
  - `store.spec.ts`: `E2E-STORE-01`, `E2E-STORE-02`, `E2E-REV-01`, `E2E-REV-02`, `E2E-CUR-01`, `E2E-CUR-02`.
  - `library.spec.ts`: `E2E-LIB-01`.
  - `wallet_history.spec.ts`: `E2E-WAL-02`.
  - `market_trade.spec.ts`: `E2E-MKT-01`, `E2E-MKT-02`, `E2E-TRD-01`.
  - `points_shop.spec.ts`: `E2E-PTS-01`, `E2E-PTS-02`.
  - `inventory.spec.ts`: `E2E-INV-01`, `E2E-INV-02`, `E2E-XP-01`, `E2E-CRF-01`.
  - `public_profile.spec.ts`: `E2E-PUB-01`, `E2E-PRV-01`.
  - `community_groups.spec.ts`: `E2E-GRP-01`, `E2E-FRM-01`, `E2E-GCHT-01`.
  - `ugc_screenshots.spec.ts`: `E2E-UGC-01`, `E2E-UGC-02`.
  - `workshop.spec.ts`: `E2E-WKS-01`, `E2E-WKS-02`.
  - `notifications_search.spec.ts`: `E2E-NOT-01`, `E2E-NOT-02`, `E2E-SCH-01`.
  - `social_chat.spec.ts`: `E2E-SOC-01`, `E2E-SOC-02`.
  - `master_flow.spec.ts`: `E2E-INTEG-01`.
- **Documentação de Testes (`TESTS.md`):**
  - Atualização completa da seção `## E2E / Sistema completo` com especificações formais estruturadas (Dado / Quando / Então, Rastreabilidade, Comandos de execução) para todos os 37 testes.
- **Execução e Validação:**
  - Validação de 37/37 testes aprovados na suíte E2E do Playwright (`37 passed in 39.0s`).
  - Execução via `runner_adapter.py` para catalogação formal e sincronização no histórico de `resultados.json`.
