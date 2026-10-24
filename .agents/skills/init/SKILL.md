---
name: init
description: >-
  Inicializa o contexto de engenharia do projeto Hering Checklist PWA.
  Lê e interpreta CONTEXT_AGENT.md, AGENTS.md e docs/SDD/ para guiar qualquer
  desenvolvedor ou LLM sobre regras inegociáveis, mapa de arquitetura e rotas de código.
---

# Skill: /init — Inicialização de Contexto e Governança Técnica

Esta skill é ativada quando o usuário ou desenvolvedor digita `/init` (ou solicita a inicialização do contexto do projeto).

Seu papel é carregar a governança de engenharia e instruir o agente sobre **onde e como alterar o código** em qualquer nova demanda.

---

## 1. Procedimento de Inicialização Obrigatório

Ao receber `/init`, o agente deve executar mentalmente e confirmar os seguintes passos:

1. **Leitura da Fonte da Verdade:**
   - Inspecionar [`CONTEXT_AGENT.md`](../../CONTEXT_AGENT.md) (regras de ouro e visão geral).
   - Inspecionar [`AGENTS.md`](../../AGENTS.md) (convenções arquiteturais e padrão de commits).
   - Inspecionar [`docs/SDD/README.md`](../../docs/SDD/README.md) (mapa das 11 fases de engenharia).

2. **Apresentar o Status Inicial ao Usuário:**
   Emitir uma mensagem de prontidão técnica destacando:
   - Identificação do projeto (**Hering Checklist Operacional PWA**).
   - Resumo das camadas do Monorepo (`apps/api` e `apps/web`).
   - Confirmação de que as regras invioláveis estão ativas.

---

## 2. Matriz de Decisão: Onde Fazer Cada Alteração?

Sempre que uma nova tarefa ou funcionalidade for solicitada, use esta matriz para direcionar as alterações:

| Demanda Solicitada | Camada Responsável | Arquivos / Diretórios-Chave | SDD de Referência |
|---|---|---|---|
| **Nova regra de pontuação ou fórmula** | Backend | `apps/api/src/services/score/ScoreCalculator.ts`<br>`apps/api/src/tests/scoreCalculator.test.ts` | [SDD-04](../../docs/SDD/SDD04-motor-calculo-score.md) |
| **Novo campo no Checklist ou Modelo** | Banco & API | `apps/api/prisma/schema.prisma`<br>`apps/api/src/routes/checklistRoutes.ts`<br>`apps/web/src/lib/db.ts` | [SDD-02](../../docs/SDD/SDD02-modelagem-prisma-seed.md)<br>[SDD-06](../../docs/SDD/SDD06-sync-idempotente-planos-acao-swagger.md) |
| **Sincronização Offline e Retry** | Web & API | `apps/web/src/lib/syncEngine.ts`<br>`apps/web/src/lib/db.ts`<br>`apps/api/src/services/checklist/ChecklistService.ts` | [SDD-06](../../docs/SDD/SDD06-sync-idempotente-planos-acao-swagger.md)<br>[SDD-09](../../docs/SDD/SDD09-sync-engine-compressao-fotos-ui.md) |
| **Manipulação ou Upload de Fotos** | Storage & Web | `apps/api/src/services/storage/LocalDiskStorage.ts`<br>`apps/web/src/lib/imageCompressor.ts`<br>`apps/api/src/routes/photoRoutes.ts` | [SDD-03](../../docs/SDD/SDD03-storage-fotos-local.md)<br>[SDD-09](../../docs/SDD/SDD09-sync-engine-compressao-fotos-ui.md) |
| **Permissões, Perfis e Lojas** | Segurança Backend | `apps/api/src/middlewares/authMiddleware.ts`<br>`apps/api/src/routes/authRoutes.ts` | [SDD-05](../../docs/SDD/SDD05-autenticacao-jwt-rbac-multiloja.md) |
| **Telas do PWA, Modais e Layout** | Frontend Next.js | `apps/web/src/app/`<br>`apps/web/src/components/` | [SDD-10](../../docs/SDD/SDD10-telas-pwa-dashboard-modelos.md) |
| **Métricas e Dashboards Gerenciais** | API & Frontend | `apps/api/src/services/dashboard/DashboardService.ts`<br>`apps/web/src/app/page.tsx` | [SDD-10](../../docs/SDD/SDD10-telas-pwa-dashboard-modelos.md) |

---

## 3. Checklist de Validação Antes de Entregar Código

Antes de dar uma tarefa por concluída, o agente deve validar:
1. **Segurança:** O backend valida cargo e escopo de loja? (Gerente/Operador não podem acessar recursos de outra loja).
2. **Offline-First:** Os IDs foram gerados no cliente via UUID?
3. **Persistência de Fotos:** Nenhuma foto foi salva em Base64/Blob no PostgreSQL?
4. **Cálculo de Score:** O caso de borda 100% `NA` retorna `null` ("N/A")?
5. **Commits:** A mensagem do commit está **obrigatoriamente em Português do Brasil (PT-BR)** no padrão Conventional Commits?
6. **Testes:** Os testes existentes continuam passando (`npm run test` em `apps/api`)?

