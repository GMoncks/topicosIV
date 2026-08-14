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
