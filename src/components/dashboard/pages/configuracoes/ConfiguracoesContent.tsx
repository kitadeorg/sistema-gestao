'use client';

import { useState } from 'react';
import { User, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import PerfilTab from './PerfilTab';
import SistemaTab from './SistemaTab';

type Tab = 'perfil' | 'sistema';

export default function ConfiguracoesContent() {
  const [activeTab, setActiveTab] = useState<Tab>('perfil');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'perfil',  label: 'Perfil',  icon: <User size={16} /> },
    { key: 'sistema', label: 'Sistema', icon: <SettingsIcon size={16} /> },
  ];

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Configurações</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Gerir o seu perfil e preferências do sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2',
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="animate-in fade-in duration-200">
        {activeTab === 'perfil'  && <PerfilTab />}
        {activeTab === 'sistema' && <SistemaTab />}
      </div>

    </main>
  );
}
