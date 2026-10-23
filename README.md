# Hering Checklist Operacional — PWA Offline-First

Sistema completo de auditorias e checklists operacionais para redes de lojas, com suporte integral a operação **Offline-First**, sincronização idempotente, versionamento imutável de modelos, geração automática de planos de ação corretivos e armazenamento de fotos em disco local.

---

## 1. Visão Geral e Funcionalidades

O sistema foi desenvolvido para atender às rotinas diárias de lojas da rede (abertura, fechamento, limpeza, segurança e exposição de produtos), permitindo que operadores e gerentes realizem vistorias com seus dispositivos móveis, mesmo em locais sem qualquer conectividade de rede (subsolos, estoques, áreas isoladas).

### Funcionalidades Centrais
- **Autenticação e Perfis (RBAC):** Administrador, Gerente de Loja e Operador, com isolamento multi-loja estrito garantido no backend.
- **Operação Offline-First:** Execução de checklists sem internet com persistência em IndexedDB (Dexie), incluindo Blobs binários de fotos e planos de ação.
- **Sincronização Idempotente:** UUIDs gerados no cliente, transações atômicas no PostgreSQL e envio em duas fases (metadados estruturados + upload binário de mídias), tolerando reenvios e falhas de rede sem duplicar dados.
- **Fotos em Disco Local:** Abstração `StorageService` (`LocalDiskStorage`) gravando em `./data/uploads` no host e `/app/storage/uploads` no container via volume persistente, com proteção contra Path Traversal e download autenticado restrito por loja.
- **Planos de Ação Automáticos:** Toda Não Conformidade (`NC`) gera automaticamente um plano de ação (prazo 48h, gerente como responsável padrão). Conclusão de plano exige foto de evidência corretiva.
- **Versionamento Imutável de Modelos (RD01):** Alterações em modelos geram novas versões incrementais, preservando snapshots históricos em execuções passadas.
- **Pontuação Ponderada (RD03):** Conformidade proporcional calculada com pesos por item e exclusão correta de itens `NA` (Não se aplica).
- **Painel Gerencial (RD02):** Ranking de lojas por conformidade e acompanhamento de planos de ação abertos e atrasados.
- **Exportação de Relatórios (RD06):** Impressão e exportação PDF formatada de checklists finalizados.

---

## 2. Stack Tecnológica e Justificativas

| Tecnologia | Função no Sistema | Justificativa Técnica |
|---|---|---|
| **Next.js 14 (App Router)** | Frontend PWA | Arquitetura moderna de componentes, renderização otimizada, TypeScript estrito e suporte comprovado a PWA. |
| **Tailwind CSS** | Estilização Mobile-First | Interface responsiva rápida, acessível e otimizada para uso em smartphones nas lojas. |
| **Dexie (IndexedDB)** | Persistência Cliente | Transações robustas no navegador, consultas indexadas e capacidade de armazenar Blobs binários de fotos sem os limites rígidos do `localStorage`. |
| **Express + TypeScript** | Backend REST API | Controle fino de middlewares de segurança, streaming eficiente de fotos e tipagem estrita de ponta a ponta. |
| **PostgreSQL 16** | Banco de Dados Relacional | Fonte da verdade (`source of truth`), restrições únicas (`UNIQUE`) para prevenção de duplicatas e suporte a transações ACID. |
| **Prisma ORM** | Mapeamento Relacional | Migrações versionadas declarativas, seed reproduzível e tipagem automatizada compatível com TypeScript. |
| **Zod** | Validação de Dados | Validação consistente de payloads no backend e no frontend com mensagens de erro claras. |
| **Swagger / OpenAPI 3.0** | Documentação Viva da API | Contrato REST documentado interativamente em `/api/docs`. |
| **Vitest + Supertest** | Suíte de Testes | Execução veloz de testes unitários e testes de integração com banco de dados real. |

---

## 3. Arquitetura e Fluxo de Dados

```text
[ SmartPhone / PWA ] ──── (Offline: IndexedDB / Dexie)
         │
         ▼ (Sincronização Idempotente em 2 Fases)
[ API REST Express ] ──── (Prisma ORM) ──── [ PostgreSQL 16 ]
         │
         ▼ (LocalDiskStorage)
[ Disco Local: data/uploads ]
```

