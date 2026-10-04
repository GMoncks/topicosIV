# Registro de Prompts — gabriel-T800 (3rd)

Arquivo diário de rastreamento de prompts e decisões técnicas para a sessão do desenvolvedor **gabriel-T800** no dia **3 de Outubro de 2026**.

---

## 2026-10-03 — Prompt 1

**Prompt do usuário:**

> Notei alguns ajustes que devem ser feitos antes de eu publicar o trabalho:
> - Remover mocks de atividade recente. Vi que um usuário novo já tem em seu perfil as atividades recentes mockadas do Marvel Rivals, Subnautica, etc
> - Aplicar um disclaimer em vermelho na home-page no cabeçalho da tela (acima de todo o cabeçalho atual do sistema, que contém carrinho, saldo, etc) deixando claro que "Esse ecossistema é um trabalho acâdemico, sem jogos reais além dos categorizados como "MIST Studios!"
> - O disclaimer deve poder ser removido após alguns segundos. Ou seja, o "x" para remover ele deve surgir apenas depois de 5 segundos
> - Após a remoção do disclaimer pelo usuário (logado ou não), a tela deve se comportar e ser vista como se comporta atualmente. Ou seja, o disclaimer pode ter uma lógica de div
> 
> /qa_writer escreva testes (incluindo de E2E para a visualização desse disclaimer) associados com esses ajustes

**Decisões arquiteturais e técnicas:**

1. **Remoção de Mocks Estáticos de Atividade Recente (`Profile.tsx`):**
   - Removido o array estático `defaultFallbackRecentGames` que continha os jogos fictícios mockados (*Librarian: Tidy Up the Arcane Library!*, *Marvel Rivals* e *Subnautica*).
   - Ajustado o estado padrão de `currentUser` para inicializar com `recentGames: []` e `recentPlaytimeWeeks: 0`.
   - Adicionada renderização de um componente de estado vazio amigável (`data-testid="empty-recent-activity"`), orientando o usuário a jogar títulos da Biblioteca para registrar atividades no perfil e disponibilizando atalho para explorar a Loja MIST.
   - Removido o import não utilizado de `GameActivity` do módulo `types` em `Profile.tsx` para garantir conformidade estrita com o compilador TypeScript.

2. **Banner de Disclaimer Acadêmico (`AcademicDisclaimer.tsx` & `App.tsx`):**
   - Criado o componente `AcademicDisclaimer.tsx` posicionado imediatamente acima do `<Header />` da aplicação na coluna principal de rolagem em `App.tsx`.
   - Estilizado com destaque em vermelho (`bg-red-600`, borda inferior `border-red-700`, texto branco de alto contraste e ícone de advertência animado `fa-triangle-exclamation`).
   - Implementado temporizador interno via `useEffect` com `setTimeout(..., 5000)` para liberação do botão de fechamento ('x').
   - Nos primeiros 5 segundos, o botão 'x' não é renderizado no DOM. Após decorrido o prazo, o botão com `data-testid="academic-disclaimer-close"` torna-se visível e interativo.
   - Ao ser fechado pelo usuário (logado ou visitante), o estado `showAcademicDisclaimer` é atualizado para `false`, desmontando a div do banner e restaurando o posicionamento original do cabeçalho sem quebras ou lacunas de layout.

3. **Criação de Testes Automatizados com /qa_writer:**
   - **Unitário (`AcademicDisclaimer.test.tsx`):**
     - Cobertura da renderização do texto obrigatório e aplicação do estilo vermelho (`bg-red-600`).
     - Validação de que o botão 'x' não é exibido inicialmente (avanço de 3000ms com `vi.advanceTimersByTime`).
     - Validação de que após 5000ms o botão de fechamento é renderizado e seu clique dispara o callback `onClose`.
   - **Unitário (`Profile.test.tsx`):**
     - Caso `FRONT-UNIT-58` adicionado para certificar que novos usuários sem histórico não vejam menções a *Marvel Rivals*, *Subnautica* ou *Librarian*, e sim o container de estado vazio de atividade recente.
   - **E2E Playwright (`academic-disclaimer.spec.ts`):**
     - Teste `E2E-DISCLAIMER-01` acessando a home-page (`/`), validando o texto acadêmico no topo, confirmando que o botão de fechar não está visível de início, aguardando os 5 segundos, clicando no 'x' e verificando a remoção da div e a integridade da tela.

