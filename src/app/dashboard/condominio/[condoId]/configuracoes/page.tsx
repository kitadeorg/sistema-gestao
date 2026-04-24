'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import {
  Settings, ArrowLeft, Save, Building2, MapPin,
  Phone, Mail, CheckCircle2, Receipt, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CondominioConfig {
  nome: string;
  status: 'active' | 'inactive';
  totalUnidades: number;
  // Quota — guardada directamente no doc raiz para compatibilidade com gerarQuotasMensais
  valorQuotaMensal: number;
  diaVencimentoQuota: number;
  multaPorAtraso: number;
  jurosMensal: number;
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

function Field({
  label, value, onChange, type = 'text', placeholder, hint, min, max, prefix,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  prefix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">{prefix}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          className={cn(
            'w-full py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white',
            prefix ? 'pl-8 pr-3' : 'px-3',
          )}
        />
      </div>
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 font-semibold text-zinc-800">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { condoId } = useParams() as { condoId: string };
  const [config, setConfig] = useState<CondominioConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    if (!condoId) return;
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'condominios', condoId));
        if (snap.exists()) {
          const d = snap.data();
          // Compatibilidade: lê de configuracoes{} ou do raiz
          setConfig({
            nome:               d.nome ?? '',
            status:             d.status ?? 'active',
            totalUnidades:      d.totalUnidades ?? 0,
            valorQuotaMensal:   d.valorQuotaMensal ?? d.configuracoes?.valorQuotaMensal ?? 0,
            diaVencimentoQuota: d.diaVencimentoQuota ?? d.configuracoes?.diaVencimento ?? 5,
            multaPorAtraso:     d.multaPorAtraso ?? d.configuracoes?.multaPorAtraso ?? 0,
            jurosMensal:        d.jurosMensal ?? d.configuracoes?.jurosMensal ?? 0,
            endereco:           d.endereco ?? {},
            contacto:           d.contacto ?? {},
          });
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [condoId]);

  const handleSave = async () => {
    if (!config || !condoId) return;
    setSaving(true);
    try {
      // Guardar apenas os campos que gerimos — não sobrescrever totalMoradores, etc.
      await updateDoc(doc(db, 'condominios', condoId), {
        nome:               config.nome,
        status:             config.status,
        valorQuotaMensal:   config.valorQuotaMensal,
        diaVencimentoQuota: config.diaVencimentoQuota,
        multaPorAtraso:     config.multaPorAtraso,
        jurosMensal:        config.jurosMensal,
        endereco:           config.endereco,
        contacto:           config.contacto ?? {},
        updatedAt:          serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof CondominioConfig) => (v: string) =>
    setConfig(prev => prev ? { ...prev, [key]: key === 'nome' || key === 'status' ? v : Number(v) } : prev);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
      </div>
    );
  }
  if (!config) return <div className="p-8 text-red-500">Condomínio não encontrado.</div>;

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">

      <Link href={`/dashboard/condominio/${condoId}`} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition">
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Settings size={22} className="text-orange-500" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Configurações</h1>
            <p className="text-sm text-zinc-500">Dados e definições do condomínio</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          {saving ? (
            <><Loader2 size={15} className="animate-spin" />A guardar...</>
          ) : saved ? (
            <><CheckCircle2 size={15} />Guardado</>
          ) : (
            <><Save size={15} />Guardar Alterações</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Informações Gerais */}
        <Section icon={<Building2 size={16} className="text-orange-500" />} title="Informações Gerais">
          <Field
            label="Nome do Condomínio"
            value={config.nome}
            onChange={v => setConfig(prev => prev ? { ...prev, nome: v } : prev)}
            placeholder="Ex: Residencial Jardins"
          />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Estado</label>
            <select
              value={config.status}
              onChange={e => setConfig(prev => prev ? { ...prev, status: e.target.value as 'active' | 'inactive' } : prev)}
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
        </Section>

        {/* Quotas Mensais */}
        <Section icon={<Receipt size={16} className="text-orange-500" />} title="Quotas Mensais">
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-700">
            Estes valores são usados ao gerar as quotas mensais. Unidades com quota individual configurada usam o seu próprio valor.
          </div>

          <Field
            label="Valor Padrão da Quota (Kz)"
            value={config.valorQuotaMensal}
            onChange={set('valorQuotaMensal')}
            type="number"
            min={0}
            placeholder="Ex: 15000"
            prefix="Kz"
            hint="Aplicado a todas as unidades sem quota individual"
          />

          <Field
            label="Dia de Vencimento"
            value={config.diaVencimentoQuota}
            onChange={set('diaVencimentoQuota')}
            type="number"
            min={1}
            max={28}
            placeholder="5"
            hint="Dia do mês em que a quota vence (1–28)"
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Multa por Atraso (%)"
              value={config.multaPorAtraso}
              onChange={set('multaPorAtraso')}
              type="number"
              min={0}
              placeholder="0"
              hint="% sobre o valor em atraso"
            />
            <Field
              label="Juros Mensal (%)"
              value={config.jurosMensal}
              onChange={set('jurosMensal')}
              type="number"
              min={0}
              placeholder="0"
              hint="% ao mês sobre o valor em atraso"
            />
          </div>

          {/* Preview */}
          {config.valorQuotaMensal > 0 && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-zinc-600">Resumo</p>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Quota mensal padrão</span>
                <span className="font-bold text-zinc-900">
                  {config.valorQuotaMensal.toLocaleString('pt-AO')} Kz
                </span>
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Vencimento</span>
                <span className="font-medium text-zinc-700">Dia {config.diaVencimentoQuota || 5} de cada mês</span>
              </div>
              {config.multaPorAtraso > 0 && (
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Multa por atraso</span>
                  <span className="font-medium text-red-600">{config.multaPorAtraso}%</span>
                </div>
              )}
              {config.jurosMensal > 0 && (
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Juros mensal</span>
                  <span className="font-medium text-red-600">{config.jurosMensal}%</span>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Endereço */}
        <Section icon={<MapPin size={16} className="text-orange-500" />} title="Endereço">
          {[
            { key: 'rua',       label: 'Rua / Avenida',  placeholder: 'Ex: Av. 21 de Janeiro' },
            { key: 'numero',    label: 'Número',          placeholder: 'Ex: 123'               },
            { key: 'bairro',    label: 'Bairro',          placeholder: 'Ex: Miramar'            },
            { key: 'cidade',    label: 'Cidade',          placeholder: 'Ex: Luanda'             },
            { key: 'provincia', label: 'Província',       placeholder: 'Ex: Luanda'             },
          ].map(({ key, label, placeholder }) => (
            <Field
              key={key}
              label={label}
              value={(config.endereco as Record<string, string>)[key] ?? ''}
              onChange={v => setConfig(prev => prev ? { ...prev, endereco: { ...prev.endereco, [key]: v } } : prev)}
              placeholder={placeholder}
            />
          ))}
        </Section>

        {/* Contacto */}
        <Section icon={<Phone size={16} className="text-orange-500" />} title="Contacto">
          <Field
            label="Email"
            value={config.contacto?.email ?? ''}
            onChange={v => setConfig(prev => prev ? { ...prev, contacto: { ...prev.contacto, email: v } } : prev)}
            type="email"
            placeholder="admin@condominio.ao"
          />
          <Field
            label="Telefone"
            value={config.contacto?.telefone ?? ''}
            onChange={v => setConfig(prev => prev ? { ...prev, contacto: { ...prev.contacto, telefone: v } } : prev)}
            type="tel"
            placeholder="+244 9XX XXX XXX"
          />
        </Section>

      </div>
    </main>
  );
}
