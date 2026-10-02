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
