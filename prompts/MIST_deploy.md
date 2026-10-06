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

---

## 2026-10-02 — Prompt 4

**Prompt do usuário:**

> Acabei de rodar todos os builds (Passo 1), mas infelizmente não terei o tempo necessário para seguir com o restante da implementação para hospedagem via home-server. Considerando que não farei agora os próximos passos, esses buildx produziram algum lixo que eu devo excluir para liberar armazenamento/memoria do meu PC ou do meu Docker Desktop?

**Decisões arquiteturais e técnicas:**

1. Orientação de limpeza das 8 imagens ARM64 carregadas via `--load` (~1.5-2 GB) com `docker rmi`.
2. Orientação de remoção do builder buildx e seu cache (~1-3 GB) com `docker buildx rm` ou `docker builder prune`.
3. Esclarecimento de que imagens paradas não consomem RAM, apenas disco.

**Resumo das saídas:**

- Nenhuma modificação de código. Orientação consultiva de limpeza de artefatos Docker.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-02 — Prompt 5

**Prompt do usuário:**

> Irei fazer o deploy do sistema MIST para hospedar localmente. Entretanto, gostaria de saber se não há um metodo mais "profissional" e "automatizado" de realizar esse tipo de deploy de forma consistente. Digo isso porque percebi que esse método de fazer buildx de todos os serviços e depois instalar diretamente no Pi é um tanto manual. Qual seria o padrão da industria para essa resolução?

**Decisões arquiteturais e técnicas:**

1. **Apresentação do padrão CI/CD + Container Registry:**
   - Explicação do fluxo profissional: push no Git → GitHub Actions builda multi-arch → publica no GHCR → Pi faz `docker pull`.
   - Comparação de registries (GHCR, Docker Hub, self-hosted Harbor).
   - Explicação do Watchtower para auto-update de containers no Pi.
2. **Comparação direta** entre método manual e CI/CD em 6 dimensões (build, transporte, versionamento, rollback, tempo, reprodutibilidade).

**Resumo das saídas:**

- Nenhuma modificação de código. Orientação consultiva sobre padrões de deploy.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-02 — Prompt 6

**Prompt do usuário:**

> Pode implementar o workflow usando o sistema de tags sematicas como organização do versionamento. Em termos de configurações que terei que fazer do lado do meu Pi, gere o passo a passo do que devo fazer para seguir com o watchtower com monitoramento de 15 minutos. Ainda não suba o MIST com nenhuma tag de release, pois farei mais algumas modificações no sistema em termos de segurança e adequação a alguns critérios legais antes de subir.

**Decisões arquiteturais e técnicas:**

