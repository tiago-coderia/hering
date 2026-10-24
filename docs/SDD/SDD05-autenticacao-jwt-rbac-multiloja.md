# SDD 05: Autenticação JWT, Controle RBAC e Isolamento Multi-Loja

- **Identificador:** SDD-05
- **Fase:** Segurança, Controle de Acesso e Isolamento de Dados
- **Commit Equivalente:** `1e224a7` (*feat(api): autenticacao JWT, middlewares de autorizacao RBAC e isolamento multi-loja*)
- **Status:** Implementado e Testado

---

## 1. Contexto e Requisitos de Segurança

1. **Backend como Autoridade Inviolável:** Ocultar botões ou rotas no frontend nunca substitui as validações de perfil e loja em cada endpoint da API.
2. **Matriz de Cargos e Responsabilidades (RBAC):**
   - **`Administrador`:** Escopo global (`lojaId` nulo). Pode gerenciar modelos, visualizar rankings de todas as lojas, inspecionar qualquer execução e plano de ação.
   - **`Gerente`:** Restrito estritamente aos dados e execuções da sua própria loja. Pode visualizar relatórios da loja e concluir planos de ação corretivos com foto de evidência.
   - **`Operador`:** Restrito à sua loja física e aos modelos de checklist explicitamente autorizados para o cargo. Executa checklists e envia respostas/fotos.
3. **Isolamento de Dados e Mídias:**
   - Nenhuma foto é servida por pasta pública estática.
   - O endpoint de recuperação de fotos valida se o solicitante pertence à mesma loja da foto vinculada (ou é Administrador). Acesso cruzado entre lojas retorna `403 Forbidden`.

---

## 2. Decisões Arquiteturais e Implementação

### 2.1 Autenticação Stateless com JWT (`authRoutes.ts`)
- **Login:** Recebe `email` e `senha`, busca usuário ativo, compara hash via `bcrypt.compare`.
- **Payload JWT:**
  ```json
  {
    "id": "uuid-do-usuario",
    "nome": "Ana Operadora Blumenau",
    "email": "operador.blumenau@hering.com.br",
    "cargo": "Operador",
    "lojaId": "uuid-loja-blumenau"
  }
  ```
- Assinado com segredo `JWT_SECRET` com validade de 7 dias, permitindo operação fluida mesmo em turnos prolongados com conectividade intermitente.

### 2.2 Middlewares de Segurança (`authMiddleware.ts`)
- **`authenticateToken`:**
  - Extrai token do header `Authorization: Bearer <token>`, de cookies ou do query parameter `?token=...` (fundamental para tags HTML `<img>` que não injetam headers personalizados).
  - Valida assinatura criptográfica e injeta o objeto decodificado em `req.user`.
- **`requireRole(...roles)`:**
  - Valida se `req.user.cargo` pertence à lista autorizada para a rota. Em caso negativo, retorna `403 Forbidden`.

### 2.3 Regras de Isolamento Multi-Loja nos Serviços
Nos serviços (`ChecklistService`, `PhotoService`, `ActionPlanService`, `DashboardService`), todas as consultas e mutações aplicam escopo mandatário:
```typescript
if (user.cargo !== 'Administrador') {
  if (execucao.lojaId !== user.lojaId) {
    throw new ForbiddenError('Acesso negado: você não tem permissão para acessar dados de outra loja');
  }
}
```

---

## 3. Validação e Testes

A segurança foi validada através de testes automatizados de integração que simulam:
- Tentativa de acesso a rotas protegidas sem token (`401 Unauthorized`).
- Operador tentando criar/editar modelos de checklist (`403 Forbidden`).
- Gerente da Loja Blumenau tentando ler execuções ou fotos da Loja São Paulo (`403 Forbidden`).
- Administrador acessando métricas e relatórios globais com sucesso (`200 OK`).
