# SDD 12: Estratégia e Implementação de Testes E2E com Playwright

- **Identificador:** SDD-12
- **Fase:** Qualidade de Software, Testes End-to-End (E2E) e Automação PWA
- **Status:** Implementado e Validado (14/14 testes passando)
- **Escopo:** Frontend (`apps/web`), Integração API (`apps/api`) e Simulação Offline/PWA

---

## 1. Motivação e Objetivos

O **App de Checklist Operacional PWA** possui características arquiteturais críticas:
1. **Comportamento 100% Offline-First:** Persistência em IndexedDB (Dexie) e sincronização idempotente via SyncEngine em 2 fases.
2. **Isolamento de Segurança (RBAC) e Multi-Loja:** Perfis `Administrador`, `Gerente` e `Operador` com escopos restritos.
3. **Regras de Negócio Estritas:** Validação obrigatória de fotos em não conformidades (`NC`), cálculo de score ponderado (com caso de borda 100% `NA` retornando `null` / `"N/A"`) e criação automática de planos de ação.
4. **Resolução de Planos de Ação:** Concorrência otimista via campo `revisao` (`409 Conflict`) e evidência fotográfica obrigatória.

Para garantir que essas premissas continuem íntegras sem regressão, adotamos o **Playwright** como framework oficial de testes E2E.

---

## 2. Por que Playwright em vez de Cypress?

- **Emulação Offline Nativa:** Permite ligar e desligar a rede programaticamente no mesmo teste através de `context.setOffline(true/false)`.
- **Suporte Completo a PWA / Service Workers:** Inspeção de Service Worker e IndexedDB sem restrições de mesma origem.
- **Emulação Mobile Fiel:** Suporte a emulação de dispositivos reais (ex: Pixel 5, iPhone 13) com simulação de toque e viewport móvel.
- **Velocidade e Isolamento:** Execução paralela em múltiplos navegadores com baixo consumo de memória e total suporte a TypeScript.

---

## 3. Matriz de Cenários de Teste

| ID | Cenário | Descrição / Critérios de Aceite |
|---|---|---|
| **E2E-01** | **Autenticação e Perfis (RBAC)** | Valida login rápido e manual com credenciais de Administrador, Gerente e Operador. Garante visibilidade das rotas adequadas (ex.: menu Admin apenas para Administrador). |
| **E2E-02** | **Cálculo de Score e Validações NC** | Preenchimento de checklist alternando respostas (`C`, `NC`, `NA`). Garante que `NC` exige foto e gera plano de ação; valida cálculo do score no painel. |
| **E2E-03** | **Fluxo 100% Offline e Sincronização** | Usuário desliga a conexão (`setOffline(true)`), preenche checklist, anexa foto mock e salva rascunho localmente no IndexedDB. Ao religar a rede (`setOffline(false)`), o SyncEngine sincroniza automaticamente com o backend. |
| **E2E-04** | **Gestão e Conclusão de Plano de Ação** | Gerente visualiza plano de ação gerado, adiciona foto de evidência corretiva e conclui com sucesso. |

---

## 4. Plano de Execução Técnica

1. **Configuração de Dependências:** Instalação do `@playwright/test` em `apps/web`.
2. **Configuração do Playwright:** Criação de `playwright.config.ts` com base URL configurada (`http://localhost:3000`), inicialização de servidores de dev e suporte a projetos Desktop Chrome e Mobile Chrome.
3. **Suporte a Fixtures e Mocks de Mídia:** Criação de utilitários para simulação de fotos em canvas/base64 para upload.
4. **Implementação dos Testes:**
   - `apps/web/e2e/auth.spec.ts`
   - `apps/web/e2e/score-rules.spec.ts`
   - `apps/web/e2e/offline-sync.spec.ts`
   - `apps/web/e2e/action-plans.spec.ts`
5. **Scripts npm:** Adição de `test:e2e` e `test:e2e:ui` nos scripts de `apps/web` e na raiz do monorepo.
6. **Documentação e Guia de Execução:** Instruções passo a passo de como rodar headless, com interface gráfica e em modo debug.

