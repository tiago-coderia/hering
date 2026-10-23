import { offlineDB, LocalExecucao } from './db';
import { apiRequest } from './api';

export interface SyncStatusSummary {
  isOnline: boolean;
  isSyncing: boolean;
  totalPendentes: number;
  totalErros: number;
  ultimaSincronizacao?: Date;
}

export class SyncEngine {
  private static syncing = false;

  /**
   * Baixa dados do servidor e armazena em cache no Dexie IndexedDB
   */
  public static async downloadCache(): Promise<void> {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    try {
      // 1. Modelos autorizados
      const modelos = await apiRequest('/modelos');
      if (Array.isArray(modelos)) {
        await offlineDB.modelos.clear();
        for (const m of modelos) {
          const versaoAtiva = m.versoes?.[0];
          if (versaoAtiva) {
            await offlineDB.modelos.put({
              id: m.id,
              nome: m.nome,
              descricao: m.descricao,
              ativo: m.ativo,
              versao: {
                id: versaoAtiva.id,
                versao: versaoAtiva.versao,
                cargoPermitidoId: versaoAtiva.cargoPermitidoId,
                cargoPermitido: versaoAtiva.cargoPermitido,
                itens: versaoAtiva.itens || [],
              },
            });
          }
        }
      }

      // 2. Lojas
      const lojas = await apiRequest('/lojas');
      if (Array.isArray(lojas)) {
        await offlineDB.lojas.clear();
        await offlineDB.lojas.bulkPut(lojas);
      }

      // 3. Usuários da loja
      const usuarios = await apiRequest('/usuarios');
      if (Array.isArray(usuarios)) {
        await offlineDB.usuarios.clear();
        await offlineDB.usuarios.bulkPut(usuarios);
      }

      console.log('[SyncEngine] Cache offline de modelos, lojas e usuários atualizado.');
    } catch (err) {
      console.warn('[SyncEngine] Erro ao baixar cache de referência (pode estar offline):', err);
    }
  }

  /**
   * Sincroniza a fila de execuções e fotos pendentes com o servidor
   */
  public static async syncPending(): Promise<void> {
    if (this.syncing) return;
    if (typeof window === 'undefined' || !navigator.onLine) return;

    this.syncing = true;

    try {
      const execucoesPendentes = await offlineDB.execucoes
        .where('syncStatus')
        .anyOf(['PENDENTE', 'ERRO'])
        .toArray();

      for (const exec of execucoesPendentes) {
        try {
          // Marca execução como SINCRONIZANDO
          await offlineDB.execucoes.update(exec.id, { syncStatus: 'SINCRONIZANDO' });

          // 1. Coleta respostas locais
          const respostas = await offlineDB.respostas
            .where('execucaoId')
            .equals(exec.id)
            .toArray();

          // 2. Coleta planos e fotos locais de cada resposta
          const respostasPayload = [];

          for (const resp of respostas) {
            const fotosResp = await offlineDB.fotos
              .where('respostaId')
              .equals(resp.id)
              .toArray();

            const planoResp = await offlineDB.planosAcao
              .where('respostaId')
              .equals(resp.id)
              .first();

            respostasPayload.push({
              id: resp.id,
              itemModeloId: resp.itemModeloId,
              itemDescricaoSnapshot: resp.itemDescricaoSnapshot,
              itemOrdemSnapshot: resp.itemOrdemSnapshot,
              itemObrigatorioSnapshot: resp.itemObrigatorioSnapshot,
              itemPesoSnapshot: resp.itemPesoSnapshot,
              valor: resp.valor,
              observacao: resp.observacao,
              fotos: fotosResp.map((f) => ({
                id: f.id,
                mimeType: f.mimeType,
                tamanhoBytes: f.tamanhoBytes,
              })),
              planoAcao: planoResp
                ? {
                    id: planoResp.id,
                    descricao: planoResp.descricao,
                    responsavelId: planoResp.responsavelId,
                    prazo: planoResp.prazo,
                  }
                : undefined,
            });
          }

          // 3. Fase 1: Envia metadados estruturados
          const payload = {
            execucoes: [
              {
                id: exec.id,
                versaoModeloId: exec.versaoModeloId,
                lojaId: exec.lojaId,
                iniciadaEm: exec.iniciadaEm,
                finalizadaEm: exec.finalizadaEm,
                status: exec.status,
                respostas: respostasPayload,
              },
            ],
          };

          await apiRequest('/execucoes/sync', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          // 4. Fase 2: Envia arquivos binários das fotos pendentes
          for (const resp of respostas) {
            const fotosPendentes = await offlineDB.fotos
              .where('respostaId')
              .equals(resp.id)
              .toArray();

            for (const f of fotosPendentes) {
              if (f.syncStatus !== 'SINCRONIZADO') {
                const formData = new FormData();
                formData.append('fotoId', f.id);
                formData.append('respostaId', resp.id);
                formData.append('foto', f.blob, `${f.id}.jpg`);

                await apiRequest('/fotos/upload', {
                  method: 'POST',
                  body: formData,
                });

                await offlineDB.fotos.update(f.id, { syncStatus: 'SINCRONIZADO' });
              }
            }
          }

          // 5. Sucesso completo: marca execução como SINCRONIZADO
          await offlineDB.execucoes.update(exec.id, {
            syncStatus: 'SINCRONIZADO',
            syncErro: null,
          });

          console.log(`[SyncEngine] Execução ${exec.id} e fotos sincronizadas com sucesso!`);
        } catch (err: any) {
          console.error(`[SyncEngine] Falha ao sincronizar execução ${exec.id}:`, err);
          await offlineDB.execucoes.update(exec.id, {
            syncStatus: 'ERRO',
            syncErro: err.message || 'Erro durante sincronização',
          });
        }
      }
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Obtém resumo do estado de sincronização para exibição na UI
   */
  public static async getStatusSummary(): Promise<SyncStatusSummary> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const totalPendentes = await offlineDB.execucoes
      .where('syncStatus')
      .equals('PENDENTE')
      .count();

    const totalErros = await offlineDB.execucoes
      .where('syncStatus')
      .equals('ERRO')
      .count();

    return {
      isOnline,
      isSyncing: this.syncing,
      totalPendentes,
      totalErros,
    };
  }
}

