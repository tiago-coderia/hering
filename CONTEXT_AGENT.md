# Guia de Contexto para Agentes de IA e LLMs (CONTEXT_AGENT.md)

Este documento serve como fonte de verdade primária e guia de orientação executiva para **qualquer Modelo de Linguagem (LLM)** ou **Agente Autônomo de IA** que venha a interagir com este repositório no presente ou no futuro.

---

## 1. Visão Executiva do Projeto

- **Nome do Projeto:** App de Checklist Operacional PWA (Desafio Técnico Hering).
- **Proposta Central:** Sistema robusto para auditorias de conformidade e rotinas operacionais em lojas físicas da rede Hering, com operação **100% Offline-First**, sincronização idempotente, armazenamento físico de fotos em disco local com proteção contra path traversal, pontuação matemática ponderada e isolamento estrito por cargo e loja.
- **Estrutura do Repositório:** Monorepo com npm workspaces:
  - `apps/api`: Backend Express em TypeScript, Prisma ORM, PostgreSQL, Zod, JWT, Swagger.
  - `apps/web`: Frontend Next.js 14 (App Router), React 18, Tailwind CSS, Dexie (IndexedDB), Service Worker PWA.
  - `data/uploads`: Diretório no disco do host mapeado em `/app/storage/uploads` no container.
  - `docs/SDD`: Especificações detalhadas de design de sistema e arquitetura (SDD 01 ao SDD 11).

---

## 2. Regras de Ouro e Diretrizes Imutáveis (Guardrails)

Ao sugerir alterações, gerar código ou planejar tarefas, o Agente de IA **DEVE** respeitar impreterivelmente as seguintes regras:

### 2.1 Mensagens de Commit (Obrigatoriamente em PT-BR)
- Todas as mensagens de commit devem ser escritas em **Português do Brasil (PT-BR)**.
- Formato: `<tipo>(<escopo>): <descrição em português>` (ex.: `feat(api): implementar novo filtro de relatorio`).
- **Nenhum commit deve ser gerado em inglês.**

### 2.2 O Backend é a Autoridade Suprema de Segurança
- Ocultar botões ou rotas no frontend (`apps/web`) **NUNCA** substitui validações no backend (`apps/api`).
- Todas as requisições à API devem validar o cargo (`Administrador`, `Gerente`, `Operador`) e a vinculação de loja (`lojaId`).
- Usuários `Gerente` e `Operador` nunca podem acessar dados ou fotos de outra loja (`403 Forbidden`).
- `Administrador` possui visão global (`lojaId` nulo).

### 2.3 Proibição de Blobs / Base64 no Banco de Dados
- O PostgreSQL armazena apenas metadados de fotos (UUID, chave relativa, MIME type, tamanho em bytes).
- Imagens são compactadas no cliente (`apps/web/src/lib/imageCompressor.ts`) e armazenadas fisicamente no disco local através da classe `LocalDiskStorage`.

### 2.4 Filosofia 100% Offline-First
- A geração de identificadores (UUIDs) para execuções, respostas, planos de ação e fotos ocorre **sempre no dispositivo do cliente** antes de qualquer sincronização.
- O IndexedDB (`HeringChecklistOfflineDB` via Dexie) é a fonte de dados local primária.
- A sincronização com o servidor ocorre em duas etapas atômicas:
  1. Envio de metadados estruturados (`POST /api/v1/execucoes/sync`).
  2. Upload binário sequencial dos arquivos de fotos compactados (`POST /api/v1/fotos/upload`).

### 2.5 Regras Matemáticas de Pontuação (Score)
- Itens `C` (Conforme): somam no numerador e no denominador (`peso`).
- Itens `NC` (Não conforme): somam apenas no denominador (`peso`), com valor zero no numerador.
- Itens `NA` (Não se aplica): são expurgados do cálculo (não somam em nada).
- Denominador zero (todos os itens `NA`): a pontuação formal no banco deve ser `null`, exibindo `"N/A"` no frontend.
- Toda resposta `NC` exige pelo menos 1 foto e cria automaticamente um plano de ação (prazo default 48h).

