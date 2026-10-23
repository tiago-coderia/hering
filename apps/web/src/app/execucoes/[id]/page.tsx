'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest, getApiBaseUrl } from '../../../lib/api';
import { offlineDB } from '../../../lib/db';
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Calendar,
  User,
  Store,
  Camera,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export default function ExecucaoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const execucaoId = params.id as string;

  const [execucao, setExecucao] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      try {
        // Tenta buscar na API se online
        if (navigator.onLine) {
          try {
            const data = await apiRequest(`/execucoes/${execucaoId}`);
            setExecucao(data);
            setLoading(false);
            return;
          } catch {
            // Continua para o IndexedDB local
          }
        }

        // Busca local no Dexie
        const localExec = await offlineDB.execucoes.get(execucaoId);
        if (localExec) {
          const respostas = await offlineDB.respostas
            .where('execucaoId')
            .equals(execucaoId)
            .toArray();

          const respostasComMídia = [];
          for (const r of respostas) {
            const fotos = await offlineDB.fotos.where('respostaId').equals(r.id).toArray();
            const plano = await offlineDB.planosAcao.where('respostaId').equals(r.id).first();

            respostasComMídia.push({
              ...r,
              fotos: fotos.map((f) => ({
                id: f.id,
                mimeType: f.mimeType,
                previewUrl: URL.createObjectURL(f.blob),
              })),
              planoAcao: plano,
            });
          }

          setExecucao({
            ...localExec,
            respostas: respostasComMídia,
          });
        } else {
          setErro('Execução não encontrada no dispositivo ou servidor.');
        }
      } catch (err: any) {
        setErro(err.message || 'Erro ao carregar detalhes');
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [execucaoId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-sm text-slate-500">Carregando detalhes da execução...</p>
      </div>
    );
  }

  if (!execucao) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-red-600 font-medium">{erro || 'Registro não encontrado'}</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 print:p-0">
      {/* Botões de Ação Superiores (ocultos na impressão) */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        {/* Exportação / Impressão em PDF (RD06) */}
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Exportar / Imprimir Relatório</span>
        </button>
      </div>

      {/* Cabeçalho do Relatório */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Relatório de Execução de Checklist
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {execucao.modeloNomeSnapshot || 'Checklist Operacional'}
            </h1>
            <p className="text-xs text-slate-500">
              Versão Snapshot: v{execucao.modeloVersaoSnapshot || 1} • ID: {execucao.id}
            </p>
          </div>

          {/* Pontuação */}
          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block mb-1">Conformidade Final</span>
            {execucao.pontuacao !== null ? (
              <span
                className={`text-2xl font-black px-3.5 py-1 rounded-xl inline-block ${
                  execucao.pontuacao >= 85
                    ? 'bg-emerald-100 text-emerald-800'
                    : execucao.pontuacao >= 70
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {execucao.pontuacao}%
              </span>
            ) : (
              <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-bold">
                N/A (Sem aplicáveis)
              </span>
            )}
          </div>
        </div>

        {/* Metadados da Execução */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 flex items-center gap-1 mb-1">
              <Store className="w-3.5 h-3.5" /> Loja
            </span>
            <strong className="text-slate-700 block truncate">
              {execucao.loja?.nome || execucao.lojaId}
            </strong>
          </div>

          <div>
            <span className="text-slate-400 flex items-center gap-1 mb-1">
              <User className="w-3.5 h-3.5" /> Responsável
            </span>
            <strong className="text-slate-700 block truncate">
              {execucao.usuario?.nome || 'Operador'}
            </strong>
          </div>

          <div>
            <span className="text-slate-400 flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5" /> Início
            </span>
            <strong className="text-slate-700 block">
              {new Date(execucao.iniciadaEm).toLocaleString()}
            </strong>
          </div>

          <div>
            <span className="text-slate-400 flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5" /> Conclusão
            </span>
            <strong className="text-slate-700 block">
              {execucao.finalizadaEm
                ? new Date(execucao.finalizadaEm).toLocaleString()
                : 'Em andamento'}
            </strong>
          </div>
        </div>
      </div>

      {/* Tabela de Respostas e Apontamentos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h2 className="font-bold text-slate-800 text-sm">Respostas do Checklist</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {execucao.respostas?.map((resp: any, idx: number) => {
            const isC = resp.valor === 'C';
            const isNC = resp.valor === 'NC';
            const isNA = resp.valor === 'NA';

            return (
              <div key={resp.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {resp.itemOrdemSnapshot || idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        {resp.itemDescricaoSnapshot}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>Peso: {resp.itemPesoSnapshot}</span>
                        {resp.itemObrigatorioSnapshot && <span>• Obrigatório</span>}
                      </div>
                    </div>
                  </div>

                  {/* Badge de Resposta */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                      isC
                        ? 'bg-emerald-100 text-emerald-800'
                        : isNC
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isC && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {isNC && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                    {isNA && <MinusCircle className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{isC ? 'Conforme' : isNC ? 'Não Conforme' : 'Não se Aplica'}</span>
                  </span>
                </div>

                {/* Observação */}
                {resp.observacao && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                    &quot;{resp.observacao}&quot;
                  </p>
                )}

                {/* Fotos Anexadas */}
                {resp.fotos && resp.fotos.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" /> Evidências Fotográficas ({resp.fotos.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {resp.fotos.map((f: any) => {
                        const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
                        const photoUrl = f.previewUrl || `${getApiBaseUrl()}/fotos/${f.id}?token=${token}`;

                        return (
                          <div
                            key={f.id}
                            className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-sm"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoUrl}
                              alt="Evidência"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Plano de Ação Associado */}
                {resp.planoAcao && (
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Plano de Ação Corretiva
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {resp.planoAcao.status}
                      </span>
                    </div>
                    <p className="text-amber-950 font-medium">{resp.planoAcao.descricao}</p>
                    <p className="text-[11px] text-amber-800/80">
                      Prazo: {new Date(resp.planoAcao.prazo).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

