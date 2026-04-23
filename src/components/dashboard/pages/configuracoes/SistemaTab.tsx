'use client';

import { useState } from 'react';
import {
  Moon, Sun, Monitor, Loader2, Save,
  Bell, Mail, Zap, LayoutGrid, Type,
  Globe, Eye,
} from 'lucide-react';
import { useUserPreferences, Tema, DensidadeUI } from '@/contexts/UserPreferencesContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// PRIMITIVOS DE UI
// ─────────────────────────────────────────────

function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-5">
      <div>
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">{title}</h3>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
        checked ? 'bg-orange-500' : 'bg-zinc-200',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-6' : 'translate-x-1',
      )} />
    </button>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ─────────────────────────────────────────────
// SELETOR DE TEMA
// ─────────────────────────────────────────────

const TEMAS: { key: Tema; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'claro',   label: 'Claro',   icon: <Sun size={18} />,     desc: 'Interface clara' },
  { key: 'escuro',  label: 'Escuro',  icon: <Moon size={18} />,    desc: 'Interface escura' },
  { key: 'sistema', label: 'Sistema', icon: <Monitor size={18} />, desc: 'Segue o SO' },
];

function TemaSelector({ value, onChange }: { value: Tema; onChange: (v: Tema) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {TEMAS.map(t => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium',
            value === t.key
              ? 'border-orange-500 bg-orange-50 text-orange-700'
              : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
          )}
        >
          <span className={value === t.key ? 'text-orange-500' : 'text-zinc-400'}>{t.icon}</span>
          <span>{t.label}</span>
          <span className="text-[10px] text-zinc-400 font-normal">{t.desc}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// SELETOR DE DENSIDADE
// ─────────────────────────────────────────────

const DENSIDADES: { key: DensidadeUI; label: string; desc: string }[] = [
  { key: 'compacta',  label: 'Compacta',  desc: 'Mais informação por ecrã' },
  { key: 'normal',    label: 'Normal',    desc: 'Equilíbrio padrão' },
  { key: 'espaçosa',  label: 'Espaçosa',  desc: 'Mais espaço entre elementos' },
];

function DensidadeSelector({ value, onChange }: { value: DensidadeUI; onChange: (v: DensidadeUI) => void }) {
  return (
    <div className="flex gap-2">
      {DENSIDADES.map(d => (
        <button
          key={d.key}
          type="button"
          onClick={() => onChange(d.key)}
          className={cn(
            'flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all text-xs font-medium',
            value === d.key
              ? 'border-orange-500 bg-orange-50 text-orange-700'
              : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
          )}
        >
          <span className="font-semibold">{d.label}</span>
          <span className="text-[10px] text-zinc-400 font-normal text-center">{d.desc}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function SistemaTab() {
  const { prefs, updatePref, savePrefs, saving } = useUserPreferences();

  const handleSave = async () => {
    try {
      await savePrefs();
      toast.success('Configurações guardadas com sucesso.');
    } catch {
      toast.error('Erro ao guardar configurações.');
    }
  };

  return (
    <div className="max-w-2xl space-y-6">

      {/* Aparência */}
      <Section
        title="Aparência"
        description="Personalize o aspecto visual da aplicação"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <Sun size={15} className="text-zinc-400" />
            Tema
          </div>
          <TemaSelector
            value={prefs.tema}
            onChange={v => updatePref('tema', v)}
          />
        </div>

        <div className="h-px bg-zinc-100" />

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <LayoutGrid size={15} className="text-zinc-400" />
            Densidade da interface
          </div>
          <DensidadeSelector
            value={prefs.densidade}
            onChange={v => updatePref('densidade', v)}
          />
        </div>

        <div className="h-px bg-zinc-100" />

        <ToggleRow
          label="Animações"
          description="Transições e efeitos visuais na interface"
          checked={prefs.animacoes}
          onChange={v => updatePref('animacoes', v)}
        />

        <ToggleRow
          label="Mostrar avatares"
          description="Exibir fotos de perfil nas listas e tabelas"
          checked={prefs.mostrarAvatares}
          onChange={v => updatePref('mostrarAvatares', v)}
        />
      </Section>

      {/* Notificações */}
      <Section
        title="Notificações"
        description="Controle como e quando recebe alertas"
      >
        <ToggleRow
          label="Notificações por email"
          description="Receber alertas e resumos por email"
          checked={prefs.notificacoesEmail}
          onChange={v => updatePref('notificacoesEmail', v)}
        />

        <div className="h-px bg-zinc-100" />

        <ToggleRow
          label="Notificações push"
          description="Alertas em tempo real no browser"
          checked={prefs.notificacoesPush}
          onChange={v => updatePref('notificacoesPush', v)}
        />

        <div className="h-px bg-zinc-100" />

        <ToggleRow
          label="Ocorrências"
          description="Notificar quando uma ocorrência é criada ou actualizada"
          checked={prefs.notificacoesOcorrencias}
          onChange={v => updatePref('notificacoesOcorrencias', v)}
        />

        <ToggleRow
          label="Financeiro"
          description="Alertas de pagamentos pendentes e inadimplência"
          checked={prefs.notificacoesFinanceiro}
          onChange={v => updatePref('notificacoesFinanceiro', v)}
        />
      </Section>

      {/* Idioma */}
      <Section title="Idioma e Região">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-zinc-400" />
            <div>
              <p className="text-sm font-medium text-zinc-900">Idioma da aplicação</p>
              <p className="text-xs text-zinc-500">Língua usada em menus e mensagens</p>
            </div>
          </div>
          <select
            value={prefs.idioma}
            onChange={e => updatePref('idioma', e.target.value as 'pt' | 'en')}
            className="px-3 py-2 rounded-xl border border-zinc-200 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="pt">Português</option>
            <option value="en">English</option>
          </select>
        </div>
      </Section>

      {/* Preview do tema activo */}
      <div className={cn(
        'rounded-2xl border-2 p-5 transition-all',
        prefs.tema === 'escuro'
          ? 'bg-zinc-900 border-zinc-700'
          : 'bg-white border-zinc-200',
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Eye size={14} className={prefs.tema === 'escuro' ? 'text-zinc-400' : 'text-zinc-400'} />
          <span className={cn('text-xs font-semibold uppercase tracking-wider', prefs.tema === 'escuro' ? 'text-zinc-400' : 'text-zinc-400')}>
            Pré-visualização
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', prefs.tema === 'escuro' ? 'bg-zinc-800' : 'bg-zinc-100')}>
            <span className={cn('text-lg font-bold', prefs.tema === 'escuro' ? 'text-orange-400' : 'text-orange-500')}>M</span>
          </div>
          <div>
            <p className={cn('text-sm font-semibold', prefs.tema === 'escuro' ? 'text-zinc-100' : 'text-zinc-900')}>
              NETSUL<span className='text-orange-400'>CONDO</span>
            </p>
            <p className={cn('text-xs', prefs.tema === 'escuro' ? 'text-zinc-400' : 'text-zinc-500')}>
              Tema: {prefs.tema === 'claro' ? 'Claro' : prefs.tema === 'escuro' ? 'Escuro' : 'Sistema'}
            </p>
          </div>
        </div>
      </div>

      {/* Guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'A guardar...' : 'Guardar configurações'}
        </button>
      </div>

    </div>
  );
}
