'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { SyncStatusBadge } from './SyncStatusBadge';
import { LogOut, ClipboardCheck, Store, Shield } from 'lucide-react';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{
    nome: string;
    email: string;
    cargo: string;
    lojaNome?: string | null;
  } | null>(null);

  useEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem('usuario');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // Ignora erro
        }
      } else {
        setUser(null);
      }
    };

    checkUser();
    // Ouve eventos de storage e foco para manter sincronizado
    window.addEventListener('storage', checkUser);
    window.addEventListener('focus', checkUser);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('focus', checkUser);
    };
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUser(null);
    window.dispatchEvent(new Event('storage'));
    router.push('/login');
  };

  // Se estiver na tela de login ou não tiver usuário autenticado, nunca renderiza a navbar
  if (pathname === '/login' || !user) return null;

  return (
    <header className="sticky top-0 z-40 bg-brand-500 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Marca / Identidade */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white text-base tracking-wider">
            H
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-widest uppercase">HERING</span>
            <span className="text-[10px] text-white/70 font-medium">Checklist Operacional</span>
          </div>
        </Link>

        {/* Status de Rede & Sincronização */}
        <div className="flex items-center gap-3">
          <SyncStatusBadge />

          {/* Dados do Usuário / Cargo */}
          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-white/20 text-xs">
            <div className="text-right">
              <p className="font-semibold leading-tight">{user.nome}</p>
              <div className="flex items-center justify-end gap-1 text-[11px] text-white/70">
                {user.cargo === 'Administrador' ? (
                  <span className="inline-flex items-center gap-0.5 text-amber-300 font-medium">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5">
                    <Store className="w-3 h-3" /> {user.lojaNome || user.cargo}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botão Logout */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Sair da conta"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

