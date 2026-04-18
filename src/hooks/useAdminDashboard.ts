// src/hooks/useAdminDashboard.ts

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

import {
  DashboardAdminData,
  KPIData,
  CondominioPerfomance,
  AlertaDashboard,
} from '@/types/admin';

// 1. A interface de props foi alterada para receber o período e o condomínio
interface UseAdminDashboardProps {
  startDate: Date;
  endDate: Date;
  selectedCondo?: string; // Tornar opcional para segurança
}

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

// 2. O hook agora recebe um único objeto com as props desestruturadas
export function useAdminDashboard({
  startDate,
  endDate,
  selectedCondo,
}: UseAdminDashboardProps) {
  const [data, setData] = useState<DashboardAdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. O useEffect agora depende das datas e do condomínio
  useEffect(() => {
    // Não faz nada se o condomínio selecionado não estiver definido
    if (!selectedCondo) {
      setLoading(false);
      return;
    }

    const fetchDashboard = async () => {
      try {
        setLoading(true);

        // NOTA: Para uma query real por data, seria preciso filtrar outras coleções
        // como 'pagamentos' ou 'ocorrencias' usando where() com o startDate e endDate.
        // Ex: query(collection(db, 'pagamentos'), where('createdAt', '>=', Timestamp.fromDate(startDate)))

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

        const condominiosFiltrados = isGlobal
          ? condominios
          : condominios.filter((c) => c.id === selectedCondo);

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

        const condominiosData: CondominioPerfomance[] =
          condominiosFiltrados.map((condo) => ({
            id: condo.id,
            nome: condo.data.nome,
            unidades: condo.data.totalUnidades || 0,
            moradores: 0,
            receita: 0,
            inadimplencia: 0,
            status: condo.data.status === 'active' ? 'ativo' : 'inativo',
          }));

        const alertasData: AlertaDashboard[] = [];

        setData({
          // 4. As datas são usadas para definir o período no estado
          periodo: {
            dataInicio: startDate,
            dataFim: endDate,
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
  }, [startDate, endDate, selectedCondo]); // Dependências atualizadas

  return { data, loading, error };
}