'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Wrench, Search } from 'lucide-react';

interface Manutencao {
  id: string;
  titulo: string;
  descricao?: string;
  status: 'pendente' | 'em_execucao' | 'concluida';
  prioridade: 'baixa' | 'media' | 'alta';
  local?: string;
  prazo?: string;
  responsavel?: string;
}

function PrioridadeBadge({ prioridade }: { prioridade: Manutencao['prioridade'] }) {
  const map   = { alta: 'bg-red-50 text-red-600', media: 'bg-amber-50 text-amber-600', baixa: 'bg-zinc-100 text-zinc-500' };
  const label = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[prioridade]}`}>
      {label[prioridade]}
    </span>
  );
}

export default function ManutencaoFuncionarioPage() {
  const { userData } = useAuthContext(); // ✅ consistente com o resto do projecto
  const condoId = userData?.condominioId ?? '';

  const [items,   setItems]   = useState<Manutencao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filtro,  setFiltro]  = useState<'todos' | 'pendente' | 'em_execucao' | 'concluida'>('todos');

  useEffect(() => {
    if (!condoId) return;

    const fetchItems = async () => {
      try {
        const q = query(
          collection(db, 'manutencao'),
          where('condominioId', '==', condoId)
        );
        const snap = await getDocs(q);
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Manutencao)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [condoId]);

  const handleStatus = async (id: string, status: Manutencao['status']) => {
    try {
      await updateDoc(doc(db, 'manutencao', id), {
        status,
        updatedAt: serverTimestamp(), // ✅ regista a data de alteração
      });
      setItems(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = items
    .filter(m => filtro === 'todos' || m.status === filtro)
    .filter(m => m.titulo.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">

      <div className="flex items-center gap-3">
        <Wrench size={22} className="text-orange-500" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Manutenção</h1>
          <p className="text-sm text-zinc-500">Tarefas de manutenção do condomínio</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pendentes',   value: items.filter(m => m.status === 'pendente').length,    cor: 'text-amber-500'   },
          { label: 'Em Execução', value: items.filter(m => m.status === 'em_execucao').length, cor: 'text-blue-500'    },
          { label: 'Concluídas',  value: items.filter(m => m.status === 'concluida').length,   cor: 'text-emerald-500' },
        ].map(({ label, value, cor }) => (
          <div key={label} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${cor}`}>{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros + Pesquisa */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(['todos', 'pendente', 'em_execucao', 'concluida'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${
                filtro === f
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'em_execucao' ? 'Em Execução' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar manutenção..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="p-8 text-zinc-500 text-sm text-center">A carregar...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <Wrench size={36} className="mb-2 opacity-30" />
          <p className="text-sm">Nenhuma manutenção encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <div
              key={m.id}
              className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-4 hover:shadow-md transition-shadow"
            >
              <div>
                <p className="text-sm font-semibold text-zinc-900">{m.titulo}</p>
                {m.descricao && (
                  <p className="text-xs text-zinc-500 mt-0.5">{m.descricao}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <PrioridadeBadge prioridade={m.prioridade} />
                  {m.local && (
                    <span className="text-xs text-zinc-400">📍 {m.local}</span>
                  )}
                  {m.prazo && (
                    <span className="text-xs text-zinc-400">· Prazo: {m.prazo}</span>
                  )}
                </div>
              </div>

              <select
                value={m.status}
                onChange={e => handleStatus(m.id, e.target.value as Manutencao['status'])}
                className="text-xs border border-zinc-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 shrink-0"
              >
                <option value="pendente">Pendente</option>
                <option value="em_execucao">Em Execução</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}