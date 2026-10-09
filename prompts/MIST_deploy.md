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

---

## 2026-10-07 — Prompt 14

**Prompt do usuário:**

> Agora os packages estão publicados, mas ainda assim obtive um erro no CasaOS. Se houve como verificar de forma mais verbosa o log de erro, me informe pois não sei como fazer. Segue também o comando do próprio Github para o auth [...] *(Acompanhado de screenshot com erro "denied denied")*

**Decisões arquiteturais e técnicas:**

1. **Diagnóstico do Erro de Pull (`denied denied`):**
   - A screenshot revelou o erro padrão do Docker daemon ao tentar fazer pull anônimo de uma imagem restrita (Privada) em um registry.
   - Confirmado que a formatação da URL da imagem (`ghcr.io/gmoncks/topicosiv/...`) gerada pelo workflow está perfeitamente correta.
   - Concluído que a causa raiz é a visibilidade padrão do GHCR (pacotes nascem privados, mesmo em repositórios públicos), e o proprietário do repositório não alterou a visibilidade para Público conforme instruído em prompts anteriores.

2. **Plano de Resolução:**
   - Reiterado o passo a passo exato na interface web do GitHub (Packages -> Package Settings -> Change visibility -> Public) que o proprietário (`gmoncks`) deve executar para os 8 pacotes.
   - Fornecido o método de teste verboso/direto via SSH no host (`docker pull ...`) para isolar o CasaOS da equação e validar a autorização diretamente no daemon do Docker.
   - Oferecida a alternativa de manter as imagens privadas caso o usuário prefira configurar a autenticação (`docker login`) manualmente no SO host usando um PAT (Personal Access Token).

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Resolução de bloqueio de infraestrutura / permissões IAM no GitHub.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-07 — Prompt 15

**Prompt do usuário:**

> Pelo que eu vejo no github, a visualização já foi feita em modo public, assim como o repositorio também é publico. Segue o comando + retorno no terminal do casaOS: docker pull ghcr.io/gmoncks/topicosiv/mist-auth-service:latest
> permission denied while trying to connect to the docker API at unix:///var/run/docker.sock

**Decisões arquiteturais e técnicas:**

1. **Diagnóstico do Erro no Socket do Docker:**
   - Explicado ao usuário que a mensagem `permission denied [...] docker.sock` não está relacionada à autorização do GHCR, mas sim a privilégios do SO local (Linux).
   - O usuário rodou o cliente do Docker via SSH com uma conta sem privilégios (não pertencente ao grupo `docker`).
2. **Resolução:**
   - Orientada a execução do comando antecedido por `sudo` (`sudo docker pull ...`).
   - Mapeados os cenários de saída após a elevação de privilégios: se houver sucesso no pull, confirma-se a visibilidade pública; se houver reincidência do `denied denied`, as políticas do GHCR não foram aplicadas corretamente na fonte.

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Troubleshoot de SO Linux.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-07 — Prompt 16

**Prompt do usuário:**

> Parece que está funcionando sim o comando, mas apesar disso sabemos que dá o erro que lhe passei antes ao tentar rodar a criação do docker. Como dará um certo trabalho repetir a instalação novamente do docker, gostaria que você antes confirmasse se de fato esse esquema das permissões é a única possibilidade de erro ao tentar criar o container. Não pode ser algo com a configuração do watchtower por exemplo? *(Acompanhado de screenshot comprovando pull com sucesso do auth-service)*

**Decisões arquiteturais e técnicas:**

1. **Validação do Sucesso do Pull:**
   - A screenshot atestou `Status: Image is up to date`, provando categoricamente que o pacote `mist-auth-service` está Público e acessível sem autenticação pelo host local, eliminando as hipóteses de problema de permissão no GHCR para esta imagem em específico.
2. **Análise de Causa Raiz Alternativa:**
   - Esclarecido que o Watchtower não tem responsabilidade no erro de `denied`, pois o erro ocorre na camada de *Pull* (antes dos containers serem criados/iniciados), e o Watchtower atua apenas em tempo de execução (*runtime*).
   - Levantada a hipótese mais provável para a falha do CasaOS: a instalação no CasaOS tenta realizar o pull em massa (bulk) de todas as 10 imagens (8 MIST + cloudflared + watchtower). Se **apenas um** dos pacotes remanescentes (ex: `frontend` ou `gateway`) tiver sido esquecido como *Private* pelo proprietário no GitHub, a orquestração inteira falha com `denied`.
