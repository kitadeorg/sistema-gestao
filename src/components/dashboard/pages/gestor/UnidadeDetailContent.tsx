'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import {
  Home,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  AlertTriangle,
  Wrench,
  Bell,
  CheckCircle,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */

interface Unidade {
  id: string;
  numero: string;
  bloco?: string;
  area?: number;
  tipo?: string;
  status?: string;
  condominioId: string;
}

interface Morador {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  tipo?: string;
  unidadeId?: string;
}

export default function UnidadeDetailContent() {
  const params = useParams();
  const { condoId, unitId } = params as {
    condoId: string;
    unitId: string;
  };

  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [morador, setMorador] = useState<Morador | null>(null);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [financeiroResumo, setFinanceiroResumo] = useState({
    totalEmAtraso: 0,
    totalPago: 0,
  });

  const [loading, setLoading] = useState(true);

  /* ─────────────────────────────────────────────────────────────
     FETCH DATA
  ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1️⃣ Unidade
        const unidadeSnap = await getDoc(
          doc(db, 'unidades', unitId)
        );

        if (!unidadeSnap.exists()) {
          setLoading(false);
          return;
        }

        const unidadeData = {
          id: unidadeSnap.id,
          ...unidadeSnap.data(),
        } as Unidade;

        setUnidade(unidadeData);

        // 2️⃣ Morador da unidade
        const moradorSnap = await getDocs(
          query(
            collection(db, 'moradores'),
            where('unidadeId', '==', unitId)
          )
        );

        if (!moradorSnap.empty) {
          const moradorDoc = moradorSnap.docs[0];
          setMorador({
            id: moradorDoc.id,
            ...moradorDoc.data(),
          } as Morador);
        }

        // 3️⃣ Financeiro
        const pagamentosSnap = await getDocs(
          query(
            collection(db, 'pagamentos'),
            where('unidadeId', '==', unitId)
          )
        );

        let totalEmAtraso = 0;
        let totalPago = 0;

        pagamentosSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.status === 'pendente') {
            totalEmAtraso += data.valor || 0;
          }
          if (data.status === 'pago') {
            totalPago += data.valor || 0;
          }
        });

        setFinanceiroResumo({ totalEmAtraso, totalPago });

        // 4️⃣ Ocorrências
        const ocorrenciasSnap = await getDocs(
          query(
            collection(db, 'ocorrencias'),
            where('unidade', '==', unidadeData.numero)
          )
        );

        setOcorrencias(ocorrenciasSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })));

        // 5️⃣ Manutenção
        const manutencaoSnap = await getDocs(
          query(
            collection(db, 'manutencao'),
            where('unidadeId', '==', unitId)
          )
        );

        setManutencoes(manutencaoSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })));

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [unitId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!unidade) {
    return <p>Unidade não encontrada.</p>;
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Home className="text-orange-500" />
        <h1 className="text-xl text-black font-bold">
          Unidade {unidade.numero} {unidade.bloco && `- Bloco ${unidade.bloco}`}
        </h1>
      </div>

      {/* INFO GERAL */}
      <div className="bg-white rounded-2xl p-6 text-black border border-zinc-200">
        <h2 className="font-semibold text-black mb-4">Informações Gerais</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 text-black gap-4 text-sm">
          <p><strong>Tipo:</strong> {unidade.tipo || '-'}</p>
          <p><strong>Área:</strong> {unidade.area || '-'} m²</p>
          <p><strong>Status:</strong> {unidade.status}</p>
        </div>
      </div>

      {/* MORADOR */}
      <div className="bg-white text-black rounded-2xl p-6 border border-zinc-200">
        <h2 className="font-semibold text-black mb-4">Morador Atual</h2>
        {morador ? (
          <div className="space-y-2 text-black text-sm">
            <p className="flex text-black items-center gap-2">
              <User size={14} /> {morador.nome}
            </p>
            <p className="flex text-black items-center gap-2">
              <Mail size={14} /> {morador.email || '-'}
            </p>
            <p className="flex text-black text-black items-center gap-2">
              <Phone size={14} /> {morador.telefone || '-'}
            </p>
          </div>
        ) : (
          <p className="text-zinc-400 text-black">Unidade vaga</p>
        )}
      </div>

      {/* FINANCEIRO */}
      <div className="bg-white text-black rounded-2xl p-6 border border-zinc-200">
        <h2 className="font-semibold text-black mb-4">Resumo Financeiro</h2>
        <div className="grid grid-cols-2 text-black gap-4 text-sm">
          <p>
            <DollarSign size={14} className="inline text-black mr-1" />
            Total Pago: {financeiroResumo.totalPago} Kz
          </p>
          <p className="text-red-500">
            <AlertTriangle size={14} className="inline mr-1" />
            Em Atraso: {financeiroResumo.totalEmAtraso} Kz
          </p>
        </div>
      </div>

      {/* OCORRÊNCIAS */}
      <div className="bg-white rounded-2xl text-black p-6 border border-zinc-200">
        <h2 className="font-semibold text-black mb-4">Ocorrências</h2>
        {ocorrencias.length === 0 ? (
          <p className="text-zinc-400">Nenhuma ocorrência</p>
        ) : (
          ocorrencias.map((o) => (
            <div key={o.id} className="text-sm text-black border-b py-2">
              <Bell size={14} className="inline mr-1" />
              {o.titulo}
            </div>
          ))
        )}
      </div>

      {/* MANUTENÇÃO */}
      <div className="bg-white rounded-2xl text-black p-6 border border-zinc-200">
        <h2 className="font-semibold text-black mb-4">Manutenções</h2>
        {manutencoes.length === 0 ? (
          <p className="text-zinc-400">Nenhuma manutenção</p>
        ) : (
          manutencoes.map((m) => (
            <div key={m.id} className="text-sm text-black border-b py-2">
              <Wrench size={14} className="inline text-black mr-1" />
              {m.titulo}
            </div>
          ))
        )}
      </div>

    </div>
  );
}