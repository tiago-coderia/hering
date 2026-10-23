# Convenções de Arquitetura e Engenharia — AGENTS.md

Este documento define os padrões, convenções arquiteturais e diretrizes de desenvolvimento para o repositório **App de Checklist Operacional PWA**.

---

## 1. Visão Geral da Arquitetura

O sistema adota uma estrutura em monorepo com npm workspaces:
- `apps/web`: Frontend Next.js (App Router), React 18, Tailwind CSS, PWA (Service Worker + Cache API) e Dexie (IndexedDB) para operação 100% offline-first.
- `apps/api`: Backend Express em TypeScript, Prisma ORM, PostgreSQL, validação com Zod, autenticação JWT com controle de acesso baseado em cargos (RBAC) e isolamento multi-loja.
- `data/uploads`: Diretório no disco do host para fotos persistentes gerenciadas por `LocalDiskStorage`, espelhado no container em `/app/storage/uploads` via bind mount no Docker Compose.

---

## 2. Princípios de Segurança e Autorização

1. **Backend como Autoridade de Segurança:** Ocultar botões ou rotas no frontend nunca substitui as validações de perfil e escopo de loja em cada endpoint da API.
2. **Cargos e Perfis:**
   - `Administrador`: Acesso irrestrito a cadastros, lojas, usuários e modelos. `loja_id` nulo ou global.
   - `Gerente`: Restrito exclusivamente aos dados da própria loja. Conclui planos de ação da sua loja com evidência fotográfica.
   - `Operador`: Restrito à própria loja e aos modelos autorizados para o cargo. Executa checklists e envia respostas/fotos.
3. **Isolamento de Dados e Mídias:**
   - Nenhuma foto é servida por pasta pública ou URL estática aberta.
   - O endpoint `GET /api/v1/fotos/:id` valida explicitamente a permissão do usuário solicitante em relação à loja vinculada à foto.
   - Tentativa de acesso a recursos de outra loja por Gerente ou Operador retorna `403 Forbidden`.

---

## 3. Armazenamento de Fotos (LocalDiskStorage)

- **Proibição de Blobs/Base64 no Banco:** O PostgreSQL armazena apenas metadados (UUID, chave relativa, MIME type, tamanho em bytes, data de criação e vínculos).
- **Abstração StorageService:** Todas as operações de leitura, escrita e verificação passam pela interface `StorageService`, isolando o domínio do provedor físico de armazenamento.
- **Padrão de Chave / Diretórios:**
  - Respostas: `lojas/{lojaId}/execucoes/{execucaoId}/respostas/{respostaId}/{fotoId}.jpg`
  - Evidências de Plano de Ação: `lojas/{lojaId}/planos/{planoId}/evidencias/{fotoId}.jpg`
- **Mitigação de Path Traversal:** O `LocalDiskStorage` resolve o caminho absoluto e valida se o destino permanece estritamente contido no diretório raiz configurado.

---

## 4. Persistência Offline e Sincronização Idempotente

1. **UUIDs Gerados no Cliente:** Identificadores de execuções, respostas, planos de ação e fotos são gerados no dispositivo móvel antes de qualquer envio de rede.
2. **Separação de Estados:**
   - Estado de Execução: `RASCUNHO` | `FINALIZADA`
   - Estado de Sincronização Local: `PENDENTE` | `SINCRONIZANDO` | `SINCRONIZADO` | `ERRO`
3. **Ordem de Sincronização:**
   1º) Envio atômico de metadados estruturados (execução, respostas, planos e metadados de fotos).
   2º) Upload binário sequencial ou em lote dos arquivos de fotos.
   3º) Marcação durável como sincronizado no IndexedDB apenas após confirmação de ambos os passos pelo servidor.
4. **Idempotência no Servidor:** Reenvios da mesma execução com mesmos UUIDs não geram duplicidades (garantido por restrições únicas e transações de upsert idempotentes no PostgreSQL).
5. **Conflito em Planos de Ação:** Controle otimista de concorrência com o campo `revisao`. Divergência de versão retorna `409 Conflict`.

---

## 5. Regras de Pontuação (Score)

- `C` (Conforme): soma no numerador e no denominador (`peso`).
- `NC` (Não conforme): soma apenas no denominador (`peso`), gerando pontuação zero para o item.
- `NA` (Não se aplica): não entra no cálculo (nem numerador, nem denominador).
- Denominador zero (todos os itens `NA`): pontuação calculada como `null`, exibindo `"N/A"` claramente ao invés de conformidade artificial.
- Itens obrigatórios não respondidos impedem a finalização da execução.
- Toda resposta `NC` exige pelo menos 1 foto e gera automaticamente 1 plano de ação com responsável padrão (gerente da loja) e prazo de 48h.

---

## 6. Comandos e Scripts de Referência

- `npm run dev`: Executa frontend e API em modo desenvolvimento.
- `npm run test`: Executa todos os testes automatizados com Vitest.
- `npm run typecheck`: Validação estrita de tipos TypeScript sem emitir artefatos.
- `npm run db:migrate`: Aplica migrações versionadas do Prisma.
- `npm run db:seed`: Popula banco com dados demonstrativos reproduzíveis.
- `docker compose up --build`: Constrói e inicializa os containers `web`, `api` e `postgres`.

---

## 7. Convenção de Mensagens de Commit

- **Idioma Obrigatório:** Todas as mensagens de commit devem ser escritas obrigatoriamente em **Português do Brasil (PT-BR)**.
- **Padrão Conventional Commits:** `<tipo>(<escopo opcional>): <descrição em português>` (ex.: `fix(api): suportar parametro de query token no authenticateToken para visualizacao de midias`).
- **Nenhum commit deve ser gerado em inglês.**


