'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { ShieldCheck, Plus, Mail, Phone, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import SindicoSidePanel from './SindicoSidePanel';

interface Sindico {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  status: 'ativo' | 'inativo' | 'pendente';
  emailStatus?: string;
  mustChangeCredentials?: boolean;
}

function StatusBadge({ status }: { status: Sindico['status'] }) {
  const map = {
    ativo:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    inativo:  'bg-zinc-100 text-zinc-500 border-zinc-200',
    pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const label = { ativo: 'Ativo', inativo: 'Inativo', pendente: 'Pendente' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function ConviteBadge({ emailStatus, mustChange }: { emailStatus?: string; mustChange?: boolean }) {
  if (mustChange) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
        <Clock size={10} /> Aguarda 1º login
      </span>
    );
  }
  if (emailStatus === 'email_enviado') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200">
        <CheckCircle2 size={10} /> Enviado
      </span>
    );
  }
  if (emailStatus === 'email_bounce' || emailStatus === 'email_erro') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border bg-red-50 text-red-700 border-red-200">
        <AlertTriangle size={10} /> Falhou
      </span>
    );
  }
  return null;
}

export default function SindicoPage() {
  const params  = useParams();
  const condoId = params?.condoId as string;
  const { userData } = useAuthContext();

  const [sindicos, setSindicos] = useState<Sindico[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showPanel, setShowPanel] = useState(false);

  const canManage = userData?.role === 'gestor' || userData?.role === 'admin';

  const fetchSindicos = useCallback(async () => {
    if (!condoId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'usuarios'),
        where('condominioId', '==', condoId),
        where('role', '==', 'sindico'),
      );
      const snap = await getDocs(q);
      setSindicos(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } finally {
      setLoading(false);
    }
  }, [condoId]);

  useEffect(() => { fetchSindicos(); }, [fetchSindicos]);

  return (
    <>
      <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} className="text-orange-500" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Síndico</h1>
              <p className="text-sm text-zinc-500 mt-0.5">Gestão do síndico do condomínio</p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowPanel(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Plus size={16} /> Registar Síndico
            </button>
          )}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="p-8 text-center text-zinc-500 text-sm">A carregar...</div>
        ) : sindicos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <ShieldCheck size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum síndico registado</p>
            {canManage && (
              <button onClick={() => setShowPanel(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors">
                <Plus size={14} /> Registar primeiro síndico
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sindicos.map(s => (
              <div key={s.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                    {s.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={s.status} />
                    <ConviteBadge emailStatus={s.emailStatus} mustChange={s.mustChangeCredentials} />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">{s.nome}</p>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Mail size={12} className="text-zinc-400" />
                    <span className="truncate">{s.email}</span>
                  </div>
                  {s.telefone && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Phone size={12} className="text-zinc-400" />
                      <span>{s.telefone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showPanel && (
        <SindicoSidePanel
          condoId={condoId}
          onClose={() => setShowPanel(false)}
          onSuccess={() => { setShowPanel(false); fetchSindicos(); }}
        />
      )}
    </>
  );
}
