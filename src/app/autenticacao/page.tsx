// AuthPage.tsx — "Primeiro Acesso" em vez de "Criar Conta"
'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight,
  AlertCircle, Building2, Shield,
  Briefcase, KeyRound,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebase';
import {
  doc, setDoc, getDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { toast } from 'sonner';

/* ─────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────── */

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  general?: string;
}

interface FormState {
  name: string;
  email: string;
  password: string;
}

interface PreRegistroData {
  email: string;
  nome?: string;
  role?: string;
  status?: string;
  condominioId?: string;
  condominiosGeridos?: string[];
  telefone?: string;
}

/* ─────────────────────────────────────────────────────────
   HELPERS  (idênticos ao original)
───────────────────────────────────────────────────────── */

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

async function getPreRegistroData(
  email: string,
): Promise<PreRegistroData | null> {
  try {
    const snap = await getDoc(
      doc(db, 'usuarios_pre_registro', normalizeEmail(email)),
    );
    return snap.exists() ? (snap.data() as PreRegistroData) : null;
  } catch (error: any) {
    console.error('Erro ao verificar pré-registo:', error.code, error.message);
    throw error;
  }
}

async function activateUserFromPreRegistro(
  userId: string,
  name: string,
  preData: PreRegistroData,
): Promise<void> {
  const emailNorm = normalizeEmail(preData.email);

  await setDoc(doc(db, 'usuarios', userId), {
    uid: userId,
    nome: name || preData.nome || 'Utilizador',
    email: emailNorm,
    telefone: preData.telefone ?? null,
    role: preData.role ?? 'morador',
    status: preData.status === 'inativo' ? 'inativo' : 'ativo',
    condominioId: preData.condominioId ?? null,
    condominiosGeridos: preData.condominiosGeridos ?? [],
    isEmailVerified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await deleteDoc(doc(db, 'usuarios_pre_registro', emailNorm));
}

async function activateGoogleUser(
  userId: string,
  email: string,
  name: string,
  preData: PreRegistroData,
): Promise<void> {
  const ref = doc(db, 'usuarios', userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await activateUserFromPreRegistro(userId, name, preData);
  } else {
    const emailNorm = normalizeEmail(email);
    try {
      const preRef = doc(db, 'usuarios_pre_registro', emailNorm);
      const preSnap = await getDoc(preRef);
      if (preSnap.exists()) await deleteDoc(preRef);
    } catch (err) {
      console.warn('[activateGoogleUser] Não foi possível limpar pré-registo:', err);
    }
  }
}

function mapFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use':   'Este email já está registado.',
    'auth/invalid-email':          'Email inválido.',
    'auth/operation-not-allowed':  'Operação não permitida.',
    'auth/weak-password':          'Senha muito fraca (mínimo 6 caracteres).',
    'auth/user-disabled':          'Utilizador desativado.',
    'auth/user-not-found':         'Utilizador não encontrado.',
    'auth/wrong-password':         'Senha incorreta.',
    'auth/invalid-credential':     'Credenciais inválidas.',
    'auth/network-request-failed': 'Erro de ligação. Verifique a sua internet.',
    'auth/too-many-requests':      'Demasiadas tentativas. Tente mais tarde.',
    'auth/popup-closed-by-user':   'Login cancelado.',
  };
  return map[code] ?? 'Erro desconhecido. Tente novamente.';
}

/* ─────────────────────────────────────────────────────────
   MODOS DA UI
   'login'        → entrar com conta existente
   'first-access' → primeiro acesso / activar conta
   'forgot'       → recuperar senha
───────────────────────────────────────────────────────── */

type UIMode = 'login' | 'first-access' | 'forgot';