4. **Atualização do Catálogo de Testes (`TESTS.md`):**
   - Registrados incrementalmente os novos testes:
     - `FRONT-UNIT-57`: Banner de Disclaimer Acadêmico com exibição condicional e liberação do botão de fechar após 5 segundos.
     - `FRONT-UNIT-58`: Estado vazio de atividade recente e ausência de jogos mockados para novos usuários no Profile.
     - `E2E-DISCLAIMER-01`: Exibição, persistência de 5 segundos do botão fechar e remoção do banner acadêmico na Home-page.
   - Atualizada a tabela de contagem total de testes: 192 testes catalogados (119 pytest, 69 vitest, 4 playwright).

**Resumo das saídas:**

- Componente criado: [`frontend/src/components/AcademicDisclaimer.tsx`](../frontend/src/components/AcademicDisclaimer.tsx)
- Teste unitário criado: [`frontend/src/components/AcademicDisclaimer.test.tsx`](../frontend/src/components/AcademicDisclaimer.test.tsx)
- Teste E2E criado: [`frontend/e2e/academic-disclaimer.spec.ts`](../frontend/e2e/academic-disclaimer.spec.ts)
- Modificado: [`frontend/src/App.tsx`](../frontend/src/App.tsx)
- Modificado: [`frontend/src/pages/Profile.tsx`](../frontend/src/pages/Profile.tsx)
- Modificado: [`frontend/src/pages/Profile.test.tsx`](../frontend/src/pages/Profile.test.tsx)
- Modificado: [`TESTS.md`](../TESTS.md)
- Registro criado: [`prompts/gabriel-T800_3rd.md`](prompts/gabriel-T800_3rd.md)

---

## 2026-10-03 — Prompt 2

**Prompt do usuário:**

> Mais bugs: 
> - os jogos, após serem baixados, não tem seu registro de download persistidos entre reloads da tela ou deslocamento entre páginas. Por exemplo, baixei o resonant e depois de "baixar" ele, o botão mudou para jogar. Entretanto, depois de mudar de página e voltar, vi que o botão está como baixar novamente. Aconteceu o mesmo para o MIST Quiz e para o Dead Cells, mas por algum motivo para o The Witcher 3 não houve esse problema. Essa persistencia do botão como "jogar" deve ser mantida, ou você acha que é ruim considerando que o sistema não pode ver se o jogo está devidamente instalado?
> - Ao clicar no overlay do download concluido, ele deve sumir

**Decisões arquiteturais e técnicas:**

1. **Diagnóstico da Causa Raiz:**
   - **The Witcher 3:** Foi previamente semeado no banco de dados (`seed_library.py`) com `is_installed = True` para o usuário `gabriel_t800` (Game ID 8). Assim, consultas à API `GET /library/my-games` sempre retornavam o estado instalado.
   - **Demais jogos (*Resonant*, *MIST Quiz*, *Dead Cells*):** Ao concluir o download, o componente `DownloadBar` disparava o evento `mist:game-installed`. O `Library.tsx` apenas alterava o estado em memória React (`items`), sem persistir no `localStorage` nem no banco de dados. Qualquer transição de aba ou reload acionava `getMyGames()`, que retornava `is_installed: false` do Postgres.
   - **Recomendação Arquitetural:** A persistência do botão como "Jogar" **deve ser mantida integralmente**. Em plataformas de jogos (como a Steam), o fluxo de download tem por finalidade disponibilizar o jogo para execução ("Jogar"). Reverter o botão a cada reload causava inconsistência na experiência do usuário.

