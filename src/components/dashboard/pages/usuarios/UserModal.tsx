'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, ShieldAlert, Save, Building2, ChevronDown, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  createUser,
  updateUser,
  type UserData,
  type CreateUserData,
  type UpdateUserData,
} from '@/lib/firebase/users';
import { getCondominios } from '@/lib/firebase/condominios';
import { validateEmail } from '@/lib/validations/emailDnsValidator';
import type { Condominio } from '@/types';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// TIPOS E CONSTANTES
// ─────────────────────────────────────────────

type UserModalProps = {
  user: UserData | null;
  onClose: () => void;
  onSuccess: () => void;
};

type Role   = UserData['role'];
type Status = UserData['status'];

// Estado da validação DNS do e-mail
type DnsValidationState =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'valid' }
  | { state: 'invalid'; reason: 'invalid_format' | 'no_mx_record' | 'dns_error' };

const ROLE_OPTIONS: Array<{ value: Role; label: string; hint: string }> = [
  { value: 'admin',       label: 'Administrador',       hint: 'Acesso total ao sistema'       },
  { value: 'gestor',      label: 'Gestor de Portfólio', hint: 'Gere múltiplos condomínios'    },
  { value: 'sindico',     label: 'Síndico',             hint: 'Gestão de um condomínio'       },
  { value: 'funcionario', label: 'Funcionário',          hint: 'Manutenção e operações'        },
  { value: 'morador',     label: 'Morador',             hint: 'Acesso ao seu apartamento'     },
];

const ROLES_SINGLE_CONDO: Role[] = ['sindico', 'funcionario', 'morador'];
const ROLES_MULTI_CONDO:  Role[] = ['gestor'];
const ROLES_NO_CONDO:     Role[] = ['admin'];

const DNS_ERROR_MESSAGES: Record<string, string> = {
  invalid_format: 'Formato de e-mail inválido.',
  no_mx_record:   'Domínio sem servidores de e-mail — verifique se não há erro de digitação.',
  dns_error:      'Não foi possível verificar o domínio. Verifique a ligação e tente novamente.',
};

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────

