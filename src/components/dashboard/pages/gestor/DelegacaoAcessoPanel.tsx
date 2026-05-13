'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users, UserPlus, Trash2, ShieldCheck, Loader2,
  Search, X, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import {
  adicionarCondominioAoGestor,
  removerCondominioDoGestor,
  type UserData,
} from '@/lib/firebase/users';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  condominioId:   string;
  condominioNome: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// ─── Modal de adicionar gestor ────────────────────────────────────────────────

interface AdicionarModalProps {
  condominioId:   string;
  condominioNome: string;
  gestoresAtuais: string[];   // IDs já com acesso
  onClose:        () => void;
  onSuccess:      () => void;
}

function AdicionarGestorModal({
  condominioId, condominioNome, gestoresAtuais, onClose, onSuccess,
}: AdicionarModalProps) {
  const { userData } = useAuthContext();
  const [search,   setSearch]   = useState('');
  const [gestores, setGestores] = useState<UserData[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<string | null>(null);

  // Buscar todos os gestores da plataforma
  useEffect(() => {
    getDocs(query(collection(db, 'usuarios'), where('role', '==', 'gestor')))
      .then(snap => {
        const lista = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as UserData))
          // Excluir o próprio gestor e os que já têm acesso
          .filter(g => g.id !== userData?.uid && !gestoresAtuais.includes(g.id));
        setGestores(lista);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [gestoresAtuais, userData?.uid]);

  const filtrados = gestores.filter(g =>
    g.nome.toLowerCase().includes(search.toLowerCase()) ||
    g.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdicionar = async (gestor: UserData) => {
    setSaving(gestor.id);
    try {
      await adicionarCondominioAoGestor(gestor.id, condominioId);
      toast.success(`${gestor.nome} agora tem acesso a "${condominioNome}".`);
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao delegar acesso.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h3 className="font-bold text-zinc-900">Delegar Acesso</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Partilhar "{condominioNome}" com outro gestor
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-zinc-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Pesquisar gestor por nome ou email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-orange-500" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
              <Users size={28} className="mb-2 opacity-30" />
              <p className="text-sm">
                {search ? 'Nenhum gestor encontrado' : 'Não há outros gestores disponíveis'}
              </p>
            </div>
          ) : (
            filtrados.map(g => (
              <div
                key={g.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {getInitials(g.nome)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{g.nome}</p>
                    <p className="text-xs text-zinc-500 truncate">{g.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAdicionar(g)}
                  disabled={saving === g.id}
                  className="ml-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-60 shrink-0"
                >
                  {saving === g.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <UserPlus size={12} />
                  }
                  Delegar
                </button>
              </div>
            ))
          )}
        </div>

        {/* Info */}
        <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100">
          <p className="text-xs text-zinc-400 flex items-start gap-1.5">
            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-500" />
            O gestor delegado terá acesso completo a este condomínio no seu portfólio.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DelegacaoAcessoPanel({ condominioId, condominioNome }: Props) {
  const { userData } = useAuthContext();
  const [gestores,      setGestores]      = useState<UserData[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [removendo,     setRemovendo]     = useState<string | null>(null);

  const isAdmin  = userData?.role === 'admin';
  const isGestor = userData?.role === 'gestor';
  const podeGerir = isAdmin || isGestor;

  // Buscar gestores que já têm acesso a este condomínio
  const fetchGestores = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'usuarios'),
        where('role', '==', 'gestor'),
        where('condominiosGeridos', 'array-contains', condominioId),
      ));
      setGestores(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [condominioId]);

  useEffect(() => { fetchGestores(); }, [fetchGestores]);

  const handleRemover = async (gestor: UserData) => {
    // Gestor não pode remover a si próprio
    if (gestor.id === userData?.uid) {
      toast.error('Não podes remover o teu próprio acesso.');
      return;
    }

    setRemovendo(gestor.id);
    try {
      await removerCondominioDoGestor(gestor.id, condominioId);
      toast.success(`Acesso de ${gestor.nome} removido.`);
      fetchGestores();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao remover acesso.');
    } finally {
      setRemovendo(null);
    }
  };

  return (
    <>
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-orange-500" />
            <h3 className="font-bold text-zinc-900 text-sm">Gestores com Acesso</h3>
            {!loading && (
              <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs font-bold rounded-full">
                {gestores.length}
              </span>
            )}
          </div>
          {podeGerir && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors shadow-sm"
            >
              <UserPlus size={13} />
              Delegar Acesso
            </button>
          )}
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-orange-400" />
          </div>
        ) : gestores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
            <Users size={28} className="mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhum gestor delegado</p>
            {podeGerir && (
              <p className="text-xs mt-1 opacity-70">
                Clica em "Delegar Acesso" para partilhar este condomínio
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {gestores.map(g => {
              const isSelf = g.id === userData?.uid;
              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {getInitials(g.nome)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{g.nome}</p>
                        {isSelf && (
                          <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full font-semibold">
                            Tu
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{g.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                      <CheckCircle2 size={10} />
                      Acesso ativo
                    </span>
                    {podeGerir && !isSelf && (
                      <button
                        onClick={() => handleRemover(g)}
                        disabled={removendo === g.id}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          removendo === g.id
                            ? 'opacity-50 cursor-not-allowed'
                            : 'text-zinc-400 hover:text-red-500 hover:bg-red-50',
                        )}
                        title="Remover acesso"
                      >
                        {removendo === g.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <AdicionarGestorModal
          condominioId={condominioId}
          condominioNome={condominioNome}
          gestoresAtuais={gestores.map(g => g.id)}
          onClose={() => setShowModal(false)}
          onSuccess={fetchGestores}
        />
      )}
    </>
  );
}
