// src/components/dashboard/pages/condominios/CondominiosContent.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { Condominio } from '@/types';
import { AnimatePresence } from 'framer-motion';

import {
  getCondominios,
  getCondominiosByIds,
  deleteCondominio,
  toggleCondominioStatus,
} from '@/lib/firebase/condominios';
import { toast } from 'sonner';

import CondominiosTable from './CondominiosList';
import CondominioSidePanel from './CondominioSidePanel';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

type StatusFilter = Condominio['status'] | 'todos';

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────

export default function CondominiosContent() {
  const {
    userData,
    loading: authLoading,
    isAdmin,
    isGestor,
    condominiosAcessiveis,
  } = useAuthContext();

  // Admin e Gestor têm acesso — cada um vê os seus condomínios
  const canAccess = isAdmin || isGestor;

  // Só o Admin pode criar/editar/eliminar condomínios
  const canEdit = isAdmin;

  const [condominios,      setCondominios]      = useState<Condominio[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState<StatusFilter>('todos');
  const [isPanelOpen,      setIsPanelOpen]      = useState(false);
  const [editingCondominio, setEditingCondominio] = useState<Condominio | null>(null);

  // ── Fetch condomínios com base no role ──
  const fetchCondominios = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      let data: Condominio[] = [];

      if (isAdmin) {
        // Admin vê tudo
        data = await getCondominios();
      } else if (isGestor && condominiosAcessiveis.length > 0) {
        // Gestor vê apenas o seu portfólio
        data = await getCondominiosByIds(condominiosAcessiveis);
      }

      setCondominios(data);
    } catch (err) {
      console.error('Erro ao carregar condomínios:', err);
    } finally {
      setLoading(false);
    }
  }, [canAccess, isAdmin, isGestor, condominiosAcessiveis]);

  useEffect(() => {
    if (!authLoading && userData) {
      fetchCondominios();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [fetchCondominios, authLoading, userData]);

  // ── Filtros locais (sem chamadas ao Firestore) ──
  const filteredCondominios = condominios.filter((c) => {
    const matchesSearch =
      searchTerm === '' ||
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.endereco.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj?.includes(searchTerm);

    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ── Handlers ──
  const handleEdit = (condominio: Condominio) => {
    if (!canEdit) return;
    setEditingCondominio(condominio);
    setIsPanelOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    toast('Eliminar condomínio?', {
      description: 'Esta acção não pode ser desfeita.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await deleteCondominio(id);
            await fetchCondominios();
            toast.success('Condomínio eliminado com sucesso.');
          } catch (err) {
            console.error('Erro ao eliminar condomínio:', err);
            toast.error('Erro ao eliminar condomínio.');
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  const handleToggleStatus = async (id: string, status: 'active' | 'inactive') => {
    if (!canEdit) return;
    try {
      await toggleCondominioStatus(id, status);
      await fetchCondominios();
      toast.success('Estado do condomínio actualizado.');
    } catch (err) {
      console.error('Erro ao alternar status:', err);
      toast.error('Erro ao actualizar estado do condomínio.');
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setEditingCondominio(null);
  };

  const handleSuccess = () => {
    handleClosePanel();
    fetchCondominios();
  };

  // ── KPIs ──
  const counts = {
    total:    condominios.length,
    ativos:   condominios.filter(c => c.status === 'active').length,
    inativos: condominios.filter(c => c.status === 'inactive').length,
    unidades: condominios.reduce((acc, c) => acc + c.totalUnidades, 0),
  };

  // ── Estados de loading / acesso ──
  if (authLoading) {
    return <div className="p-10 text-center text-zinc-500">A carregar permissões...</div>;
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900">Acesso Restrito</h2>
        <p className="text-zinc-600 max-w-sm mt-2">
          Não tem permissão para aceder a esta página.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Condomínios</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isAdmin
              ? 'Gerir todos os condomínios da plataforma'
              : `O seu portfólio — ${counts.total} condomínio(s)`}
          </p>
        </div>

        {/* Só o Admin pode criar novos condomínios */}
        {canEdit && (
          <button
            onClick={() => { setEditingCondominio(null); setIsPanelOpen(true); }}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors"
          >
            <Plus size={16} />
            Novo Condomínio
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl px-4 py-3 border border-zinc-200 bg-zinc-100 text-zinc-700">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">Total</p>
          <p className="text-2xl font-bold mt-1">{counts.total}</p>
        </div>
        <div className="rounded-xl px-4 py-3 border border-zinc-200 bg-emerald-50 text-emerald-700">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">Ativos</p>
          <p className="text-2xl font-bold mt-1">{counts.ativos}</p>
        </div>
        <div className="rounded-xl px-4 py-3 border border-zinc-200 bg-red-50 text-red-700">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">Inativos</p>
          <p className="text-2xl font-bold mt-1">{counts.inativos}</p>
        </div>
        <div className="rounded-xl px-4 py-3 border border-zinc-200 bg-blue-50 text-blue-700">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">Unidades</p>
          <p className="text-2xl font-bold mt-1">{counts.unidades}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nome, cidade ou NIF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white"
        >
          <option value="todos">Todos os Status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
        <button
          onClick={fetchCondominios}
          disabled={loading}
          className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          aria-label="Atualizar lista"
        >
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      {/* Tabela */}
      <CondominiosTable
        data={filteredCondominios}
        loading={loading}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canEdit ? handleDelete : undefined}
        onToggleStatus={canEdit ? handleToggleStatus : undefined}
      />

      {/* Side Panel (só para Admin) */}
      <AnimatePresence>
        {isPanelOpen && canEdit && (
          <CondominioSidePanel
            key="condominio-side-panel"
            isOpen={isPanelOpen}
            condominioData={editingCondominio}
            onClose={handleClosePanel}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}