'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight,
  AlertCircle, Building2, Shield, Briefcase,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function normalizeEmail(e: string) {
  return e.toLowerCase().trim();
}

function mapFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/invalid-email':          'Email inválido.',
    'auth/user-disabled':          'Utilizador desativado.',
    'auth/user-not-found':         'Email ou senha incorretos.',
    'auth/wrong-password':         'Email ou senha incorretos.',
    'auth/invalid-credential':     'Email ou senha incorretos.',
    'auth/network-request-failed': 'Erro de ligação. Verifique a sua internet.',
    'auth/too-many-requests':      'Demasiadas tentativas. Tente mais tarde.',
    'auth/popup-closed-by-user':   'Login cancelado.',
  };
  return map[code] ?? 'Erro desconhecido. Tente novamente.';
}

// ─────────────────────────────────────────────
// ÍCONE GOOGLE
// ─────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ─────────────────────────────────────────────
// FIELD ERROR
// ─────────────────────────────────────────────

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="flex items-center gap-1 text-red-500 text-xs mt-1 ml-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {msg}
    </p>
  );
}

// ─────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────

type Mode = 'login' | 'forgot';

export default function AuthPage() {
  const router = useRouter();

  const [mode,        setMode]        = useState<Mode>('login');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [authReady,   setAuthReady]   = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  // Redirecionar se já autenticado
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [router]);

  const clearErrors = () => setErrors({});

  // ── LOGIN ──────────────────────────────────

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearErrors();

    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email    = 'Email é obrigatório.';
    if (!password)     errs.password = 'Senha é obrigatória.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsLoading(true);
    try {
      const emailNorm = normalizeEmail(email);
      const cred = await signInWithEmailAndPassword(auth, emailNorm, password);

      const snap = await getDoc(doc(db, 'usuarios', cred.user.uid));
      if (!snap.exists()) {
        await signOut(auth);
        throw new Error('Acesso não autorizado. Contacte o administrador.');
      }

      const data = snap.data();
      if (data.status === 'inativo') {
        await signOut(auth);
        throw new Error('A sua conta está desativada. Contacte o administrador.');
      }

      if (data.mustChangeCredentials) {
        toast.success('Primeiro acesso! Vamos configurar a sua conta.');
        setTimeout(() => router.push('/dashboard/setup'), 800);
        return;
      }

      toast.success('Login efetuado com sucesso!');
      setTimeout(() => router.push('/dashboard'), 800);

    } catch (err: any) {
      const msg = err.message && !err.code ? err.message : mapFirebaseError(err.code);
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setIsLoading(false);
    }
  };

  // ── RECUPERAR SENHA ────────────────────────

  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearErrors();

    if (!email.trim()) { setErrors({ email: 'Email é obrigatório.' }); return; }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalizeEmail(email));
      toast.success('Email de recuperação enviado! Verifique a sua caixa de entrada.');
      setMode('login');
      setEmail('');
    } catch (err: any) {
      const msg = mapFirebaseError(err.code);
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setIsLoading(false);
    }
  };

  // ── GOOGLE ─────────────────────────────────

  const handleGoogle = async () => {
    setIsLoading(true);
    clearErrors();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);

      const snap = await getDoc(doc(db, 'usuarios', result.user.uid));
      if (!snap.exists()) {
        await signOut(auth);
        throw new Error('Email não autorizado. Contacte o administrador.');
      }

      const data = snap.data();
      if (data.status === 'inativo') {
        await signOut(auth);
        throw new Error('A sua conta está desativada. Contacte o administrador.');
      }

      if (data.mustChangeCredentials) {
        toast.success('Primeiro acesso! Vamos configurar a sua conta.');
        setTimeout(() => router.push('/dashboard/setup'), 800);
        return;
      }

      toast.success('Login com Google efetuado!');
      setTimeout(() => router.push('/dashboard'), 800);

    } catch (err: any) {
      const msg = err.message && !err.code ? err.message : mapFirebaseError(err.code);
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setIsLoading(false);
    }
  };

  // ── LOADING INICIAL ────────────────────────

  if (!authReady) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isForgot = mode === 'forgot';

  // ── RENDER ─────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* ── Painel esquerdo ── */}
        <div className="hidden md:flex w-5/12 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-10 flex-col justify-between relative overflow-hidden shrink-0">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-white/5 rounded-full" />

          {/* Logo */}
          <div className="relative z-10">
            <Image
              src="/logo.svg"
              alt="CONDO."
              width={130}
              height={31}
              className="h-8 w-auto brightness-0 invert"
            />
            <p className="text-orange-100 text-sm mt-3 leading-relaxed">
              Gestão inteligente para condomínios
            </p>
          </div>

          {/* Features */}
          <div className="relative z-10 space-y-5">
            {[
              { Icon: Building2, title: 'Multi-Condomínio', desc: 'Gere vários condomínios numa plataforma' },
              { Icon: Shield,    title: 'Seguro',           desc: 'Dados protegidos com encriptação de ponta' },
              { Icon: Briefcase, title: 'Profissional',     desc: 'Ferramentas para gestão completa' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-orange-100 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Painel direito ── */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 overflow-y-auto min-h-[560px]">

          {/* Logo mobile */}
          <div className="md:hidden mb-6 flex justify-center">
            <Image src="/logo.svg" alt="CONDO." width={110} height={26} className="h-7 w-auto" />
          </div>

          {/* Título */}
          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              {isForgot ? 'Recuperar senha' : 'Bem-vindo de volta!'}
            </h1>
            <p className="text-zinc-500 text-sm mt-1.5">
              {isForgot
                ? 'Insira o seu email para receber o link de recuperação.'
                : 'Entre com as suas credenciais para continuar.'}
            </p>
          </div>

          {/* Erro geral */}
          {errors.general && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={isForgot ? handleForgot : handleLogin} className="space-y-4" noValidate>

            {/* Email */}
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearErrors(); }}
                  placeholder="Email"
                  autoComplete="email"
                  disabled={isLoading}
                  className={`w-full pl-9 pr-4 py-3 border rounded-xl outline-none text-sm text-zinc-900 transition-all disabled:bg-zinc-50 disabled:opacity-60 ${
                    errors.email
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                  }`}
                />
              </div>
              {errors.email && <FieldError msg={errors.email} />}
            </div>

            {/* Senha — oculta no modo forgot */}
            {!isForgot && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearErrors(); }}
                    placeholder="Senha"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className={`w-full pl-9 pr-11 py-3 border rounded-xl outline-none text-sm text-zinc-900 transition-all disabled:bg-zinc-50 disabled:opacity-60 ${
                      errors.password
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                        : 'border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <FieldError msg={errors.password} />}
              </div>
            )}

            {/* Esqueceu a senha */}
            {!isForgot && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); clearErrors(); }}
                  disabled={isLoading}
                  className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {/* Voltar ao login */}
            {isForgot && (
              <button
                type="button"
                onClick={() => { setMode('login'); clearErrors(); }}
                disabled={isLoading}
                className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
              >
                ← Voltar ao login
              </button>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3.5 rounded-xl font-bold text-sm mt-1 hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 hover:-translate-y-0.5"
            >
              {isLoading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><span>{isForgot ? 'Enviar link' : 'Entrar'}</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          {/* Google */}
          {!isForgot && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-zinc-200" />
                <span className="text-xs text-zinc-400">ou</span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 border border-zinc-200 rounded-xl py-3 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoogleIcon />
                Entrar com Google
              </button>
            </>
          )}

          <p className="mt-8 text-center text-zinc-400 text-xs">
            © {new Date().getFullYear()} CONDO. — Sistema de Gestão de Condomínios
          </p>
        </div>
      </div>
    </div>
  );
}
