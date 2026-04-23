'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Users, ArrowLeft, Plus, X, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Visitante {
  id: string;
  nome: string;
  documento?: string;
  unidadeDestino: string;
  motivoVisita?: string;
  entrada: string;
  saida?: string;
  status: 'dentro' | 'saiu';
}

function Modal({ onClose, onSave, unidade }: { onClose: () => void; onSave: (v: Omit<Visitante, 'id'>) => void; unidade: string }) {
  const [form, setForm] = useState({ nome: '', documento: '', motivoVisita: '' });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">Registar Visitante</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {[
            { key: 'nome', label: 'Nome Completo *', placeholder: 'Ex: João Manuel' },
            { key: 'documento', label: 'BI / Documento', placeholder: 'Nº do Bilhete' },
            { key: 'motivoVisita', label: 'Motivo da Visita', placeholder: 'Ex: Entrega, Visita familiar' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">{label}</label>
              <input 
                type="text" 
                placeholder={placeholder}
                value={(form as any)[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" 
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => form.nome && onSave({ ...form, unidadeDestino: unidade, entrada: new Date().toLocaleString('pt-AO'), status: 'dentro' })}
            disabled={!form.nome}
            className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm"
          >
            Registar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VisitantesMoradorPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData, loading: authLoading } = useAuth();

  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Solução para o erro de conversão de tipo (Type Cast)
  const unidade = (userData as any)?.unidade ?? 'Minha Unidade';

  useEffect(() => {
    if (authLoading || !condoId || !userData?.uid) return;
    
    const fetchVisitantes = async () => {
      try {
        const q = query(
          collection(db, 'visitantes'), 
          where('condominioId', '==', condoId),
          where('unidadeDestino', '==', unidade) // Filtra apenas para a unidade do morador
        );
        const snap = await getDocs(q);
        setVisitantes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Visitante)));
      } catch (e) { 
        console.error("Erro ao procurar visitantes:", e); 
      } finally { 
        setLoading(false); 
      }
    };

    fetchVisitantes();
  }, [condoId, userData?.uid, authLoading, unidade]);

  const handleSave = async (v: Omit<Visitante, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'visitantes'), { 
        ...v, 
        condominioId: condoId, 
        criadoEm: Timestamp.now(),
        moradorUid: userData?.uid // Rastreabilidade
      });
      setVisitantes(prev => [{ id: docRef.id, ...v }, ...prev]);
      setShowModal(false);
    } catch (e) { 
      console.error("Erro ao salvar:", e); 
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">
      {showModal && <Modal onClose={() => setShowModal(false)} onSave={handleSave} unidade={unidade} />}

      <Link 
        href={`/dashboard/condominio/${condoId}/morador`} 
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
        Voltar ao Painel
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-xl">
            <Users size={22} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Meus Visitantes</h1>
            <p className="text-sm text-zinc-500">Gestão de acessos para a unidade: <span className="font-semibold text-zinc-700">{unidade}</span></p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-all shadow-sm active:scale-95"
        >
          <Plus size={16} /> Registar Visitante
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-orange-500">{visitantes.filter(v => v.status === 'dentro').length}</p>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-medium">No Momento</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-zinc-500">{visitantes.length}</p>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-medium">Histórico Total</p>
        </div>
      </div>

      {visitantes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-3xl text-zinc-400">
          <Users size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Nenhum visitante registado</p>
          <p className="text-xs mt-1 text-zinc-400">Os teus registos de entrada aparecerão aqui.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-100">
            {visitantes.map(v => (
              <div key={v.id} className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-sm shrink-0 border border-zinc-200">
                    {v.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{v.nome}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                       <span>{v.documento || 'Sem doc.'}</span>
                       <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
                       <span>{v.entrada}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-tight ${
                  v.status === 'dentro' 
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                  : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                }`}>
                  {v.status === 'dentro' ? 'Presente' : 'Saiu'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}