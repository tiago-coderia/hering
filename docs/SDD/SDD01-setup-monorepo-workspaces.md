# SDD 01: Setup do Monorepo, Workspaces e Estrutura Base

- **Identificador:** SDD-01
- **Fase:** Fundação e Infraestrutura Base
- **Commit Equivalente:** `ec86958` (*chore: setup monorepo workspaces, docker-compose and environment base*)
- **Status:** Implementado e Validado

---

## 1. Contexto e Motivação

O projeto requer a entrega de um aplicativo PWA Offline-First para checklists operacionais em lojas da rede Hering, acompanhado de uma API robusta, banco de dados relacional e infraestrutura pronta para execução via Docker Compose.

Para evitar a fragmentação de repositórios e simplificar a orquestração de desenvolvimento, testes e tipagem TypeScript compartilhada, adotou-se a arquitetura de **Monorepo com npm workspaces**.

---

## 2. Decisões Arquiteturais

### 2.1 Estrutura em Workspaces (`apps/api` e `apps/web`)
- **Raiz (`/`):** Gerenciador central de dependências do monorepo via `package.json` com `"workspaces": ["apps/*"]`.
- **`apps/api`:** Aplicação de backend em Node.js com Express e TypeScript, Prisma ORM, validação com Zod e autenticação JWT.
- **`apps/web`:** Aplicação frontend em Next.js 14 (App Router), React 18, Tailwind CSS, Dexie (IndexedDB) e suporte a Progressive Web App (PWA).

### 2.2 Orquestração de Containers (`docker-compose.yml`)
Para permitir execução completa com um único comando (`docker compose up --build`), a infraestrutura foi configurada com três serviços essenciais:
1. `postgres`: Imagem oficial `postgres:16-alpine`, com healthcheck nativo via `pg_isready` e volume persistente nomeado `postgres_data`.
2. `api`: Container baseado em multi-stage build Node.js Alpine, expondo a porta `3001` e com bind mount persistente para `/app/storage/uploads`.
3. `web`: Container frontend Next.js em modo produção, expondo a porta `3000`.

### 2.3 Gestão de Variáveis de Ambiente
Criação do arquivo `.env.example` central com valores padrão reproduzíveis:
- `PORT=3001`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/checklist_db?schema=public`
- `JWT_SECRET=hering_challenge_super_secret_jwt_key_2026`
- `STORAGE_LOCAL_DIR=../../data/uploads`
- `CORS_ORIGIN=http://localhost:3000`
- `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`

---

## 3. Estrutura de Diretórios Inicial

```
hering/
├── .gitignore
├── .env.example
├── docker-compose.yml
├── package.json (monorepo root)
├── AGENTS.md (diretrizes de engenharia e regras de commits)
├── apps/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   └── web/
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
└── data/
    └── uploads/ (diretório físico para fotos locais)
```

---

## 4. Como Executar e Validar

1. **Instalação de Dependências:**
   ```bash
   npm install
   ```
2. **Execução Simultânea em Desenvolvimento:**
   ```bash
   npm run dev
   ```
3. **Subida Completa em Containers:**
   ```bash
   docker compose up --build -d
   ```

