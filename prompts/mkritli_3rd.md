# Registro de Prompts — mkritli (3rd)

Arquivo diário de rastreamento de prompts e decisões técnicas para a sessão do desenvolvedor **mkritli** (Trilha 3 — Dev 3: Social, UGC, Notificações e Gateway) no dia **03 de Outubro**.

---

## 2026-10-03 — Prompt 1

**Prompt do usuário:**

> como posso rodar o testes de playwright usando comando do playwright diretamente via linha de comando no terminal, considerando que os containers vao estar up e running via docker

**Decisões arquiteturais e técnicas:**

1. **Mudança de Dia Operacional (Mandatório por `AGENTS.md` e `GEMINI.md`):**
   - Transição do dia 02 de Outubro (`mkritli_2nd.md`) para 03 de Outubro (`mkritli_3rd.md`).
   - Identificação do usuário ativo `mkritli`.

2. **Análise da Infraestrutura Docker e Configuração do Playwright:**
   - Inspeção de [`docker-compose.yml`](../docker-compose.yml): os containers sobem o `mist-frontend` mapeado na porta `3000:80` e o `mist-gateway` na porta `8000:8000`.
   - Inspeção de [`frontend/playwright.config.ts`](../frontend/playwright.config.ts):
     - `baseURL` está definido como `http://localhost:3000`.
     - `webServer` possui `reuseExistingServer: !process.env.CI`. Isso significa que se o container Docker já estiver rodando e respondendo em `http://localhost:3000`, o Playwright não inicia um servidor duplicado e conecta diretamente no container ativo.
     - `projects`: configurado para rodar no `chromium`.
   - Inspeção de [`frontend/package.json`](../frontend/package.json): scripts `test:e2e` (`playwright test`) e `test:e2e:ui` (`playwright test --ui`).

3. **Guia de Execução CLI:**
   - Apresentação dos comandos nativos do Playwright a partir da pasta `frontend/`:
     - Execução direta com relatórios no terminal (`npx playwright test` / `npm run test:e2e`).
     - Execução com visualização de navegador (`--headed`).
     - Modo interativo com interface gráfica (`--ui`).
     - Modo depuração passo a passo (`--debug`).
     - Execução por arquivo específico ou por filtro de nome (`-g`).
     - Visualização do relatório consolidado (`npx playwright show-report`).

**Resumo das saídas:**

- Arquivo criado:
  - `prompts/mkritli_3rd.md` (Registro diário de 03 de Outubro para `mkritli`).
- Resposta detalhada com os comandos prontos para copiar e colar no terminal com explicações do comportamento com Docker.
