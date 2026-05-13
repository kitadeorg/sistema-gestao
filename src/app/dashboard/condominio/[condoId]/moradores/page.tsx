'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { getMoradores, deleteMorador, updateMoradorStatus, type StatusMorador } from '@/lib/firebase/moradores';
import MoradorSidePanel from './MoradorSidePanel';
import { Plus, Trash2, Search, History, ChevronDown, RefreshCw } from 'lucide-react';
import { can } from '@/lib/permissions/permissionMatrix';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ativo:        { label: 'Ativo',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inadimplente: { label: 'Inadimplente', cls: 'bg-red-50 text-red-700 border-red-200'             },
  ausente:      { label: 'Ausente',      cls: 'bg-amber-50 text-amber-700 border-amber-200'       },
  inativo:      { label: 'Inativo',      cls: 'bg-zinc-100 text-zinc-500 border-zinc-200'         },
};

const ESTADOS: StatusMorador[] = ['ativo', 'inadimplente', 'ausente', 'inativo'];

function StatusDropdown({
  moradorId,
  statusAtual,
  podeEditar,
  onUpdated,
}: {
  moradorId: string;
  statusAtual: string;
  podeEditar: boolean;
  onUpdated: () => void;
}) {
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const cfg = STATUS_CFG[statusAtual] ?? STATUS_CFG.inativo;

  if (!podeEditar) {
    return (
      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0', cfg.cls)}>
        {cfg.label}
      </span>
    );
  }

  const handleSelect = async (novoStatus: StatusMorador) => {
    if (novoStatus === statusAtual) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    try {
      await updateMoradorStatus(moradorId, novoStatus);
      toast.success(`Estado alterado para "${STATUS_CFG[novoStatus].label}".`);
      onUpdated();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao alterar estado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={cn(
          'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border transition-opacity',
          cfg.cls,
          saving && 'opacity-50',
        )}
      >
        {saving ? '...' : cfg.label}
        <ChevronDown size={10} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden min-w-[130px]">
            {ESTADOS.map(s => {
              const c = STATUS_CFG[s];
              return (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs font-semibold hover:bg-zinc-50 transition-colors flex items-center gap-2',
                    s === statusAtual && 'bg-zinc-50',
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', {
                    'bg-emerald-500': s === 'ativo',
                    'bg-red-500':     s === 'inadimplente',
                    'bg-amber-500':   s === 'ausente',
                    'bg-zinc-400':    s === 'inativo',
                  })} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function MoradoresPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData, isSuperAdmin } = useAuthContext();
  const role = userData?.role;

  const [moradores, setMoradores] = useState<any[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const podeCriar   = role ? can(role, 'create', 'morador') : false;
  const podeExcluir = role ? can(role, 'delete', 'morador') : false;
  const podeEditar  = role ? can(role, 'update', 'morador') : false;

  const fetchMoradores = useCallback(async () => {
    if (!condoId) { setLoading(false); return; }
    setLoading(true);
    const data = await getMoradores(condoId, isSuperAdmin);
    setMoradores(data);
    setLoading(false);
  }, [condoId, isSuperAdmin]);

  useEffect(() => { fetchMoradores(); }, [fetchMoradores]);

  const handleDelete = async (id: string, unidadeId: string) => {
    if (!podeExcluir) return;
    toast('Eliminar morador?', {
      description: 'O registo será arquivado no histórico de residência.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          await deleteMorador(id, unidadeId, condoId, {
            actorId:   userData!.uid,
            actorNome: userData!.nome,
            actorRole: userData!.role,
          });
          toast.success('Morador eliminado e arquivado no histórico.');
          fetchMoradores();
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  const filtered = moradores.filter(m => {
    const matchSearch =
      search === '' ||
      m.nome?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.unidadeNumero?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || m.status === filtroStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    total:        moradores.length,
    ativo:        moradores.filter(m => m.status === 'ativo').length,
    inadimplente: moradores.filter(m => m.status === 'inadimplente').length,
    ausente:      moradores.filter(m => m.status === 'ausente').length,
  };

  if (!condoId || loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Moradores</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/condominio/${condoId}/moradores/historico`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <History size={15} /> Histórico
          </Link>
          <button
            onClick={fetchMoradores}
            disabled={loading}
            className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
          </button>
          {podeCriar && (
            <button
              onClick={() => setPanelOpen(true)}
              className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition"
            >
              <Plus size={16} /> Novo Morador
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'todos',        label: 'Total',        value: counts.total,        cls: 'text-zinc-900'    },
          { key: 'ativo',        label: 'Ativos',       value: counts.ativo,        cls: 'text-emerald-600' },
          { key: 'inadimplente', label: 'Inadimplentes',value: counts.inadimplente, cls: 'text-red-600'     },
          { key: 'ausente',      label: 'Ausentes',     value: counts.ausente,      cls: 'text-amber-600'   },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFiltroStatus(filtroStatus === item.key ? 'todos' : item.key)}
            className={cn(
              'bg-white border rounded-2xl p-4 shadow-sm text-center transition-all hover:shadow-md',
              filtroStatus === item.key ? 'border-orange-300 ring-2 ring-orange-100' : 'border-zinc-200',
            )}
          >
            <p className={cn('text-2xl font-bold', item.cls)}>{item.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{item.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar por nome, email ou unidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
        />
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-zinc-500 py-10">
            {search ? 'Nenhum resultado encontrado.' : 'Nenhum morador registado.'}
          </div>
        )}
        {filtered.map(m => (
          <div key={m.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold shrink-0">
                  {m.nome?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <h3 className="font-semibold text-zinc-900 truncate text-sm">{m.nome}</h3>
              </div>
              <StatusDropdown
                moradorId={m.id}
                statusAtual={m.status ?? 'ativo'}
                podeEditar={podeEditar}
                onUpdated={fetchMoradores}
              />
            </div>

            <div className="space-y-1 text-xs text-zinc-500">
              {m.unidadeNumero && (
                <p>Unidade: <span className="font-medium text-zinc-700">{m.bloco ? `${m.bloco} — ` : ''}{m.unidadeNumero}</span></p>
              )}
              <p>Tipo: <span className="font-medium text-zinc-700">{m.tipo === 'proprietario' ? 'Proprietário' : 'Inquilino'}</span></p>
              {m.email && <p className="truncate">{m.email}</p>}
              {m.telefone && <p>{m.telefone}</p>}
            </div>

            {podeExcluir && (
              <div className="mt-4 pt-3 border-t border-zinc-100 flex justify-end">
                <button
                  onClick={() => handleDelete(m.id, m.unidadeId)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <MoradorSidePanel
        isOpen={panelOpen}
        condominioId={condoId}
        onClose={() => setPanelOpen(false)}
        onSuccess={fetchMoradores}
      />
    </main>
  );
}