---

## 4. Pré-requisitos e Inicialização

### Opção A: Execução via Docker Compose (Recomendada)
Requisitos: Docker e Docker Compose instalados.

```bash
# 1. Clonar o repositório e entrar na pasta
cd hering

# 2. Configurar o arquivo de variáveis de ambiente
cp .env.example .env

# 3. Subir todos os serviços com build
docker compose up --build
```
> Os serviços `postgres`, `api` e `web` serão iniciados automaticamente. A API executará as migrações e o seed do banco de dados na inicialização.

### Opção B: Execução Local no Host
Requisitos: Node.js 20+ e PostgreSQL rodando localmente na porta 5432.

```bash
# 1. Instalar dependências em todo o monorepo
npm install

# 2. Configurar o .env (verifique se DATABASE_URL aponta para seu Postgres local)
cp .env.example .env
cp .env apps/api/.env

# 3. Sincronizar o banco de dados e rodar o seed
npm run db:migrate
npm run db:seed

# 4. Executar os serviços em modo de desenvolvimento
npm run dev
```

---

## 5. Comandos de Validação e Testes

```bash
# Executar todos os testes automatizados (unitários e de integração)
npm test

# Executar apenas testes da API
npm run test:api

# Executar checagem estrita de tipos TypeScript
npm run typecheck

# Gerar build de produção de todos os workspaces
npm run build
```

---

## 6. URLs Locais Úteis

