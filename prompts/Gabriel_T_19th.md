# Registro de Prompts e Modificações — Gabriel Torres (19/11/2026)

## Prompt
"Você é um desenvolvedor Web experiente.
Desde minhas últimas mudanças no MIST, notei que diferentes ícones sumiram do sistema, tanto em termos do ambiente produtivo quanto do ambiente de desenvolvimento dockerizado no localhost. No print em anexo, faltam por exemplo
- Ícone do controle de videogame, ao lado do nome MIST
- Ícone das notificações
- Ícone de "x" para fechar o alerta de que 'Esse ecossistema é um trabalho acadêmico, sem jogos reais além dos categorizados como "MIST Studios!"'
No segundo print podemos ver outros ícones que sumiram:
- O "x" de fechamento da modal
- O ícone de varinha da curadoria do MIST
- As setas para mudar a imagem do jogo

Analise o que pode estar causando esses problemas"

## Decisões Arquiteturais e Técnicas
1. **Auditoria das Últimas Mudanças (Commit `4a38874` / PR #121):**
   - Identificado que o commit recente de correção de vulnerabilidades de segurança introduziu cabeçalhos de **Content Security Policy (CSP)** tanto no Nginx do frontend (`frontend/nginx.conf`) quanto no middleware de segurança do Gateway (`gateway/app/main.py`).
2. **Diagnóstico da Causa Raiz do Desaparecimento dos Ícones:**
   - Todos os ícones ausentes (`fa-gamepad`, `fa-bell`, `fa-xmark`, `fa-wand-magic-sparkles`, `fa-chevron-left`, `fa-chevron-right`, `fa-triangle-exclamation`) pertencem à biblioteca **FontAwesome 6**, carregada externamente via CDN em `frontend/index.html`:
     `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" ...>`
   - A diretiva CSP configurada foi:
     `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; ...`
   - **Dois bloqueios críticos acontecem simultaneamente:**
     1. `style-src`: O domínio `https://cdnjs.cloudflare.com` foi colocado equivocadamente em `script-src` em vez de `style-src`. Como consequência, o navegador bloqueia o download do CSS do FontAwesome (`Refused to load the stylesheet ... violates style-src`).
     2. `font-src`: FontAwesome carrega seus arquivos de fontes vetoriais (`fa-solid-900.woff2`, `fa-brands-400.woff2`, etc.) a partir da CDN (`https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/...`). A diretiva `font-src` atual permite apenas `https://fonts.gstatic.com`, bloqueando o carregamento dos glifos mesmo que o CSS fosse parseado.
3. **Plano de Correção Proposto:**
   - Atualizar a política CSP em `frontend/nginx.conf` e `gateway/app/main.py`:
     - Adicionar `https://cdnjs.cloudflare.com` à diretiva `style-src`.
     - Adicionar `https://cdnjs.cloudflare.com` (e defensivamente `'self' data:`) à diretiva `font-src`.

## Resumo das Saídas e Modificações
- Criado:
  - `prompts/Gabriel_T_19th.md` (Registro perpétuo do prompt de análise do dia 19/11/2026)

---

## Prompt
"Gere um "csp_icons.md" com um resumo do problema e como e onde deve ser aplicada a correção para posteriormente ser lido por outra IA para que ela aplique a correção. (Meu trabalho agora exige o uso de uma IA Local, que infelizmente não estava encontrando essa causa do problema)"

## Decisões Arquiteturais e Técnicas
1. **Estruturação de Documento Autônomo e Orientado a Execução por IA:**
   - Criado o arquivo `csp_icons.md` na raiz do projeto com estrutura direta, detalhada e determinística.
   - O documento inclui:
     - Mapeamento explícito de sintomas e classes de ícones FontAwesome afetadas.
     - Explicação da mecânica do bloqueio CSP nas diretivas `style-src` e `font-src` para o CDN `cdnjs.cloudflare.com`.
     - Blocos de código exatos (trecho atual vs. trecho corrigido) para `frontend/nginx.conf` e `gateway/app/main.py`.
     - Comandos de validação via testes automatizados (`pytest gateway/tests/test_gateway.py`), rebuild dos contêineres Docker (`docker compose up -d --build frontend gateway`) e inspeção de console/hard refresh no navegador.

## Resumo das Saídas e Modificações
- Criado:
  - `csp_icons.md` (Guia estruturado e acionável para aplicação e validação da correção por agente de IA ou desenvolvedor)
- Modificado:
  - `prompts/Gabriel_T_19th.md` (Registro incremental do prompt e decisões técnicas)

