'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Users, Plus, Search, X, LogOut, Loader2 } from 'lucide-react';

interface Visitante {
  id: string;
  nome: string;
  documento?: string;
  unidadeDestino: string;
  motivoVisita?: string;
  entrada: string;
  saida?: string;
  status: 'dentro' | 'saiu';
  condominioId: string;
}

function Modal({ onClose, onSave }: { onClose: () => void; onSave: (v: Omit<Visitante, 'id' | 'condominioId'>) => void }) {
  const [form, setForm] = useState({ nome: '', documento: '', unidadeDestino: '', motivoVisita: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.nome.trim() || !form.unidadeDestino.trim()) return;
    setSaving(true);
    await onSave({ ...form, entrada: new Date().toLocaleString('pt-AO'), status: 'dentro' });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">Registar Visitante</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><X size={16} /></button>
        </div>
        {[
          { key: 'nome',           label: 'Nome Completo *',   placeholder: 'Ex: João Silva'    },
          { key: 'documento',      label: 'BI / Documento',    placeholder: 'Nº do documento'   },
          { key: 'unidadeDestino', label: 'Unidade Destino *', placeholder: 'Ex: A8, 3B'        },
          { key: 'motivoVisita',   label: 'Motivo da Visita',  placeholder: 'Ex: Visita familiar'},
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1 block">{label}</label>
            <input
              type="text"
              value={(form as Record<string, string>)[key]}
              onChange={e => setForm({ ...form, [key]: e.target.value })}
              placeholder={placeholder}
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Registar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VisitantesPage() {
  const { userData } = useAuthContext();
  const condoId = userData?.condominioId ?? '';

  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showModal, setShowModal]   = useState(false);

  useEffect(() => {
    if (!condoId) { setLoading(false); return; }
    const fetch = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'visitantes'), where('condominioId', '==', condoId)));
        setVisitantes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Visitante)));
      } catch (e) { console.error('Erro ao carregar visitantes:', e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [condoId]);

  const handleSave = async (v: Omit<Visitante, 'id' | 'condominioId'>) => {
    if (!condoId || !userData?.uid) return;
    try {
      const docRef = await addDoc(collection(db, 'visitantes'), {
        ...v,
        condominioId: condoId,
        criadoPor:    userData.uid,
        createdAt:    serverTimestamp(),
      });
      setVisitantes(prev => [{ id: docRef.id, ...v, condominioId: condoId }, ...prev]);
      setShowModal(false);
    } catch (e) { console.error('Erro ao registar visitante:', e); }
  };

  const handleSaida = async (id: string) => {
    try {
      await updateDoc(doc(db, 'visitantes', id), {
        status: 'saiu',
        saida:  new Date().toLocaleString('pt-AO'),
      });
      setVisitantes(prev => prev.map(v => v.id === id ? { ...v, status: 'saiu', saida: new Date().toLocaleString('pt-AO') } : v));
    } catch (e) { console.error('Erro ao registar saída:', e); }
  };

  const filtered = visitantes.filter(v =>
    v.nome.toLowerCase().includes(search.toLowerCase()) ||
    v.unidadeDestino.toLowerCase().includes(search.toLowerCase())
  );

  const dentro = visitantes.filter(v => v.status === 'dentro').length;

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">
      {showModal && <Modal onClose={() => setShowModal(false)} onSave={handleSave} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users size={22} className="text-orange-500" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Visitantes</h1>
            <p className="text-sm text-zinc-500">Controlo de entrada e saída</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus size={16} /> Registar Visitante
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-orange-500">{dentro}</p>
          <p className="text-xs text-zinc-500 mt-1">Dentro do Condomínio</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-zinc-500">{visitantes.length}</p>
          <p className="text-xs text-zinc-500 mt-1">Total Registado</p>
        </div>
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Pesquisar visitante ou unidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-orange-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <Users size={36} className="mb-2 opacity-30" />
          <p className="text-sm">Nenhum visitante registado</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-100">
            {filtered.map(v => (
              <div key={v.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {v.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{v.nome}</p>
                    <p className="text-xs text-zinc-500">
                      Unidade {v.unidadeDestino} · Entrada: {v.entrada}
                      {v.saida && ` · Saída: ${v.saida}`}
                    </p>
                    {v.motivoVisita && <p className="text-xs text-zinc-400">{v.motivoVisita}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    v.status === 'dentro' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                  }`}>
                    {v.status === 'dentro' ? 'Dentro' : 'Saiu'}
                  </span>
                  {v.status === 'dentro' && (
                    <button
                      onClick={() => handleSaida(v.id)}
                      className="p-1.5 rounded-lg border border-zinc-200 hover:bg-red-50 hover:border-red-200 text-zinc-400 hover:text-red-500 transition-colors"
                      title="Registar saída"
                    >
                      <LogOut size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}