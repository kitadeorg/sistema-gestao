'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import {
  UserCheck, Plus, Search, Phone, Mail, MoreVertical,
} from 'lucide-react';
import FuncionarioSidePanel from './FuncionarioSidePanel';

/* ─────────────────────────────────────────────────────────────────────────────
   INTERFACES
───────────────────────────────────────────────────────────────────────────── */

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  cargo?: string;
  status: 'ativo' | 'inativo' | 'pendente';
  avatarUrl?: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

function getInitials(nome: string) {
  return nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function StatusBadge({ status }: { status: Funcionario['status'] }) {
  const map = {
    ativo:    'bg-emerald-50 text-emerald-600',
    inativo:  'bg-zinc-100 text-zinc-500',
    pendente: 'bg-amber-50 text-amber-600',
  };
  const label = { ativo: 'Ativo', inativo: 'Inativo', pendente: 'Pendente' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CARD
───────────────────────────────────────────────────────────────────────────── */

function FuncionarioCard({ funcionario }: { funcionario: Funcionario }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {funcionario.avatarUrl ? (
            <img
              src={funcionario.avatarUrl}
              alt={funcionario.nome}
              className="w-11 h-11 rounded-full object-cover"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold text-sm">
              {getInitials(funcionario.nome)}
            </div>
          )}
          <div>
            <p className="font-semibold text-zinc-900 text-sm">{funcionario.nome}</p>
            <p className="text-xs text-zinc-500">{funcionario.cargo ?? 'Sem cargo definido'}</p>
          </div>
        </div>
        <button className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400">
          <MoreVertical size={16} />
        </button>
      </div>

      <StatusBadge status={funcionario.status} />

      <div className="space-y-1.5 pt-1 border-t border-zinc-100">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Mail size={13} className="text-zinc-400 shrink-0" />
          <span className="truncate">{funcionario.email}</span>
        </div>
        {funcionario.telefone && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Phone size={13} className="text-zinc-400 shrink-0" />
            <span>{funcionario.telefone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────────────────────────────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
      <UserCheck size={40} className="mb-3 opacity-30" />
      <p className="text-sm font-medium">Nenhum funcionário encontrado</p>
      <p className="text-xs mt-1 mb-4">Adiciona membros à equipa para os ver aqui.</p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-xl transition-colors"
      >
        <Plus size={14} /> Adicionar primeiro funcionário
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────────────────── */

export default function EquipePage() {
  const params  = useParams();
  const condoId = params?.condoId as string;

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [showPanel,    setShowPanel]    = useState(false);

  /* ── fetch ── */
  const fetchEquipe = useCallback(async () => {
    if (!condoId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'usuarios'),
        where('condominioId', '==', condoId),
        where('role', '==', 'funcionario'),
      );
      const snapshot = await getDocs(q);
      const data: Funcionario[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Funcionario, 'id'>),
      }));
      setFuncionarios(data);
    } catch (error) {
      console.error('Erro ao carregar equipa:', error);
    } finally {
      setLoading(false);
    }
  }, [condoId]);

  useEffect(() => { fetchEquipe(); }, [fetchEquipe]);

  /* ── filtro ── */
  const filtered = funcionarios.filter((f) =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    f.email.toLowerCase().includes(search.toLowerCase()) ||
    (f.cargo ?? '').toLowerCase().includes(search.toLowerCase())
  );

  /* ── contadores ── */
  const totalAtivos   = funcionarios.filter((f) => f.status === 'ativo').length;
  const totalInativos = funcionarios.filter((f) => f.status === 'inativo').length;
  const totalPendente = funcionarios.filter((f) => f.status === 'pendente').length;

  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <>
      <main className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserCheck size={22} className="text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Minha Equipa</h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                Funcionários associados a este condomínio
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPanel(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} />
            Adicionar Funcionário
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalAtivos}</p>
            <p className="text-xs text-zinc-500 mt-1">Ativos</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-500">{totalPendente}</p>
            <p className="text-xs text-zinc-500 mt-1">Pendentes</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-zinc-400">{totalInativos}</p>
            <p className="text-xs text-zinc-500 mt-1">Inativos</p>
          </div>
        </div>

        {/* Pesquisa */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="p-8 text-zinc-500 text-sm text-center">A carregar equipa...</div>
        ) : filtered.length === 0 && search === '' ? (
          <EmptyState onAdd={() => setShowPanel(true)} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Search size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Nenhum resultado para "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((f) => (
              <FuncionarioCard key={f.id} funcionario={f} />
            ))}
          </div>
        )}

      </main>

      {/* Side Panel */}
      {showPanel && (
        <FuncionarioSidePanel
          condoId={condoId}
          onClose={() => setShowPanel(false)}
          onSuccess={() => {
            setShowPanel(false);
            fetchEquipe(); // ← re-fetch automático após criar
          }}
        />
      )}
    </>
  );
}