2. **Implementação de Persistência em Duas Camadas:**
   - **Cliente (`localStorage`):** Criados helpers `getLocalInstalledGameIds()` e `saveLocalInstalledGameId(gameId)` com a chave `mist_installed_game_ids`. Em `fetchMyGames()`, os dados da API são mesclados com os IDs locais salvos, garantindo persistência síncrona imediata contra reloads e desmontagem de componentes.
   - **Backend (`library-service`):**
     - Adicionado método `LibraryService.mark_installed(db, user_id, game_id)` que localiza ou garante o item na biblioteca e atualiza `item.is_installed = True` de forma persistente.
     - Criados os endpoints `POST /library/games/{game_id}/install` e `POST /games/{game_id}/install` com injeção de autenticação via header `X-User-Id`.
     - Atualizado o client frontend com `libraryApi.markGameInstalled(gameId)`.
     - Ao receber `mist:game-installed`, o `Library.tsx` salva no `localStorage`, atualiza o estado e aciona o endpoint no backend assincronamente.

3. **Fechamento do Overlay do Download Concluído (`DownloadBar.tsx`):**
   - Alterada a lógica de clique: quando `download.progressPercentage >= 100`, qualquer clique sobre o overlay fecha e remove o card da tela (`setIsVisible(false); setDownload(null)`).
   - Adicionado botão explícito de fechar (`x`) no canto direito do overlay quando concluído, com tooltip indicativo e cursor pointer.

4. **Testes Automatizados & Catálogo (`TESTS.md`):**
   - `DownloadBar.test.tsx`: Adicionado teste validando que ao clicar no overlay de download concluído (100%), o componente fecha e desaparece do DOM.
   - `Library.test.tsx`: Adicionado teste validando que o evento `mist:game-installed` persiste o ID no `localStorage`, dispara a chamada `libraryApi.markGameInstalled` e mantém o botão "Jogar" ativo após desmontar e remontar a tela.
   - `test_library.py`: Adicionado teste de integração `test_lib_int_06_mark_game_installed`.
   - `TESTS.md`: Catalogados `FRONT-UNIT-59` e `FRONT-UNIT-60`, atualizando o total de testes para 194 (119 pytest, 71 vitest, 4 playwright).

**Resumo das saídas:**

- Modificado: [`frontend/src/components/DownloadBar.tsx`](../frontend/src/components/DownloadBar.tsx)
- Modificado: [`frontend/src/components/DownloadBar.test.tsx`](../frontend/src/components/DownloadBar.test.tsx)
- Modificado: [`frontend/src/api/client.ts`](../frontend/src/api/client.ts)
- Modificado: [`frontend/src/pages/Library.tsx`](../frontend/src/pages/Library.tsx)
- Modificado: [`frontend/src/pages/Library.test.tsx`](../frontend/src/pages/Library.test.tsx)
- Modificado: [`services/library-service/app/services/library_service.py`](../services/library-service/app/services/library_service.py)
- Modificado: [`services/library-service/app/api/routes.py`](../services/library-service/app/api/routes.py)
- Modificado: [`services/library-service/tests/test_library.py`](../services/library-service/tests/test_library.py)
- Modificado: [`TESTS.md`](../TESTS.md)
- Atualizado: [`prompts/gabriel-T800_3rd.md`](prompts/gabriel-T800_3rd.md)

---

## 2026-10-03 — Prompt 3

**Prompt do usuário:**

> Novo bug: ao clicar para baixar esses mesmos jogos que estavam "bugados" (com exceção do MIST), duas mensagens são emitidas em pouco tempo. 1ª que houve um erro ao iniciar o download. Entretanto, o download está sendo feito pelo frontend. 2ª que o download foi concluido, quando ele encerra o loading do download

**Decisões arquiteturais e técnicas:**

