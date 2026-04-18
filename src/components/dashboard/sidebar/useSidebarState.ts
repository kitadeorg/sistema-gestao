'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore'; 
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';

interface CondominioData {
  id: string;
  nome: string;
}

/**
 * Hook customizado para gerenciar o estado da UI da Sidebar,
 * como a lista de condomínios para o seletor do Gestor/Admin.
 */
export function useSidebarState() {
  const { userData, loading: authLoading } = useAuthContext();
  const [condominiosList, setCondominiosList] = useState<CondominioData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [selectedCondo, setSelectedCondo] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    gestao: true,
    financeiro: true,
    operacional: true,
  });

  useEffect(() => {
    // Não executa nada se a autenticação ainda estiver a carregar
    if (authLoading) return;

    const loadCondominios = async () => {
      // Condição de saída se o usuário não for Admin ou Gestor
      if (!userData || (userData.role !== 'admin' && userData.role !== 'gestor')) {
        setDataLoading(false);
        return;
      }
      
      setDataLoading(true);
      try {
        let condoIds: string[] = [];
        
        if (userData.role === 'admin') {
          // Admin vê todos os condomínios cadastrados no sistema
          const condosSnap = await getDocs(collection(db, 'condominios'));
          condoIds = condosSnap.docs.map(d => d.id);
        } else if (userData.role === 'gestor') {
          // ✅ CORREÇÃO: O campo correto definido no seu UserData é 'condominiosGeridos'
          condoIds = userData.condominiosGeridos || [];
        }

        if (condoIds.length === 0) {
          setCondominiosList([]);
          setDataLoading(false);
          return;
        }

        // Busca os nomes de cada condomínio da lista de IDs
        const promises = condoIds.map(id => getDoc(doc(db, 'condominios', id)));
        const condoDocs = await Promise.all(promises);

        const condoData = condoDocs
          .filter(snapshot => snapshot.exists())
          .map(snapshot => ({
            id: snapshot.id,
            nome: snapshot.data()?.nome || 'Condomínio Sem Nome',
          }));

        setCondominiosList(condoData);
        
        // Define o condomínio selecionado inicial se ainda não houver um
        if (condoData.length > 0 && !selectedCondo) {
          setSelectedCondo(condoData[0].id);
        }

      } catch (error) {
        console.error("Erro ao carregar condomínios para a sidebar:", error);
      } finally {
        setDataLoading(false);
      }
    };

    loadCondominios();
  }, [userData, authLoading, selectedCondo]); 

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return {
    condominiosList,
    selectedCondo,
    setSelectedCondo,
    expandedSections,
    toggleSection,
    // Combina os dois estados de loading para o componente que o consome
    loading: authLoading || dataLoading, 
  };
}