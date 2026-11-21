# Guia de Correção: Resolução do Desaparecimento dos Ícones (Bloqueio CSP)

Este documento foi elaborado para guiar qualquer desenvolvedor ou agente de IA na identificação e correção definitiva do problema de ícones ausentes no ecossistema MIST (tanto em ambiente Docker local quanto em produção).

---

## 1. Descrição do Problema e Sintomas

Após a aplicação do commit de hardening de segurança HTTP (`4a38874`), diversos ícones da interface do usuário pararam de ser renderizados, aparecendo como caixas transparentes ou círculos escuros vazios:
- Ícone do controle de videogame ao lado do logo "MIST" no topo/sidebar (`fa-gamepad`).
- Ícone de sino de notificações (`fa-bell`).
- Ícone de fechar ("X") no aviso acadêmico vermelho do topo (`fa-xmark`) e o ícone de alerta (`fa-triangle-exclamation`).
- Ícone de fechar ("X") no cabeçalho das modais (como detalhes do jogo) (`fa-xmark`).
- Ícone de varinha mágica da seção de Curadoria MIST (`fa-wand-magic-sparkles`).
- Setas esquerda/direita do carrossel de screenshots do jogo (`fa-chevron-left`, `fa-chevron-right`).
- Ícone de lupa do campo de busca global (`fa-magnifying-glass`).

---

## 2. Diagnóstico da Causa Raiz

Todos os ícones da aplicação utilizam a biblioteca **FontAwesome 6**, carregada via CDN no arquivo `frontend/index.html`:
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="..." crossorigin="anonymous" referrerpolicy="no-referrer" />
```

O commit de segurança adicionou o cabeçalho **Content-Security-Policy (CSP)** em dois pontos centrais:
1. `frontend/nginx.conf` (servidor web do SPA).
2. `gateway/app/main.py` (middleware HTTP do API Gateway).

A configuração atual do cabeçalho é:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; object-src 'none'
```

### Por que os ícones são bloqueados?
1. **Bloqueio do Stylesheet CSS (`style-src`):**
   O domínio `https://cdnjs.cloudflare.com` foi colocado em `script-src` por engano, em vez de `style-src`. Como o FontAwesome é importado como folha de estilo (`<link rel="stylesheet">`), o navegador emite:
   > `Refused to load the stylesheet 'https://cdnjs.cloudflare.com/...' because it violates the following Content Security Policy directive: "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com".`
2. **Bloqueio dos Arquivos de Fontes Vetoriais (`font-src`):**
   Dentro do arquivo `all.min.css`, os glifos dos ícones são carregados via arquivos `.woff2` e `.ttf` (ex.: `../webfonts/fa-solid-900.woff2`). A diretiva `font-src` está restrita a `https://fonts.gstatic.com`. Sem permitir `https://cdnjs.cloudflare.com` em `font-src`, o navegador bloqueia as fontes com:
   > `Refused to load the font 'https://cdnjs.cloudflare.com/...' because it violates the following Content Security Policy directive: "font-src https://fonts.gstatic.com".`

---

## 3. Instruções Exatas de Modificação

Para corrigir, adicione `https://cdnjs.cloudflare.com` nas diretivas `style-src` e `font-src` (incluindo também `'self' data:` em `font-src` por resiliência) nos dois arquivos descritos a seguir:

### Arquivo 1: `frontend/nginx.conf`
**Localização:** Linha ~16.

**Substituir:**
```nginx
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; object-src 'none'" always;
```

**Por:**
```nginx
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: blob:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; object-src 'none'" always;
```

---

### Arquivo 2: `gateway/app/main.py`
**Localização:** Linhas ~101 a 111 (dentro de `add_security_headers`).

**Substituir:**
```python
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src https://fonts.gstatic.com; "
        "img-src 'self' data: https: blob:; "
        "connect-src 'self' ws: wss:; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "object-src 'none'"
    )
```

**Por:**
```python
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
        "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
        "img-src 'self' data: https: blob:; "
        "connect-src 'self' ws: wss:; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "object-src 'none'"
    )
```

---

## 4. Passos para Aplicação e Validação

Após aplicar os diffs acima:

1. **Testes do Gateway:**
   Execute a suíte de testes do Gateway para garantir integridade:
   ```bash
   pytest gateway/tests/test_gateway.py
   ```
2. **Rebuild e Reinício dos Contêineres Docker:**
   Como o arquivo `frontend/nginx.conf` é empacotado durante o build da imagem do container Nginx, reconstrua o frontend e gateway:
   ```bash
   docker compose up -d --build frontend gateway
   ```
3. **Verificação no Navegador:**
   - Acesse a aplicação no navegador (ex.: `http://localhost:3000` ou domínio de produção).
   - Abra o Console do DevTools (`F12`). Verifique que **nenhum erro de violação de CSP** (bloqueio de `style-src` ou `font-src`) é exibido.
   - Pressione `Ctrl + F5` (Hard Refresh) para limpar cache de CSS/fontes do navegador.
   - Valide visualmente que todos os ícones (controle de videogame, sino, botões fechar, varinha mágica e setas) reapareceram perfeitamente.
