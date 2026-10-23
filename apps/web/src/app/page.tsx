'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { offlineDB, LocalModelo, LocalExecucao } from '../lib/db';
import { apiRequest } from '../lib/api';
import { SyncEngine } from '../lib/syncEngine';
import { ActionPlanModal } from '../components/ActionPlanModal';
import {
  ClipboardCheck,
  Play,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Store,
  Users,
  Settings,
  ChevronRight,
  Shield,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [modelos, setModelos] = useState<LocalModelo[]>([]);
  const [execucoes, setExecucoes] = useState<any[]>([]);
  const [planosAcao, setPlanosAcao] = useState<any[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlano, setSelectedPlano] = useState<any | null>(null);

  // Tabs para o Gerente
  const [activeTab, setActiveTab] = useState<'modelos' | 'planos' | 'historico'>('modelos');

  const carregarDados = async () => {
    const storedUser = localStorage.getItem('usuario');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(storedUser);
    setUsuario(user);

    try {
      // 1. Carrega modelos (IndexedDB primeiro, depois API se online)
      let localModelos = await offlineDB.modelos.toArray();
      if (localModelos.length === 0 && navigator.onLine) {
        await SyncEngine.downloadCache();
        localModelos = await offlineDB.modelos.toArray();
      }
      setModelos(localModelos);

      // 2. Carrega execuções (API ou Dexie local)
      if (navigator.onLine) {
        try {
          const apiExecs = await apiRequest('/execucoes');
          setExecucoes(apiExecs);
        } catch {
          const localExecs = await offlineDB.execucoes.toArray();
          setExecucoes(localExecs);
        }
      } else {
        const localExecs = await offlineDB.execucoes.toArray();
        setExecucoes(localExecs);
      }

      // 3. Se for Gerente ou Admin, carrega planos de ação
      if (user.cargo === 'Gerente' || user.cargo === 'Administrador') {
        if (navigator.onLine) {
          try {
            const apiPlanos = await apiRequest('/planos-acao');
            setPlanosAcao(apiPlanos);
          } catch {
            const localPlanos = await offlineDB.planosAcao.toArray();
            setPlanosAcao(localPlanos);
          }
        } else {
          const localPlanos = await offlineDB.planosAcao.toArray();
          setPlanosAcao(localPlanos);
        }
      }

      // 4. Se for Admin ou Gerente, carrega métricas do Dashboard (RD02)
      if (navigator.onLine && (user.cargo === 'Administrador' || user.cargo === 'Gerente')) {
        try {
          const metrics = await apiRequest('/dashboard');
          setDashboardMetrics(metrics);
        } catch {
          // Ignora se indisponível
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-sm text-slate-500">Inicializando painel...</p>
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Boas-vindas e Identificação */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Painel Operacional
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            Olá, {usuario.nome}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Perfil: <strong className="text-brand-500">{usuario.cargo}</strong> •{' '}
            {usuario.lojaNome || 'Escopo Global'}
          </p>
        </div>

        {/* Ações do Administrador */}
        {usuario.cargo === 'Administrador' && (
          <Link
            href="/admin/modelos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-xs sm:text-sm hover:bg-brand-600 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Settings className="w-4 h-4" />
            <span>Gerenciar Modelos & Versões</span>
          </Link>
        )}
      </div>

      {/* DASHBOARD GERENCIAL (RD02) - Administrador e Gerente */}
      {dashboardMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-brand-500" /> Execuções Concluídas
            </span>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {dashboardMetrics.totais.totalExecucoes}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" /> Planos de Ação Abertos
            </span>
            <p className="text-2xl font-black text-amber-600 mt-2">
              {dashboardMetrics.totais.totalPlanosAbertos}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Planos Atrasados (&gt;48h)
            </span>
            <p className="text-2xl font-black text-red-600 mt-2">
              {dashboardMetrics.totais.totalPlanosAtrasados}
            </p>
          </div>
        </div>
      )}

      {/* RANKING DE LOJAS (RD02) - Apenas para Administrador */}
      {usuario.cargo === 'Administrador' && dashboardMetrics?.rankingLojas && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-500" />
              <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                Ranking de Conformidade por Loja (RD02)
              </h2>
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/50 text-slate-400 font-semibold text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">Posição / Loja</th>
                  <th className="py-3 px-4 text-center">Execuções</th>
                  <th className="py-3 px-4 text-center">Conformidade Média</th>
                  <th className="py-3 px-4 text-center">Planos Abertos</th>
                  <th className="py-3 px-4 text-center">Planos Atrasados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboardMetrics.rankingLojas.map((loja: any, idx: number) => (
                  <tr key={loja.lojaId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-xs flex items-center justify-center text-slate-600">
                          {idx + 1}º
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">{loja.nome}</p>
                          <p className="text-xs text-slate-400">
                            {loja.codigo} • {loja.cidade}/{loja.uf}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                      {loja.totalExecucoes}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {loja.mediaPontuacao !== null ? (
                        <span
                          className={`font-black px-2.5 py-0.5 rounded-full text-xs ${
                            loja.mediaPontuacao >= 85
                              ? 'bg-emerald-100 text-emerald-800'
                              : loja.mediaPontuacao >= 70
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {loja.mediaPontuacao}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-amber-700">
                      {loja.planosAbertos}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-red-600">
                      {loja.planosAtrasados}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NAVEGAÇÃO DE ABAS (Para Gerente e Operador) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('modelos')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'modelos'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Checklists Disponíveis ({modelos.length})
        </button>

        {(usuario.cargo === 'Gerente' || usuario.cargo === 'Administrador') && (
          <button
            onClick={() => setActiveTab('planos')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'planos'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Planos de Ação</span>
            {planosAcao.filter((p) => p.status !== 'CONCLUIDO').length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {planosAcao.filter((p) => p.status !== 'CONCLUIDO').length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'historico'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Histórico ({execucoes.length})
        </button>
      </div>

      {/* ABA 1: MODELOS DISPONÍVEIS PARA EXECUÇÃO */}
      {activeTab === 'modelos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              Checklists Autorizados para Execução
            </h2>
            <span className="text-xs text-emerald-600 font-medium">
              ✓ Disponível para execução offline
            </span>
          </div>

          {modelos.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
              Nenhum checklist disponível no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {modelos.map((m) => (
                <div
                  key={m.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-brand-500/50 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500 bg-brand-50 px-2 py-0.5 rounded border border-brand-500/20">
                        v{m.versao.versao} • {m.versao.itens?.length || 0} Itens
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base">{m.nome}</h3>
                    {m.descricao && (
                      <p className="text-xs text-slate-500 line-clamp-2">{m.descricao}</p>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {m.versao.cargoPermitido?.nome ? `Cargo: ${m.versao.cargoPermitido.nome}` : 'Pronto para uso'}
                    </span>

                    <Link
                      href={`/execucao/${m.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Iniciar</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: GESTÃO DE PLANOS DE AÇÃO (GERENTE / ADMIN) */}
      {activeTab === 'planos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              Planos de Ação da Loja
            </h2>
            <span className="text-xs text-slate-400">
              Clique no plano para atualizar ou concluir com foto
            </span>
          </div>

          {planosAcao.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
              Nenhum plano de ação pendente ou registrado.
            </div>
          ) : (
            <div className="space-y-3">
              {planosAcao.map((plano) => {
                const isConcluido = plano.status === 'CONCLUIDO';
                const isAtrasado = !isConcluido && new Date(plano.prazo) < new Date();

                return (
                  <div
                    key={plano.id}
                    onClick={() => setSelectedPlano(plano)}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isConcluido
                              ? 'bg-emerald-100 text-emerald-800'
                              : isAtrasado
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {plano.status}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Revisão v{plano.revisao}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm">{plano.descricao}</h4>
                      <p className="text-xs text-slate-500">
                        Responsável: {plano.responsavel?.nome || 'Gerente da Loja'} • Prazo:{' '}
                        {new Date(plano.prazo).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {plano.fotos && plano.fotos.length > 0 && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg font-medium">
                          {plano.fotos.length} foto(s) evidência
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: HISTÓRICO DE EXECUÇÕES */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          <h2 className="font-bold text-slate-800 text-sm sm:text-base">
            Histórico de Checklists Realizados
          </h2>

          {execucoes.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
              Nenhuma execução registrada no histórico ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {execucoes.map((exec) => (
                <Link
                  key={exec.id}
                  href={`/execucoes/${exec.id}`}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 transition-all flex items-center justify-between gap-4 block"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {exec.modeloNomeSnapshot || 'Checklist Operacional'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        v{exec.modeloVersaoSnapshot || 1}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Realizado em {new Date(exec.iniciadaEm).toLocaleDateString()} às{' '}
                      {new Date(exec.iniciadaEm).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {exec.pontuacao !== null ? (
                      <span
                        className={`text-sm font-black px-2.5 py-1 rounded-xl ${
                          exec.pontuacao >= 85
                            ? 'bg-emerald-100 text-emerald-800'
                            : exec.pontuacao >= 70
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {exec.pontuacao}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">N/A</span>
                    )}

                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Conclusão / Atualização de Plano de Ação */}
      {selectedPlano && (
        <ActionPlanModal
          plano={selectedPlano}
          onClose={() => setSelectedPlano(null)}
          onSuccess={() => {
            setSelectedPlano(null);
            carregarDados();
          }}
        />
      )}
    </div>
  );
}

