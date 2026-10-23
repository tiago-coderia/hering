'use client';

import { useEffect } from 'react';
import { SyncEngine } from '../lib/syncEngine';

export function ServiceWorkerRegister() {
  useEffect(() => {
    // 1. Registro do Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registrado com escopo:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Falha ao registrar Service Worker:', err);
          });
      });
    }

    // 2. Ouvintes para retorno de conexão de rede
    const handleOnline = () => {
      console.log('[PWA] Conexão restabelecida. Disparando sincronização...');
      SyncEngine.syncPending();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null;
}

