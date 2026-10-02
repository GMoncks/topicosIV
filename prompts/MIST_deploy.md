# Registro de Prompts — MIST Deploy (Raspberry Pi + CasaOS + Cloudflare Tunnel)

Arquivo dedicado ao rastreamento de prompts e decisões técnicas relacionadas ao **deploy do MIST em ambiente de produção acadêmica** no home-server do desenvolvedor **gabriel-T800**.

---

## 2026-10-01 — Prompt 1

**Prompt do usuário:**

> O MIST ainda não está totalmente pronto, mas já pode-se ter uma boa noção da escala atual do projeto em suas fases finais de implementação do planejamento. Considerando que ele é todo baseado em microserviços e possui um docker compose responsável por subir cada uma das partes do sistema, pensei em subir a plataforma via Docker no meu home-server, que é baseado em CasaOS sobre um Raspberry Pi OS Lite, para em seguida disponibilizar o acesso ao frontend do sistema via URL por um domínio CloudFlared Tunnel. Como já possuo todo esse esquema de tunel bem configurado no meu servidor (necessitando apenas que eu crie o novo subdominio para o MIST), avalie a possibilidade de eu concretizar essa ideia. Seriam necessárias mudanças para que eu possa disponibilizar o MIST de forma produtiva da maneira que pensei? E qual a estimativa de uso do hardware considerando o acesso de no máximo 10 usuários simultaneos (projeto puramente academico)

**Decisões arquiteturais e técnicas:**

1. **Análise de Compatibilidade ARM64:**
   - Verificação de que todas as 8 imagens Docker do MIST (`python:3.11-slim` ×7 + `nginx:alpine`) possuem manifests multi-arch com suporte nativo a `linux/arm64` no Docker Hub.
   - Confirmação de que todas as dependências Python (FastAPI, SQLAlchemy, bcrypt, pydantic, uvicorn, httpx, websockets) possuem wheels pré-compilados `manylinux_2_28_aarch64`, sem necessidade de compilação local.
   - Alerta de que o Pi OS **deve** ser a versão 64-bit (aarch64), pois a versão 32-bit (armv7l) não possui wheels para `pydantic-core` e `bcrypt`.

2. **Identificação de Mudanças Necessárias no Frontend:**
   - Descoberta de que `API_GATEWAY_URL` em `frontend/src/api/client.ts` é embutido em tempo de build pelo Vite com fallback para `http://localhost:8000`, o que quebraria todas as chamadas de API quando acessado remotamente.
   - Proposta de duas soluções: **(A)** URL relativa (`''`) aproveitando o Nginx reverse proxy já existente em `nginx.conf` (recomendada), ou **(B)** parametrização via `ARG` no Dockerfile.
   - Identificação de que o `wsBase` para WebSockets é construído via `API_GATEWAY_URL.replace(/^http/, 'ws')` em 4 componentes (ChatWindow, Social, Groups, NotificationsDropdown), necessitando ajuste para usar `window.location` de forma dinâmica.

3. **Análise de CORS e Segurança:**
   - Identificação de que `CORS_ORIGINS` precisa incluir o domínio público do Cloudflare Tunnel no `.env` de produção.
   - Alerta sobre a necessidade de gerar um `JWT_SECRET_KEY` criptograficamente seguro para produção.

4. **Estimativa de Hardware:**
   - Cálculo de consumo de RAM por container (idle ~260MB total, sob carga de 10 users ~383MB).
   - Análise de CPU (pico ~40-60% em bursts de checkout simultâneo, regime normal 15-35%).
   - Recomendação de hardware mínimo: Pi 4 com **4GB RAM** e **SSD USB** para evitar desgaste do microSD.
   - Descarte de viabilidade no Pi 4 com 1GB (OOM Killer mataria containers).

5. **Considerações sobre Cloudflare Tunnel:**
   - Confirmação de suporte nativo a WebSockets pelo Cloudflare Tunnel (desde 2019).
   - HTTPS automático no edge sem necessidade de certificado no Pi.
   - Configuração do tunnel apontando para `http://localhost:3000` (container frontend com Nginx proxy).