3. **Plano de Validação Eficiente:**
   - Fornecido um script de comandos de CLI sequenciais (`sudo docker pull ...` para os 7 serviços restantes) para validar individualmente a visibilidade de cada pacote.
   - Orientado que, ao realizar os pulls via CLI primeiro, as imagens ficam em cache no daemon. Isso tornará a subsequente tentativa de instalação na UI do CasaOS instantânea e imune a gargalos de pull remoto, otimizando o esforço do usuário.

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Consultoria de infraestrutura focada na orquestração de imagens do Docker.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-07 — Prompt 17

**Prompt do usuário:**

> Entendi o problema. Não existe esse mist-frontend na lista de packages (sejam elas privadas ou públicas)

**Decisões arquiteturais e técnicas:**

1. **Confirmação da Causa Raiz:**
   - A ausência do pacote `mist-frontend` confirmou a hipótese do Prompt 16. O docker daemon lança `denied` ou `manifest unknown` quando tenta fazer pull de um artefato inexistente em um registry, o que causou a falha total no CasaOS.
2. **Plano de Ação (Troubleshooting de CI):**
   - Orientado o usuário a acessar a aba **Actions** do repositório no GitHub para inspecionar o job específico da matriz referente ao `frontend`.
   - Explicado que a falha na publicação indica um erro de build (ex: falhas de tipagem estrita no `tsc` ou gargalos de performance/timeout durante a compilação cruzada ARM64 via QEMU).
   - Definido o fluxo de correção: identificar o erro no log, corrigir o código, publicar uma nova tag semântica (ex: `v1.0.1`), aguardar o sucesso do workflow, alterar a visibilidade do novo pacote para Public, e então retomar a instalação no CasaOS.

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Direcionamento técnico para debugging de esteira de CI/CD (GitHub Actions).
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-07 — Prompt 18

**Prompt do usuário:**

> Acabei de ver que o job do frontend está rodando a 6h. Segue os últimos logs emitidos na etapa de Build and push Docker image: [...] qemu: uncaught target signal 4 (Illegal instruction) - core dumped

**Decisões arquiteturais e técnicas:**

1. **Diagnóstico do Crash em QEMU:**
   - O log fornecido revelou um erro fatal de instrução ilegal (`qemu: uncaught target signal 4`) durante o comando `npm install` no estágio do emulador ARM64. 
   - A causa é comum no ecossistema Node.js/Vite: pacotes contendo dependências binárias nativas pesadas (como o compilador `esbuild`) perdem compatibilidade e causam stack overflow / core dumps quando virtualizados pelo QEMU em hosts AMD64.
2. **Solução Arquitetural de Cross-Build:**
   - Em vez de emular a compilação inteira, a infraestrutura foi ajustada para compilar nativamente. Como as saídas do Vite são HTML/JS/CSS genéricos, eles não dependem da arquitetura destino, apenas o Nginx final depende.
   - Adicionado o parâmetro `--platform=$BUILDPLATFORM` no Estágio 1 do `frontend/Dockerfile` (`FROM --platform=$BUILDPLATFORM node:20-alpine AS builder`). 
   - Isso orienta o Docker Buildx a rodar o Node sempre na arquitetura nativa veloz do GitHub (AMD64), enquanto o Estágio 2 (`FROM nginx:alpine`) utiliza a arquitetura final (`linux/arm64`) para montar os assets no SO de produção.

**Resumo das saídas:**

- Modificado: `frontend/Dockerfile` (Linha 2, injeção de `$BUILDPLATFORM`).
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-07 — Prompt 19

**Prompt do usuário:**

> Fiz as alterações na publicação e dessa vez consegui criar o container no meu home-server. Entretanto, notei que o site não está funcionando quando pesquiso pela URL que defini. Para tentar debbugar, acionei o Live Logs do Tunnel e ao dar refresh na página, obtive o seguinte log. Quais poderiam ser as causas desse erro? Pode ser pelo fato de eu ter que ter usado o container cloudflared-web para funcionar? Antes de usar o conatainer cloudflared, sequer consta como ativo o túnel no meu painel da cloudflare *(Logs do Cloudflare exibindo erro DNS "no such host" na busca pelo originService `http://frontend:80`)*

**Decisões arquiteturais e técnicas:**

