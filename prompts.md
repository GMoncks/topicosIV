# Histórico de prompts

Este arquivo registra os prompts usados para conduzir o desenvolvimento do projeto. Deve ser atualizado a cada novo prompt do usuário.

---

## 2026-08-14 — Prompt 1

**Prompt do usuário:**

> Eu quero criar um projeto POC (prova de conceito) de um sistema com as mesmas funcionalidades da Steam (Steam como ecossistema - Loja, social, biblioteca). Inicialmente, adicione uma estrutura de arquivos como placeholders e crie um arquivo README.md descrevendo os arquivos criados e para que servem, ainda não popule estes arquivos. Para a arquitetura e tecnologias utilizadas: me pergunte, utilizando as opções mais utilizadas no mercado. Ao final, salve este prompt em um arquivo prompts.md - Este arquivo sempre deverá ser modificado quando eu fizer outro prompt.

**Decisões tomadas em resposta (via perguntas ao usuário):**

- Arquitetura: Microsserviços
- Backend: Python + FastAPI
- Frontend: React + TypeScript
- Banco de dados: SQLite, localmente (um arquivo por serviço)

**Resultado:**

- Criada estrutura de pastas e arquivos placeholder (vazios) para: `gateway` (API Gateway), 4 microsserviços (`auth-service`, `store-service`, `library-service`, `social-service`), `frontend` (React + TS) e `docs/`.
- Criado `README.md` descrevendo a estrutura e o propósito de cada arquivo.
- Criado este arquivo `prompts.md`.

---

## 2026-08-31 — Prompt 2

**Prompt do usuário:**

> Análise técnica do estado atual do projeto e planejamento de um plano de ação estruturado para recriar o ecossistema Steam (MIST), considerando equipe de 3 pessoas, repositório GitHub público, GitHub Projects (tickets/épicos), desenvolvimento assistido por IA, integração de agentes de IA nos microsserviços, prazo de 1 a 2 meses e divisão de papéis.

**Decisões e Entregas em Resposta:**

- Avaliação arquitetural técnica (comunicação entre microsserviços, propagação de auth, banco de dados, storage simulado de arquivos de jogos).
- Definição da arquitetura de Agentes de IA (Recomendação Inteligente, Agente de Conquistas e Assistente de Comunidade).
- Estrutura de Épicos e Tickets para o GitHub Project.
- Divisão de papéis e responsabilidades para o trio de Engenharia da Computação.
- Cronograma detalhado em 4 Sprints (6 a 8 semanas).
- Fluxo de trabalho metodológico com IA (Spec-first, Prompting, Code Review & Test Generation).
