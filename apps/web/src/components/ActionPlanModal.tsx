'use client';

import { useState } from 'react';
import { apiRequest, ApiError } from '../lib/api';
import { PhotoCapture, CapturedPhoto } from './PhotoCapture';
import { X, CheckCircle2, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface ActionPlanModalProps {
  plano: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function ActionPlanModal({ plano, onClose, onSuccess }: ActionPlanModalProps) {
  const [status, setStatus] = useState<string>(plano.status);
  const [observacao, setObservacao] = useState<string>(plano.observacaoConclusao || '');
  const [fotosEvidencia, setFotosEvidencia] = useState<CapturedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conflito409, setConflito409] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    setConflito409(false);

    try {
      // 1. Se o status for CONCLUIDO, valida foto de evidência
      const fotosAtuais = (plano.fotos || []).length + fotosEvidencia.length;
      if (status === 'CONCLUIDO' && fotosAtuais === 0) {
        setErro('É obrigatório anexar pelo menos uma foto comprobatória de correção para concluir o plano de ação.');
        setLoading(false);
        return;
      }

      // 2. Se novas fotos de evidência foram adicionadas, faz upload primeiro
      if (fotosEvidencia.length > 0) {
        for (const f of fotosEvidencia) {
          const formData = new FormData();
          formData.append('fotoId', f.id);
          formData.append('planoAcaoId', plano.id);
          formData.append('foto', f.blob, `${f.id}.jpg`);

          await apiRequest('/fotos/upload', {
            method: 'POST',
            body: formData,
          });
        }
      }

      // 3. Atualiza o plano de ação com controle de concorrência (revisaoEsperada)
      await apiRequest(`/planos-acao/${plano.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          observacaoConclusao: observacao,
          revisaoEsperada: plano.revisao, // Envia a revisão lida
        }),
      });

      onSuccess();
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setConflito409(true);
        setErro('Conflito de Concorrência: este plano foi alterado no servidor por outro usuário.');
      } else {
        setErro(err.message || 'Erro ao atualizar plano de ação');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-50 text-brand-500">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Plano de Ação Corretiva
              </h3>
              <p className="text-xs text-slate-500">
                Revisão v{plano.revisao} • Prazo: {new Date(plano.prazo).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {erro && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                conflito409
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{erro}</p>
                {conflito409 && (
                  <button
                    type="button"
                    onClick={onSuccess}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline hover:text-amber-950"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Recarregar dados do servidor
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Contexto da Não Conformidade */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Item Não Conforme
            </span>
            <p className="font-medium text-slate-800">
              {plano.resposta?.itemDescricaoSnapshot || plano.descricao}
            </p>
            <p className="text-xs text-slate-500">
              Responsável: {plano.responsavel?.nome || 'Gerente da Loja'}
            </p>
          </div>

          {/* Seletor de Status */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 text-xs">
              Status do Plano
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'ABERTO', label: 'Aberto', color: 'border-slate-300 text-slate-700' },
                { val: 'EM_ANDAMENTO', label: 'Em Andamento', color: 'border-blue-300 text-blue-700' },
                { val: 'CONCLUIDO', label: 'Concluído', color: 'border-emerald-300 text-emerald-700' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setStatus(opt.val)}
                  className={`py-2 px-2 rounded-lg border text-center font-medium transition-all ${
                    status === opt.val
                      ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                      : `bg-white hover:bg-slate-50 ${opt.color}`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Observações da Conclusão / Ações Tomadas */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 text-xs">
              Ações Realizadas / Observação
            </label>
            <textarea
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva as ações corretivas tomadas para solucionar o apontamento..."
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Fotos de Evidência da Correção (RF06) */}
          <div className="pt-2 border-t border-slate-100">
            <PhotoCapture
              label="Evidência Fotográfica da Correção"
              required={status === 'CONCLUIDO'}
              photos={fotosEvidencia}
              onAddPhoto={(f) => setFotosEvidencia((prev) => [...prev, f])}
              onRemovePhoto={(id) => setFotosEvidencia((prev) => prev.filter((p) => p.id !== id))}
              maxPhotos={3}
            />
          </div>

          {/* Rodapé / Ações */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-brand-500 text-white font-bold hover:bg-brand-600 shadow-sm disabled:opacity-60 flex items-center gap-1.5"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

