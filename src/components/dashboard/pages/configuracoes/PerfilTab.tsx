'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, Save, User, Mail, Phone, Shield } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { updateUser } from '@/lib/firebase/users';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor de Portfólio',
  sindico: 'Síndico',
  funcionario: 'Funcionário',
  morador: 'Morador',
};

export default function PerfilTab() {
  const { user, userData } = useAuthContext();

  const [nome,     setNome]     = useState(userData?.nome     ?? '');
  const [telefone, setTelefone] = useState(userData?.telefone ?? '');
  const [saving,   setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const avatarUrl = userData?.avatarUrl ?? user?.photoURL ?? null;
  const initials  = (userData?.nome ?? 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const handleSave = async () => {
    if (!user || !userData) return;
    setSaving(true);
    try {
      await updateUser(user.uid, { nome: nome.trim(), telefone: telefone.trim() });
      await updateProfile(user, { displayName: nome.trim() });
      toast.success('Perfil actualizado com sucesso.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao guardar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem demasiado grande. Máximo 2 MB.');
      return;
    }

    setUploading(true);
    try {
      // Converte para base64 para guardar no Firestore (sem Storage)
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const url = ev.target?.result as string;
        try {
          await updateUser(user.uid, { avatarUrl: url });
          await updateProfile(user, { photoURL: url });
          toast.success('Foto actualizada.');
        } catch (e: any) {
          toast.error(e?.message ?? 'Erro ao actualizar foto.');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao actualizar foto.');
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">

      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-zinc-200 overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-zinc-500">{initials}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center shadow-md transition-colors disabled:opacity-60"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="font-semibold text-zinc-900">{userData?.nome}</p>
          <p className="text-sm text-zinc-500">{userData?.email}</p>
          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full border border-orange-200">
            <Shield size={10} />
            {ROLE_LABELS[userData?.role ?? ''] ?? userData?.role}
          </span>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Informações Pessoais</h3>

        <Field
          label="Nome completo"
          icon={<User size={15} />}
          value={nome}
          onChange={setNome}
          placeholder="O seu nome"
        />

        <Field
          label="Email"
          icon={<Mail size={15} />}
          value={userData?.email ?? ''}
          onChange={() => {}}
          placeholder="email@exemplo.com"
          disabled
          hint="O email não pode ser alterado aqui."
        />

        <Field
          label="Telefone"
          icon={<Phone size={15} />}
          value={telefone}
          onChange={setTelefone}
          placeholder="+244 9XX XXX XXX"
        />
      </div>

      {/* Informações da conta */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Conta</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-zinc-500">Estado</p>
            <span className={cn(
              'inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold',
              userData?.status === 'ativo'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700',
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', userData?.status === 'ativo' ? 'bg-emerald-500' : 'bg-red-500')} />
              {userData?.status === 'ativo' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div>
            <p className="text-zinc-500">Perfil de acesso</p>
            <p className="font-semibold text-zinc-900 mt-1">{ROLE_LABELS[userData?.role ?? ''] ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'A guardar...' : 'Guardar alterações'}
        </button>
      </div>

    </div>
  );
}

function Field({
  label, icon, value, onChange, placeholder, disabled, hint,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">{icon}</span>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm text-zinc-900',
            'focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500',
            disabled
              ? 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed'
              : 'bg-white border-zinc-200',
          )}
        />
      </div>
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}
