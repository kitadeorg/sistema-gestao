'use client';

import { useState } from 'react';
import { X, UserCheck, Loader2, AlertCircle } from 'lucide-react';
import { createUser } from '@/lib/firebase/users';
import { toast } from 'sonner';

/* ─────────────────────────────────────────────────────────────────────────────
   INTERFACES
───────────────────────────────────────────────────────────────────────────── */

interface FuncionarioSidePanelProps {
  condoId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
}

interface FormErrors {
  nome?: string;
  email?: string;
  telefone?: string;
  cargo?: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   VALIDAÇÃO
───────────────────────────────────────────────────────────────────────────── */

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!form.nome.trim())     errors.nome     = 'Nome é obrigatório';
  if (!form.email.trim())    errors.email    = 'Email é obrigatório';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                             errors.email    = 'Email inválido';
  if (!form.telefone.trim()) errors.telefone = 'Telefone é obrigatório';
  if (!form.cargo.trim())    errors.cargo    = 'Cargo é obrigatório';
  return errors;
}

/* ─────────────────────────────────────────────────────────────────────────────
   INPUT COMPONENT
───────────────────────────────────────────────────────────────────────────── */

function Field({
  label, value, onChange, error, type = 'text', placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 text-sm rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300 ${
          error
            ? 'border-red-300 bg-red-50 focus:ring-red-200'
            : 'border-zinc-200 bg-white'
        }`}
      />
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CARGOS SUGERIDOS
───────────────────────────────────────────────────────────────────────────── */

const CARGOS_SUGERIDOS = [
  'Porteiro',
  'Segurança',
  'Zelador',
  'Auxiliar de Limpeza',
  'Técnico de Manutenção',
  'Administrativo',
  'Gestor de Condomínio',
];

/* ─────────────────────────────────────────────────────────────────────────────
   SIDE PANEL
───────────────────────────────────────────────────────────────────────────── */

export default function FuncionarioSidePanel({
  condoId,
  onClose,
  onSuccess,
}: FuncionarioSidePanelProps) {
  const [form, setForm] = useState<FormData>({
    nome: '', email: '', telefone: '', cargo: '',
  });
  const [errors, setErrors]   = useState<FormErrors>({});
  const [saving, setSaving]   = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  /* ── helpers ── */
  const set = (key: keyof FormData) => (value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    const validation = validate(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setSaving(true);
    setApiError(null);

    try {
      await createUser({
        nome:        form.nome.trim(),
        email:       form.email.trim().toLowerCase(),
        telefone:    form.telefone.trim(),
        role:        'funcionario',
        status:      'pendente',
        condominioId: condoId,
      });

      toast.success('Funcionário pré-registado! Pode agora activar a conta no login.');
      onSuccess();
      onClose();

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar funcionário.';
      setApiError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 h-full w-full sm:max-w-sm md:max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl">
              <UserCheck size={18} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Adicionar Funcionário</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Será criado um pré-registo — o funcionário activa a conta no login.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-100 transition-colors text-zinc-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">

          {/* Erro de API */}
          {apiError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{apiError}</p>
            </div>
          )}

          {/* Formulário */}
          <>
              <Field
                label="Nome Completo *"
                value={form.nome}
                onChange={set('nome')}
                error={errors.nome}
                placeholder="Ex: João Silva"
              />

              <Field
                label="Email *"
                value={form.email}
                onChange={set('email')}
                error={errors.email}
                type="email"
                placeholder="joao@email.com"
              />

              <Field
                label="Telefone *"
                value={form.telefone}
                onChange={set('telefone')}
                error={errors.telefone}
                type="tel"
                placeholder="+244 9XX XXX XXX"
              />

              {/* Cargo — select + input livre */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">Cargo *</label>
                <select
                  value={CARGOS_SUGERIDOS.includes(form.cargo) ? form.cargo : '__outro__'}
                  onChange={e => {
                    if (e.target.value !== '__outro__') set('cargo')(e.target.value);
                    else set('cargo')('');
                  }}
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white ${
                    errors.cargo ? 'border-red-300' : 'border-zinc-200'
                  }`}
                >
                  <option value="">Selecionar cargo...</option>
                  {CARGOS_SUGERIDOS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__outro__">Outro (escrever)</option>
                </select>

                {/* Input livre se não estiver na lista */}
                {!CARGOS_SUGERIDOS.includes(form.cargo) && (
                  <input
                    type="text"
                    value={form.cargo}
                    onChange={e => set('cargo')(e.target.value)}
                    placeholder="Escreve o cargo..."
                    className={`mt-2 w-full px-3 py-2.5 text-sm rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                      errors.cargo ? 'border-red-300 bg-red-50' : 'border-zinc-200'
                    }`}
                  />
                )}

                {errors.cargo && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.cargo}
                  </p>
                )}
              </div>

              {/* Info sobre o fluxo */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-1">
                  Como funciona o pré-registo?
                </p>
                <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                  <li>Preenchas este formulário e clicas em "Adicionar"</li>
                  <li>O funcionário recebe o email de convite</li>
                  <li>O funcionário vai à página de login e activa a conta</li>
                  <li>A partir daí pode aceder ao sistema normalmente</li>
                </ol>
              </div>
            </>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-zinc-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
            >
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> A guardar...</>
              ) : (
                <><UserCheck size={16} /> Adicionar Funcionário</>
              )}
            </button>
          </div>

      </aside>
    </>
  );
}