1. **Implementação do CI/CD (GitHub Actions):**
   - Criação do arquivo `.github/workflows/release.yml`.
   - Pipeline engatilhada apenas no push de tags semânticas (`v*.*.*`).
   - Uso de `matrix` strategy para compilar paralelamente as 8 imagens (frontend, gateway, auth, store, library, social, market, ugc), tornando o código DRY (Don't Repeat Yourself).
   - Uso das actions `docker/setup-qemu-action` e `docker/setup-buildx-action` para garantir o suporte de cross-compilação para arquitetura `linux/arm64` nativamente pelo runner do GitHub.
   - Configuração de tags automáticas no formato SemVer (`{{version}}`, `{{major}}.{{minor}}`) e de tag `latest` via action `docker/metadata-action`. O login automático é feito no `ghcr.io` utilizando o `$GITHUB_TOKEN`.

2. **Guia de Configuração do Watchtower (Raspberry Pi):**
   - Elaborado artefato instrucional com a adição do serviço do Watchtower no `docker-compose.yml` utilizando intervalo de 900s (`WATCHTOWER_POLL_INTERVAL=900`) e limpeza automática habilitada (`WATCHTOWER_CLEANUP=true`).
   - Inseridas orientações sobre como alterar a visibilidade padrão dos pacotes no GHCR (de Private para Public) para facilitar o deploy acadêmico, sem a necessidade de gerenciar PAT (Personal Access Tokens) no Raspbian.

**Resumo das saídas:**

- Criado: Arquivo `.github/workflows/release.yml` contendo a pipeline de CD do projeto.
- Criado: Artefato `watchtower_guide.md` abordando a configuração da plataforma local.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-02 — Prompt 7

**Prompt do usuário:**

> Eu devo criar um novo app então no meu CasaOS para rodar esse docker-compose.yml?

**Decisões arquiteturais e técnicas:**

1. **Estratégia de Integração com CasaOS:**
   - Recomendada a importação do `docker-compose.yml` via Web UI do CasaOS usando a função "Custom Install" -> "Import Docker Compose".
   - Este método agrupa os serviços como um único "App" no dashboard, facilitando a visualização de logs, restart e gestão pela interface do usuário.
   - Orientação técnica: O CasaOS possui limitações ao importar arquivos `.env` soltos, sendo aconselhável inserir as variáveis diretamente na interface ou no yaml antes da colagem.
2. **Método Alternativo (CLI):**
   - Explicado que rodar `docker compose up -d` via SSH também funciona, mas deixa os containers "soltos" na UI.

**Resumo das saídas:**

- Nenhuma modificação de código. Orientação de operação de infraestrutura (CasaOS).
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-02 — Prompt 8

**Prompt do usuário:**

> Caso o repositório seja do meu colega, e o nome do repo seja "topicosIV" e esteja público, o usuário usado no docker compose para cada um dos serviços pode ser o meu mesmo (sou colaborador) ou deve ser o dele?

**Decisões arquiteturais e técnicas:**

1. **Definição de Caminho no GHCR:**
   - Explicado que o caminho das imagens no `docker-compose.yml` do Pi deve usar o **usuário do colega (dono do repositório)**.
   - Justificativa técnica: O workflow utiliza `${GITHUB_REPOSITORY}`, que sempre resolve para `<owner>/<repo>`. Independentemente de qual colaborador disparar a Action, os pacotes pertencerão ao dono do repositório.
   - Detalhe de formatação: Informado que o nome da imagem será `ghcr.io/<colega>/topicosiv/mist-<servico>`, com `topicosiv` em minúsculas (padrão forçado pelo Docker e tratado no workflow).
2. **Visibilidade do Pacote (Ação do Colega):**
   - Ressaltado que as imagens no GHCR nascem privadas por padrão, mesmo em repositórios públicos.
   - Orientado que o **colega (proprietário)** precisará acessar os "Packages" no GitHub e alterar a visibilidade de cada um dos 8 pacotes para "Public", permitindo que o CasaOS do usuário faça o pull sem necessidade de autenticação/tokens.

**Resumo das saídas:**

- Nenhuma modificação de código. Esclarecimento sobre gestão de artefatos no GitHub.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-02 — Prompt 9

**Prompt do usuário:**

> Fiz atualizações no funcionamento do sistema, para usar nginx e outras normas de segurança ao mesmo tempo que uso cloudflare tunnel. Crie o código yaml para eu copiar e colar e me oriente no processo de instalação do watchtower (se necessário) e configuração do lado do servidor. Use como <seu-usuario> gmoncks/topicosiv. Verifique como ficou o docker-compose.yml, os últimos prompts de hoje feitos por mim no arquivo principal e o example.env para ter uma boa noção das mudanças que foram feitas e não se atrapalhar.
> @[Quote] Isso não fere as normas de segurança que criei para o sistema?

**Decisões arquiteturais e técnicas:**

1. **Clarificação de Segurança sobre GHCR Público:**
   - Respondida a dúvida do usuário quanto à abertura das imagens do Docker para Público.
   - Esclarecido que as imagens do CI/CD contêm o mesmo código fonte que já é aberto no repositório público do GitHub, não ferindo nenhuma norma estabelecida de restrição.
   - Reforçado que os segredos (como `TUNNEL_TOKEN`, `JWT_SECRET_KEY` e senhas/API Keys de banco ou IA) **não são queimados nas imagens docker**. Eles são passados em tempo de execução (`environment: / .env`) pelo CasaOS, mantendo a operação perfeitamente segura contra vazamentos de dados críticos, enquanto tira a dor de cabeça de injetar Personal Access Tokens no Raspberry Pi.

2. **Geração do Arquivo Declarativo de Deploy:**
   - Criado e fornecido um `docker-compose.yml` consolidado e definitivo para o ambiente do Raspberry Pi.
   - As diretrizes de imagem alteradas do Docker build local (`build:`) para Docker pull (`image: ghcr.io/gmoncks/topicosiv/mist-<servico>:latest`).
   - Integrado o serviço `cloudflared` para criar o túnel de rede zero-trust diretamente por container, eliminando a necessidade de expor as portas do frontend (`3000:80`) no servidor host (CasaOS).
   - Integrado o container do `watchtower` com cleanup de imagens órfãs e polling de 15 min (`WATCHTOWER_POLL_INTERVAL=900`), já como parte integrante do app do MIST.

3. **Guia de Integração Cloudflare / CasaOS:**
   - Orientado a importação do texto do YAML gerado diretamente na aba "Custom Install -> Import" da UI Web do CasaOS.
   - Orientado no preenchimento de variáveis estritas (`TUNNEL_TOKEN`, `JWT_SECRET_KEY`, `CORS_ORIGINS`) diretamente nos inputs formulados que a interface visual cria após a interpretação do Compose.
   - Orientada a configuração do Cloudflare Zero Trust: o túnel não precisa mais apontar para `localhost:3000` via SO host, mas sim para o tráfego interno dos containers na porta HTTP mapeando `mist-frontend:80`.

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Arquivo YAML final foi entregue diretamente na conversa para a máquina hospedeira do usuário.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-02 — Prompt 10

**Prompt do usuário:**

> Devo preencher essas coisas mesmo no container do CasaOS? *(Acompanhado de screenshot do CasaOS exibindo alerta padrão de importação requerendo WebUI, volumes e portas).*

**Decisões arquiteturais e técnicas:**

1. **Análise do Alerta do CasaOS:**
   - Identificado que o modal é o aviso padrão do CasaOS após o parse de um arquivo `docker-compose.yml`, solicitando revisão manual do formulário visual gerado.
   - Esclarecido que, dada a arquitetura Zero Trust (Cloudflare Tunnel interno), não há necessidade de exposição de portas locais (Host to Container) nem configuração de WebUI Port, já que o ingresso se dá exclusivamente via túnel.
   - Explicado que os *named volumes* definidos no YAML serão gerenciados adequadamente pelo daemon Docker do CasaOS sem necessidade de mapeamentos estritos de caminhos absolutos (bind mounts).
2. **Diretrizes de Preenchimento:**
   - Orientado o usuário a clicar em "OK" para ignorar o alerta genérico e focar na tela subsequente.
   - Reforçada a instrução crítica: a única intervenção manual necessária na interface visual do CasaOS é o preenchimento das variáveis de ambiente interpoladas (`TUNNEL_TOKEN`, `JWT_SECRET_KEY`, `CORS_ORIGINS`) nos cards respectivos dos serviços.

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Resolução de bloqueio em operação de infraestrutura e orientação UX da plataforma de hospedagem.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-02 — Prompt 11

**Prompt do usuário:**

> As coisas devem ficar nesse estilo então, mas substituindo os valores de cors, tunnel e jwt pelos meus valores secretos do .env? *(Acompanhado de screenshot mostrando as variáveis de ambiente com interpolação crua do docker-compose e o campo Host de volume exibindo o bug '[object Object]')*

**Decisões arquiteturais e técnicas:**

1. **Correção de Parser de Env do CasaOS:**
   - Detectado via screenshot que o CasaOS não resolve a interpolação shell-style do Docker Compose (ex: `${ENVIRONMENT:-production}`).
   - Orientado o usuário a limpar toda a notação de cifrão e chaves, substituindo pelas strings literais cruas (ex: trocar `${JWT_ALGORITHM:-HS256}` por apenas `HS256`), mitigando potenciais erros de parsing pelo daemon interno.
2. **Resolução de Bug Crítico de Volume (CasaOS UI):**
   - Detectado bug visual gravíssimo da UI do CasaOS: a plataforma tenta traduzir "Named Volumes" e falha injetando a string de javascript `[object Object]` no campo de montagem do host.
   - Orientado o usuário a substituir o erro por bind mounts absolutos padronizados do CasaOS, como `/DATA/AppData/mist/auth_data`, garantindo que os dados persistam sem causar crash na inicialização do container.

**Resumo das saídas:**

- Nenhuma modificação de código. Troubleshoot e correção de bugs da UI do ambiente de hospedagem.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-02 — Prompt 12

**Prompt do usuário:**

> Qual a tag que devo usar no watchtower? No site deles só encontrei o seguinte para o docker-compose.yml no quick start [...]

**Decisões arquiteturais e técnicas:**

1. **Clarificação da Imagem do Watchtower:**
   - Confirmado ao usuário que o uso da imagem base sem tag explícita (`containrrr/watchtower`) é a prática correta e recomendada pela documentação oficial.
   - Explicado que a omissão resolve automaticamente para a tag `:latest`, o que é ideal para a ferramenta de atualização (garante que o próprio daemon de atualização se mantenha atualizado).
   - Reafirmada a necessidade do mapeamento de volume do socket do docker (`/var/run/docker.sock`) para que o serviço consiga executar comandos no daemon do host.

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Validação técnica de documentação externa fornecida ao usuário.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-02 — Prompt 13

**Prompt do usuário:**

> Para que esse container suba, é necessário que já haja o workflow do Github e os pacotes disponíveis? Pois deu erro ao subir o container

**Decisões arquiteturais e técnicas:**

1. **Troubleshooting de Erro de Pull:**
   - Explicado ao usuário que a diretiva `image: ghcr.io/...` do compose requer que os artefatos já existam no repositório remoto.
   - Como o usuário decidiu previamente adiar a criação das tags de release, o GitHub Actions não rodou, resultando em erro (ex: `manifest unknown` ou `access denied`) no daemon Docker do CasaOS ao tentar o pull.
2. **Definição da Ordem de Operações (Pipeline):**
   - Reforçada a cronologia obrigatória do CI/CD:
     1. Push do código.
     2. Criação e push da tag (ex: `v1.0.0`).
     3. Aguardar término do Job na aba Actions.
     4. Alterar pacotes para "Public".
     5. Acionar/Start no CasaOS.

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Resolução de erro conceitual sobre a ordem de execução do fluxo de CI/CD.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).



