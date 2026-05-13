'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';
import {
  getAssembleias, createAssembleia, updateStatusAssembleia,
  toggleVotacaoPauta, registarVoto, registarResultadoPauta,
  deleteAssembleia,
  type Assembleia, type PautaItem, type StatusAssembleia, type TipoVoto,
} from '@/lib/firebase/assembleias';
import {
  Users, Plus, X, Loader2, Search, RefreshCw,
  Calendar, MapPin, ChevronDown, ChevronUp,
  Vote, CheckCircle2, XCircle, Minus, Trash2,
  PlayCircle, StopCircle, ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_CFG: Record<StatusAssembleia, { label: string; cls: string }> = {
  agendada:  { label: 'Agendada',  cls: 'bg-blue-50 text-blue-700 border-blue-200'       },
  em_curso:  { label: 'Em Curso',  cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  encerrada: { label: 'Encerrada', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelada: { label: 'Cancelada', cls: 'bg-zinc-100 text-zinc-500 border-zinc-200'      },
};

// ─── Modal de nova assembleia ─────────────────────────────────────────────────

interface NovaAssembleiaModalProps {
  condominioId: string;
  autorId: string;
  autorNome: string;
  onClose: () => void;
  onSuccess: () => void;
}

function NovaAssembleiaModal({ condominioId, autorId, autorNome, onClose, onSuccess }: NovaAssembleiaModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    data: '',
    hora: '19:00',
    local: '',
  });
  const [pautaItems, setPautaItems] = useState([{ titulo: '', descricao: '' }]);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const addPauta = () => setPautaItems(prev => [...prev, { titulo: '', descricao: '' }]);
  const removePauta = (i: number) => setPautaItems(prev => prev.filter((_, idx) => idx !== i));
  const setPauta = (i: number, k: 'titulo' | 'descricao', v: string) =>
    setPautaItems(prev => prev.map((p, idx) => idx === i ? { ...p, [k]: v } : p));

  const handleSave = async () => {
    if (!form.titulo.trim()) { toast.warning('Título obrigatório.'); return; }
    if (!form.data) { toast.warning('Data obrigatória.'); return; }
    if (!form.local.trim()) { toast.warning('Local obrigatório.'); return; }
    const pautaValida = pautaItems.filter(p => p.titulo.trim());
    if (pautaValida.length === 0) { toast.warning('Adiciona pelo menos um ponto de pauta.'); return; }

    setSaving(true);
    try {
      const dataHora = new Date(`${form.data}T${form.hora}:00`);
      await createAssembleia({
        condominioId,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || undefined,
        data: dataHora,
        local: form.local.trim(),
        pauta: pautaValida,
        criadoPor: autorId,
        criadoPorNome: autorNome,
      });
      toast.success('Assembleia criada com sucesso.');
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao criar assembleia.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 shrink-0">
          <h2 className="font-semibold text-zinc-900 flex items-center gap-2">
            <Users size={18} className="text-orange-500" /> Nova Assembleia
          </h2>
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Título *</label>
            <input className={inputCls} placeholder="Ex: Assembleia Geral Ordinária 2024" value={form.titulo} onChange={e => set('titulo')(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Descrição</label>
            <textarea className={cn(inputCls, 'resize-none')} rows={2} placeholder="Informações adicionais (opcional)" value={form.descricao} onChange={e => set('descricao')(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Data *</label>
              <input className={inputCls} type="date" value={form.data} onChange={e => set('data')(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Hora *</label>
              <input className={inputCls} type="time" value={form.hora} onChange={e => set('hora')(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Local *</label>
            <input className={inputCls} placeholder="Ex: Salão de Festas, Bloco A" value={form.local} onChange={e => set('local')(e.target.value)} />
          </div>

          {/* Pauta */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pontos de Pauta *</label>
              <button onClick={addPauta} className="text-xs text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1">
                <Plus size={12} /> Adicionar ponto
              </button>
            </div>
            {pautaItems.map((p, i) => (
              <div key={i} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 w-5 shrink-0">{i + 1}.</span>
                  <input
                    className="flex-1 px-2 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                    placeholder="Título do ponto *"
                    value={p.titulo}
                    onChange={e => setPauta(i, 'titulo', e.target.value)}
                  />
                  {pautaItems.length > 1 && (
                    <button onClick={() => removePauta(i)} className="p-1 text-zinc-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <input
                  className="w-full px-2 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                  placeholder="Descrição (opcional)"
                  value={p.descricao}
                  onChange={e => setPauta(i, 'descricao', e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-zinc-100 shrink-0">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Criar Assembleia
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Painel de votação de um ponto de pauta ───────────────────────────────────

function PautaVotacaoCard({
  item,
  assembleiaId,
  canManage,
  moradorId,
  moradorNome,
  onUpdate,
}: {
  item: PautaItem;
  assembleiaId: string;
  canManage: boolean;
  moradorId?: string;
  moradorNome?: string;
  onUpdate: () => void;
}) {
  const [resultado, setResultado] = useState(item.resultado ?? '');
  const [savingResultado, setSavingResultado] = useState(false);
  const [votando, setVotando] = useState(false);

  const jaVotou = moradorId ? item.votos.some(v => v.moradorId === moradorId) : false;
  const meuVoto = moradorId ? item.votos.find(v => v.moradorId === moradorId)?.voto : undefined;

  const contagem = {
    sim:       item.votos.filter(v => v.voto === 'sim').length,
    nao:       item.votos.filter(v => v.voto === 'nao').length,
    abstencao: item.votos.filter(v => v.voto === 'abstencao').length,
  };
  const total = item.votos.length;

  const handleVotar = async (voto: TipoVoto) => {
    if (!moradorId || !moradorNome || !item.id) return;
    setVotando(true);
    try {
      await registarVoto(assembleiaId, item.id, moradorId, moradorNome, voto);
      toast.success('Voto registado.');
      onUpdate();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao votar.');
    } finally {
      setVotando(false);
    }
  };

  const handleToggleVotacao = async () => {
    if (!item.id) return;
    try {
      await toggleVotacaoPauta(assembleiaId, item.id, !item.votacaoAtiva);
      toast.success(item.votacaoAtiva ? 'Votação encerrada.' : 'Votação aberta.');
      onUpdate();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro.');
    }
  };

  const handleSaveResultado = async () => {
    if (!resultado.trim() || !item.id) return;
    setSavingResultado(true);
    try {
      await registarResultadoPauta(assembleiaId, item.id, resultado.trim());
      toast.success('Resultado registado.');
      onUpdate();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao registar resultado.');
    } finally {
      setSavingResultado(false);
    }
  };

  return (
    <div className={cn(
      'border rounded-xl p-4 space-y-3 transition-all',
      item.votacaoAtiva ? 'border-orange-300 bg-orange-50/30' : 'border-zinc-200 bg-white',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-900">{item.titulo}</p>
          {item.descricao && <p className="text-xs text-zinc-500 mt-0.5">{item.descricao}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.votacaoAtiva && (
            <span className="text-xs font-bold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full animate-pulse">
              Votação aberta
            </span>
          )}
          {canManage && !item.resultado && (
            <button
              onClick={handleToggleVotacao}
              className={cn(
                'p-1.5 rounded-lg text-xs font-semibold transition-colors',
                item.votacaoAtiva
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-orange-50 text-orange-600 hover:bg-orange-100',
              )}
              title={item.votacaoAtiva ? 'Encerrar votação' : 'Abrir votação'}
            >
              {item.votacaoAtiva ? <StopCircle size={16} /> : <PlayCircle size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Resultado registado */}
      {item.resultado && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-emerald-700 mb-1">Resultado</p>
          <p className="text-sm text-emerald-800">{item.resultado}</p>
        </div>
      )}

      {/* Contagem de votos */}
      {total > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500">{total} voto{total !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'sim',       label: 'Sim',       icon: <CheckCircle2 size={12} />, cls: 'text-emerald-600 bg-emerald-50' },
              { key: 'nao',       label: 'Não',       icon: <XCircle size={12} />,      cls: 'text-red-600 bg-red-50'         },
              { key: 'abstencao', label: 'Abstenção', icon: <Minus size={12} />,        cls: 'text-zinc-500 bg-zinc-100'      },
            ].map(({ key, label, icon, cls }) => (
              <div key={key} className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold', cls)}>
                {icon}
                <span>{label}: {contagem[key as keyof typeof contagem]}</span>
              </div>
            ))}
          </div>
          {total > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden bg-zinc-100 gap-0.5">
              {contagem.sim > 0 && <div className="bg-emerald-400 transition-all" style={{ width: `${(contagem.sim / total) * 100}%` }} />}
              {contagem.nao > 0 && <div className="bg-red-400 transition-all" style={{ width: `${(contagem.nao / total) * 100}%` }} />}
              {contagem.abstencao > 0 && <div className="bg-zinc-300 transition-all" style={{ width: `${(contagem.abstencao / total) * 100}%` }} />}
            </div>
          )}
        </div>
      )}

      {/* Botões de voto para morador */}
      {item.votacaoAtiva && moradorId && !jaVotou && (
        <div className="flex gap-2">
          {(['sim', 'nao', 'abstencao'] as TipoVoto[]).map(v => (
            <button
              key={v}
              onClick={() => handleVotar(v)}
              disabled={votando}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-60',
                v === 'sim'       ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' :
                v === 'nao'       ? 'border-red-300 text-red-700 hover:bg-red-50'             :
                                    'border-zinc-200 text-zinc-600 hover:bg-zinc-50',
              )}
            >
              {v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : 'Abstenção'}
            </button>
          ))}
        </div>
      )}

      {/* Voto já registado */}
      {jaVotou && meuVoto && (
        <div className="text-xs text-zinc-500 flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-500" />
          Votaste: <span className="font-semibold capitalize">{meuVoto === 'nao' ? 'Não' : meuVoto === 'abstencao' ? 'Abstenção' : 'Sim'}</span>
        </div>
      )}

      {/* Registar resultado (gestor/síndico) */}
      {canManage && !item.resultado && total > 0 && !item.votacaoAtiva && (
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            placeholder="Registar resultado da votação..."
            value={resultado}
            onChange={e => setResultado(e.target.value)}
          />
          <button
            onClick={handleSaveResultado}
            disabled={savingResultado || !resultado.trim()}
            className="px-3 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition disabled:opacity-60 flex items-center gap-1"
          >
            {savingResultado ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Card de Assembleia ───────────────────────────────────────────────────────

function AssembleiaCard({
  assembleia,
  canManage,
  moradorId,
  moradorNome,
  onUpdate,
  onDelete,
}: {
  assembleia: Assembleia;
  canManage: boolean;
  moradorId?: string;
  moradorNome?: string;
  onUpdate: () => void;
  onDelete: (id: string, titulo: string) => void;
}) {
  const [expanded, setExpanded] = useState(assembleia.status === 'em_curso');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const statusCfg = STATUS_CFG[assembleia.status];

  const handleStatusChange = async (novoStatus: StatusAssembleia) => {
    setUpdatingStatus(true);
    try {
      await updateStatusAssembleia(assembleia.id, novoStatus);
      toast.success(`Assembleia marcada como "${STATUS_CFG[novoStatus].label}".`);
      onUpdate();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao actualizar estado.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className={cn(
      'bg-white border rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md',
      assembleia.status === 'em_curso' ? 'border-orange-300 ring-1 ring-orange-100' : 'border-zinc-200',
    )}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-zinc-900">{assembleia.titulo}</h3>
            {assembleia.descricao && (
              <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{assembleia.descricao}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', statusCfg.cls)}>
              {statusCfg.label}
            </span>
            {canManage && (
              <button
                onClick={() => onDelete(assembleia.id, assembleia.titulo)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} className="text-zinc-400" />
            {formatDate(assembleia.data)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="text-zinc-400" />
            {assembleia.local}
          </span>
          <span className="flex items-center gap-1.5">
            <ClipboardList size={13} className="text-zinc-400" />
            {assembleia.pauta.length} ponto{assembleia.pauta.length !== 1 ? 's' : ''} de pauta
          </span>
        </div>

        {/* Acções de estado */}
        {canManage && (
          <div className="flex gap-2 mt-4">
            {assembleia.status === 'agendada' && (
              <button
                onClick={() => handleStatusChange('em_curso')}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition disabled:opacity-60"
              >
                {updatingStatus ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
                Iniciar
              </button>
            )}
            {assembleia.status === 'em_curso' && (
              <button
                onClick={() => handleStatusChange('encerrada')}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition disabled:opacity-60"
              >
                {updatingStatus ? <Loader2 size={12} className="animate-spin" /> : <StopCircle size={12} />}
                Encerrar
              </button>
            )}
            {assembleia.status === 'agendada' && (
              <button
                onClick={() => handleStatusChange('cancelada')}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-lg transition disabled:opacity-60"
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Toggle pauta */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-3 bg-zinc-50 border-t border-zinc-100 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
      >
        <span>Ver Pauta ({assembleia.pauta.length} pontos)</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Pauta expandida */}
      {expanded && (
        <div className="p-5 space-y-3 border-t border-zinc-100">
          {assembleia.pauta.map((item, i) => (
            <div key={item.id} className="flex gap-3">
              <span className="text-xs font-bold text-zinc-400 mt-3 w-5 shrink-0">{i + 1}.</span>
              <div className="flex-1">
                <PautaVotacaoCard
                  item={item}
                  assembleiaId={assembleia.id}
                  canManage={canManage && assembleia.status === 'em_curso'}
                  moradorId={moradorId}
                  moradorNome={moradorNome}
                  onUpdate={onUpdate}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function AssembleiasPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData } = useAuthContext();
  const role = userData?.role;

  const podeCriar   = role ? can(role, 'create', 'assembleia') : false;
  const podeGerir   = role ? can(role, 'update', 'assembleia') : false;
  const isMorador   = role === 'morador';

  const [assembleias, setAssembleias] = useState<Assembleia[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusAssembleia | 'todas'>('todas');
  const [showModal, setShowModal]     = useState(false);

  const fetchAssembleias = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAssembleias(condoId);
      setAssembleias(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [condoId]);

  useEffect(() => { fetchAssembleias(); }, [fetchAssembleias]);

  const handleDelete = (id: string, titulo: string) => {
    toast(`Eliminar "${titulo}"?`, {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await deleteAssembleia(id);
            toast.success('Assembleia eliminada.');
            fetchAssembleias();
          } catch (e: any) {
            toast.error(e?.message ?? 'Erro ao eliminar.');
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  const filtered = assembleias.filter(a => {
    const matchSearch = search === '' || a.titulo.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFiltro === 'todas' || a.status === statusFiltro;
    return matchSearch && matchStatus;
  });

  const emCurso = assembleias.filter(a => a.status === 'em_curso').length;

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-xl">
            <Users size={20} className="text-purple-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Assembleias & Votação</h1>
            <p className="text-sm text-zinc-500">Convocatórias, votações e registo de decisões</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAssembleias} disabled={loading} className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition disabled:opacity-50">
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          </button>
          {podeCriar && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus size={16} /> Nova Assembleia
            </button>
          )}
        </div>
      </div>

      {/* Alerta em curso */}
      {emCurso > 0 && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
          <Vote size={18} className="text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700 font-medium">
            {emCurso} assembleia{emCurso > 1 ? 's' : ''} em curso agora
            {isMorador && ' — podes votar nos pontos de pauta abertos'}
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(STATUS_CFG) as [StatusAssembleia, typeof STATUS_CFG[StatusAssembleia]][]).map(([status, cfg]) => (
          <button
            key={status}
            onClick={() => setStatusFiltro(statusFiltro === status ? 'todas' : status)}
            className={cn(
              'bg-white border rounded-2xl p-4 shadow-sm text-center transition-all hover:shadow-md',
              statusFiltro === status ? 'border-orange-300 ring-2 ring-orange-100' : 'border-zinc-200',
            )}
          >
            <p className="text-2xl font-bold text-zinc-900">{assembleias.filter(a => a.status === status).length}</p>
            <p className="text-xs text-zinc-500 mt-1">{cfg.label}</p>
          </button>
        ))}
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar assembleias..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Users size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhuma assembleia encontrada</p>
          {podeCriar && <p className="text-xs mt-1 opacity-70">Clica em "Nova Assembleia" para criar</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(a => (
            <AssembleiaCard
              key={a.id}
              assembleia={a}
              canManage={podeGerir}
              moradorId={isMorador ? userData?.uid : undefined}
              moradorNome={isMorador ? userData?.nome : undefined}
              onUpdate={fetchAssembleias}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && userData && (
        <NovaAssembleiaModal
          condominioId={condoId}
          autorId={userData.uid}
          autorNome={userData.nome}
          onClose={() => setShowModal(false)}
          onSuccess={fetchAssembleias}
        />
      )}
    </main>
  );
}
