# SDD 08: Frontend PWA, Service Worker e Persistência Dexie (IndexedDB)

- **Identificador:** SDD-08
- **Fase:** Frontend Offline-First e Arquitetura do Cliente
- **Commit Equivalente:** `35e482b` (*feat(web): configuracao PWA, service worker offline shell, manifest e persistencia IndexedDB com Dexie*)
- **Status:** Implementado e Validado

---

## 1. Contexto e Requisitos

Lojas de varejo de vestuário frequentemente possuem zonas cegas de conectividade (estoque no subsolo, provadores com isolamento estrutural). A aplicação PWA precisa ser **100% utilizável sem internet**:
1. O usuário deve conseguir abrir o app, visualizar os modelos autorizados para sua loja/cargo e preencher todas as etapas do checklist sem conexão ativa.
2. Identificadores universais (UUIDs) de execuções, respostas, fotos e planos de ação devem ser **gerados diretamente no dispositivo móvel** antes de qualquer sincronização de rede.
3. A persistência client-side deve ser durável, estruturada e suportar transações locais através do IndexedDB.
4. O Service Worker deve gerenciar o cache do Application Shell e assets estáticos via Cache API.

---

## 2. Decisões Arquiteturais e Implementação

### 2.1 Banco Local no Cliente com Dexie.js (`db.ts`)
Para evitar limitações de cota do `localStorage` (limitado a 5MB e síncrono), adotou-se o **IndexedDB** abstraído pela biblioteca **Dexie**:
```typescript
export class HeringChecklistOfflineDB extends Dexie {
  modelos!: Table<LocalModelo, string>;
  execucoes!: Table<LocalExecucao, string>;
  respostas!: Table<LocalResposta, string>;
  fotos!: Table<LocalFoto, string>;
  planosAcao!: Table<LocalPlanoAcao, string>;

  constructor() {
    super('HeringChecklistOfflineDB');
    this.version(1).stores({
      modelos: 'id, cargoPermitido, ativo',
      execucoes: 'id, versaoModeloId, lojaId, status, syncStatus, iniciadaEm',
      respostas: 'id, execucaoId, itemId, conformidade',
      fotos: 'id, respostaId, planoAcaoId, syncStatus',
      planosAcao: 'id, execucaoId, lojaId, status, syncStatus, revisao',
    });
  }
}
```

### 2.2 Estados de Sincronização Local
Separou-se rigorosamente o estado do ciclo de vida da execução e o estado da sincronização de rede:
- **Estado de Execução (`status`):** `RASCUNHO` | `FINALIZADA`
- **Estado de Sincronização (`syncStatus`):**
  - `PENDENTE`: Salvo no IndexedDB local, aguardando conexão.
  - `SINCRONIZANDO`: Em processo ativo de envio de metadados ou fotos.
  - `SINCRONIZADO`: Confirmado integralmente pelo servidor.
  - `ERRO`: Falha de validação ou payload com status retido para nova tentativa.

### 2.3 Service Worker e Cache Shell (`sw.js`)
- **Estratégia Cache First / Stale-While-Revalidate:** Cacheia bundles JavaScript compilados do Next.js, arquivos CSS, fontes e ícones.
- **Navegação Offline com Fallback:** Em caso de perda de rede durante a navegação entre páginas pré-carregadas, o Service Worker serve as rotas em cache ou o fallback `/login` sem crash da aplicação.
- **Manifest PWA (`manifest.json`):**
  - Identidade visual com o azul marinho clássico Hering (`#002B49`).
  - `display: standalone` para comportamento de aplicativo nativo sem barra de endereços do navegador no Android e iOS.
  - Conjunto completo de ícones (`192x192` e `512x512`).

---

## 3. Validação

- Testes no Chrome DevTools com a flag **Offline** ativada comprovando o carregamento da casca do aplicativo e leitura instantânea de modelos persistidos no IndexedDB.

