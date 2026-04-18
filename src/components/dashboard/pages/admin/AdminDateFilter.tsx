'use client';

import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import 'react-day-picker/dist/style.css'; // Estilo base do DayPicker

type Preset = 'mes' | 'trimestre' | 'ano' | 'custom';

interface AdminDateFilterProps {
  dataInicio: Date;
  dataFim: Date;
  activePreset: Preset;
  onDatasChange: (dates: { inicio: Date, fim: Date }) => void;
  onPresetChange: (preset: Preset) => void;
}

const presets: { label: string, value: Preset }[] = [
  { label: 'Últimos 30 dias', value: 'mes' },
  { label: 'Trimestre', value: 'trimestre' },
  { label: 'Ano', value: 'ano' },
];

export default function AdminDateFilter({
  dataInicio,
  dataFim,
  activePreset,
  onDatasChange,
  onPresetChange,
}: AdminDateFilterProps) {

  const aplicarPreset = (preset: Preset) => {
    const agora = new Date();
    let inicio = new Date();

    if (preset === 'mes') inicio.setMonth(agora.getMonth() - 1);
    else if (preset === 'trimestre') inicio.setMonth(agora.getMonth() - 3);
    else if (preset === 'ano') inicio.setFullYear(agora.getFullYear() - 1);

    onDatasChange({ inicio, fim: agora });
    onPresetChange(preset);
  };
  
  const handleDateChange = (newDates: { inicio?: Date, fim?: Date }) => {
    onDatasChange({ inicio: newDates.inicio || dataInicio, fim: newDates.fim || dataFim });
    onPresetChange('custom');
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 md:p-6 mb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarIcon className="h-5 w-5 text-orange-500 hidden md:block" />
          {presets.map(p => (
            <button
              key={p.value}
              onClick={() => aplicarPreset(p.value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                activePreset === p.value
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : 'border-zinc-200 bg-transparent hover:bg-zinc-50'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <DatePicker value={dataInicio} onChange={date => handleDateChange({ inicio: date })} label="De:" />
          <DatePicker value={dataFim} onChange={date => handleDateChange({ fim: date })} label="Até:" />
        </div>
      </div>
    </div>
  );
}

function DatePicker({ value, onChange, label }: { value: Date; onChange: (date: Date) => void; label: string; }) {
  return (
    <div className="flex w-full sm:w-auto items-center gap-2">
       <label className="text-sm font-medium text-gray-600">{label}</label>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            className={cn(
              'flex w-full min-w-[180px] items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm font-medium',
              'hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500'
            )}
          >
            <span>{format(value, 'd MMM, yyyy', { locale: pt })}</span>
            <CalendarIcon className="ml-2 h-4 w-4 text-zinc-400" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="z-10 w-auto rounded-lg border bg-white p-0 shadow-lg" align="start">
            <DayPicker
              mode="single"
              selected={value}
              onSelect={date => date && onChange(date)}
              initialFocus
              locale={pt}
              // ALTERAÇÃO AQUI: 'dropdown-buttons' é obsoleto, o correto é 'dropdown'
              captionLayout="dropdown"
              fromYear={2020}
              toYear={new Date().getFullYear()}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}