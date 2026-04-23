'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Lock, Eye, EyeOff, ArrowRight,
  CheckCircle2, Loader2, ShieldCheck,
} from 'lucide-react';
import {
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SetupPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuthContext();

  const [nome,        setNome]        = useState('');
  const [novaSenha,   setNovaSenha]   = useState('');
  const [confirmar,   setConfirmar]   = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [done,        setDone]        = useState(false);

  // Pré-preencher com o nome actual
  useEffect(() => {
    if (userData?.nome) setNome(userData.nome);
  }, [userData?.nome]);

  // Se não precisa de setup, redirecionar
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/autenticacao'); return; }

    const check = async () => {
      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      if (snap.exists() && !snap.data().mustChangeCredentials) {
        router.replace('/dashboard');
      }
    };
    check();
  }, [user, authLoading, router]);

  const validate = (): string | null => {
    if (!nome.trim())           return 'O nome é obrigatório.';
    if (nome.trim().length < 3) return 'O nome deve ter pelo menos 3 caracteres.';
    if (!novaSenha)             return 'A nova senha é obrigatória.';
    if (novaSenha.length < 8)   return 'A senha deve ter pelo menos 8 caracteres.';
    if (novaSenha !== confirmar) return 'As senhas não coincidem.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!user) return;

    setSaving(true);
    try {
      // 1. Actualizar senha no Firebase Auth
      await updatePassword(user, novaSenha);

      // 2. Actualizar displayName no Firebase Auth
      await updateProfile(user, { displayName: nome.trim() });

      // 3. Actualizar no Firestore — limpar flag mustChangeCredentials
      await updateDoc(doc(db, 'usuarios', user.uid), {
        nome:                  nome.trim(),
        mustChangeCredentials: false,
        tempUsername:          null,
        tempPassword:          null,
        updatedAt:             serverTimestamp(),
      });

      setDone(true);
      toast.success('Conta configurada com sucesso!');
      setTimeout(() => router.replace('/dashboard'), 1800);

    } catch (err: any) {
      // Firebase pode exigir re-autenticação se a sessão for antiga
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Por segurança, faça login novamente antes de alterar a senha.');
        router.replace('/autenticacao');
      } else {
        toast.error(err.message ?? 'Erro ao guardar. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Tudo pronto!</h2>
          <p className="text-zinc-500 text-sm">A redirecionar para o dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Configurar a sua conta</h1>
          <p className="text-zinc-500 text-sm mt-2">
            Antes de continuar, defina o seu nome e uma senha pessoal.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8">

          {/* Aviso */}
          <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              As suas credenciais de acesso são temporárias. Defina agora um nome e senha que só você conhece.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Nome completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="O seu nome completo"
                  disabled={saving}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Nova senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Nova senha
              </label>
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
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Indicador de força */}
              {novaSenha && (
                <PasswordStrength password={novaSenha} />
              )}
            </div>

            {/* Confirmar senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Confirmar senha
              </label>
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
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmar && novaSenha !== confirmar && (
                <p className="text-xs text-red-500">As senhas não coincidem.</p>
              )}
              {confirmar && novaSenha === confirmar && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Senhas coincidem.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 mt-2"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> A guardar...</>
                : <><span>Confirmar e entrar</span><ArrowRight className="w-4 h-4" /></>
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
// INDICADOR DE FORÇA DA SENHA
// ─────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ caracteres',    ok: password.length >= 8 },
    { label: 'Letra maiúscula',  ok: /[A-Z]/.test(password) },
    { label: 'Letra minúscula',  ok: /[a-z]/.test(password) },
    { label: 'Número',           ok: /\d/.test(password) },
  ];

  const score = checks.filter(c => c.ok).length;
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400'];
  const labels = ['Fraca', 'Razoável', 'Boa', 'Forte'];

  return (
    <div className="space-y-2 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all',
              i < score ? colors[score - 1] : 'bg-zinc-200',
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map(c => (
            <span key={c.label} className={cn('text-[10px] flex items-center gap-0.5', c.ok ? 'text-emerald-600' : 'text-zinc-400')}>
              <span>{c.ok ? '✓' : '○'}</span> {c.label}
            </span>
          ))}
        </div>
        <span className={cn('text-[10px] font-bold', score >= 3 ? 'text-emerald-600' : 'text-zinc-400')}>
          {labels[score - 1] ?? ''}
        </span>
      </div>
    </div>
  );
}
