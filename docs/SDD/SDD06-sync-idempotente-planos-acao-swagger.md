# SDD 06: Sincronização Idempotente, Planos de Ação e OpenAPI

- **Identificador:** SDD-06
- **Fase:** API REST, Concorrência e Especificação OpenAPI
- **Commit Equivalente:** `f5d17d8` (*feat(api): sincronizacao idempotente, planos de acao 409, storage de fotos e swagger*)
- **Status:** Implementado e Testado

---

## 1. Contexto e Requisitos

Em aplicações Offline-First de alta disponibilidade para varejo físico, conexões instáveis provocam reenvios involuntários de requisições de rede (retries do cliente, instabilidade do Wi-Fi na loja).

O sistema precisa garantir:
1. **Idempotência no Servidor:** O reenvio da mesma execução com os mesmos UUIDs não pode gerar duplicidades no banco nem recalcular scores desnecessariamente.
2. **Resolução de Conflitos em Planos de Ação:** O plano de ação possui múltiplos atores (Gerente na loja e Administrador na matriz). Deve-se aplicar controle de concorrência otimista com versionamento (`revisao`). Modificações concorrentes baseadas em versão desatualizada devem ser rejeitadas com status `409 Conflict`.
3. **Automação de Não Conformidades:** Toda resposta `NC` deve gerar automaticamente um plano de ação preventivo com prazo de 48h e exigir foto de evidência.
4. **Documentação Viva:** Disponibilização da especificação OpenAPI 3.0 interativa (Swagger UI).

---

## 2. Decisões Arquiteturais e Implementação

### 2.1 Endpoint de Sincronização Atômica (`POST /api/v1/execucoes/sync`)
- O payload de sincronização recebe o pacote completo gerado no IndexedDB do cliente (UUID da execução, respostas, itens e fotos vinculadas).
- **Transação Atômica com Upsert Idempotente no Prisma:**
  ```typescript
  return prisma.$transaction(async (tx) => {
    // 1. Verifica existência prévia
    const execExistente = await tx.execucoes.findUnique({ where: { id: payload.id } });
    
    // Se já finalizada e reenviada, retorna com segurança sem duplicar
    if (execExistente && execExistente.status === 'FINALIZADA') {
      return execExistente;
    }
    
    // 2. Calcula Score pelo motor oficial
    const resultadoCalculo = ScoreCalculator.calcular(itens);
    
    // 3. Upsert da Execução e Respostas
    // 4. Criação automática de Planos de Ação para respostas 'NC'
  });
  ```

### 2.2 Concorrência Otimista em Planos de Ação (`PUT /api/v1/planos-acao/:id`)
- O modelo do banco possui o campo inteiro `revisao` (inicia em `1`).
- O cliente envia na atualização o payload `{ status, acaoTomada, revisao: 1 }`.
- O servidor valida atômica e estritamente:
  ```typescript
  if (planoAtual.revisao !== dados.revisao) {
    throw new ConflictError(
      `Conflito de versão no plano de ação. A revisão atual no servidor é ${planoAtual.revisao}, mas você enviou ${dados.revisao}. Atualize os dados antes de reenviar.`
    );
  }
  ```
- Ao persistir com sucesso, incrementa `revisao: planoAtual.revisao + 1`.
- Caso o plano seja marcado como `CONCLUIDO`, exige obrigatoriamente que exista ao menos 1 foto de evidência corretiva vinculada.

### 2.3 Documentação OpenAPI 3.0 e Swagger UI
- Configuração de `swagger-jsdoc` e `swagger-ui-express`.
- Schemas estruturados para `Usuario`, `ExecucaoSyncInput`, `PlanoAcao`, `Foto`.
- Rotas documentadas com códigos de retorno padrão REST: `200`, `201`, `400`, `401`, `403`, `404`, `409 Conflict`.
- Disponibilizado nos endpoints:
  - `/api/v1/docs`
  - `/api/docs`
  - `/docs`

---

## 3. Validação

- Validação rigorosa dos schemas via biblioteca **Zod** antes de atingir os serviços.
- Testes cobrindo detecção de 409 em edições simultâneas de planos de ação.
