# SDD 02: Modelagem Relacional Prisma, Migrations e Seed

- **Identificador:** SDD-02
- **Fase:** Banco de Dados e Modelagem de Domínio
- **Commit Equivalente:** `973f699` (*feat(api): schema prisma, migration versionada e seed de lojas, cargos e usuarios*)
- **Status:** Implementado e Validado

---

## 1. Contexto e Requisitos

O sistema precisa suportar:
- Múltiplas lojas físicas da rede Hering com códigos de identificação próprios.
- Três perfis de usuário com prerrogativas estritas: **Administrador**, **Gerente** e **Operador**.
- Modelos de checklist dinâmicos e **versionados**, garantindo que edições de itens não corrompam auditorias anteriores (imutabilidade histórica).
- Execuções de checklist com respostas pontuadas (`C`, `NC`, `NA`).
- Planos de ação corretivos automáticos para itens não conformes (`NC`) com controle de versão otimista (`revisao`).
- Vínculo seguro de fotos locais tanto em respostas quanto em planos de ação.

---

## 2. Decisões Arquiteturais e de Modelagem

### 2.1 Esquema Relacional (`schema.prisma`)
O banco de dados PostgreSQL foi modelado com as seguintes entidades normalizadas:

1. **`Lojas` (`lojas`):** Código da loja (`LJ-001`, `LJ-002`), nome fantasia, cidade e UF.
2. **`Cargos` (`cargos`):** Perfis de segurança pré-definidos (`Administrador`, `Gerente`, `Operador`).
3. **`Usuarios` (`usuarios`):** Nome, e-mail corporativo único, hash de senha (`bcrypt`) e vínculo opcional a uma loja física (`loja_id` nulo para administradores globais).
4. **`ModelosChecklist` (`modelos_checklist`):** Título, descrição, cargo mínimo autorizado e status ativo/inativo.
5. **`VersoesModelo` (`versoes_modelo`):** Número sequencial de versão (`versao`), vínculo ao modelo e relação de composição com itens.
6. **`ItensChecklist` (`itens_checklist`):** Texto descritivo, peso de conformidade (1 a 5), flag `obrigatorio` e ordem de exibição.
7. **`Execucoes` (`execucoes`):** Identificador UUID gerado pelo cliente, status (`RASCUNHO`, `FINALIZADA`), score calculado (0 a 100 ou null), timestamps de início/fim e vínculo com a versão específica do modelo.
8. **`Respostas` (`respostas`):** Vínculo à execução e item, status de conformidade (`C`, `NC`, `NA`) e texto de observação opcional.
9. **`PlanosAcao` (`planos_acao`):** Criados automaticamente para `NC`, status (`ABERTO`, `EM_ANDAMENTO`, `CONCLUIDO`), prazo (default 48h), responsável e controle otimista de concorrência (`revisao Int @default(1)`).
10. **`Fotos` (`fotos`):** Metadados de arquivos físicos armazenados em disco (chave relativa, mime type, tamanho em bytes). Não há Base64 no banco.

### 2.2 Integridade Referencial e Exclusões em Cascata
Configuração explícita de `onDelete: Cascade` nas relações de execução para garantir que a exclusão de uma execução limpe atômica e confiavelmente suas respostas, planos de ação e fotos associadas.

### 2.3 Dados Demonstrativos Reproduzíveis (`seed.ts`)
O script de seed (`apps/api/prisma/seed.ts`) implementa upsert idempotente para inicializar o ambiente com:
- **Cargos:** Administrador, Gerente, Operador.
- **Lojas:**
  - `LJ-001` — Hering Blumenau Centro (SC)
  - `LJ-002` — Hering São Paulo Paulista (SP)
- **Usuários de Teste (Senha: `hering123`):**
  - `admin@hering.com.br` (Administrador Global)
  - `gerente.blumenau@hering.com.br` (Gerente LJ-001)
  - `operador.blumenau@hering.com.br` (Operador LJ-001)
  - `gerente.paulista@hering.com.br` (Gerente LJ-002)
- **Modelos de Checklist com Versão Inicial (v1):**
  - *Checklist de Abertura de Loja* (5 itens com pesos diferenciados, autorizado para Operador).
  - *Auditoria de Fechamento e Segurança* (4 itens de alta criticidade, autorizado para Gerente).

---

## 3. Validação e Execução

- Gerar cliente Prisma:
  ```bash
  cd apps/api && npx prisma generate
  ```
- Aplicar migrações versionadas:
  ```bash
  npx prisma migrate dev
  ```
- Popular banco com seed:
  ```bash
  npx prisma db seed
  ```
