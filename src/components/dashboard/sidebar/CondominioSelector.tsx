'use client';

import React, { useId } from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils'; // A nossa função utilitária de classes

// As props continuam as mesmas
interface CondominioData {
  id: string;
  nome: string;
}

interface CondominioSelectorProps {
  condominios: CondominioData[];
  selectedCondo: string;
  onSelect: (condoId: string) => void;
  className?: string; // Prop opcional para classes extras
}

export default function CondominioSelector({
  condominios,
  selectedCondo,
  onSelect,
  className,
}: CondominioSelectorProps) {
  const triggerId = useId();
  const selectedCondoData = condominios.find(c => c.id === selectedCondo);

  return (
    <div className={cn('px-4 py-3 space-y-2', className)}>
      {/* 1. Label ligada ao seletor via ID para acessibilidade */}
      <label
        htmlFor={triggerId}
        className="text-[9.5px] font-bold tracking-[0.16em] uppercase text-zinc-400"
      >
        Condomínio Ativo
      </label>

      {/* 2. Componente Select do Radix UI */}
      <Select.Root value={selectedCondo} onValueChange={onSelect}>
        <Select.Trigger
          id={triggerId}
          className="group flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-[13px] font-medium text-zinc-700 outline-none transition-colors hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 data-[placeholder]:text-zinc-500"
        >
          <Select.Value placeholder="Selecione um condomínio...">
            {selectedCondoData?.nome}
          </Select.Value>
          <Select.Icon>
            <ChevronsUpDown className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={5}
            className="z-50 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
          >
            <Select.Viewport className="p-1">
              {condominios.map(condo => (
                <Select.Item
                  key={condo.id}
                  value={condo.id}
                  className="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-4 text-sm font-medium text-zinc-700 outline-none data-[highlighted]:bg-zinc-100"
                >
                  <Select.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4 text-orange-500" />
                  </Select.ItemIndicator>
                  <Select.ItemText>{condo.nome}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}