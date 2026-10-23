import Dexie, { Table } from 'dexie';

export interface LocalModelo {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  versao: {
    id: string;
    versao: number;
    cargoPermitidoId: string;
    cargoPermitido?: { nome: string };
    itens: Array<{
      id: string;
      ordem: number;
      descricao: string;
      obrigatorio: boolean;
      exigeFotoEmNC: boolean;
      peso: number;
    }>;
  };
}

export interface LocalLoja {
  id: string;
  codigo: string;
  nome: string;
  cidade: string;
  uf: string;
}

export interface LocalUsuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  lojaId?: string | null;
}

export interface LocalExecucao {
  id: string; // UUID cliente
  versaoModeloId: string;
  modeloVersaoSnapshot: number;
  modeloNomeSnapshot: string;
  lojaId: string;
  usuarioId: string;
  status: 'RASCUNHO' | 'FINALIZADA';
  pontuacao: number | null;
  iniciadaEm: string;
  finalizadaEm?: string | null;
  syncStatus: 'PENDENTE' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'ERRO';
  syncErro?: string | null;
}

export interface LocalResposta {
  id: string; // UUID cliente
  execucaoId: string;
  itemModeloId?: string;
  itemDescricaoSnapshot: string;
  itemOrdemSnapshot: number;
  itemObrigatorioSnapshot: boolean;
  itemPesoSnapshot: number;
  valor: 'C' | 'NC' | 'NA';
  observacao?: string | null;
}

export interface LocalPlanoAcao {
  id: string; // UUID cliente
  respostaId: string;
  lojaId: string;
  descricao: string;
  responsavelId: string;
  prazo: string;
  status: 'ABERTO' | 'EM_ANDAMENTO' | 'CONCLUIDO';
  revisao: number;
  observacaoConclusao?: string | null;
  syncStatus: 'PENDENTE' | 'SINCRONIZADO' | 'ERRO';
}

export interface LocalFoto {
  id: string; // UUID cliente
  respostaId?: string | null;
  planoAcaoId?: string | null;
  blob: Blob;
  mimeType: string;
  tamanhoBytes: number;
  syncStatus: 'PENDENTE' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'ERRO';
  criadoEm: string;
}

export class ChecklistOfflineDB extends Dexie {
  modelos!: Table<LocalModelo, string>;
  lojas!: Table<LocalLoja, string>;
  usuarios!: Table<LocalUsuario, string>;
  execucoes!: Table<LocalExecucao, string>;
  respostas!: Table<LocalResposta, string>;
  planosAcao!: Table<LocalPlanoAcao, string>;
  fotos!: Table<LocalFoto, string>;

  constructor() {
    super('HeringChecklistOfflineDB');
    this.version(1).stores({
      modelos: 'id, nome, ativo',
      lojas: 'id, codigo',
      usuarios: 'id, email, lojaId, cargo',
      execucoes: 'id, versaoModeloId, lojaId, usuarioId, status, syncStatus, iniciadaEm',
      respostas: 'id, execucaoId, itemModeloId, valor',
      planosAcao: 'id, respostaId, lojaId, status, syncStatus',
      fotos: 'id, respostaId, planoAcaoId, syncStatus',
    });
  }
}

export const offlineDB = new ChecklistOfflineDB();

