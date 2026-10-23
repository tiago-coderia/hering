'use client';

import { useState, useEffect } from 'react';
import { SyncEngine, SyncStatusSummary } from '../lib/syncEngine';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export function SyncStatusBadge() {
  const [summary, setSummary] = useState<SyncStatusSummary>({
    isOnline: true,
    isSyncing: false,
    totalPendentes: 0,
    totalErros: 0,
  });

  const updateSummary = async () => {
    try {
      const s = await SyncEngine.getStatusSummary();
      setSummary(s);
    } catch {
      // Ignora erro se DB ainda não pronto
    }
  };

  useEffect(() => {
    updateSummary();
    const interval = setInterval(updateSummary, 4000);

    const onStatusChange = () => updateSummary();
    window.addEventListener('online', onStatusChange);
    window.addEventListener('offline', onStatusChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onStatusChange);
      window.removeEventListener('offline', onStatusChange);
    };
  }, []);

  const handleManualSync = async () => {
    if (!summary.isOnline) return;
    await SyncEngine.syncPending();
    await updateSummary();
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Indicador de Conexão */}
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium ${
          summary.isOnline
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}
        title={summary.isOnline ? 'Conexão ativa' : 'Modo Offline: operando com dados locais'}
      >
        {summary.isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            <span>Offline</span>
          </>
        )}
      </span>

      {/* Indicador de Fila de Sincronização */}
      {summary.isSyncing ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>Sincronizando...</span>
        </span>
      ) : summary.totalErros > 0 ? (
        <button
          onClick={handleManualSync}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
          title="Falha em itens da fila. Clique para tentar novamente."
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <span>{summary.totalErros} com erro (Reenviar)</span>
        </button>
      ) : summary.totalPendentes > 0 ? (
        <button
          onClick={handleManualSync}
          disabled={!summary.isOnline}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 disabled:opacity-60"
          title="Clique para sincronizar os dados pendentes com o servidor"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
          <span>{summary.totalPendentes} pendente(s)</span>
        </button>
      ) : (
        <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sincronizado</span>
        </span>
      )}
    </div>
  );
}

