'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// INDICADOR DE FORÇA
// ─────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ caracteres',   ok: password.length >= 8 },
    { label: 'Maiúscula',       ok: /[A-Z]/.test(password) },
    { label: 'Minúscula',       ok: /[a-z]/.test(password) },
    { label: 'Número',          ok: /\d/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400'];
  const labels = ['Fraca', 'Razoável', 'Boa', 'Forte'];

  return (
    <div className="space-y-2 mt-1">
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-all', i < score ? colors[score-1] : 'bg-zinc-200')} />
        ))}
      </div>
      <div className="flex items-center justify-between flex-wrap gap-1">
        {checks.map(c => (
          <span key={c.label} className={cn('text-[10px] flex items-center gap-0.5', c.ok ? 'text-emerald-600' : 'text-zinc-400')}>
            {c.ok ? <CheckCircle2 size={9}/> : <Circle size={9}/>} {c.label}
          </span>
        ))}
        <span className={cn('text-[10px] font-bold', score >= 3 ? 'text-emerald-600' : 'text-zinc-400')}>
          {labels[score-1] ?? ''}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTEÚDO PRINCIPAL
// ─────────────────────────────────────────────

function RedefinirSenhaContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');

  const [novaSenha,   setNovaSenha]   = useState('');
  const [confirmar,   setConfirmar]   = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [done,        setDone]        = useState(false);
  const [tokenError,  setTokenError]  = useState<string | null>(null);

  // Sem token → erro imediato
  useEffect(() => {
    if (!token) setTokenError('Link inválido. Solicite um novo link de redefinição.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!novaSenha)             { toast.error('A nova senha é obrigatória.');          return; }
    if (novaSenha.length < 8)   { toast.error('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (novaSenha !== confirmar) { toast.error('As senhas não coincidem.');             return; }

    setSaving(true);
    try {
      const res = await fetch('/api/reset-password/confirmar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, novaSenha }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao redefinir senha.');
        if (data.error?.includes('expirou') || data.error?.includes('inválido') || data.error?.includes('utilizado')) {
          setTokenError(data.error);
        }
        return;
      }

      setDone(true);
      toast.success('Senha redefinida com sucesso!');
      setTimeout(() => router.replace('/autenticacao'), 2500);

    } catch {
      toast.error('Erro de ligação. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // ── Token inválido ──
  if (tokenError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Link inválido</h1>
          <p className="text-zinc-500 text-sm">{tokenError}</p>
          <button
            onClick={() => router.replace('/autenticacao')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  // ── Sucesso ──
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Senha redefinida!</h1>
          <p className="text-zinc-500 text-sm">A sua senha foi atualizada com sucesso. A redirecionar para o login...</p>
        </div>
      </div>
    );
  }

  // ── Formulário ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Nova senha</h1>
          <p className="text-zinc-500 text-sm mt-1.5">Defina uma nova senha para a sua conta.</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nova senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Nova senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  disabled={saving}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
              {novaSenha && <PasswordStrength password={novaSenha} />}
            </div>

            {/* Confirmar senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Confirmar senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  placeholder="Repita a senha"
                  disabled={saving}
                  className={cn(
                    'w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm text-zinc-900 focus:outline-none focus:ring-2 disabled:opacity-60',
                    confirmar && novaSenha !== confirmar
                      ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                      : confirmar && novaSenha === confirmar
                        ? 'border-emerald-300 focus:ring-emerald-200 focus:border-emerald-400'
                        : 'border-zinc-200 focus:ring-orange-500/20 focus:border-orange-500',
                  )}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {showConfirm ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
              {confirmar && novaSenha !== confirmar && (
                <p className="text-xs text-red-500">As senhas não coincidem.</p>
              )}
              {confirmar && novaSenha === confirmar && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3"/> Senhas coincidem.
                </p>
              )}
            </div>

            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 mt-2">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin"/> A guardar...</>
                : <><span>Confirmar nova senha</span><ArrowRight className="w-4 h-4"/></>
              }
            </button>

          </form>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          © {new Date().getFullYear()} CONDO. — Sistema de Gestão de Condomínios
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EXPORT — Suspense necessário para useSearchParams
// ─────────────────────────────────────────────

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    }>
      <RedefinirSenhaContent />
    </Suspense>
  );
}
