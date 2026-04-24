'use client';

import { useState } from 'react';
import { X, ShieldCheck, Loader2, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';
import { inviteUser } from '@/lib/inviteUser';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import DocumentUploader, { UploadedDoc } from '@/components/ui/DocumentUploader';
import { toast } from 'sonner';

interface Props {
  condoId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  nome: string;
  email: string;
  telefone: string;
}

interface FormErrors {
  nome?: string;
  email?: string;
  telefone?: string;
}

function validate(form: FormData): FormErrors {
  const e: FormErrors = {};
  if (!form.nome.trim())  e.nome  = 'Nome é obrigatório';
  if (!form.email.trim()) e.email = 'Email é obrigatório';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
  if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório';
  return e;
}

function Field({ label, value, onChange, error, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-3 py-2.5 text-sm rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300 ${error ? 'border-red-300 bg-red-50' : 'border-zinc-200 bg-white'}`}
      />
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
    </div>
  );
}

export default function SindicoSidePanel({ condoId, onClose, onSuccess }: Props) {
  const [form, setForm]     = useState<FormData>({ nome: '', email: '', telefone: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [done, setDone]     = useState<{ username: string; password: string } | null>(null);
  const [docs, setDocs]     = useState<UploadedDoc[]>([]);

  const set = (key: keyof FormData) => (value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const validation = validate(form);
    if (Object.keys(validation).length > 0) { setErrors(validation); return; }

    setSaving(true);
    setApiError(null);

    try {
      const result = await inviteUser({
        nome:        form.nome.trim(),
        email:       form.email.trim().toLowerCase(),
        telefone:    form.telefone.trim(),
        role:        'sindico',
        status:      'ativo',
        condominioId: condoId,
      });

      // Guardar documentos
      if (docs.length > 0) {
        const { getUserByEmail } = await import('@/lib/firebase/users');
        const found = await getUserByEmail(form.email.trim().toLowerCase());
        if (found?.data?.uid) {
          await updateDoc(doc(db, 'usuarios', found.data.uid), {
            documentos: docs,
            updatedAt:  serverTimestamp(),
          });
        }
      }

      if (result.emailSent) {
        setDone({ username: result.username, password: result.password });
        toast.success('Síndico convidado com sucesso!');
      } else {
        toast.warning(`Síndico criado, mas o email falhou: ${result.emailError}`);
        setDone({ username: result.username, password: result.password });
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar síndico.';
      setApiError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-full w-full sm:max-w-sm md:max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl"><ShieldCheck size={18} className="text-orange-500" /></div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Registar Síndico</h2>
              <p className="text-xs text-zinc-500">Convite enviado por email automaticamente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {done ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </div>
                <h3 className="font-bold text-zinc-900">Síndico convidado!</h3>
                <p className="text-sm text-zinc-500">O email de convite foi enviado com as credenciais temporárias.</p>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Credenciais temporárias</p>
                <div>
                  <p className="text-xs text-zinc-400">Utilizador</p>
                  <p className="font-mono font-semibold text-zinc-900">{done.username}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Senha</p>
                  <p className="font-mono font-bold text-orange-600 text-lg tracking-widest">{done.password}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-full py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors">
                Fechar
              </button>
            </div>
          ) : (
            <>
              {apiError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{apiError}</p>
                </div>
              )}

              <Field label="Nome Completo *" value={form.nome} onChange={set('nome')} error={errors.nome} placeholder="Ex: Carlos Mendes" />
              <Field label="Email *" value={form.email} onChange={set('email')} error={errors.email} type="email" placeholder="carlos@email.com" />
              <Field label="Telefone *" value={form.telefone} onChange={set('telefone')} error={errors.telefone} type="tel" placeholder="+244 9XX XXX XXX" />

              {/* Documentos */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Documentos (opcional)</label>
                <p className="text-xs text-zinc-400">BI, contrato de mandato, outros documentos</p>
                <DocumentUploader
                  folder={`sindicos/${condoId}`}
                  onUploaded={setDocs}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>

              {/* Info */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={14} className="text-amber-600" />
                  <p className="text-xs font-semibold text-amber-700">Papel do Síndico</p>
                </div>
                <p className="text-xs text-amber-600 leading-relaxed">
                  O síndico terá acesso à gestão do condomínio: ocorrências, manutenção, visitantes, equipa e documentos. Não tem acesso a dados financeiros globais.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail size={14} className="text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700">Convite por email</p>
                </div>
                <p className="text-xs text-blue-600 leading-relaxed">
                  O síndico receberá um email com credenciais temporárias. No primeiro login será pedido que defina o seu nome e senha pessoal.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="px-5 py-4 border-t border-zinc-100 flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? <><Loader2 size={16} className="animate-spin" />A enviar...</> : <><ShieldCheck size={16} />Convidar Síndico</>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