**Resumo das saídas:**

- Criado: Artefato de avaliação `avaliacao_deploy_raspi.md` com análise completa de viabilidade, tabelas de hardware, checklist de deploy e listagem de mudanças de código (~10 linhas).
- Criado: [`prompts/MIST_deploy.md`](MIST_deploy.md).
- Nenhuma modificação de código realizada (prompt puramente investigativo/consultivo).

---

## 2026-10-02 — Prompt 2

**Prompt do usuário:**

> Sim, sou o gabriel-T800. No entanto, salve os registros dessa conversa em específico em um novo arquivo chamado MIST_deploy.md, apenas a título de separação desse item adicional que pensei

**Decisões arquiteturais e técnicas:**

1. Criação do arquivo dedicado `prompts/MIST_deploy.md` para rastreamento separado do tópico de deploy.
2. Remoção da entrada correspondente (Prompt 7) de `prompts/gabriel-T800_1st.md`.

**Resumo das saídas:**

- Criado: [`prompts/MIST_deploy.md`](MIST_deploy.md).
- Modificado: [`prompts/gabriel-T800_1st.md`](gabriel-T800_1st.md) (removido Prompt 7 migrado).

---

## 2026-10-02 — Prompt 3

**Prompt do usuário:**

> Finalizei os escopos do trabalho. Como estou realizando apenas ajustes de QA no sistema, o docker compose dificilmente será modificado novamente. Analise e faça as mudanças necessárias para que eu possa hospedar o docker completo do MIST em meu home-server usando um túnel cloudflared. Ao final, explique como esse processo de buildar na minha máquina e transferir as imagens para o home-server deve ser feita.

**Decisões arquiteturais e técnicas:**

1. **Mudança de `API_GATEWAY_URL` para URL relativa (`''`):**
   - Alterado o fallback em `frontend/src/api/client.ts` de `'http://localhost:8000'` para `''` (string vazia), tornando todas as chamadas `fetch` relativas ao domínio atual.
   - O `nginx.conf` do frontend já possuía as regras de proxy reverso para `/api/` e `/ws/`, portanto nenhuma configuração adicional de Nginx foi necessária.

2. **Correção do `wsBase` para WebSockets dinâmicos:**
   - Alterados 3 componentes (`ChatWindow.tsx`, `Social.tsx`, `Groups.tsx`) para construir o `wsBase` via `window.location` quando `API_GATEWAY_URL` é vazio, garantindo detecção automática de `wss://` em HTTPS (Cloudflare Tunnel).
   - Preservado o fallback para o comportamento original quando `VITE_API_GATEWAY_URL` é explicitamente configurada (ambiente de dev).
   - `NotificationsDropdown.tsx` já usava `window.location` e não precisou de alteração.

3. **Validação completa:**
   - Build TypeScript + Vite: sucesso absoluto.
   - Suíte Vitest: **189/189 testes aprovados em 36 arquivos** — zero regressões.

4. **Guia de cross-build e transferência:**
   - Documentação completa de 9 passos: criação de builder buildx, build ARM64 de 8 imagens, export `.tar.gz`, transferência via SCP, `docker load` no Pi, configuração de `.env` de produção, `docker compose up`, e configuração do Cloudflare Tunnel.

**Resumo das saídas:**

- Modificado: [`frontend/src/api/client.ts`](../frontend/src/api/client.ts) (L1: URL relativa).
- Modificado: [`frontend/src/components/ChatWindow.tsx`](../frontend/src/components/ChatWindow.tsx) (L55-56: wsBase dinâmico).
- Modificado: [`frontend/src/pages/Social.tsx`](../frontend/src/pages/Social.tsx) (L65-66: wsBase dinâmico).
- Modificado: [`frontend/src/pages/Groups.tsx`](../frontend/src/pages/Groups.tsx) (L154-155: wsBase dinâmico).
- Criado: Artefato `walkthrough.md` com guia de deploy passo a passo.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

