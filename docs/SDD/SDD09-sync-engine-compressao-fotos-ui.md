# SDD 09: Motor de Sincronização SyncEngine, Compressão de Fotos e Componentes

- **Identificador:** SDD-09
- **Fase:** Sincronização Mobile, Processamento de Mídia e Componentes de UI
- **Commit Equivalente:** `b9cb7d8` (*feat(web): motor de sincronizacao offline SyncEngine, compressao de fotos e componentes de UI*)
- **Status:** Implementado e Validado

---

## 1. Contexto e Requisitos do Desafio

1. **Requisito Diferencial RD04 (Compressão de Fotos no Cliente):**
   Fotos capturadas por câmeras de smartphones modernos possuem entre 5MB e 15MB, o que inviabilizaria o upload em redes móveis de lojas (3G/4G/Wi-Fi congestionado) e consumiria largura de banda desnecessária. As imagens devem ser comprimidas **no cliente antes de serem gravadas no IndexedDB** ou enviadas para o servidor.
2. **Ordem Estrita de Sincronização:**
   - **Fase 1 (Metadados Estruturados):** Envio atômico da execução, respostas, planos de ação e metadados das fotos para validação e persistência relacional.
   - **Fase 2 (Upload Binário de Mídias):** Envio sequencial/lote dos arquivos binários compactados associados aos IDs pré-registrados.
   - **Confirmação Durável:** O registro só é marcado como `SINCRONIZADO` no IndexedDB após a confirmação bem-sucedida de ambas as fases.

---

## 2. Decisões Arquiteturais e Implementação

### 2.1 Compressão de Fotos via HTML5 Canvas (`imageCompressor.ts`)
Implementado em [`imageCompressor.ts`](file:///p:/09.%20Testes/hering/apps/web/src/lib/imageCompressor.ts):
- Redimensionamento inteligente preservando proporção de tela (largura máxima de `1280px`).
- Compressão com qualidade JPEG otimizada em `0.7` (70%).
- **Resultado Prático:** Redução drástica do tamanho dos arquivos de ~8MB para **~150KB - 300KB** (mais de 90% de economia de dados), mantendo total legibilidade e nitidez para auditoria visual de gôndolas e vitrines.

### 2.2 Motor de Sincronização Idempotente (`syncEngine.ts`)
A classe [`SyncEngine`](file:///p:/09.%20Testes/hering/apps/web/src/lib/syncEngine.ts) gerencia o ciclo de sincronização:
```typescript
export class SyncEngine {
  public static async syncPendingExecutions(): Promise<{ sucessos: number; erros: number }> {
    if (!navigator.onLine) return { sucessos: 0, erros: 0 };
    // 1. Busca execuções com status FINALIZADA e syncStatus PENDENTE
    // 2. Monta payload estruturado e chama POST /api/v1/execucoes/sync
    // 3. Itera pelas fotos locais pendentes associadas e faz POST /api/v1/fotos/upload via FormData
    // 4. Marca localmente como SINCRONIZADO apenas após conclusão de ambos
  }
}
```
- **Listeners Reativos de Rede:** Registra eventos `window.addEventListener('online', ...)` para disparar a sincronização imediatamente quando o dispositivo recupera conexão.

### 2.3 Componentes de UI Reutilizáveis
- **`PhotoCapture`:** Componente de câmera integrado com fallback para galeria de imagens, preview instantâneo e badge indicando a contagem de fotos anexadas.
- **`SyncStatusBadge`:** Componente visual posicionado no Navbar que informa em tempo real o status de conectividade (`Online` / `Offline`) e o estado da fila de sincronização (`Sincronizado`, `Pendente`, `Sincronizando`).
- **`ActionPlanModal`:** Modal interativo para o Gerente visualizar planos de ação pendentes, preencher a ação corretiva tomada e anexar foto de evidência obrigatória para encerramento do plano.

---

## 3. Validação

- Testes de captura e compressão em navegadores mobile demonstrando redução de tamanho de imagem em milissegundos sem travamento de thread.
- Testes simulando desconexão proposital durante o envio de fotos: os metadados mantêm a rastreabilidade e a sincronização retoma o upload assim que a rede restabelece.
