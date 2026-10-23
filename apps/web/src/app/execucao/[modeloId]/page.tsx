'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { offlineDB, LocalModelo } from '../../../lib/db';
import { apiRequest } from '../../../lib/api';
import { SyncEngine } from '../../../lib/syncEngine';
import { ScoreCalculator, ItemParaCalculo, ValorResposta } from '../../../lib/scoreCalculator';
import { PhotoCapture, CapturedPhoto } from '../../../components/PhotoCapture';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
  Camera,
  Save,
  Send,
  Loader2,
} from 'lucide-react';

interface ItemRespostaState {
  itemModeloId: string;
  descricao: string;
  ordem: number;
  obrigatorio: boolean;
  peso: number;
  exigeFotoEmNC: boolean;
  valor: ValorResposta | null;
  observacao: string;
  fotos: CapturedPhoto[];
  planoDescricao?: string;
}

export default function ExecucaoPage() {
  const params = useParams();
  const router = useRouter();
  const modeloId = params.modeloId as string;

  const [modelo, setModelo] = useState<LocalModelo | null>(null);
  const [respostas, setRespostas] = useState<ItemRespostaState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('usuario');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUsuario(parsedUser);

    const loadModelo = async () => {
      try {
        // 1. Busca primeiro no IndexedDB local (suporte total offline)
        let m = await offlineDB.modelos.get(modeloId);

        // 2. Se não estiver no IndexedDB e estiver online, busca na API e salva
        if (!m && navigator.onLine) {
          const apiModelo = await apiRequest(`/modelos/${modeloId}`);
          if (apiModelo) {
            const versao = apiModelo.versoes?.[0];
            m = {
              id: apiModelo.id,
              nome: apiModelo.nome,
              descricao: apiModelo.descricao,
              ativo: apiModelo.ativo,
              versao: {
                id: versao.id,
                versao: versao.versao,
                cargoPermitidoId: versao.cargoPermitidoId,
                cargoPermitido: versao.cargoPermitido,
                itens: versao.itens || [],
              },
            };
            await offlineDB.modelos.put(m);
          }
        }

        if (!m) {
          setErro('Modelo de checklist não encontrado offline nem online.');
          return;
        }

        setModelo(m);

        // Inicializa estado das respostas
        const itensIniciais: ItemRespostaState[] = m.versao.itens.map((it) => ({
          itemModeloId: it.id,
          descricao: it.descricao,
          ordem: it.ordem,
          obrigatorio: it.obrigatorio,
          peso: it.peso,
          exigeFotoEmNC: it.exigeFotoEmNC,
          valor: null,
          observacao: '',
          fotos: [],
          planoDescricao: '',
        }));

        setRespostas(itensIniciais);
      } catch (err: any) {
        setErro(err.message || 'Erro ao carregar checklist');
      } finally {
        setLoading(false);
      }
    };

    loadModelo();
  }, [modeloId, router]);

  // Atualiza resposta de um item
  const handleSetValor = (itemModeloId: string, valor: ValorResposta) => {
    setRespostas((prev) =>
      prev.map((r) => (r.itemModeloId === itemModeloId ? { ...r, valor } : r))
    );
  };

  const handleSetObservacao = (itemModeloId: string, observacao: string) => {
    setRespostas((prev) =>
      prev.map((r) => (r.itemModeloId === itemModeloId ? { ...r, observacao } : r))
    );
  };

  const handleAddFoto = (itemModeloId: string, foto: CapturedPhoto) => {
    setRespostas((prev) =>
      prev.map((r) =>
        r.itemModeloId === itemModeloId ? { ...r, fotos: [...r.fotos, foto] } : r
      )
    );
  };

  const handleRemoveFoto = (itemModeloId: string, fotoId: string) => {
    setRespostas((prev) =>
      prev.map((r) =>
        r.itemModeloId === itemModeloId
          ? { ...r, fotos: r.fotos.filter((f) => f.id !== fotoId) }
          : r
      )
    );
  };

  // Cálculo da pontuação e validação em tempo real (RF07 e RD03)
  const itensParaCalculo: ItemParaCalculo[] = respostas.map((r) => ({
    obrigatorio: r.obrigatorio,
    peso: r.peso,
    valor: r.valor,
  }));

  const calculo = ScoreCalculator.calcular(itensParaCalculo);

  // Finalizar Execução
  const handleFinalizar = async () => {
    setErro(null);

    // Validação RF04: Não finalizar se algum obrigatório estiver sem resposta
    if (!calculo.podeFinalizar) {
      setErro(
        `Existem ${calculo.itensObrigatoriosSemResposta} item(ns) obrigatório(s) pendente(s) de resposta.`
      );
      return;
    }

    // Validação RF05: Item NC exige foto
    for (const r of respostas) {
      if (r.valor === 'NC' && r.exigeFotoEmNC && r.fotos.length === 0) {
        setErro(`O item "${r.descricao}" está marcado como Não Conforme e exige foto.`);
        return;
      }
    }

    setSaving(true);
    try {
      const execucaoId = crypto.randomUUID();
      const lojaId = usuario.lojaId;

      if (!lojaId) {
        throw new Error('Usuário sem loja vinculada para registrar a execução.');
      }

      // 1. Grava no Dexie: Execução
      await offlineDB.execucoes.put({
        id: execucaoId,
        versaoModeloId: modelo!.versao.id,
        modeloVersaoSnapshot: modelo!.versao.versao,
        modeloNomeSnapshot: modelo!.nome,
        lojaId: lojaId,
        usuarioId: usuario.id,
        status: 'FINALIZADA',
        pontuacao: calculo.pontuacao,
        iniciadaEm: new Date().toISOString(),
        finalizadaEm: new Date().toISOString(),
        syncStatus: 'PENDENTE',
      });

      // 2. Grava no Dexie: Respostas, Fotos e Planos de Ação
      for (const r of respostas) {
        const respostaId = crypto.randomUUID();

        await offlineDB.respostas.put({
          id: respostaId,
          execucaoId: execucaoId,
          itemModeloId: r.itemModeloId,
          itemDescricaoSnapshot: r.descricao,
          itemOrdemSnapshot: r.ordem,
          itemObrigatorioSnapshot: r.obrigatorio,
          itemPesoSnapshot: r.peso,
          valor: r.valor!,
          observacao: r.observacao || null,
        });

        // Grava fotos locais no IndexedDB
        for (const f of r.fotos) {
          await offlineDB.fotos.put({
            id: f.id,
            respostaId: respostaId,
            blob: f.blob,
            mimeType: f.mimeType,
            tamanhoBytes: f.tamanhoBytes,
            syncStatus: 'PENDENTE',
            criadoEm: new Date().toISOString(),
          });
        }

        // Gera plano de ação se NC
        if (r.valor === 'NC') {
          const planoId = crypto.randomUUID();
          await offlineDB.planosAcao.put({
            id: planoId,
            respostaId: respostaId,
            lojaId: lojaId,
            descricao: r.planoDescricao || `Correção de: ${r.descricao}`,
            responsavelId: usuario.id,
            prazo: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            status: 'ABERTO',
            revisao: 1,
            syncStatus: 'PENDENTE',
          });
        }
      }

      // 3. Se estiver online, dispara sincronização durável em segundo plano
      if (navigator.onLine) {
        SyncEngine.syncPending();
      }

      router.push('/');
    } catch (err: any) {
      setErro(err.message || 'Erro ao finalizar checklist');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-sm text-slate-500 font-medium">Carregando checklist...</p>
      </div>
    );
  }

  if (!modelo) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-medium">{erro || 'Modelo não encontrado'}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Barra Superior / Voltar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <span className="text-xs text-slate-400 font-medium">
          Versão v{modelo.versao.versao} • {modelo.versao.itens.length} itens
        </span>
      </div>

      {/* Header do Modelo */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">{modelo.nome}</h1>
        {modelo.descricao && (
          <p className="text-xs sm:text-sm text-slate-500">{modelo.descricao}</p>
        )}

        {/* Painel Flutuante / Placar de Pontuação */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-400">Respondidos:</span>{' '}
              <strong className="text-slate-700">
                {calculo.itensRespondidos}/{calculo.totalItens}
              </strong>
            </div>
            <div>
              <span className="text-slate-400">Pendentes Obrig.:</span>{' '}
              <strong
                className={
                  calculo.itensObrigatoriosSemResposta > 0 ? 'text-amber-600' : 'text-emerald-600'
                }
              >
                {calculo.itensObrigatoriosSemResposta}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Pontuação:</span>
            {calculo.pontuacao !== null ? (
              <span
                className={`text-sm font-extrabold px-2.5 py-0.5 rounded-full ${
                  calculo.pontuacao >= 85
                    ? 'bg-emerald-100 text-emerald-800'
                    : calculo.pontuacao >= 70
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {calculo.pontuacao}%
              </span>
            ) : (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                N/A (Sem aplicáveis)
              </span>
            )}
          </div>
        </div>
      </div>

      {erro && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{erro}</span>
        </div>
      )}

      {/* Lista de Itens do Checklist */}
      <div className="space-y-4">
        {respostas.map((item, index) => {
          const isNC = item.valor === 'NC';

          return (
            <div
              key={item.itemModeloId}
              className={`p-5 rounded-2xl border transition-all ${
                item.valor === 'C'
                  ? 'bg-emerald-50/20 border-emerald-200'
                  : item.valor === 'NC'
                  ? 'bg-red-50/20 border-red-200 shadow-sm'
                  : item.valor === 'NA'
                  ? 'bg-slate-50 border-slate-200 opacity-80'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {/* Cabeçalho do Item */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900 text-sm sm:text-base leading-snug">
                      {item.descricao}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      {item.obrigatorio ? (
                        <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Obrigatório
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          Opcional
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">Peso {item.peso}</span>
                      {item.exigeFotoEmNC && (
                        <span className="text-[10px] text-blue-600 flex items-center gap-0.5">
                          <Camera className="w-3 h-3" /> Foto em NC
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Resposta: Conforme, Não Conforme, Não se Aplica */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => handleSetValor(item.itemModeloId, 'C')}
                  className={`py-2.5 px-3 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                    item.valor === 'C'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Conforme</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetValor(item.itemModeloId, 'NC')}
                  className={`py-2.5 px-3 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                    item.valor === 'NC'
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white hover:bg-red-50 text-red-700 border-slate-200'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Não Conforme</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetValor(item.itemModeloId, 'NA')}
                  className={`py-2.5 px-3 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                    item.valor === 'NA'
                      ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <MinusCircle className="w-4 h-4" />
                  <span>Não se Aplica</span>
                </button>
              </div>

              {/* Observação Opcional */}
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Observação (opcional)..."
                  value={item.observacao}
                  onChange={(e) => handleSetObservacao(item.itemModeloId, e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Bloco de Não Conformidade (Exige Foto e Gera Plano de Ação) */}
              {isNC && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Não Conformidade Apontada — Foto Obrigatória</span>
                  </div>

                  {/* Componente de Captura de Fotos com compressão no cliente */}
                  <PhotoCapture
                    label="Foto Comprobatória"
                    required={item.exigeFotoEmNC}
                    photos={item.fotos}
                    onAddPhoto={(f) => handleAddFoto(item.itemModeloId, f)}
                    onRemovePhoto={(fId) => handleRemoveFoto(item.itemModeloId, fId)}
                    maxPhotos={3}
                  />

                  {/* Descrição do Plano de Ação Gerado */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ação Corretiva Sugerida (Gera Plano de Ação automático com prazo de 48h)
                    </label>
                    <input
                      type="text"
                      placeholder={`Ex: Reparar ou higienizar ${item.descricao}...`}
                      value={item.planoDescricao || ''}
                      onChange={(e) =>
                        setRespostas((prev) =>
                          prev.map((r) =>
                            r.itemModeloId === item.itemModeloId
                              ? { ...r, planoDescricao: e.target.value }
                              : r
                          )
                        )
                      }
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Barra Fixa Inferior com Ação de Finalizar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 shadow-lg z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">
              {calculo.itensRespondidos} de {calculo.totalItens} respondidos
            </p>
            <p className="text-sm font-bold text-slate-800">
              Pontuação:{' '}
              {calculo.pontuacao !== null ? `${calculo.pontuacao}%` : 'N/A'}
            </p>
          </div>

          <button
            type="button"
            disabled={saving || !calculo.podeFinalizar}
            onClick={handleFinalizar}
            className="px-6 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Finalizando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Finalizar Checklist</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