export default function UserModal({ user, onClose, onSuccess }: UserModalProps) {
  const { userData: currentUserData } = useAuthContext();
  const isAdmin = currentUserData?.role === 'admin';
  const isEdit  = !!user;

  // ── Estado do formulário ──
  const initial = useMemo(() => ({
    nome:               user?.nome               ?? '',
    email:              user?.email              ?? '',
    telefone:           user?.telefone           ?? '',
    role:               (user?.role              ?? 'morador') as Role,
    status:             (user?.status            ?? 'pendente') as Status,
    condominioId:       user?.condominioId       ?? '',
    condominiosGeridos: user?.condominiosGeridos ?? [],
  }), [user]);

  const [nome,               setNome]               = useState(initial.nome);
  const [email,              setEmail]              = useState(initial.email);
  const [telefone,           setTelefone]           = useState(initial.telefone);
  const [role,               setRole]               = useState<Role>(initial.role);
  const [status,             setStatus]             = useState<Status>(initial.status);
  const [condominioId,       setCondominioId]       = useState(initial.condominioId);
  const [condominiosGeridos, setCondominiosGeridos] = useState<string[]>(initial.condominiosGeridos);

  // ── Validação DNS ──
  const [dnsValidation, setDnsValidation] = useState<DnsValidationState>({ state: 'idle' });
  // Debounce ref para não disparar uma consulta por tecla
  const dnsDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Lista de condomínios ──
  const [condominios,   setCondominios]   = useState<Condominio[]>([]);
  const [loadingCondos, setLoadingCondos] = useState(false);

  // ── Estado de submissão ──
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Derivados de role
  const needsSingleCondo = ROLES_SINGLE_CONDO.includes(role);
  const needsMultiCondo  = ROLES_MULTI_CONDO.includes(role);
  const needsCondo       = needsSingleCondo || needsMultiCondo;

  // ── Reset ao trocar de utilizador ──
  useEffect(() => {
    setNome(initial.nome);
    setEmail(initial.email);
    setTelefone(initial.telefone);
    setRole(initial.role);
    setStatus(initial.status);
    setCondominioId(initial.condominioId);
    setCondominiosGeridos(initial.condominiosGeridos);
    setDnsValidation({ state: 'idle' });
    setError(null);
    setSubmitting(false);
  }, [initial]);

  // ── Fechar com ESC ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // ── Carregar condomínios quando necessário ──
  useEffect(() => {
    if (!needsCondo || condominios.length > 0) return;

    setLoadingCondos(true);
    getCondominios()
      .then(setCondominios)
      .catch(() => setError('Não foi possível carregar os condomínios.'))
      .finally(() => setLoadingCondos(false));
  }, [needsCondo]);

  // ── Limpar seleção ao mudar role ──
  useEffect(() => {
    if (ROLES_NO_CONDO.includes(role)) {
      setCondominioId('');
      setCondominiosGeridos([]);
    } else if (needsSingleCondo) {
      setCondominiosGeridos([]);
    } else if (needsMultiCondo) {
      setCondominioId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // ── Validação DNS com debounce ao alterar e-mail ──
  // Apenas activa no modo de criação (não faz sentido validar em edição
  // pois o e-mail já está registado e pode estar a ser apenas consultado).
  useEffect(() => {
    if (isEdit) return;

    // Limpar debounce anterior
    if (dnsDebounceRef.current) clearTimeout(dnsDebounceRef.current);

    if (!email.trim()) {
      setDnsValidation({ state: 'idle' });
      return;
    }

    setDnsValidation({ state: 'checking' });

    dnsDebounceRef.current = setTimeout(async () => {
      const result = await validateEmail(email);
      if (result.valid) {
        setDnsValidation({ state: 'valid' });
      } else {
        setDnsValidation({ state: 'invalid', reason: result.reason! });
      }
    }, 600); // 600ms de debounce — equilibra UX e número de chamadas DNS

    return () => {
      if (dnsDebounceRef.current) clearTimeout(dnsDebounceRef.current);
    };
  }, [email, isEdit]);

  // ─────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────

  const toggleCondoGerido = (id: string) => {
    setCondominiosGeridos((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const validate = (): string | null => {
    if (!nome.trim())  return 'Informe o nome.';
    if (!email.trim()) return 'Informe o email.';
    if (!role)         return 'Selecione o perfil.';
    if (!status)       return 'Selecione o status.';

    // Bloquear submissão se DNS ainda a verificar ou inválido (apenas em criação)
    if (!isEdit) {
      if (dnsValidation.state === 'checking') return 'A verificar o domínio do e-mail, aguarde...';
      if (dnsValidation.state === 'invalid')  return DNS_ERROR_MESSAGES[dnsValidation.reason] ?? 'E-mail inválido.';
      if (dnsValidation.state === 'idle')     return 'Aguarde a verificação do e-mail.';
    }

    if (needsSingleCondo && !condominioId)
      return 'Selecione o condomínio associado.';
    if (needsMultiCondo && condominiosGeridos.length === 0)
      return 'Selecione pelo menos um condomínio a gerir.';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAdmin) {
      setError('Apenas Administradores podem criar/editar utilizadores.');
      return;
    }

    const msg = validate();
    if (msg) { setError(msg); return; }

    setSubmitting(true);
    try {
      if (isEdit && user) {
        // ── Editar ──────────────────────────────────────────
        const condoPayload: Partial<UpdateUserData> = {};

        if (needsSingleCondo) {
          condoPayload.condominioId = condominioId;
          condoPayload.condominiosGeridos = [];
        } else if (needsMultiCondo) {
          condoPayload.condominioId = '';
          condoPayload.condominiosGeridos = condominiosGeridos;
        } else {
          condoPayload.condominioId = '';
          condoPayload.condominiosGeridos = [];
        }

        const payload: UpdateUserData = {
          nome:     nome.trim(),
          email:    email.trim().toLowerCase(),
          telefone: telefone.trim(),
          role,
          status,
          ...condoPayload,
        };
        await updateUser(user.id, payload);

      } else {
        // ── Criar ────────────────────────────────────────────
        const condoPayload: Partial<CreateUserData> = {};

        if (needsSingleCondo) {
          condoPayload.condominioId = condominioId;
          condoPayload.condominiosGeridos = [];
        } else if (needsMultiCondo) {
          condoPayload.condominioId = '';
          condoPayload.condominiosGeridos = condominiosGeridos;
        }

        const payload: CreateUserData = {
          nome:     nome.trim(),
          email:    email.trim().toLowerCase(),
          telefone: telefone.trim(),
          role,
          status,
          ...condoPayload,
        };
        await createUser(payload);
      }

      toast.success(isEdit ? 'Utilizador actualizado com sucesso.' : 'Utilizador criado com sucesso.');
      onSuccess();

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.';
      toast.error(msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────
  // RENDER — indicador DNS inline
  // ─────────────────────────────────────────────

  const renderDnsIndicator = () => {
    if (isEdit) return null;

    switch (dnsValidation.state) {
      case 'idle':
        return null;
      case 'checking':
        return (
          <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
            <Loader2 size={11} className="animate-spin" />
            A verificar domínio...
          </p>
        );
      case 'valid':
        return (
          <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
            <CheckCircle2 size={11} />
            Domínio verificado — e-mail válido.
          </p>
        );
      case 'invalid':
        return (
          <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
            <XCircle size={11} />
            {DNS_ERROR_MESSAGES[dnsValidation.reason] ?? 'E-mail inválido.'}
          </p>
        );
    }
  };

  // ─────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Fechar"
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-zinc-200 bg-white">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-zinc-900">
                {isEdit ? 'Editar utilizador' : 'Novo utilizador'}
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                {isEdit
                  ? 'Atualize os dados e o perfil do utilizador.'
                  : 'Crie um novo utilizador e defina o perfil de acesso.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors"
              aria-label="Fechar modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Conteúdo com scroll */}
          <div className="px-5 py-4 max-h-[75vh] overflow-y-auto">

            {/* Aviso de permissão */}
            {!isAdmin && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex gap-3">
                <ShieldAlert className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Ação restrita</p>
                  <p className="text-amber-800">
                    Apenas <b>Administradores</b> podem criar/editar utilizadores e atribuir perfis.
                  </p>
                </div>
              </div>
            )}

            {/* Aviso DNS inválido em destaque */}
            {!isEdit && dnsValidation.state === 'invalid' && (
              <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 flex gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-orange-500" />
                <div>
                  <p className="font-semibold">Domínio de e-mail inválido</p>
                  <p>{DNS_ERROR_MESSAGES[dnsValidation.reason]}</p>
                  <p className="mt-1 text-orange-700">
                    Corrija o e-mail antes de continuar. Não é possível guardar um utilizador com um e-mail que não pode receber mensagens.
                  </p>
                </div>
              </div>
            )}

            {/* Erro de validação ou servidor */}
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Nome
                </label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João Manuel"
                  disabled={!isAdmin || submitting}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm
                             text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20
                             focus:border-orange-500 disabled:opacity-60"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Email
                </label>
                <div className="relative">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@dominio.com"
                    disabled={!isAdmin || submitting}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-zinc-900',
                      'focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60',
                      !isEdit && dnsValidation.state === 'valid'   && 'border-emerald-400',
                      !isEdit && dnsValidation.state === 'invalid' && 'border-red-400',
                      !isEdit && dnsValidation.state === 'checking' && 'border-zinc-300',
                      (isEdit || dnsValidation.state === 'idle') && 'border-zinc-200',
                    )}
                  />
                  {/* Ícone de estado inline no campo */}
                  {!isEdit && dnsValidation.state === 'valid' && (
                    <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  )}
                  {!isEdit && dnsValidation.state === 'invalid' && (
                    <XCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />
                  )}
                  {!isEdit && dnsValidation.state === 'checking' && (
                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 animate-spin" />
                  )}
                </div>
                {/* Mensagem DNS inline */}
                {renderDnsIndicator()}
                {/* Dica padrão quando em estado idle */}
                {(isEdit || dnsValidation.state === 'idle') && (
                  <p className="text-xs text-zinc-500">
                    O utilizador receberá um convite e deverá criar a conta no ecrã de login.
                  </p>
                )}
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Telefone
                </label>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Ex: +244 9xx xxx xxx"
                  disabled={!isAdmin || submitting}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm
                             text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20
                             focus:border-orange-500 disabled:opacity-60"
                />
              </div>

              {/* Perfil / Role */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Perfil (Permissão)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((opt) => {
                    const selected = role === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRole(opt.value)}
                        disabled={!isAdmin || submitting}
                        className={cn(
                          'text-left rounded-2xl border p-3 transition-colors',
                          selected
                            ? 'border-orange-300 bg-orange-50'
                            : 'border-zinc-200 bg-white hover:bg-zinc-50',
                          (!isAdmin || submitting) &&
                            'opacity-60 cursor-not-allowed hover:bg-white',
                        )}
                      >
                        <p className="text-sm font-bold text-zinc-900">{opt.label}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{opt.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seleção de condomínio */}
              {needsCondo && (
                <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 size={16} className="text-zinc-500" />
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      {needsMultiCondo ? 'Condomínios a Gerir' : 'Condomínio Associado'}
                    </label>
                  </div>

                  {loadingCondos ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
                      <Loader2 size={14} className="animate-spin" />
                      A carregar condomínios...
                    </div>
                  ) : condominios.length === 0 ? (
                    <p className="text-sm text-zinc-400 py-2">
                      Nenhum condomínio encontrado. Crie um primeiro.
                    </p>
                  ) : needsSingleCondo ? (
                    <div className="relative">
                      <select
                        value={condominioId}
                        onChange={(e) => setCondominioId(e.target.value)}
                        disabled={!isAdmin || submitting}
                        className="w-full appearance-none px-4 py-2.5 rounded-xl border border-zinc-200
                                   bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2
                                   focus:ring-orange-500/20 focus:border-orange-500
                                   disabled:opacity-60 pr-10"
                      >
                        <option value="">Selecionar condomínio…</option>
                        {condominios.map((c) => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {condominios.map((c) => {
                        const checked = condominiosGeridos.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                              checked
                                ? 'border-orange-300 bg-orange-50'
                                : 'border-zinc-200 bg-white hover:bg-zinc-50',
                              (!isAdmin || submitting) && 'opacity-60 cursor-not-allowed',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCondoGerido(c.id)}
                              disabled={!isAdmin || submitting}
                              className="accent-orange-500 w-4 h-4"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-900 truncate">
                                {c.nome}
                              </p>
                              <p className="text-xs text-zinc-500 truncate">
                                {c.endereco.cidade}, {c.endereco.provincia}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {needsMultiCondo && condominiosGeridos.length > 0 && (
                    <p className="text-xs text-orange-600 font-medium">
                      {condominiosGeridos.length} condomínio(s) selecionado(s)
                    </p>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  disabled={!isAdmin || submitting}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm
                             text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20
                             focus:border-orange-500 disabled:opacity-60"
                >
                  <option value="pendente">Pendente (aguarda activação)</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
                {!isEdit && status === 'pendente' && (
                  <p className="text-xs text-zinc-500">
                    O utilizador será notificado e poderá criar a conta no ecrã de login.
                  </p>
                )}
              </div>

              {/* Ações */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm
                             font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    !isAdmin ||
                    submitting ||
                    (!isEdit && dnsValidation.state !== 'valid')
                  }
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                    isAdmin && !submitting && (isEdit || dnsValidation.state === 'valid')
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                      : 'bg-zinc-200 text-zinc-500 cursor-not-allowed',
                  )}
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> A salvar...</>
                  ) : (
                    <><Save className="h-4 w-4" /> Salvar</>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
            Apenas administradores podem gerir utilizadores e atribuir acessos.
          </div>
        </div>
      </div>
    </div>
  );
}