'use client';

import { useEffect, useState } from 'react';
import { X, Users, Loader2, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { inviteUser } from '@/lib/inviteUser';
import DocumentUploader, { UploadedDoc } from '@/components/ui/DocumentUploader';
import { toast } from 'sonner';

interface Props {
  condominioId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  unidadeId: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: 'proprietario' | 'inquilino';
}

interface FormErrors {
  unidadeId?: string;
  nome?: string;
  email?: string;
}

function validate(form: FormData): FormErrors {
  const e: FormErrors = {};
  if (!form.unidadeId)    e.unidadeId = 'Selecione uma unidade';
  if (!form.nome.trim())  e.nome      = 'Nome é obrigatório';
  if (!form.email.trim()) e.email     = 'Email é obrigatório';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
  return e;
}

export default function MoradorSidePanel({ condominioId, isOpen, onClose, onSuccess }: Props) {
  const [form, setForm]     = useState<FormData>({ unidadeId: '', nome: '', email: '', telefone: '', tipo: 'proprietario' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [done, setDone]     = useState<{ username: string; password: string } | null>(null);
  const [docs, setDocs]     = useState<UploadedDoc[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; numero: string; bloco?: string }[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ unidadeId: '', nome: '', email: '', telefone: '', tipo: 'proprietario' });
    setErrors({});
    setApiError(null);
    setDone(null);
    setDocs([]);

    const fetchUnidades = async () => {
      const q = query(collection(db, 'unidades'), where('condominioId', '==', condominioId), where('status', '==', 'vaga'));
      const snap = await getDocs(q);
      setUnidades(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    };
    fetchUnidades();
  }, [isOpen, condominioId]);

  if (!isOpen) return null;

  const set = (key: keyof FormData) => (value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if ((errors as any)[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
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
        role:        'morador',
        status:      'ativo',
        condominioId,
        unidadeId:   form.unidadeId,
        tipoMorador: form.tipo,
      });

      // Guardar documentos no Firestore se existirem
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
        toast.success('Morador convidado com sucesso!');
      } else {
        toast.warning(`Morador criado, mas o email falhou: ${result.emailError}`);
        setDone({ username: result.username, password: result.password });
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar morador.';
      setApiError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (err?: string) =>
    `w-full px-3 py-2.5 text-sm rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white ${err ? 'border-red-300 bg-red-50' : 'border-zinc-200'}`;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={() => !saving && onClose()} />

      <aside className="w-full sm:max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl"><Users size={18} className="text-orange-500" /></div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Adicionar Morador</h2>
              <p className="text-xs text-zinc-500">Convite enviado por email automaticamente</p>
            </div>
          </div>
          <button onClick={() => !saving && onClose()} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {done ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </div>
                <h3 className="font-bold text-zinc-900">Morador convidado!</h3>
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

              {/* Unidade */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Unidade *</label>
                <select value={form.unidadeId} onChange={e => set('unidadeId')(e.target.value)} className={inputCls(errors.unidadeId)}>
                  <option value="">Selecionar unidade vaga...</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.bloco ? `Bloco ${u.bloco} — ` : ''}{u.numero}</option>
                  ))}
                </select>
                {errors.unidadeId && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{errors.unidadeId}</p>}
              </div>

              {/* Nome */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nome Completo *</label>
                <input type="text" value={form.nome} onChange={e => set('nome')(e.target.value)} placeholder="Ex: Maria Silva" className={inputCls(errors.nome)} />
                {errors.nome && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{errors.nome}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email *</label>
                <input type="email" value={form.email} onChange={e => set('email')(e.target.value)} placeholder="maria@email.com" className={inputCls(errors.email)} />
                {errors.email && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{errors.email}</p>}
              </div>

              {/* Telefone */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Telefone</label>
                <input type="tel" value={form.telefone} onChange={e => set('telefone')(e.target.value)} placeholder="+244 9XX XXX XXX" className={inputCls()} />
              </div>

              {/* Tipo */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tipo</label>
                <select value={form.tipo} onChange={e => set('tipo')(e.target.value)} className={inputCls()}>
                  <option value="proprietario">Proprietário</option>
                  <option value="inquilino">Inquilino</option>
                </select>
              </div>

              {/* Documentos */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Documentos (opcional)</label>
                <p className="text-xs text-zinc-400">BI, contrato de arrendamento, outros</p>
                <DocumentUploader
                  folder={`moradores/${condominioId}`}
                  onUploaded={setDocs}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail size={14} className="text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700">Convite por email</p>
                </div>
                <p className="text-xs text-blue-600 leading-relaxed">
                  O morador receberá um email com credenciais temporárias. No primeiro login será pedido que defina o seu nome e senha pessoal.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="px-5 py-4 border-t border-zinc-100 flex gap-3">
            <button onClick={() => !saving && onClose()} className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? <><Loader2 size={16} className="animate-spin" />A enviar...</> : <><Users size={16} />Convidar</>}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