1. **Diagnóstico da Causa Raiz:**
   - Em `handleDownload` no [`Library.tsx`](../frontend/src/pages/Library.tsx), ao clicar em "Baixar", o frontend primeiro emitia `mist:start-download` (acionando o `DownloadBar`) e, em seguida, tentava chamar `storeApi.downloadGamePackage(item.game_id)` para obter o arquivo `.zip` real.
   - Conforme especificado pelo projeto e refletido no disclaimer acadêmico, apenas jogos desenvolvidos pela **MIST Studios** possuem código executável `.zip` físico no backend (`services/store-service/app/data/`). Para os demais jogos do catálogo geral (ex: *Resonant*, *Dead Cells*, etc.), o backend intencionalmente retorna HTTP 400 (`"Este jogo não possui pacote de download direto disponível no momento"`).
   - O bloco `catch` de `handleDownload` tratava essa resposta esperada como um erro fatal de download, emitindo o toast espúrio: `"Erro ao iniciar download de [jogo]. Tente novamente."`. Enquanto isso, a barra de progresso no frontend continuava sua simulação até emitir `"Download e instalação concluídos!"`.

2. **Ajuste no Tratamento de Download Simulado:**
   - No [`Library.tsx`](../frontend/src/pages/Library.tsx), a tentativa de baixar o binário físico foi isolada em um bloco resiliente.
   - Caso o backend informe que o título não possui pacote de download direto (títulos não-MIST), o erro é suprimido no UI (apenas log informativo no console), permitindo que o download simulado ocorra de forma límpida no `DownloadBar` até a conclusão e instalação normal.
   - Dessa forma, o usuário recebe apenas a notificação legítima de download concluído ao término dos 100%.

3. **Testes Automatizados & Catálogo (`TESTS.md`):**
   - Adicionado teste unitário em [`Library.test.tsx`](../frontend/src/pages/Library.test.tsx) validando que, para jogos sem pacote binário no backend, o download simulado prossegue sem emissão de toast de erro.
   - Registrado `FRONT-UNIT-61` no [`TESTS.md`](../TESTS.md), elevando a contagem total de testes para 195 (119 pytest, 72 vitest, 4 playwright).

**Resumo das saídas:**

- Modificado: [`frontend/src/pages/Library.tsx`](../frontend/src/pages/Library.tsx)
- Modificado: [`frontend/src/pages/Library.test.tsx`](../frontend/src/pages/Library.test.tsx)
- Modificado: [`TESTS.md`](../TESTS.md)
- Atualizado: [`prompts/gabriel-T800_3rd.md`](prompts/gabriel-T800_3rd.md)

---

## 2026-10-03 — Prompt 4

**Prompt do usuário:**

> Vamos com a alternativa 1 mesmo. Se assemelha mais ao modelo da Steam, mas sem o estresse de se mexer com o SO. Para o domínio, use https://mist.biomimetics.com.br/, que é o caminho que estará apontando para o http://frontend:80 do MIST rodando no meu servidor.
> Não esqueça de oferecer a compatibilidade entre Windows e Linux/Mac nesse serviço

**Decisões arquiteturais e técnicas:**

1. **Adoção da Alternativa 1 (Distribuição Standalone Multiplataforma Autocontida):**
   - Para contornar os bloqueios de segurança de navegadores modernos (*Mixed Content* HTTPS ➔ HTTP e *Private Network Access* do W3C) que ocorrem ao acessar o ecossistema via túnel público Cloudflare (`https://mist.biomimetics.com.br/`), eliminamos a dependência de um daemon local HTTP (`127.0.0.1:39090`).
   - Adotou-se o modelo padrão de distribuição digital (semelhante ao Itch.io e Humble Bundle / DRM-free), onde cada download de título MIST Studios gera dinamicamente um arquivo `.zip` autocontido pronto para execução local.