- **Frontend / PWA:** [http://localhost:3000](http://localhost:3000)
- **API Backend:** [http://localhost:3001/api/v1](http://localhost:3001/api/v1)
- **Documentação Swagger (OpenAPI):** [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **Healthcheck:** [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)

---

## 7. Usuários e Senhas de Demonstração (Seed)

> **Aviso de Segurança:** Estas credenciais são exclusivas para o ambiente local de testes e demonstração.

| Perfil | E-mail | Senha | Loja / Escopo |
|---|---|---|---|
| **Administrador** | `admin@hering.com.br` | `AdminPassword123!` | Global (Todas as lojas) |
| **Gerente** | `gerente.blumenau@hering.com.br` | `GerentePassword123!` | Hering Blumenau Centro (`LJ-001`) |
| **Operador** | `operador.blumenau@hering.com.br` | `OperadorPassword123!` | Hering Blumenau Centro (`LJ-001`) |
| **Gerente** | `gerente.paulista@hering.com.br` | `GerentePassword123!` | Hering São Paulo Paulista (`LJ-002`) |
| **Operador** | `operador.paulista@hering.com.br` | `OperadorPassword123!` | Hering São Paulo Paulista (`LJ-002`) |

*Dica: Na tela de login existem botões de atalho que preenchem as credenciais com um único clique.*

---

## 8. Regras de Negócio Centrais

### 8.1 Sincronização Idempotente e Política de Conflitos
- **UUIDs Gerados no Cliente:** Identificadores estáveis gerados antes do envio evitam duplicações ao tentar sincronizar novamente.
- **Fluxo em Duas Etapas:**
  1. Primeiro envia metadados estruturados (execuções, respostas, planos e metadados de fotos).
  2. Depois envia os arquivos binários das fotos para `POST /api/v1/fotos/upload`.
  3. Marca no IndexedDB como totalmente sincronizado apenas após confirmação de ambos os passos pelo servidor.
- **Detecção de Conflitos (HTTP 409 Conflict):**
  - Cada plano possui um campo `revisao`.
  - O cliente envia a revisão que leu (`revisaoEsperada`).
  - Se a revisão no servidor for divergente, a API rejeita com `409 Conflict`, devolve o estado atualizado do servidor e a interface permite ao usuário recarregar os dados.

### 8.2 Cálculo de Pontuação e Regras de Itens (RF07 e RD03)
- **Fórmula:** `(soma dos pesos dos itens C) / (soma dos pesos dos itens C e NC) * 100`.
- **Não se Aplica (NA):** Não entra no numerador nem no denominador.
- **Denominador Zero:** Se todos os itens forem `NA`, o score é `null` (exibido como `"N/A"` claramente, nunca 100% artificial).
- **Itens Obrigatórios:** Não respondidos bloqueiam a finalização da execução.
- **Não Conformidade (NC):** Exige foto obrigatória e gera automaticamente um plano de ação (responsável: Gerente da loja, prazo: 48h).

### 8.3 Armazenamento de Fotos e Segurança
- **Disco Local Exclusivo:** As fotos são gravadas em `./data/uploads` no host (`/app/storage/uploads` no container). O PostgreSQL armazena apenas metadados.
- **Proteção Anti-Path Traversal:** Sanitização e verificação de limites do diretório raiz.
- **Download Autenticado:** O endpoint `GET /api/v1/fotos/:id` valida se o usuário solicitante pertence à mesma loja da execução/plano, retornando `403 Forbidden` em tentativas de acesso indevido.

---

## 9. Como Demonstrar o Cenário Offline no Celular e Limitações

### Demonstração no Computador Local (Simulação Fiel)
1. Abra o Chrome/Edge em `http://localhost:3000`.
2. Faça login com o **Operador Blumenau** (os modelos serão cacheados no IndexedDB).
3. Abra as Ferramentas do Desenvolvedor (F12) -> aba **Network** -> altere para **Offline**.
4. Observe o indicador de conexão mudar para **Offline** (laranja).
5. Inicie o checklist, responda os itens, aponte um item `NC`, tire/anexe uma foto e finalize o checklist.
6. O checklist será salvo localmente com status de sincronização **"1 pendente"**.
7. Na aba Network, volte para **Online**.
8. O `SyncEngine` detecta a reconexão e sincroniza automaticamente os dados e as fotos, atualizando o status para **"Sincronizado"** (verde).

### Demonstração em Smartphone Físico
> **Atenção:** Service Workers e PWAs exigem **Contexto Seguro (HTTPS)**, com exceção de `localhost`.
- Se você acessar via IP da rede local (ex: `http://192.168.1.50:3000`), a maioria dos navegadores móveis desabilita o Service Worker por segurança (HTTP inseguro).
- Para testar com suporte PWA offline em um celular real conectado na mesma rede:
  1. Utilize uma ferramenta de túnel HTTPS como `ngrok` ou `cloudflared` (ex: `ngrok http 3000`); ou
  2. Conecte o celular via cabo USB e utilize o **Port Forwarding** do Chrome DevTools (`chrome://inspect`) mapeando a porta 3000 para `localhost:3000` no celular. Dessa forma, o celular acessa via `http://localhost:3000` e o navegador reconhece o contexto como seguro.

---

## 10. Status dos Diferenciais e Limitações Conhecidas

### Diferenciais Concluídos
- [x] **RD01 — Versionamento de modelos:** Arquitetura central com modelos, versões imutáveis e snapshots históricos nas respostas.
- [x] **RD03 — Peso por item:** Pesos customizáveis por item e cálculo proporcional validado por testes.
- [x] **RD02 — Painel gerencial:** Ranking de lojas por média de conformidade, contagem de planos abertos e atrasados.
- [x] **RD04 — Compressão de fotos no cliente:** Redução proporcional via Canvas para no máximo 1600px e JPEG 0.8 antes da persistência local.
- [x] **RD06 — Exportação PDF:** Relatório limpo de checklist via media print.

### Diferenciais Não Implementados
- [ ] **RD05 — Notificações de prazo:** Não implementado para evitar simulações superficiais de Web Push em segundo plano, mantendo o foco na robustez da sincronização offline.

---

## 11. Guia de Apresentação Técnica

Consulte o documento detalhado em [docs/GUIA_APRESENTACAO_TECNICA.md](docs/GUIA_APRESENTACAO_TECNICA.md) com:
- Análise aprofundada da arquitetura e responsabilidades de cada camada;
- Justificativa e mapeamento de todos os índices SQL criados;
- Respostas diretas e fundamentadas às 3 perguntas técnicas do desafio;
- Roteiro de apresentação de 15 minutos passo a passo.

