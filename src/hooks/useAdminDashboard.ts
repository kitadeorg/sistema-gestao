'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';

import {
  DashboardAdminData,
  KPIData,
  CondominioPerfomance,
  AlertaDashboard,
} from '@/types/admin';

interface FirestoreDoc<T> {
  id: string;
  data: T;
}

interface FirestoreCondominio {
  nome: string;
  status: 'active' | 'inactive';
  totalUnidades?: number;
}

interface FirestoreUsuario {
  role: string;
  condominios?: string[];
}

export function useAdminDashboard(
  selectedCondo: string | undefined
) {
  const [data, setData] = useState<DashboardAdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCondo) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);

        const [condominiosSnap, usuariosSnap] = await Promise.all([
          getDocs(collection(db, 'condominios')),
          getDocs(collection(db, 'usuarios')),
        ]);

        const mapSnapshot = <T,>(snapshot: any): FirestoreDoc<T>[] =>
          snapshot.docs.map((doc: any) => ({
            id: doc.id,
            data: doc.data() as T,
          }));

        const condominios = mapSnapshot<FirestoreCondominio>(condominiosSnap);
        const usuarios = mapSnapshot<FirestoreUsuario>(usuariosSnap);

        const isGlobal = selectedCondo === 'all';

        // ✅ Filtrar condomínios conforme contexto
        const condominiosFiltrados = isGlobal
          ? condominios
          : condominios.filter((c) => c.id === selectedCondo);

        // ✅ KPIs (fase atual do sistema)
        const kpiData: KPIData = {
          receitaTotal: 0,
          totalUnidades: condominiosFiltrados.reduce(
            (acc, c) => acc + (c.data.totalUnidades || 0),
            0
          ),
          totalMoradores: 0,
          taxaInadimplenciaMedia: 0,
          ocorrenciasAbertas: 0,
          usuariosAtivos: usuarios.length,
        };

        // ✅ Converter status para o tipo do admin.ts
        const condominiosData: CondominioPerfomance[] =
          condominiosFiltrados.map((condo) => ({
            id: condo.id,
            nome: condo.data.nome,
            unidades: condo.data.totalUnidades || 0,
            moradores: 0,
            receita: 0,
            inadimplencia: 0,
            status:
              condo.data.status === 'active'
                ? 'ativo'
                : 'inativo',
          }));

        const alertasData: AlertaDashboard[] = [];

        setData({
          periodo: {
            dataInicio: new Date(),
            dataFim: new Date(),
          },
          kpis: kpiData,
          condominios: condominiosData,
          gestores: [],
          receitaMensalData: [],
          inadimplenciaData: [],
          distribuicaoUsuarios: [],
          alertas: alertasData,
          ocorrenciasStatus: {
            aberta: 0,
            emAndamento: 0,
            resolvida: 0,
          },
        });

      } catch (err) {
        console.error('Erro no Dashboard:', err);
        setError('Erro ao carregar dados do dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [selectedCondo]);

  return { data, loading, error };
}