2. **Empacotamento Dinâmico Multiplataforma no Backend (`store-service`):**
   - Em [`StoreService.build_game_package`](../services/store-service/app/services/store_service.py):
     - **Configuração da API Pública:** O `session.json` embutido no `.zip` passa a receber `library_api_url` configurado por `MIST_PUBLIC_API_URL` com fallback padrão para `https://mist.biomimetics.com.br/api/library`.
     - **Launcher Windows (`jogar.bat`):** Script em lote com codificação UTF-8 (`chcp 65001`), detecção automática de executáveis `python` e `py`, instruções amigáveis e tratamento de ausência do interpretador.
     - **Launcher Linux & macOS (`jogar.sh`):** Script bash compatível com POSIX (`#!/usr/bin/env bash`), detecção de `python3` e `python` e comandos de instalação para as principais distribuições Linux e macOS via Homebrew.
     - **Documentação de Boas-Vindas (`LEIAME.txt`):** Instruções passo a passo explicando como descompactar, executar em cada sistema operacional e como funciona a sincronização automática de telemetria e conquistas.
   - Em [`routes.py`](../services/store-service/app/api/routes.py): Adicionado suporte a `Authorization: Bearer <token>` para extrair as credenciais JWT do usuário de forma transparente durante o download.

3. **Experiência do Usuário e Modal Instrutivo na Biblioteca (`Library.tsx`):**
   - Atualizado [`frontend/src/api/client.ts`](../frontend/src/api/client.ts) para enviar cabeçalhos `Authorization`, `X-User-Token` e `X-User-Id` na requisição de download.
   - No [`Library.tsx`](../frontend/src/pages/Library.tsx), ao clicar no botão "Jogar" de um título da MIST Studios:
     - Dispara `libraryApi.startSession(item.game_id)` para registrar o início da sessão no backend e atualizar `last_played`.
     - Exibe um modal responsivo e estilizado com as instruções claras de inicialização para Windows (`jogar.bat`) e Linux/macOS (`./jogar.sh`), reforçando a sincronização online com o domínio público e oferecendo um botão prático de "Baixar Pacote Novamente".

4. **Testes Automatizados & Catálogo (`TESTS.md`):**
   - Atualizado [`test_download.py`](../services/store-service/tests/test_download.py) para validar a presença de `jogar.bat`, `jogar.sh`, `LEIAME.txt`, URL da API pública e cabeçalho `Authorization: Bearer`.
   - Adicionado novo teste unitário em [`Library.test.tsx`](../frontend/src/pages/Library.test.tsx) validando a abertura e o fechamento do modal instrutivo multiplataforma.
   - Registrado `FRONT-UNIT-62` e atualizado `STORE-UNIT-03` no [`TESTS.md`](../TESTS.md), elevando a contagem total de testes do projeto para 196 (119 pytest, 73 vitest, 4 playwright).

**Resumo das saídas:**

- Modificado: [`services/store-service/app/services/store_service.py`](../services/store-service/app/services/store_service.py)
- Modificado: [`services/store-service/app/api/routes.py`](../services/store-service/app/api/routes.py)
- Modificado: [`services/store-service/tests/test_download.py`](../services/store-service/tests/test_download.py)
- Modificado: [`frontend/src/api/client.ts`](../frontend/src/api/client.ts)
- Modificado: [`frontend/src/pages/Library.tsx`](../frontend/src/pages/Library.tsx)
- Modificado: [`frontend/src/pages/Library.test.tsx`](../frontend/src/pages/Library.test.tsx)
- Modificado: [`TESTS.md`](../TESTS.md)
- Atualizado: [`prompts/gabriel-T800_3rd.md`](prompts/gabriel-T800_3rd.md)




## Prompt: 2026-10-03
**Usu�rio:** Gabriel_T
**Prompt:** Fa�a o commit da branch atual
A seguir, fa�a merge da branch com a dev. Caso haja conflitos, a nova branch � a source of truth, e portanto tem prioridade

**Decis�es e Modifica��es:**
1. Adicionado e comitado todos os arquivos alterados na branch inal (TESTS.md, componentes de UI, disclaimer acad�mico, rotas e testes nos servi�os de store/library).
2. Mudan�a para a branch dev.
3. Merge da branch inal na dev utilizando a estrat�gia -X theirs para que as mudan�as da branch inal sejam a fonte da verdade em caso de conflitos.