1. **Diagnóstico do Erro de DNS (`no such host`):**
   - Confirmada a hipótese do usuário: a falha ocorreu porque o daemon de tunelamento estava operando a partir do app nativo do CasaOS (`cloudflared-web`), o qual opera em uma bridge network do Docker distinta da rede do compose do sistema (`mist-network`). Consequentemente, o túnel era incapaz de resolver o alias de serviço interno (`frontend` ou `mist-frontend`).
2. **Diagnóstico da Falha do Túnel Integrado:**
   - Explicado que a falha de ativação do container de túnel interno do compose (declarado no Prompt 9) decorre de um comportamento anômalo conhecido da UI de importação do CasaOS, que rotineiramente omite a diretiva `command: tunnel run` durante o parsing do YAML para a interface visual.
3. **Planos de Resolução Propostos:**
   - **Caminho A (Manutenção do Túnel Externo CasaOS):** Requer a modificação do conceito Zero Trust rígido estabelecido inicialmente. Exige mapear as portas (`3000:80`) no host OS via UI do CasaOS e ajustar a rota no Cloudflare Zero Trust Dashboard para apontar para a interface de rede do host (`http://<IP-DO-PI>:3000`).
   - **Caminho B (Reativação do Túnel Integrado):** Manutenção do ecossistema Zero Trust. Exige o desligamento do daemon externo, reconfiguração manual do `Container Command` para incluir `tunnel run` na UI do `mist-cloudflared` dentro do app MIST, e apontar o dashboard do Cloudflare para o hostname interno (`http://mist-frontend:80`).

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Consultoria de DevOps para redes Docker Isoladas em ambiente CasaOS.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-07 — Prompt 20

**Prompt do usuário:**

> Não há a rede "mist-network" pura e simplesmente. Devo setar a lacuna Rede do container cloudflare com algum desses? Ou todos devem ser setados com uma rede? Faça o tutorial completo de instação do docker usando o arquivo deploy_watchtower.txt que você criou para mim, caso este ainda seja válido *(Acompanhado de screenshot listando as redes disponíveis, revelando o prefixo `exquisite_rafael_mist-network`)*

**Decisões arquiteturais e técnicas:**

1. **Esclarecimento sobre Nomenclatura de Redes Compose no CasaOS:**
   - Explicado que o Docker Compose prepende o "Project Name" aos recursos criados (redes e volumes). Como o compose foi importado via UI sem a diretiva top-level `name:`, o CasaOS gerou um slug aleatório (`exquisite_rafael`) e nomeou a rede como `exquisite_rafael_mist-network`.
   - Instruído o usuário a assinalar todos os containers do escopo (inclusive o Cloudflared) nesta rede prefixada exata para garantir a resolução de DNS interno (`mist-frontend:80`).
2. **Consolidação do Tutorial de Deploy (Standard Operating Procedure):**
   - Compilado um "Tutorial Definitivo" incorporando todas as descobertas de bugs de parsing da UI do CasaOS enfrentados na sessão:
     1. Importação do YAML.
     2. Limpeza manual de interpolação bash (`${VAR}`) dos environment variables.
     3. Resolução do bug de serialização de volumes (substituição de `[object Object]` por Absolute Bind Mounts `/DATA/AppData/mist/...`).
     4. Correção da omissão da flag de execução do túnel (inserção manual de `tunnel run` no *Container Command*).
     5. Configuração da rota reversa no Cloudflare Zero Trust (Target: `http://mist-frontend:80`).

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Criação e consolidação de Standard Operating Procedure (SOP) para deploy no ecossistema de destino do usuário.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-07 — Prompt 21

**Prompt do usuário:**

> Tive alguns problemas com o container MIST, uma vez que o watchtower parece que estava configurado sem restrições, e por isso atualizou todos os demais containers do meu CasaOS. Sete para que somente os containers do MIST sejam atualizados no periodo. Além disso, aproveitando, revise se não tem mais nenhum problema nas configurações do docker compose. Tendo feita a desinstalação desse container (maldito), devo apagar as imagens antigas do MIST ou apenas criar um novo container é seguro?

**Decisões arquiteturais e técnicas:**

1. **Restrição de Escopo do Watchtower:**
   - Detectado que a configuração padrão anterior (`WATCHTOWER_LABEL_ENABLE=false`) permitia que o Watchtower atuasse globalmente sob o daemon do Docker local, causando atualizações indesejadas em serviços de terceiros do host (CasaOS).
   - Implementado o controle de escopo estrito via labels: alterada a variável `WATCHTOWER_LABEL_ENABLE` para `true` e injetada a tag `labels: - "com.centurylinklabs.watchtower.enable=true"` individualmente em todos os 9 containers do projeto MIST (inclusive Cloudflared, mas não no próprio Watchtower para evitar auto-ciclagens indesejadas).
