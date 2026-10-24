# SDD 07: Testes Automatizados de Integração End-to-End da API

- **Identificador:** SDD-07
- **Fase:** Qualidade de Software e Testabilidade
- **Commit Equivalente:** `bacf29b` (*test(api): testes de integracao de ponta a ponta para api, seguranca, idempotencia e conflitos*)
- **Status:** Implementado e 100% Aprovado (28/28 testes)

---

## 1. Contexto e Requisitos

Para assegurar confiabilidade de nível corporativo antes do desenvolvimento da interface web, foi estabelecida uma suíte de testes de integração ponta a ponta (`integration.test.ts`) executada contra o banco de dados real.

A suíte deve comprovar de forma automatizada e reproduzível:
1. Autenticação e geração de tokens para todos os papéis.
2. Criação e versionamento imutável de modelos de checklist pelo Administrador.
3. Bloqueio de mutação de modelos por Operadores e Gerentes.
4. Sincronização atômica de checklist com cálculo de score.
5. Idempotência em retries de sincronização (mesmo payload não duplica registros).
6. Criação automática de planos de ação para itens `NC`.
7. Controle de concorrência com rejeição `409 Conflict` em revisões desatualizadas.
8. Upload binário de fotos de respostas e fotos de conclusão de plano de ação.
9. Isolamento multi-loja em fotos e endpoints (rejeição `403 Forbidden` para lojas cruzadas).

---

## 2. Estrutura da Bateria de Testes (`apps/api/src/tests/`)

### 2.1 Cenários de Teste Implementados
- **Testes Unitários:**
  - `scoreCalculator.test.ts`: 7 testes cobrindo fórmulas, pesos, NA e denominador zero.
  - `localStorage.test.ts`: 5 testes cobrindo I/O, streaming e mitigação de Path Traversal.
- **Testes de Integração E2E (`integration.test.ts` - 16 cenários):**
  - **Fluxo 1: Autenticação & RBAC:**
    - Login de Admin, Gerente e Operador.
    - Tentativa de acesso sem token -> `401 Unauthorized`.
  - **Fluxo 2: Modelos & Versionamento:**
    - Admin cria modelo e publica nova versão -> `201 Created`.
    - Operador tenta criar modelo -> `403 Forbidden`.
  - **Fluxo 3: Sincronização & Regras de Negócio:**
    - Operador envia checklist com itens `C`, `NC` e `NA`.
    - Validação de que item `NC` exige metadados de foto associada.
    - Persistência e cálculo de score conforme a fórmula oficial.
  - **Fluxo 4: Idempotência de Rede:**
    - Reenvio exato da mesma execução sincronizada -> `200 OK` (sem duplicidade no banco).
  - **Fluxo 5: Planos de Ação & Conflito 409:**
    - Verificação de plano gerado automaticamente com status `ABERTO`.
    - Concorrência simulada: envio de atualização com `revisao: 1` passa; segundo envio concorrente com `revisao: 1` retorna `409 Conflict`.
  - **Fluxo 6: Upload Binário de Mídias e Segurança Multi-Loja:**
    - Upload multipart/form-data de foto JPG real via buffer.
    - Gerente da loja dona da foto faz download -> `200 OK`.
    - Gerente de outra loja física tenta baixar a foto -> `403 Forbidden`.

---

## 3. Como Executar os Testes

```bash
cd apps/api
npm run test
```

**Resultado:**
```
✓ src/tests/scoreCalculator.test.ts (7)
✓ src/tests/localStorage.test.ts (5)
✓ src/tests/integration.test.ts (16)

Test Files  3 passed (3)
     Tests  28 passed (28)
```

