'use client';

import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: string;
  up?: boolean;
  icon: React.ReactNode;
  isCritical?: boolean;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  trend = '0.0%',
  up = true,
  icon,
  isCritical = false,
  loading = false,
}: KPICardProps) {
  return (
    <div
      className={`p-7 rounded-[2.5rem] border transition-all ${
        isCritical
          ? 'bg-red-50 border-red-100'
          : 'bg-white border-zinc-100 shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-5">
        <div
          className={`p-3 rounded-2xl ${
            isCritical ? 'bg-red-500 text-white' : 'bg-zinc-900 text-white'
          }`}
        >
          {icon}
        </div>
        <div
          className={`flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full ${
            up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {trend}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.15em] mb-1">
          {title}
        </p>
        <h2
          className={`text-2xl font-black tracking-tight ${
            loading ? 'text-zinc-300' : isCritical ? 'text-red-600' : 'text-zinc-900'
          }`}
        >
          {loading ? '---' : value}
        </h2>
      </div>
    </div>
  );
}