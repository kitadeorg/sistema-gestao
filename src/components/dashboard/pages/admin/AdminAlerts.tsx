'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  ChevronRight,
} from 'lucide-react';
import { AlertaDashboard } from '@/types/admin';
import Link from 'next/link';

interface AdminAlertsProps {
  alertas: AlertaDashboard[];
}

export default function AdminAlerts({ alertas }: AdminAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set()
  );

  const dismissAlert = (id: string) => {
    const newDismissed = new Set(dismissedAlerts);
    newDismissed.add(id);
    setDismissedAlerts(newDismissed);
  };

  const filteredAlerts = alertas.filter(
    (alert) => !dismissedAlerts.has(alert.id)
  );

  if (filteredAlerts.length === 0) {
    return null;
  }

  const getAlertConfig = (tipo: string) => {
    switch (tipo) {
      case 'critico':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          badgeColor: 'bg-red-100 text-red-800',
          label: '🔴 CRÍTICO',
        };
      case 'aviso':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          badgeColor: 'bg-yellow-100 text-yellow-800',
          label: '🟠 AVISO',
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          badgeColor: 'bg-blue-100 text-blue-800',
          label: 'ℹ️ INFO',
        };
    }
  };

  return (
    <div className="mb-6 space-y-3">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-orange-500" />
        Alertas do Sistema
      </h3>

      {filteredAlerts.map((alert) => {
        const config = getAlertConfig(alert.tipo);
        const Icon = config.icon;

        return (
          <div
            key={alert.id}
            className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4 flex items-start justify-between gap-4`}
          >
            <div className="flex items-start gap-3 flex-1">
              <Icon className={`w-5 h-5 ${config.textColor} flex-shrink-0 mt-0.5`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`${config.badgeColor} px-2 py-0.5 rounded-full text-xs font-bold`}
                  >
                    {config.label}
                  </span>
                  <h4 className={`font-semibold ${config.textColor}`}>
                    {alert.titulo}
                  </h4>
                </div>
                <p className={`text-sm ${config.textColor} opacity-90`}>
                  {alert.mensagem}
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {alert.acao && (
                <Link
                  href={alert.acao.href}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${config.badgeColor} hover:opacity-80 transition-opacity text-sm font-medium`}
                >
                  {alert.acao.label}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={() => dismissAlert(alert.id)}
                className={`p-1.5 rounded-lg hover:bg-white/50 transition-colors`}
              >
                <X className={`w-4 h-4 ${config.textColor}`} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}