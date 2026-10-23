'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../lib/api';
import { SyncEngine } from '../../lib/syncEngine';
import { Lock, Mail, Loader2, ShieldCheck, Store, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      window.dispatchEvent(new Event('storage'));

      // Baixa imediatamente cache de referência para uso offline (RF08)
      await SyncEngine.downloadCache();

      router.push('/');
    } catch (err: any) {
      setErro(err.message || 'Falha ao realizar login. Verifique as credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setSenha(demoPass);
    setErro(null);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Banner Hering */}
        <div className="bg-brand-500 text-white p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 mx-auto flex items-center justify-center font-bold text-xl tracking-wider mb-2">
            H
          </div>
          <h1 className="text-xl font-bold tracking-widest uppercase">HERING</h1>
          <p className="text-xs text-white/70 mt-1">Checklist Operacional PWA</p>
        </div>

        {/* Formulário */}
        <div className="p-6 sm:p-8 space-y-6">
          {erro && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@hering.com.br"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <span>Entrar no Sistema</span>
              )}
            </button>
          </form>

          {/* Atalhos de Demonstração */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Contas de Demonstração (Seed)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => fillDemo('admin@hering.com.br', 'AdminPassword123!')}
                className="p-2 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-all text-xs"
              >
                <div className="flex items-center gap-1 font-bold text-slate-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-500" /> Administrador
                </div>
                <div className="text-[10px] text-slate-500 truncate">admin@hering.com.br</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('gerente.blumenau@hering.com.br', 'GerentePassword123!')}
                className="p-2 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-all text-xs"
              >
                <div className="flex items-center gap-1 font-bold text-slate-800">
                  <Store className="w-3.5 h-3.5 text-blue-600" /> Gerente Blumenau
                </div>
                <div className="text-[10px] text-slate-500 truncate">gerente.blumenau@...</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('operador.blumenau@hering.com.br', 'OperadorPassword123!')}
                className="p-2 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-all text-xs"
              >
                <div className="flex items-center gap-1 font-bold text-slate-800">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Operador Blumenau
                </div>
                <div className="text-[10px] text-slate-500 truncate">operador.blumenau@...</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('gerente.paulista@hering.com.br', 'GerentePassword123!')}
                className="p-2 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-all text-xs"
              >
                <div className="flex items-center gap-1 font-bold text-slate-800">
                  <Store className="w-3.5 h-3.5 text-indigo-600" /> Gerente Paulista
                </div>
                <div className="text-[10px] text-slate-500 truncate">gerente.paulista@...</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

