// src/components/dashboard/pages/admin/AdminCharts.tsx
'use client';

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { ReceitaMensalData } from '@/types/admin';
import { CustomTooltip } from './CustomTooltip';
import EstadoOperacaoCard from './EstadoOperacaoCard';
import { themeColors } from '@/config/theme'; // Este import agora funciona!

interface AdminChartsProps {
  receitaMensalData: ReceitaMensalData[] | null;
  ocupacaoMedia: number;
  isLoading: boolean;
}

export default function AdminCharts({
  receitaMensalData,
  ocupacaoMedia,
  isLoading,
}: AdminChartsProps) {
  const hasData = receitaMensalData && receitaMensalData.length > 0;

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-[400px] rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
          </div>
        ) : hasData ? (
          <>
            <h3 className="font-semibold text-gray-800 mb-4">Gráfico de Performance</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={receitaMensalData}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.zinc[100]} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#666' }} />
                <YAxis tick={{ fontSize: 12, fill: '#666' }} tickFormatter={(value: number) => `${value / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line
                  type="monotone"
                  dataKey="receita"
                  stroke={themeColors.green}
                  strokeWidth={2}
                  dot={{ fill: themeColors.green, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Receita"
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-zinc-100 p-4 mb-4">
              <TrendingUp className="text-zinc-400" size={24} />
            </div>
            <p className="font-semibold text-zinc-600">Gráfico de Performance</p>
            <p className="text-sm text-zinc-400 mt-1">
              Nenhum dado financeiro registado até ao momento.
            </p>
          </div>
        )}
      </div>
      <EstadoOperacaoCard ocupacao={ocupacaoMedia} isLoading={isLoading} />
    </div>
  );
}