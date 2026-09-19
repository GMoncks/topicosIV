---
name: qa_writer
description: Use esta skill para criar ou atualizar entradas do TESTS.md sempre que uma funcionalidade nova for desenvolvida, um teste precisar ser adicionado/revisado, ou um bug corrigido precisar virar um caso de regressão.
---

# QA Writer Skill

Esta skill atua como autor e curador técnico do catálogo de testes do projeto MIST (`TESTS.md`). Ela garante que qualquer novo comportamento, requisito ou correção de bug seja documentado sob a taxonomia da pirâmide de testes.

---

## 1. Responsabilidades e Permissões

- **Permissão de Leitura e Escrita**: [`TESTS.md`].
- **Permissão de Somente Leitura**: [`resultados.json`] — utilizado para analisar falhas recorrentes, avaliar estabilidade e selecionar testes para transformar em casos de regressão. A escrita nesse arquivo (inclusive durante validações dry-run acionadas por esta skill) é protegida por lock de arquivo, implementado e gerenciado pela skill `qa_tester` — esta skill não precisa administrar isso diretamente.
- **Isolamento de Execução**: Esta skill **NUNCA** executa testes diretamente. Ela não possui ferramentas nem autorização para invocar runners (`pytest`, `vitest`, `playwright`, etc.).
- **Edição Incremental Obrigatória**: Ao adicionar ou editar um teste, altere **estritamente** a seção/bloco relevante (navegando pela hierarquia `##`, `###`, `####`). **Nunca** sobrescreva o arquivo `TESTS.md` por inteiro após sua criação inicial.

---

## 2. Estrutura Padrão de um Teste

Cada novo teste adicionado deve seguir obrigatoriamente a estrutura abaixo:

```markdown
#### <ID> — <título curto>
- Prioridade: P0 | P1 | P2
- Status: planejado | implementado | aprovado | revisar
- Runner: <nome de um runner da seção "Runners registrados">
- Comando: `<comando exato>`   (deixar vazio enquanto status = planejado)
- Pré-condições: <estado necessário antes da execução>
- Passos:
  - Dado <contexto inicial>
  - Quando <ação executada>
  - Então <resultado esperado observável>
- Resultado esperado: <critério de aceite objetivo>
- Rastreabilidade: <feature, requisito, arquivo ou commit relacionado>
- Observações: <opcional — ex: contexto de uma transição para "revisar">
```

**Campos adicionais obrigatórios apenas para testes da categoria Regressão:**
```markdown
- Causa raiz: <resumo da causa raiz do defeito corrigido>
- Reprodução original: <passos como o bug foi originalmente observado>
- PR/Commit relacionado: <link ou identificador>
```

### Padrão de Nomenclatura de IDs
- **Unitários**: `<DOMINIO>-UNIT-<NUMERO>` (ex: `AUTH-UNIT-02`, `FRONT-UNIT-03`)
- **Integração**: `<DOMINIO>-INT-<NUMERO>` (ex: `GATEWAY-INT-02`, `STORE-LIB-INT-02`)
- **E2E / Sistema completo**: `E2E-<DOMINIO/FLUXO>-<NUMERO>` (ex: `E2E-BUY-01`, `E2E-CHAT-01`)
- **Regressão**: `REG-<DOMINIO>-<NUMERO>` (ex: `REG-FRONT-02`, `REG-AUTH-01`)
- **Smoke**: `SMOKE-<DOMINIO/AREA>-<NUMERO>` (ex: `SMOKE-HEALTH-02`)

### Regra de Numeração

Ao atribuir o `<NUMERO>` de um novo ID, escaneie todos os IDs existentes com aquele mesmo prefixo (categoria + domínio) — incluindo os que já existiam no `TESTS.md` **e** os que foram criados anteriormente **durante a mesma execução** — pegue o maior número encontrado e incremente sequencialmente. Nunca numere com base apenas no estado do arquivo antes do início da execução atual: isso evita colisões de ID quando múltiplos testes do mesmo domínio são criados numa única rodada, como no modo de varredura em lote (seção 6).