### 2.6 Concorrência Otimista em Planos de Ação
- Mutações em planos de ação (`PUT /api/v1/planos-acao/:id`) utilizam o campo `revisao`.
- Divergências de revisão retornam `409 Conflict`.
- Concluir um plano de ação exige pelo menos uma foto de evidência corretiva.

---

## 3. Mapa de Navegação e Documentação Técnica (SDD)

Consulte a pasta [`docs/SDD/`](./docs/SDD/README.md) para entender em detalhes a implementação de cada módulo:
- [`docs/SDD/SDD01-setup-monorepo-workspaces.md`](./docs/SDD/SDD01-setup-monorepo-workspaces.md): Infraestrutura base, workspaces e docker-compose.
- [`docs/SDD/SDD02-modelagem-prisma-seed.md`](./docs/SDD/SDD02-modelagem-prisma-seed.md): Schema relacional, migrations e dados de teste.
- [`docs/SDD/SDD03-storage-fotos-local.md`](./docs/SDD/SDD03-storage-fotos-local.md): Implementação do `LocalDiskStorage` e mitigação de path traversal.
- [`docs/SDD/SDD04-motor-calculo-score.md`](./docs/SDD/SDD04-motor-calculo-score.md): Motor de cálculo de score e cobertura de testes.
- [`docs/SDD/SDD05-autenticacao-jwt-rbac-multiloja.md`](./docs/SDD/SDD05-autenticacao-jwt-rbac-multiloja.md): Segurança, JWT, RBAC e isolamento multi-loja.
- [`docs/SDD/SDD06-sync-idempotente-planos-acao-swagger.md`](./docs/SDD/SDD06-sync-idempotente-planos-acao-swagger.md): Endpoint `/execucoes/sync`, concorrência 409 e Swagger UI.
- [`docs/SDD/SDD07-testes-integracao-e2e-api.md`](./docs/SDD/SDD07-testes-integracao-e2e-api.md): Bateria de testes automatizados com Vitest e Supertest.
- [`docs/SDD/SDD08-pwa-service-worker-indexeddb.md`](./docs/SDD/SDD08-pwa-service-worker-indexeddb.md): PWA, Service Worker offline shell e Dexie IndexedDB.
- [`docs/SDD/SDD09-sync-engine-compressao-fotos-ui.md`](./docs/SDD/SDD09-sync-engine-compressao-fotos-ui.md): SyncEngine, compressão via Canvas (RD04) e UI.
- [`docs/SDD/SDD10-telas-pwa-dashboard-modelos.md`](./docs/SDD/SDD10-telas-pwa-dashboard-modelos.md): Telas do PWA, ranking por loja (RD02) e gestão de versões.
- [`docs/SDD/SDD11-deploy-producao-ajustes-finais.md`](./docs/SDD/SDD11-deploy-producao-ajustes-finais.md): Deploy no Easypanel, resolução dinâmica e correções de produção.

---

## 4. Credenciais de Demonstração e Acesso Rápido

Para simular fluxos ou planejar scripts de teste:
- **Senha padrão de todos os usuários:** `hering123`
- `admin@hering.com.br` -> Administrador Global (Acesso irrestrito a todas as lojas, dashboard consolidado e gestão de modelos).
- `gerente.blumenau@hering.com.br` -> Gerente da Loja Blumenau Centro (`LJ-001`).
- `operador.blumenau@hering.com.br` -> Operador da Loja Blumenau Centro (`LJ-001`).
- `gerente.paulista@hering.com.br` -> Gerente da Loja São Paulo Paulista (`LJ-002`).

---

## 5. Instruções para Continuidade de Tarefas

Se for solicitado a você criar uma nova funcionalidade, refatorar código ou corrigir bugs:
1. **Verifique os testes existentes:** Execute `npm run test` em `apps/api` para garantir que nada foi quebrado.
2. **Atualize ou crie um novo SDD:** Se introduzir uma nova capacidade arquitetural relevante, crie o documento sequencial `docs/SDD/SDD12-...md` e atualize o índice `docs/SDD/README.md`.
3. **Mantenha os commits em PT-BR:** Formule o commit com verbo no infinitivo ou presente em português do Brasil conforme as regras do [AGENTS.md](file:///p:/09.%20Testes/hering/AGENTS.md).

