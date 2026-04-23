'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { Settings, ArrowLeft, Save, Building2, MapPin, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

interface CondominioConfig {
  nome: string;
  status: 'active' | 'inactive';
  totalUnidades: number;
  endereco: {
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    provincia?: string;
  };
  contacto?: {
    email?: string;
    telefone?: string;
  };
}

export default function ConfiguracoesPage() {
  const { condoId } = useParams() as { condoId: string };
  const [config, setConfig] = useState<CondominioConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!condoId) return;
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'condominios', condoId));
        if (snap.exists()) setConfig(snap.data() as CondominioConfig);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [condoId]);

  const handleSave = async () => {
    if (!config || !condoId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'condominios', condoId), { ...config });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">A carregar configurações...</div>;
  if (!config) return <div className="p-8 text-red-500">Condomínio não encontrado.</div>;

  return (
    <main className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">

      <Link href={`/dashboard/condominio/${condoId}`} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition">
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Settings size={22} className="text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Configurações</h1>
            <p className="text-sm text-zinc-500">Dados e definições do condomínio</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Save size={16} />
          {saving ? 'A guardar...' : saved ? 'Guardado ✓' : 'Guardar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Informações Gerais */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-zinc-700 font-semibold">
            <Building2 size={16} className="text-orange-500" />
            Informações Gerais
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Nome do Condomínio</label>
              <input
                type="text"
                value={config.nome}
                onChange={e => setConfig({ ...config, nome: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Total de Unidades</label>
              <input
                type="number"
                value={config.totalUnidades}
                onChange={e => setConfig({ ...config, totalUnidades: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Estado</label>
              <select
                value={config.status}
                onChange={e => setConfig({ ...config, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-zinc-700 font-semibold">
            <MapPin size={16} className="text-orange-500" />
            Endereço
          </div>

          <div className="space-y-3">
            {[
              { key: 'rua',      label: 'Rua / Avenida' },
              { key: 'numero',   label: 'Número' },
              { key: 'bairro',   label: 'Bairro' },
              { key: 'cidade',   label: 'Cidade' },
              { key: 'provincia',label: 'Província' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">{label}</label>
                <input
                  type="text"
                  value={(config.endereco as Record<string, string>)[key] ?? ''}
                  onChange={e => setConfig({
                    ...config,
                    endereco: { ...config.endereco, [key]: e.target.value },
                  })}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-zinc-700 font-semibold">
            <Phone size={16} className="text-orange-500" />
            Contacto
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block flex items-center gap-1">
                <Mail size={11} /> Email
              </label>
              <input
                type="email"
                value={config.contacto?.email ?? ''}
                onChange={e => setConfig({
                  ...config,
                  contacto: { ...config.contacto, email: e.target.value },
                })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block flex items-center gap-1">
                <Phone size={11} /> Telefone
              </label>
              <input
                type="tel"
                value={config.contacto?.telefone ?? ''}
                onChange={e => setConfig({
                  ...config,
                  contacto: { ...config.contacto, telefone: e.target.value },
                })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}