---

## 3. Categorias da Pirâmide de Testes

1. **Unitários**: Teste isolado de uma função, classe, método ou componente React sem acoplamento a serviços externos ou banco de dados real.
2. **Integração**: Verificação de comunicação entre múltiplos componentes internos (ex: Gateway validando token e encaminhando para Auth, ou Store chamando Library via HTTP).
3. **E2E / Sistema completo**: Fluxo completo de usuário do início ao fim usando navegadores reais e ambiente Docker integrado.
4. **Regressão**: Casos originados de defeitos reportados ou bugs corrigidos. Todo bug resolvido deve ser acompanhado de um caso de regressão aqui.
5. **Smoke**: Conjunto enxuto e crítico de testes para validação rápida de sanidade do sistema após deploys ou builds.

---

## 4. Regras de Transição de Status

1. **Criação do Teste**:
   - Todo teste nasce obrigatoriamente com `Status: planejado` e o campo `Comando:` vazio.
   - O runner selecionado no campo `Runner:` deve constar na seção `## Runners registrados`. Se um novo tipo de runner for adotado na stack, adicione-o primeiro à lista de runners registrados antes de referenciá-lo.

2. **Transição para `implementado`**:
   - Significa apenas que o comando de teste existe e roda mecanicamente sem erro de infraestrutura (ambiente configurado, comando resolve, execução chega ao fim) — **não** implica que a asserção do teste necessariamente passe.
   - Antes de efetuar essa transição, acione a skill `qa_tester` em **modo de validação pontual (dry-run)** especificando o `<ID>`.
   - Essa validação gera um registro em `resultados.json` marcado com `"origem": "validacao"`.
   - Se a execução ocorrer sem erro de infraestrutura, preencha `Comando: <comando exato>` e mude `Status:` para `implementado`.

3. **Transição para `aprovado`**:
   - Significa que o teste, além de rodar mecanicamente, efetivamente passou na sua asserção (resultado `pass` retornado pelo runner).
   - Um teste `implementado` transita para `aprovado` assim que uma validação (dry-run ou execução regular via `qa_tester`) retornar `pass`.

4. **Transição para `revisar`**:
   - Usada em dois cenários:
     - **(a) Falha de validação**: a validação dry-run falha — seja por erro de infraestrutura/configuração (comando incorreto, ambiente ausente) ou por falha genuína da asserção. Registre o log/contexto do erro no campo `Observações`, referenciando o `run_id` correspondente em `resultados.json`.
     - **(b) Suspeita de obsolescência**: a checagem de integridade (seção 6) detecta que um teste `implementado`/`aprovado` deixou de ser válido (ex.: o `Comando` não resolve mais um arquivo/função/rota existente).
   - Um teste em `revisar` **nunca** é apagado automaticamente por esta skill. A decisão de corrigir, reverter para `planejado` ou remover definitivamente é sempre humana.

---

## 5. Fluxo de Trabalho Passo a Passo

1. **Leitura de Contexto**:
   - Leia a seção do `TESTS.md` correspondente à categoria pretendida.
   - Se for criar um teste de **Regressão**, verifique se o pedido contém os campos mínimos exigidos (Causa raiz, Reprodução original, PR/Commit relacionado — seção 2). **Se qualquer um estiver ausente ou ambíguo, pergunte ao solicitante antes de criar o teste** — nunca infira ou reconstrua esses dados de memória. Consulte também `resultados.json` para histórico de falhas relacionado.
2. **Inserção Incremental**:
   - Localize a subseção correta (`### <Funcionalidade>`) ou crie uma nova caso não exista.
   - Adicione o bloco `#### <ID> — <título curto>` preservando a indentação e os campos obrigatórios.
3. **Validação de Transição**:
   - Caso o teste já possua código automatizado pronto, acione `qa_tester` para validação pontual (`dry-run`) com `"origem": "validacao"`.
   - Atualize `Status` e `Comando` de acordo com a resposta (ver seção 4).

