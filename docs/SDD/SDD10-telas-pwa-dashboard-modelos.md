# SDD 10: Interface do PWA, Dashboard Gerencial e Gestão de Modelos

- **Identificador:** SDD-10
- **Fase:** Telas da Aplicação Web e Experiência do Usuário (UX)
- **Commit Equivalente:** `3e296f2` (*feat(web): telas de login, dashboard por perfil, execucao offline-first, historico e gestao de modelos*)
- **Status:** Implementado e Validado

---

## 1. Contexto e Requisitos

A interface do usuário do PWA precisa oferecer uma experiência intuitiva, moderna e adaptada para uso tanto em smartphones de operadores em piso de loja quanto em tablets/desktops de gerentes e administradores:
1. **Tela de Autenticação Ágil:** Login simples com botões de atalho das contas pré-configuradas do seed para facilitar testes e demonstrações rápidas.
2. **Dashboard Gerencial (Requisito Diferencial RD02):**
   - Visão consolidada de indicadores-chave: total de execuções concluídas, planos de ação abertos e planos atrasados (>48h).
   - Tabela comparativa de **Ranking de Conformidade Média por Loja**, permitindo aos diretores e gerentes identificar rapidamente lojas que necessitam de intervenção ou suporte.
3. **Tela de Execução do Checklist:**
   - Interface com botões grandes e acessíveis de conformidade: **Conforme (C)**, **Não Conforme (NC)** e **Não se Aplica (NA)**.
   - Ao marcar `NC`, o sistema exibe dinamicamente o alerta de criação automática de plano de ação e exige ao menos uma foto comprobatória antes de permitir a conclusão.
4. **Histórico Detalhado:** Listagem e visualização completa de execuções passadas com badge de score, detalhes dos itens respondidos, fotos de evidência e status dos planos.
5. **Gestão de Modelos de Checklist (Administrador):**
   - Criação de novos modelos com controle de cargo autorizado (Operador / Gerente).
   - Criação de novas versões de modelos existentes, preservando histórico imutável.

---

## 2. Decisões Arquiteturais e Implementação

### 2.1 Identidade Visual e Design System
- Paleta baseada nas cores institucionais da Hering: azul marinho profundo (`#002B49`), azul clássico (`#004B87`), cinzas suaves para contraste (`slate-50`, `slate-100`) e cores semânticas para auditoria:
  - **Verde (`emerald-500` / `emerald-600`):** Conforme (`C`) e conformidade acima de 85%.
  - **Vermelho (`rose-500` / `rose-600`):** Não Conforme (`NC`) e planos atrasados.
  - **Cinza neutro (`slate-400` / `slate-500`):** Não se Aplica (`NA`).
  - **Âmbar (`amber-500`):** Alertas de planos de ação pendentes.

### 2.2 Estrutura de Telas e Rotas (`apps/web/src/app/`)
- `/login`: Tela de autenticação com validação de credenciais, feedback de erro e cartões de acesso rápido aos usuários de teste.
- `/`: Painel operacional central. Renderiza dinamicamente as abas conforme o perfil do usuário:
  - **Operador:** Listagem direta de checklists autorizados prontos para execução offline.
  - **Gerente:** Métricas da sua loja, lista de checklists, aba de Planos de Ação pendentes com modal de conclusão e aba de Histórico de Execuções.
  - **Administrador:** Dashboard consolidado com métricas globais, Ranking de Conformidade por Loja e botão de acesso à Gestão de Modelos.
- `/execucoes/[id]`: Visualização e preenchimento de checklist ativo (modo execução) ou relatório detalhado de checklist finalizado (modo histórico).
- `/admin/modelos`: Painel exclusivo para o Administrador cadastrar modelos, adicionar itens com pesos diferenciados e publicar novas versões imutáveis.

---

## 3. Validação

- Testes de usabilidade em telas mobile simulando fluxo completo do operador: login -> abertura de checklist -> preenchimento com fotos -> envio com cálculo automático de score -> visualização do relatório no histórico.