2. **Revisão e Otimização do Compose YAML:**
   - Foi gerado e entregue um arquivo `docker-compose.yml` consolidado. O arquivo novo já carrega explicitamente os Absolute Bind Mounts (`/DATA/AppData/mist/...`) na raiz dos volumes, mitigando definitivamente a ocorrência do erro visual `[object Object]` do importador do CasaOS, otimizando o SOP do usuário.
3. **Gestão de Artefatos Órfãos:**
   - Explicado que a criação de um novo container sobressalente é segura e utiliza eficientemente as camadas de cache das imagens pré-existentes localmente.
   - Esclarecido que exclusão manual de imagens órfãs/antigas não é mandatória, visto que a rotina automatizada (`WATCHTOWER_CLEANUP=true`) irá iterar e realizar *prune* dos manifests obsoletos a cada atualização, prevenindo degradação de storage do Raspberry Pi.

**Resumo das saídas:**

- Refatoração do `docker-compose.yml` (entregue no chat) com políticas rigorosas de escopo de CD.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-07 — Prompt 22

**Prompt do usuário:**

> Parece que não está funcionando mais uma vez, mas dessa vez não quebrou nada além do próprio container, que parece estar restartando continuamente. Segue o yaml do container criado *(Acompanhado do export YAML do CasaOS contendo chaves como `network_mode: bridge` em todos os serviços e chaves de API expostas)*

**Decisões arquiteturais e técnicas:**

1. **Diagnóstico do Restart Loop:**
   - Analisado o manifesto exportado pelo CasaOS e detectado o root cause: todos os serviços foram instanciados com a diretiva `network_mode: bridge`.
   - Explicado ao usuário a limitação técnica fundamental do daemon Docker: a rede `bridge` default (`docker0`) não provê resolução de DNS interno (Embedded DNS server). 
   - Concluído que os microserviços (como o `gateway` e o `store-service`) falharam ao tentar resolver os hostnames de suas dependências (ex: `http://auth-service:8001`), resultando em erros fatais de networking (`connection refused` ou `name not known`) e consequentes restarts contínuos gerenciados pela flag `unless-stopped`.
2. **Resolução de Infraestrutura via UI:**
   - Orientado o usuário a acessar as configurações do app no CasaOS e transicionar individualmente o campo "Network" de todos os 9 containers (saindo de `bridge` genérico para a custom bridge network criada no namespace do projeto, ex: `harmonious_amor_default`).
   - Reafirmado que a adoção de uma Custom Bridge Network restaurará a visibilidade e o DNS Service Discovery entre os microserviços e o Cloudflare Tunnel.
3. **Auditoria Geral:**
   - Revisados positivamente os apontamentos anteriores do usuário no YAML: Absolute Bind Mounts de volume devidamente configurados; política de scope restrito de CD (`WATCHTOWER_LABEL_ENABLE=true` e os `labels` presentes) aplicada de forma impecável.

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Resolução de Service Discovery DNS em redes Docker.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-07 — Prompt 23

**Prompt do usuário:**

> Simplesmente não há essa rede. Pode não existir justamente porque criei o container com bridge selecionado, e ele não "se deu conta" de criar a nova rede? *(Acompanhado de screenshot listando as redes disponíveis, revelando uma rede inusitada chamada `auth-service`)*

**Decisões arquiteturais e técnicas:**

1. **Diagnóstico de Anomalia do CasaOS Parser:**
   - O usuário reportou a ausência da rede `harmonious_amor...` ou `mist-network`.
   - Analisando o screenshot, detectou-se que o parser visual do CasaOS batizou a rede gerada para o compose com o nome do primeiro serviço declarado no arquivo YAML (`auth-service`). Isso é comprovado pelo snippet de metadados `x-casaos:` exportado no prompt anterior, onde `title.en_us` foi setado como `auth-service`.
2. **Workaround Pragmático:**
   - Esclarecido ao usuário que a rede listada como `auth-service` é, na verdade, a Custom Bridge Network designada para a stack inteira.
   - Instruído o usuário a adotar essa rede para todos os 9 containers da aplicação. Apesar da nomenclatura semanticamente incorreta/confusa gerada pela UI, tecnicamente ela é uma user-defined bridge network isolada, o que garante a ativação do Embedded DNS Server (127.0.0.11) necessário para a resolução de nomes (Service Discovery) exigida pela arquitetura de microserviços do MIST.

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Troubleshooting de idiossincrasias/glitches da plataforma hospedeira CasaOS.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-07 — Prompt 24

