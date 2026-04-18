// hooks/useSidebarData.ts
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';

// --- Interfaces ---
interface UserData {
  role: 'admin' | 'gestor' | 'sindico' | 'funcionario' | 'morador';
  nome: string;
  email: string;
  condominios?: string[];
  condominioId?: string;
}

interface CondominioData {
  id: string;
  nome: string;
}

/**
 * Hook customizado para gerenciar o estado e os dados específicos da Sidebar.
 * Ele busca os dados do usuário autenticado e, se for um gestor, busca
 * a lista de condomínios associados.
 *
 * @returns O estado necessário para a renderização da Sidebar, incluindo
 * dados do usuário, lista de condomínios, estado de carregamento e handlers de UI.
 */
export function useSidebarData() {
  // --- Estados ---
  const [userData, setUserData] = useState<UserData | null>(null);
  const [condominios, setCondominios] = useState<CondominioData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de UI gerenciados por este hook
  const [selectedCondo, setSelectedCondo] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    gestao: true,
    financeiro: true,
    operacional: true,
  });

  // --- Efeito Principal ---
  useEffect(() => {
    // O listener onAuthStateChanged garante que a lógica só roda quando
    // o estado de autenticação do Firebase está resolvido.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // 1. Usuário está logado, buscar dados no Firestore.
          const userDocRef = doc(db, 'usuarios', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data() as UserData;
            setUserData(data);

            // 2. Se for Gestor, buscar seus condomínios em paralelo.
            if (data.role === 'gestor' && data.condominios?.length) {
              
              // Otimização: Usa Promise.all para buscar todos os documentos de uma vez.
              const promises = data.condominios.map(id => getDoc(doc(db, 'condominios', id)));
              const condoDocs = await Promise.all(promises);

              const condoData = condoDocs
                .filter(snapshot => snapshot.exists())
                .map(snapshot => ({
                  id: snapshot.id,
                  nome: snapshot.data()?.nome || 'Condomínio Sem Nome',
                }));

              setCondominios(condoData);
              if (condoData.length > 0) {
                setSelectedCondo(condoData[0].id);
              }
            } else if (data.condominioId) {
              // Para Síndico/Funcionário, define o condomínio selecionado.
              setSelectedCondo(data.condominioId);
            }
          } else {
            // Caso de segurança: usuário autenticado mas sem registro no DB.
            console.warn('Usuário autenticado sem documento no Firestore.');
            setUserData(null);
          }
        } else {
          // Usuário não está logado, limpa os estados.
          setUserData(null);
          setCondominios([]);
        }
      } catch (error) {
        console.error("Erro ao carregar dados para a sidebar:", error);
        // Limpa os estados em caso de erro.
        setUserData(null);
        setCondominios([]);
      } finally {
        // 3. Essencial: setLoading(false) é chamado no final, garantindo
        // que a UI não pisque ou quebre o layout.
        setLoading(false);
      }
    });

    // Limpa o listener quando o componente é desmontado.
    return () => unsubscribe();
  }, []); // O array de dependências vazio garante que este efeito rode apenas uma vez.

  // --- Handlers de UI ---
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return {
    userData,
    condominios,
    selectedCondo,
    setSelectedCondo,
    expandedSections,
    toggleSection,
    loading,
  };
}