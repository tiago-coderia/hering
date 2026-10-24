# Índice Geral de Documentos de Arquitetura e Decisão (SDD / ADR)

Este diretório contém a especificação cronológica e detalhada de engenharia, arquitetura e decisões de design aplicadas na construção do **App de Checklist Operacional PWA** (Desafio Hering).

A sigla **SDD** (*Software Design Document* ou *System Design Document*), alinhada com as práticas modernas de **ADR** (*Architecture Decision Record*), documenta não apenas *o que* foi feito, mas *por que* foi feito, requisitos do desafio atendidos, detalhes de código e evolução contínua da base de código.

---

## 🗺️ Mapa da Documentação Cronológica

| Documento | Fase / Escopo | Commit Equivalente | Resumo das Entregas e Decisões |
|---|---|---|---|
| [SDD01-setup-monorepo-workspaces.md](./SDD01-setup-monorepo-workspaces.md) | Fundação & Infra | `ec86958` | Setup do monorepo npm workspaces (`apps/api`, `apps/web`), docker-compose e variáveis de ambiente. |
| [SDD02-modelagem-prisma-seed.md](./SDD02-modelagem-prisma-seed.md) | Banco & Domínio | `973f699` | Modelagem relacional PostgreSQL via Prisma ORM, migrations, integridade referencial e seed demonstrativo. |
| [SDD03-storage-fotos-local.md](./SDD03-storage-fotos-local.md) | Mídia & I/O | `4c15dea` | Implementação do `LocalDiskStorage`, proibição de blobs no banco, proteção anti-path-traversal e testes unitários. |
| [SDD04-motor-calculo-score.md](./SDD04-motor-calculo-score.md) | Regra de Negócio | `aed39f3` | Implementação de `ScoreCalculator`, ponderação por pesos, desconsideração de `NA`, caso de borda 100% `NA` (`null`) e testes. |
| [SDD05-autenticacao-jwt-rbac-multiloja.md](./SDD05-autenticacao-jwt-rbac-multiloja.md) | Segurança | `1e224a7` | Autenticação stateless JWT, controle de acesso baseado em cargos (RBAC) e isolamento multi-loja no backend. |
| [SDD06-sync-idempotente-planos-acao-swagger.md](./SDD06-sync-idempotente-planos-acao-swagger.md) | API & Sincronização | `f5d17d8` | Endpoint `POST /api/v1/execucoes/sync`, idempotência no banco, conflito otimista `409` em planos e OpenAPI/Swagger. |
| [SDD07-testes-integracao-e2e-api.md](./SDD07-testes-integracao-e2e-api.md) | Qualidade & Testes | `bacf29b` | Bateria de testes de integração com Vitest e Supertest cobrindo fluxos felizes, RBAC, 409 e idempotência. |
| [SDD08-pwa-service-worker-indexeddb.md](./SDD08-pwa-service-worker-indexeddb.md) | Frontend Offline | `35e482b` | Service Worker com Cache API, manifest PWA, tema oficial Hering e persistência local client-side com Dexie. |
| [SDD09-sync-engine-compressao-fotos-ui.md](./SDD09-sync-engine-compressao-fotos-ui.md) | Sincronização Mobile | `b9cb7d8` | Motor `SyncEngine` com upload em 2 fases, compressão de imagens no browser com canvas (RD04) e badge de status. |
| [SDD10-telas-pwa-dashboard-modelos.md](./SDD10-telas-pwa-dashboard-modelos.md) | Aplicação Web | `3e296f2` | Login rápido com seed, dashboard gerencial com ranking (RD02), execução passo a passo e gestão de modelos. |
| [SDD11-deploy-producao-ajustes-finais.md](./SDD11-deploy-producao-ajustes-finais.md) | Deploy & Refinamento | `e8ebf73` a `dcead61` | Deploy no Easypanel com Docker, resolução dinâmica de URLs, ajustes de rotas Swagger e refinamento de UX. |

---

## 🤖 Contexto para Agentes de IA e LLMs

Se você for uma LLM ou agente autônomo trabalhando neste projeto:
1. **Consulte sempre o arquivo [`CONTEXT_AGENT.md`](../CONTEXT_AGENT.md) na raiz do projeto.**
2. **Respeite as regras arquiteturais fixadas em [`AGENTS.md`](../AGENTS.md).**
3. **Mantenha obrigatoriamente todas as mensagens de commit em Português do Brasil (PT-BR).**
4. **Priorize a autoridade de segurança do Backend (`apps/api`) e o modelo 100% Offline-First no Frontend (`apps/web`).**