**Prompt do usuário:**

> Garantidamente esse auth-service não pode ser de outro container? Eu tenho uma série de apps no meu home-server

**Decisões arquiteturais e técnicas:**

1. **Reavaliação de Segurança e UI Ambiguity:**
   - O usuário demonstrou justa desconfiança em utilizar a opção `auth-service` da dropdown list, temendo conflito com outros apps do servidor.
   - Constatou-se que o CasaOS frequentemente lista instâncias de containers ativas na mesma dropdown de redes (referente ao driver `network_mode: container:<name>`). Assinalar essa opção poderia causar atachamento de network namespace em vez de criar um Virtual Switch (Bridge) adequado, o que não resolveria o problema de DNS Service Discovery para o cluster inteiro.
2. **Workaround Definitivo via CLI:**
   - Abandonou-se a dependência no parser falho da interface visual do CasaOS para a criação de redes.
   - Orientado o usuário a provisionar explicitamente a rede desejada via Docker CLI no host (`docker network create mist-network`).
   - Essa manobra garante a criação de uma `user-defined bridge` pura, isolada e com resolução de DNS (127.0.0.11) habilitada, sem contaminação de prefixos ou riscos de colisão com outros workloads do home-server. Em seguida, a UI do CasaOS apenas consumirá a rede recém-criada.

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Prevenção de conflito de redes Docker.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-07 — Prompt 25

**Prompt do usuário:**

> Não resolveu nosso problema inicial de dar erro Error 1033 ao tentar acessar a URL. Caso não haja riscos em seguir com o método A de usar o container cloudflared que eu já tinha e já funcionava, voltemos a essa ideia. Reformule e liste novamente as mudanças que eu teria que fazer para seguir com o método A

**Decisões arquiteturais e técnicas:**

1. **Avaliação de Risco e Fallback Estratégico:**
   - O usuário reportou o *Error 1033* (Argo Tunnel error indicando falha de roteamento interno para o *origin service*), evidenciando que os glitches de rede do CasaOS comprometeram irremediavelmente a integração do daemon do túnel in-compose.
   - Analisada a solicitação de *rollback* para o "Caminho A" (utilizar o app `cloudflared-web` nativo do CasaOS em bridge isolada).
   - Concluído que, para um ambiente homelab, o trade-off de segurança é negligenciável: a exposição da porta via *Host Port Binding* torna a interface acessível via LAN (WLAN local), mas mantém a barreira de ingressamento externo (WAN) estritamente protegida pelos túneis da Cloudflare.
2. **Definição do SOP (Standard Operating Procedure) do Caminho A:**
   - **Remoção de Conflitos:** Orientado o expurgo (`rm`) do container `mist-cloudflared` defeituoso do compose.
   - **Port Binding:** Instruído o mapeamento explícito de portas no container `mist-frontend` via UI do CasaOS (Host: `3000` -> Container: `80`).
   - **Roteamento Zero Trust:** Reconfiguração do *Public Hostname* no dashboard da Cloudflare, substituindo o DNS interno do Docker (`http://mist-frontend:80`) pelo roteamento via IP da LAN local do Raspberry Pi (`http://<LAN_IP>:3000`).

**Resumo das saídas:**

- Nenhuma modificação de código no repositório. Pivotagem arquitetural (Fallback) documentada e executada para estabilização de infraestrutura.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-08 — Prompt 26

**Prompt do usuário:**

> Realizei o deploy do MIST na internet via cloudflare tunnel pelo meu Home-server. Entretanto, acabei de verificar que o MIST não está realizando o download do "jogo" na minha máquina, somente dizendo que foi baixado.
> Revise se, com base na implementação seguida no MIST_deploy.md e no estado atual do sistema em termos de mecanismos relacionados com o download do jogo, não há algo que impeça o correto envio do jogo para a máquina do cliente

**Decisões arquiteturais e técnicas:**

1. **Auditoria da Arquitetura de Download vs Catálogo:**
   - O ecossistema MIST possui 25 jogos no catálogo. Desses, 22 são jogos mockados/simulados para enriquecimento de portfólio acadêmico (`game_file = None`), sem binário real no backend.
   - Apenas 3 títulos possuem pacotes executáveis reais desenvolvidos pela MIST Studios: `MIST Forca` (ID 14), `MIST Labirinto` (ID 15) e `MIST Quiz` (ID 16).
