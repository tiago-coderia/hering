# SDD 11: Deploy em Produção, Resolução Dinâmica de Rede e Refinamentos Finais

- **Identificador:** SDD-11
- **Fase:** DevOps, Deploy em Produção (Easypanel) e Refinamentos de UX
- **Commits Equivalentes:** `e8ebf73` até `dcead61`
- **Status:** Implementado, Deployed e em Produção

---

## 1. Contexto e Desafios de Produção

Após a conclusão dos desenvolvimentos e testes locais, o projeto foi implantado em ambiente de produção público no servidor Cloud com **Easypanel / Docker / PostgreSQL**, acessível pelos domínios:
- **PWA (Frontend):** `https://pwa.coderia.dev`
- **API (Backend):** `https://api.coderia.dev`
- **Banco de Dados:** PostgreSQL dedicado na porta `5432` (`checklist_db`)

Durante o processo de implantação e testes em rede pública e smartphones reais, surgiram cenários práticos de conectividade, CORS, autenticação de mídias e usabilidade que exigiram refinamentos arquiteturais.

---

## 2. Decisões Arquiteturais e Correções Aplicadas

### 2.1 Resolução Dinâmica de URL da API no Frontend (`apps/web/src/lib/api.ts`)
- **Problema:** Em compilações de produção do Next.js, variáveis com prefixo `NEXT_PUBLIC_` são fixadas em tempo de build. Caso o aplicativo seja acessado via túneis de desenvolvimento (`devtunnels.ms`), IP local ou domínio de produção (`coderia.dev`), requisições para `localhost:3001` falhavam no navegador do usuário.
- **Solução Implementada:** O método [`getApiBaseUrl()`](file:///p:/09.%20Testes/hering/apps/web/src/lib/api.ts) inspeciona dinamicamente `window.location.hostname`:
  - Se contiver `coderia.dev`, direciona automaticamente para `https://api.coderia.dev/api/v1`.
  - Se contiver portas de túnel (`-3000.`), converte transparentemente para `-3001.`.
  - Caso contrário, utiliza o fallback configurado ou `localhost:3001`.

### 2.2 Autenticação de Fotos em Tags `<img>` (`authMiddleware.ts`)
- **Problema:** Ao renderizar fotos de evidência em relatórios no navegador via tags HTML `<img src="..." />`, o browser não anexa o cabeçalho `Authorization: Bearer <token>`. A API retornava `401 Unauthorized`.
- **Solução Implementada:** O middleware [`authenticateToken`](file:///p:/09.%20Testes/hering/apps/api/src/middlewares/authMiddleware.ts) foi aprimorado para aceitar tokens JWT passados via query parameter (`req.query.token`), mantendo todas as verificações de assinatura e isolamento de loja (RBAC) intactas.

### 2.3 Refinamento de UX no Logout e Navbar (`Navbar.tsx` e `page.tsx`)
- **Problema:** Existência de botão redundante "Trocar Usuário" no corpo da página e persistência visual transitória da barra superior (Navbar) ao deslogar.
- **Soluções Implementadas:**
  - Remoção do botão secundário em favor do botão oficial de Logout na Navbar.
  - Adição de guarda explícita de rota com `usePathname()`, zeramento imediato de estado local e disparo de evento `storage`, garantindo que a barra superior suma instantaneamente ao clicar em sair.

### 2.4 Mapeamento de Rotas Swagger / OpenAPI (`app.ts`)
- **Ajuste:** Para acomodar diferentes convenções de proxy reverso e acesso direto de desenvolvedores, o Swagger UI foi disponibilizado simultaneamente em `/api/v1/docs`, `/api/docs` e `/docs`.

### 2.5 Regra Geral de Commits em Português do Brasil (PT-BR)
- Formalização no [AGENTS.md](file:///p:/09.%20Testes/hering/AGENTS.md) da diretriz estrita de que todos os commits do repositório devem ser gerados em Português do Brasil seguindo o padrão Conventional Commits.

---

## 3. URLs do Ambiente de Produção

- **Frontend PWA:** [https://pwa.coderia.dev](https://pwa.coderia.dev)
- **API Healthcheck:** [https://api.coderia.dev/api/v1/health](https://api.coderia.dev/api/v1/health)
- **Documentação Interativa Swagger:** [https://api.coderia.dev/api/v1/docs](https://api.coderia.dev/api/v1/docs)

