'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '../../../lib/api';
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Layers,
  Power,
  PowerOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface NovoItemInput {
  descricao: string;
  obrigatorio: boolean;
  exigeFotoEmNC: boolean;
  peso: number;
}

export default function AdminModelosPage() {
  const router = useRouter();
  const [modelos, setModelos] = useState<any[]>([]);
  const [cargos, setCargos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Form State para Criar/Editar Modelo
  const [isCreating, setIsCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cargoPermitidoId, setCargoPermitidoId] = useState('');
  const [itens, setItens] = useState<NovoItemInput[]>([
    { descricao: '', obrigatorio: true, exigeFotoEmNC: true, peso: 1.0 },
  ]);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    try {
      const dataModelos = await apiRequest('/modelos');
      setModelos(dataModelos);

      const dataCargos = await apiRequest('/usuarios/cargos');
      setCargos(dataCargos);
      if (dataCargos.length > 0 && !cargoPermitidoId) {
        setCargoPermitidoId(dataCargos[0].id);
      }
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('usuario');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(storedUser);
    if (user.cargo !== 'Administrador') {
      router.push('/');
      return;
    }

    carregar();
  }, [router]);

  const handleAddItem = () => {
    setItens((prev) => [
      ...prev,
      { descricao: '', obrigatorio: true, exigeFotoEmNC: true, peso: 1.0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItens((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (index: number, field: keyof NovoItemInput, value: any) => {
    setItens((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, [field]: value } : it))
    );
  };

  const handleCreateModelo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErro(null);

    try {
      // Valida itens
      const itensValidos = itens.filter((it) => it.descricao.trim().length > 0);
      if (itensValidos.length === 0) {
        throw new Error('Adicione ao menos um item válido com descrição');
      }

      await apiRequest('/modelos', {
        method: 'POST',
        body: JSON.stringify({
          nome,
          descricao,
          cargoPermitidoId,
          publicar: true,
          itens: itensValidos.map((it, idx) => ({
            ordem: idx + 1,
            descricao: it.descricao,
            obrigatorio: it.obrigatorio,
            exigeFotoEmNC: it.exigeFotoEmNC,
            peso: Number(it.peso),
          })),
        }),
      });

      // Reseta form e recarrega
      setNome('');
      setDescricao('');
      setItens([{ descricao: '', obrigatorio: true, exigeFotoEmNC: true, peso: 1.0 }]);
      setIsCreating(false);
      await carregar();
    } catch (err: any) {
      setErro(err.message || 'Erro ao criar modelo');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (modeloId: string, statusAtual: boolean) => {
    try {
      await apiRequest(`/modelos/${modeloId}/ativo`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !statusAtual }),
      });
      await carregar();
    } catch (err: any) {
      setErro(err.message || 'Erro ao alterar estado do modelo');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-sm text-slate-500">Carregando modelos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
        </Link>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-xs sm:text-sm hover:bg-brand-600 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Cancelar' : 'Novo Modelo de Checklist'}</span>
        </button>
      </div>

      {erro && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{erro}</span>
        </div>
      )}

      {/* Formulário de Criação de Modelo com Versionamento */}
      {isCreating && (
        <form
          onSubmit={handleCreateModelo}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
        >
          <h2 className="font-bold text-slate-800 text-base">Criar Novo Modelo de Checklist</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Modelo *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Auditoria Semanal de Vitrines e Iluminação"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cargo Autorizado a Executar *
              </label>
              <select
                value={cargoPermitidoId}
                onChange={(e) => setCargoPermitidoId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {cargos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição do Modelo
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Objetivo e instruções gerais para a equipe de loja..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Gerenciamento de Itens */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Itens do Checklist</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-500 hover:text-brand-600"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Item
              </button>
            </div>

            {itens.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-500">Item #{idx + 1}</span>
                  {itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  required
                  value={item.descricao}
                  onChange={(e) => handleUpdateItem(idx, 'descricao', e.target.value)}
                  placeholder="Descrição da verificação (ex: Lâmpadas da fachada funcionando)..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                />

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.obrigatorio}
                      onChange={(e) => handleUpdateItem(idx, 'obrigatorio', e.target.checked)}
                      className="rounded text-brand-500"
                    />
                    <span>Obrigatório</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.exigeFotoEmNC}
                      onChange={(e) => handleUpdateItem(idx, 'exigeFotoEmNC', e.target.checked)}
                      className="rounded text-brand-500"
                    />
                    <span>Exigir Foto em Não Conformidade</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <span>Peso (RD03):</span>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={item.peso}
                      onChange={(e) => handleUpdateItem(idx, 'peso', parseFloat(e.target.value))}
                      className="w-16 px-2 py-0.5 rounded border border-slate-300 bg-white text-center"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-xs sm:text-sm hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Salvar e Publicar Versão 1</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Modelos Cadastrados e Histórico de Versões (RD01) */}
      <div className="space-y-4">
        <h2 className="font-bold text-slate-800 text-base">Modelos Cadastrados</h2>

        {modelos.map((m) => (
          <div
            key={m.id}
            className={`p-5 rounded-2xl border bg-white shadow-sm space-y-4 ${
              !m.ativo ? 'opacity-60 bg-slate-50' : ''
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{m.nome}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.ativo
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {m.ativo ? 'Ativo' : 'Desativado'}
                  </span>
                </div>
                {m.descricao && <p className="text-xs text-slate-500 mt-1">{m.descricao}</p>}
              </div>

              {/* Ação de Ativar / Desativar */}
              <button
                type="button"
                onClick={() => handleToggleAtivo(m.id, m.ativo)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  m.ativo
                    ? 'border-red-200 text-red-700 hover:bg-red-50'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {m.ativo ? (
                  <>
                    <PowerOff className="w-3.5 h-3.5" /> Desativar Modelo
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5" /> Reativar Modelo
                  </>
                )}
              </button>
            </div>

            {/* Versões Históricas Imutáveis (RD01) */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Histórico de Versões ({m.versoes.length})
              </span>

              <div className="space-y-2">
                {m.versoes.map((v: any) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-slate-800">
                        Versão v{v.versao}{' '}
                        <span className="font-normal text-slate-500">
                          • Autorizado para: <strong>{v.cargoPermitido?.nome}</strong>
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {v.itens?.length || 0} itens • Publicado em{' '}
                        {v.publicadoEm ? new Date(v.publicadoEm).toLocaleDateString() : 'Rascunho'}
                      </p>
                    </div>

                    <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 self-start sm:self-auto">
                      Imutável (Snapshot Preservado)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