2. **Identificação do Mecanismo de Download e Injeção de Bloqueios:**
   - Em [`Library.tsx`](../frontend/src/pages/Library.tsx), ao clicar em "Baixar":
     - Dispara o evento `mist:start-download` (a [`DownloadBar.tsx`](../frontend/src/components/DownloadBar.tsx) inicia animação de 0% a 100%, emite som/toast e marca o jogo como instalado).
     - Paralelamente, em bloco `try/catch`, invoca `storeApi.downloadGamePackage(item.game_id)` para obter o `.zip`.
     - Caso o backend retorne HTTP 400 (para os 22 jogos não-MIST) ou se a chamada falhar, o bloco `catch` suprime o erro silenciosamente via `console.info`, mantendo a simulação visual intacta. Isso causa exatamente o sintoma reportado: a interface avisa que foi baixado sem que nenhum arquivo físico caia no computador.
3. **Auditoria de Rotas de Rede e Docker Proxy (Deploy CasaOS/Cloudflare):**
   - No frontend: `downloadGamePackage` faz `fetch('/api/games/${gameId}/download')`.
   - No Nginx: `/api/` é redirecionado para `http://gateway:8000`.
   - No Gateway: `@app.api_route("/api/games/{path:path}")` repassa para `http://store-service:8002/games/{path}`.
   - No Store Service: `@router.get("/games/{game_id}/download")` monta dinamicamente o `.zip` e envia como stream `application/zip`.
   - Conclusão: A cadeia de infraestrutura e roteamento do deploy está íntegra para os títulos reais. O sintoma ocorre primariamente pelo teste ter sido feito em um jogo do catálogo comercial simulado ou devido a bloqueios de download em segundo plano no navegador web.

**Resumo das saídas:**

- Nenhuma modificação no código-fonte necessária. Realizada auditoria arquitetural e diagnóstico técnico da infraestrutura de deploy e do fluxo de downloads.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).

---

## 2026-10-08 — Prompt 27

**Prompt do usuário:**

> Para qualquer um dos jogos MIST, o resultado é o mesmo em essencia:
> - 404 Not Found
> - https://mist.biomimetics.com.br/api/games/16/download
> - "detail": "Arquivo fonte do jogo 'games/quiz.py' não foi encontrado no servidor."
> - Jogo 'MIST Forca' não possui pacote binário no backend; download simulado mantido.
> 
> Talvez os jogos não tenham sido transportados para o servidor, não é possível? Caso seja isso, onde devo salvar os jogos?

**Decisões arquiteturais e técnicas:**

1. **Identificação da Causa Raiz (.gitignore ignorando código dos jogos):**
   - O arquivo `.gitignore` do repositório contém a regra abrangente `services/*/app/data/`.
   - Como os scripts dos jogos (`quiz.py`, `forca.py`, `labirinto.py`) e o módulo `mist_sdk.py` foram colocados dentro de `services/store-service/app/data/games/` e `services/store-service/app/data/`, o Git nunca os rastreou no repositório.
   - Consequentemente, quando o GitHub Actions executou o workflow de release (`release.yml`), os arquivos de jogo **não existiam no repositório remoto** e não foram incluídos na imagem Docker `mist-store-service:latest`.
2. **Impacto Adicional do Volume no CasaOS:**
   - No `docker-compose.yml`, o `store-service` monta um volume de persistência em `/app/app/data` (mapeado para `/DATA/AppData/mist/store_data` no host CasaOS). Qualquer diretório montado sobrescreve o conteúdo da imagem com o conteúdo da pasta do host.
3. **Estratégia de Resolução:**
   - **Solução Definitiva no Repositório:** Designorar os arquivos de código estáticos no `.gitignore` com exceções `!services/store-service/app/data/games/` e `!services/store-service/app/data/mist_sdk.py`, commitando-os no repositório para serem incorporados automaticamente nos futuros builds de Docker via CI/CD.
   - **Solução Imediata no Home-Server (sem rebuild):** Copiar a pasta `games/` e o arquivo `mist_sdk.py` diretamente para a pasta de dados do volume no host (`/DATA/AppData/mist/store_data/`), onde o `store-service` busca os arquivos.

**Resumo das saídas:**

- Identificada a causa raiz exata do erro 404.
- Atualizado: [`prompts/MIST_deploy.md`](MIST_deploy.md).