---

## 6. Modo de Varredura em Lote (Aditivo)

**Objetivo**: identificar lacunas de cobertura (funcionalidades elegíveis sem teste) e, complementarmente, checar a integridade de testes já catalogados — sem nunca escrever conteúdo novo no `TESTS.md` sem aprovação humana explícita.

### Parâmetros de Invocação

- **`escopo`** (obrigatório — não tem valor-padrão silencioso):
  - nome de uma funcionalidade/módulo específico (ex.: `"biblioteca de jogos"`)
  - uma categoria da pirâmide (ex.: `"regressão"`)
  - `"diff"` — apenas o que mudou desde a última varredura
  - `"sistema completo"` — só é aceito quando informado **explicitamente** pelo solicitante; nunca é inferido de um pedido genérico como "veja o que falta" e nunca é o comportamento padrão.
- **`rigor`** (opcional, padrão: `superficial`):
  - `superficial` — verifica se cada funcionalidade elegível tem ao menos um teste por categoria relevante da pirâmide.
  - `padrão` — inclui casos de borda óbvios (vazio, nulo, limite).
  - `profundo` — também considera interações entre funcionalidades e cenários de erro/segurança.

Se `escopo` não for informado, a skill **não** deve assumir "sistema completo" — deve perguntar qual escopo usar, ou usar como fallback o módulo/contexto imediato do trabalho em andamento.

### Critério de Elegibilidade (Allowlist)

Apenas caminhos/padrões listados explicitamente numa lista de permissão — mantida e revisada por você — entram na varredura (ex.: diretórios de rotas, serviços, componentes com interação de usuário). Arquivos de configuração, código gerado, arquivos de teste e utilitários triviais ficam fora por padrão, mesmo quando tecnicamente dentro do `escopo` informado.

### Fluxo — Detecção de Lacunas

1. **Leitura**: a skill varre o `TESTS.md` inteiro dentro do escopo definido e percorre os caminhos elegíveis da allowlist, coletando rotas, componentes, serviços e funções exportadas relevantes ao `rigor` escolhido.
2. **Detecção**: compara o que foi encontrado com as seções já existentes em `TESTS.md`, casando por **nome de módulo/rota** (chave estável — nunca por texto livre de título, para não gerar seções duplicadas do mesmo conceito). Para cada funcionalidade elegível sem bloco `#### <ID> — …` correspondente, gera uma **proposta** de lacuna contendo: nome/caminho, categoria sugerida, e sugestão de ID (seguindo a Regra de Numeração da seção 2).
3. **Aprovação humana**: a skill apresenta a lista completa de lacunas propostas para sua aprovação. **Nenhum bloco novo é inserido no `TESTS.md` sem confirmação explícita.**
4. **Inserção pontual**: após aprovação, cada lacuna aprovada é inserida via edição incremental (nunca reescrita total), seguindo o Formato Padrão de um Teste (seção 2), com `Status: planejado`.

### Fluxo — Checagem de Integridade

Dentro do mesmo escopo, para cada teste já `implementado` ou `aprovado`, a skill verifica se o `Comando` referenciado ainda resolve (arquivo/função/rota ainda existe). Se não resolver mais, o teste é movido para `Status: revisar`, com uma `Observação` indicando o motivo (ex.: "comando não resolve mais — possível refatoração ou remoção"). Diferente da inserção de lacunas novas, essa transição **não** exige aprovação prévia — é uma sinalização defensiva sobre um teste já existente, não a criação de conteúdo novo.

### Registro

Ao final da execução, a skill gera um sumário indicando: quantas lacunas foram propostas e aprovadas (com os IDs criados), e quantos testes existentes foram sinalizados para revisão pela checagem de integridade.

**Características**:
- Criação de conteúdo novo é sempre condicionada à aprovação humana; sinalização de `revisar` pela checagem de integridade é automática, por ser defensiva e não-destrutiva.
- 100% aditivo/incremental: nenhuma seção existente é removida ou reescrita por esta skill.