/* ─────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────── */

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode]                 = useState<UIMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [errors, setErrors]             = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormState>({
    name: '', email: '', password: '',
  });

  /* ── helpers ── */

  const switchMode = (next: UIMode) => {
    setMode(next);
    setErrors({});
    setFormData({ name: '', email: '', password: '' });
    setShowPassword(false);
  };

  const isLogin       = mode === 'login';
  const isFirstAccess = mode === 'first-access';
  const isForgot      = mode === 'forgot';

  /* ── validation ── */

  const validate = (): boolean => {
    const e: FormErrors = {};

    if (isFirstAccess && !formData.name.trim()) {
      e.name = 'Nome é obrigatório.';
    }
    if (!formData.email.trim()) {
      e.email = 'Email é obrigatório.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      e.email = 'Email inválido.';
    }
    if (!isForgot) {
      if (!formData.password) {
        e.password = 'Senha é obrigatória.';
      } else if (formData.password.length < 6) {
        e.password = 'Senha deve ter pelo menos 6 caracteres.';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── input change ── */

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[name as keyof FormErrors];
      return next;
    });
  };

  /* ── submit principal ── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validate()) return;

    setIsLoading(true);
    try {
      const emailNorm = normalizeEmail(formData.email);

      /* ── LOGIN ── */
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(
          auth, emailNorm, formData.password,
        );

        const userDoc = await getDoc(doc(db, 'usuarios', cred.user.uid));
        if (!userDoc.exists()) {
          await signOut(auth);
          throw new Error('Acesso não autorizado. Contacte o administrador.');
        }

        const data = userDoc.data();
        if (data.status === 'inativo') {
          await signOut(auth);
          throw new Error('A sua conta está desativada. Contacte o administrador.');
        }

        toast.success('Login efetuado com sucesso!');
        setTimeout(() => router.push('/dashboard'), 1200);
        return;
      }

      /* ── PRIMEIRO ACESSO ── */
      if (isFirstAccess) {
        // 1. Verificar convite
        const preData = await getPreRegistroData(emailNorm);
        if (!preData) {
          throw new Error(
            'Email não encontrado. Verifique se foi convidado pelo administrador.',
          );
        }

        // 2. Criar conta no Firebase Auth
        const cred = await createUserWithEmailAndPassword(
          auth, emailNorm, formData.password,
        );
        await updateProfile(cred.user, { displayName: formData.name });

        // 3. Activar (migra pre_registro → usuarios)
        await activateUserFromPreRegistro(cred.user.uid, formData.name, preData);

        // 4. Verificação de email
        await sendEmailVerification(cred.user);

        toast.success('Conta activada! Verifique o email para confirmar.');
        setTimeout(() => router.push('/dashboard'), 2000);
      }

    } catch (err: any) {
      const msg = err.message && !err.code ? err.message : mapFirebaseError(err.code);
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── forgot password ── */

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validate()) return;

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalizeEmail(formData.email));
      toast.success('Email de recuperação enviado! Verifique a sua caixa de entrada.');
      switchMode('login');
    } catch (err: any) {
      const msg = mapFirebaseError(err.code);
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Google OAuth ── */

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);

      const userDoc = await getDoc(doc(db, 'usuarios', result.user.uid));

      if (!userDoc.exists()) {
        const preData = await getPreRegistroData(result.user.email ?? '');
        if (!preData) {
          await signOut(auth);
          throw new Error('Email não autorizado. Contacte o administrador.');
        }
        await activateGoogleUser(
          result.user.uid,
          result.user.email ?? '',
          result.user.displayName ?? 'Utilizador',
          preData,
        );
      } else {
        const data = userDoc.data();
        if (data.status === 'inativo') {
          await signOut(auth);
          throw new Error('A sua conta está desativada. Contacte o administrador.');
        }
        // Limpar pre_registro residual
        try {
          const preRef = doc(
            db, 'usuarios_pre_registro', normalizeEmail(result.user.email ?? ''),
          );
          const preSnap = await getDoc(preRef);
          if (preSnap.exists()) await deleteDoc(preRef);
        } catch (_) { /* silencioso */ }
      }

      toast.success('Login com Google efetuado!');
      setTimeout(() => router.push('/dashboard'), 1200);

    } catch (err: any) {
      const msg = err.message && !err.code ? err.message : mapFirebaseError(err.code);
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setIsLoading(false);
    }
  };

  /* ─────────────────────────────────────────────────────
     COPY — textos que variam por modo
  ───────────────────────────────────────────────────── */

  const ui = {
    login: {
      tab:      'Entrar',
      title:    'Bem-vindo de volta!',
      subtitle: 'Entre com as suas credenciais para continuar.',
      btn:      'Entrar',
    },
    'first-access': {
      tab:      'Primeiro acesso',
      title:    'Activar conta',
      // ↓ mensagem que deixa claro o fluxo ao utilizador
      subtitle: 'Recebeu um convite? Defina a sua senha e active a sua conta.',
      btn:      'Activar conta',
    },
    forgot: {
      tab:      '',
      title:    'Recuperar senha',
      subtitle: 'Insira o seu email para receber o link de recuperação.',
      btn:      'Enviar link',
    },
  } satisfies Record<UIMode, { tab: string; title: string; subtitle: string; btn: string }>;

  /* ─────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100
                    flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-5xl w-full flex bg-white shadow-2xl rounded-3xl
                      overflow-hidden min-h-[580px]">

        {/* ── Painel esquerdo ── */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br
                        from-orange-500 via-orange-600 to-orange-700
                        p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5
                          rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5
                          rounded-full -ml-48 -mb-48" />

          <div className="relative z-10">
            <h1 className="text-white text-4xl font-bold mb-3">
              NETSUL<span className="text-orange-200"> CONDO</span>
            </h1>
            <p className="text-orange-100 text-lg">
              Gestão inteligente para condomínios
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            {[
              {
                Icon: Building2,
                title: 'Multi-Condomínio',
                desc:  'Gerencie múltiplos condomínios numa plataforma',
              },
              {
                Icon: Shield,
                title: 'Seguro',
                desc:  'Dados protegidos com encriptação de ponta',
              },
              {
                Icon: Briefcase,
                title: 'Profissional',
                desc:  'Ferramentas para gestão completa',
              },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg
                                flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{title}</h3>
                  <p className="text-orange-100 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Painel direito (formulário) ── */}
        <div className="w-full md:w-1/2 p-5 sm:p-8 lg:p-12 flex flex-col
                        justify-center overflow-y-auto">

          {/* Mobile logo */}
          <div className="md:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800">
              NETSUL<span className="text-orange-500"> CONDO</span>
            </h1>
          </div>

          {/* Feedback — apenas erros gerais permanecem inline */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200
                            rounded-lg flex items-center gap-2
                            text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* ── Tabs (ocultas no modo "forgot") ── */}
          {!isForgot && (
            <div className="bg-gray-100 p-1.5 rounded-full flex mb-8 w-fit">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`px-6 py-2.5 rounded-full font-medium
                            transition-all duration-200 ${
                  isLogin
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Entrar
              </button>

              <button
                type="button"
                onClick={() => switchMode('first-access')}
                className={`px-6 py-2.5 rounded-full font-medium
                            transition-all duration-200 flex items-center gap-1.5 ${
                  isFirstAccess
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {/* ícone de chave reforça o conceito "primeiro acesso" */}
                <KeyRound className="w-4 h-4" />
                Primeiro acesso
              </button>
            </div>
          )}

          {/* ── Título + subtítulo ── */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              {ui[mode].title}
            </h2>
            <p className="text-gray-500 text-sm">
              {ui[mode].subtitle}
            </p>

            {/* Badge informativo no primeiro acesso */}
            {isFirstAccess && (
              <div className="mt-3 p-2.5 bg-orange-50 border border-orange-200
                              rounded-lg flex items-center gap-2 text-orange-700 text-xs">
                <KeyRound className="w-4 h-4 flex-shrink-0" />
                <span>
                  O seu email tem de estar na lista de convidados do condomínio.
                </span>
              </div>
            )}
          </div>

          {/* ── Formulário ── */}
          <form
            onSubmit={isForgot ? handleForgotPassword : handleSubmit}
            className="space-y-4"
            noValidate
          >
            {/* Nome — apenas no primeiro acesso */}
            {isFirstAccess && (
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2
                                  text-gray-400 w-5 h-5 pointer-events-none" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Nome completo"
                    autoComplete="name"
                    disabled={isLoading}
                    className={`w-full pl-11 pr-4 py-3 border rounded-lg outline-none
                                transition-all text-black duration-200 disabled:bg-gray-100 ${
                      errors.name
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                    }`}
                  />
                </div>
                {errors.name && <FieldError msg={errors.name} />}
              </div>
            )}

            {/* Email */}
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2
                                text-gray-400 w-5 h-5 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  autoComplete="email"
                  disabled={isLoading}
                  className={`w-full pl-11 text-black pr-4 py-3 border rounded-lg
                              outline-none transition-all duration-200 disabled:bg-gray-100 ${
                    errors.email
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                  }`}
                />
              </div>
              {errors.email && <FieldError msg={errors.email} />}
            </div>

            {/* Password — oculta no modo "forgot" */}
            {!isForgot && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2
                                  text-gray-400 w-5 h-5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={isFirstAccess ? 'Definir senha' : 'Senha'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    disabled={isLoading}
                    className={`w-full pl-11 text-black pr-12 py-3 border rounded-lg
                                outline-none transition-all duration-200 disabled:bg-gray-100 ${
                      errors.password
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                               text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword
                      ? <EyeOff className="w-5 h-5" />
                      : <Eye    className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <FieldError msg={errors.password} />}
              </div>
            )}

            {/* Esqueceu a senha — só no login */}
            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  disabled={isLoading}
                  className="text-sm text-orange-500 hover:text-orange-600
                             font-medium transition"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {/* Voltar ao login — só no forgot */}
            {isForgot && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                disabled={isLoading}
                className="text-sm text-orange-500 hover:text-orange-600
                           font-medium transition"
              >
                ← Voltar ao login
              </button>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600
                         text-white py-3.5 rounded-lg font-bold mt-2
                         hover:from-orange-600 hover:to-orange-700
                         transition-all duration-200
                         flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white
                                 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{ui[mode].btn}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Google — disponível em login e primeiro acesso */}
          {!isForgot && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3
                           border border-gray-300 rounded-lg py-3
                           text-gray-700 font-medium
                           hover:bg-gray-50 transition-all duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoogleIcon />
                {isLogin ? 'Entrar com Google' : 'Activar com Google'}
              </button>
            </>
          )}

          <p className="mt-8 text-center text-gray-400 text-xs">
            © {new Date().getFullYear()} NETSUL{' '}
            <span className="text-orange-600">CONDO</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   AUXILIARES
───────────────────────────────────────────────────────── */

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="flex items-center gap-1 text-red-500 text-xs mt-1 ml-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </p>
  );
}

function GoogleIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}