'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import type { Quota } from '@/lib/firebase/quotas';
import {
  CreditCard, Building2, Smartphone, ArrowLeft,
  Lock, CheckCircle2, XCircle, Loader2, ShieldCheck,
  AlertTriangle, Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function formatKz(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

function maskCard(n: string) {
  const digits = n.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

type Metodo = 'cartao' | 'transferencia' | 'multicaixa';
type Estado = 'form' | 'processando' | 'sucesso' | 'erro';

// ─── Ecrã de Processamento ────────────────────────────────────────────────────

function EcrãProcessando() {
  const [step, setStep] = useState(0);
  const steps = [
    'A verificar dados...',
    'A contactar o banco...',
    'A processar transacção...',
    'A confirmar pagamento...',
  ];

  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 700);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-orange-100 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="font-bold text-zinc-900">A processar pagamento</p>
        <p className="text-sm text-zinc-500">{steps[step]}</p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all',
              i < step  ? 'bg-emerald-500' :
              i === step ? 'bg-orange-500 animate-pulse' : 'bg-zinc-200',
            )}>
              {i < step && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <p className={cn('text-xs', i <= step ? 'text-zinc-700' : 'text-zinc-400')}>{s}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Lock size={11} />
        Ligação segura SSL/TLS
      </div>
    </div>
  );
}

// ─── Ecrã de Sucesso ──────────────────────────────────────────────────────────

function EcrãSucesso({
  quota, refTransacao, metodo, condoId,
}: {
  quota: Quota; refTransacao: string; metodo: Metodo; condoId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace(`/dashboard/condominio/${condoId}/morador/pagamentos`), 8000);
    return () => clearTimeout(t);
  }, []);

  const metodoLabel = { cartao: 'Cartão Bancário', transferencia: 'Transferência Bancária', multicaixa: 'Multicaixa Express' };

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-zinc-900">Pagamento Confirmado!</h2>
        <p className="text-sm text-zinc-500">A sua quota foi paga com sucesso.</p>
      </div>

      {/* Recibo */}
      <div className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-3 text-left">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 mb-1">
          <Receipt size={15} className="text-orange-500" />
          Comprovativo de Pagamento
        </div>
        {[
          { label: 'Referência',  value: refTransacao },
          { label: 'Quota',       value: `${MESES[quota.mes - 1]} ${quota.ano}` },
          { label: 'Unidade',     value: quota.unidadeNumero },
          { label: 'Valor',       value: formatKz(quota.valor) },
          { label: 'Método',      value: metodoLabel[metodo] },
          { label: 'Data',        value: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) },
          { label: 'Estado',      value: 'Aprovado' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-zinc-500">{label}</span>
            <span className={cn('font-semibold text-zinc-900', label === 'Estado' && 'text-emerald-600')}>{value}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400">A redirecionar para os seus pagamentos em 8 segundos...</p>

      <Link
        href={`/dashboard/condominio/${condoId}/morador/pagamentos`}
        className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl transition-colors text-center"
      >
        Ver Meus Pagamentos
      </Link>
    </div>
  );
}

// ─── Ecrã de Erro ─────────────────────────────────────────────────────────────

function EcrãErro({ mensagem, onTentar }: { mensagem: string; onTentar: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
        <XCircle className="w-10 h-10 text-red-500" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-zinc-900">Pagamento Recusado</h2>
        <p className="text-sm text-zinc-500">{mensagem}</p>
      </div>
      <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-3">
        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
        <p>Verifique os dados do cartão ou tente outro método de pagamento. Se o problema persistir, contacte o seu banco.</p>
      </div>
      <button
        onClick={onTentar}
        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Tentar Novamente
      </button>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function PagarPage() {
  const { condoId, quotaId } = useParams() as { condoId: string; quotaId: string };
  const { userData } = useAuthContext();
  const router = useRouter();

  const [quota, setQuota]       = useState<Quota | null>(null);
  const [loading, setLoading]   = useState(true);
  const [estado, setEstado]     = useState<Estado>('form');
  const [metodo, setMetodo]     = useState<Metodo>('multicaixa');
  const [erroMsg, setErroMsg]   = useState('');
  const [refTransacao, setRef]  = useState('');

  // Campos do cartão
  const [numero,    setNumero]    = useState('');
  const [nome,      setNome]      = useState('');
  const [validade,  setValidade]  = useState('');
  const [cvv,       setCvv]       = useState('');
  // Campos transferência
  const [refTransf, setRefTransf] = useState('');
  // Campos Multicaixa
  const [telefone,  setTelefone]  = useState('');

  useEffect(() => {
    if (!quotaId) return;
    getDoc(doc(db, 'quotas', quotaId)).then(snap => {
      if (snap.exists()) {
        const q = { id: snap.id, ...snap.data() } as Quota;
        // Redirecionar se já paga
        if (q.status === 'pago' || q.status === 'isento') {
          router.replace(`/dashboard/condominio/${condoId}/morador/pagamentos`);
          return;
        }
        setQuota(q);
      }
      setLoading(false);
    });
  }, [quotaId]);

  const handlePagar = async () => {
    if (!quota || !userData?.uid) return;

    // Validação básica por método
    if (metodo === 'cartao') {
      if (numero.replace(/\s/g, '').length < 16) { toast.error('Número de cartão inválido.'); return; }
      if (!nome.trim())                           { toast.error('Nome no cartão é obrigatório.'); return; }
      if (validade.length < 5)                    { toast.error('Validade inválida. Use o formato MM/AA.'); return; }
      if (cvv.length < 3)                         { toast.error('CVV inválido.'); return; }
    }
    if (metodo === 'multicaixa' && telefone.replace(/\D/g, '').length < 9) {
      toast.error('Número de telefone inválido.');
      return;
    }

    setEstado('processando');

    try {
      // Simular latência bancária no cliente (1.5–3s)
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));

      // 5% de falha aleatória para realismo
      if (Math.random() < 0.05) {
        setErroMsg('Pagamento recusado pelo banco. Verifique os dados e tente novamente.');
        setEstado('erro');
        return;
      }

      const refTxn = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const agora  = new Date();
      const metodoLabel: Record<string, string> = {
        cartao:        'Cartão Bancário',
        transferencia: 'Transferência Bancária',
        multicaixa:    'Multicaixa Express',
      };

      // Importar Firestore client (autenticado — o utilizador já está logado)
      const { doc, updateDoc, addDoc, collection, Timestamp, serverTimestamp } =
        await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/firebase');

      // 1. Actualizar quota → 'pago'
      await updateDoc(doc(db, 'quotas', quota.id), {
        status:          'pago',
        dataPagamento:   Timestamp.fromDate(agora),
        observacoes:     `Pago via ${metodoLabel[metodo]} · Ref: ${refTxn}`,
        registadoPor:    userData.uid,
        comprovativoUrl: null,
        updatedAt:       serverTimestamp(),
      });

      // 2. Registar transacção
      await addDoc(collection(db, 'transacoes'), {
        quotaId:      quota.id,
        moradorId:    userData.uid,
        valor:        quota.valor,
        metodo,
        referencia:   metodo === 'cartao'
          ? `**** **** **** ${numero.replace(/\s/g, '').slice(-4)}`
          : metodo === 'multicaixa' ? telefone : refTransf,
        refTransacao: refTxn,
        status:       'aprovado',
        processadoEm: Timestamp.fromDate(agora),
        createdAt:    serverTimestamp(),
      });

      // 3. Audit log
      const { logAudit } = await import('@/lib/firebase/auditLog');
      void logAudit({
        actorId:      userData.uid,
        actorNome:    userData.nome,
        actorRole:    userData.role,
        accao:        'quota_paga',
        categoria:    'financeiro',
        descricao:    `Quota de ${MESES[quota.mes - 1]} ${quota.ano} paga via ${metodoLabel[metodo]}`,
        condominioId: quota.condominioId,
        entidadeId:   quota.id,
        entidadeTipo: 'quota',
        meta:         { valor: quota.valor, metodo, refTransacao: refTxn },
      });

      setRef(refTxn);
      setEstado('sucesso');
    } catch (err: any) {
      console.error('[pagar]', err);
      setErroMsg('Erro ao processar pagamento. Tente novamente.');
      setEstado('erro');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!quota) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <p>Quota não encontrada.</p>
        <Link href={`/dashboard/condominio/${condoId}/morador/pagamentos`} className="text-orange-500 text-sm mt-2 block">
          Voltar aos pagamentos
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex items-start justify-center p-4 pt-8">
      <div className="w-full max-w-md space-y-4">

        {/* Header */}
        {estado === 'form' && (
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/condominio/${condoId}/morador/pagamentos`}
              className="p-2 rounded-xl hover:bg-zinc-200 text-zinc-500 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-zinc-900">Pagamento de Quota</h1>
              <p className="text-xs text-zinc-500">Simulador de pagamento seguro</p>
            </div>
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">

          {/* Banner de simulação */}
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
            <AlertTriangle size={13} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              Modo de simulação — nenhum pagamento real será processado
            </p>
          </div>

          <div className="p-6">
            {estado === 'processando' && <EcrãProcessando />}
            {estado === 'sucesso' && quota && (
              <EcrãSucesso quota={quota} refTransacao={refTransacao} metodo={metodo} condoId={condoId} />
            )}
            {estado === 'erro' && (
              <EcrãErro mensagem={erroMsg} onTentar={() => setEstado('form')} />
            )}

            {estado === 'form' && (
              <div className="space-y-5">

                {/* Resumo da quota */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">A pagar</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-zinc-900">Quota de {MESES[quota.mes - 1]} {quota.ano}</p>
                      <p className="text-xs text-zinc-500">Unidade {quota.unidadeNumero} · {quota.moradorNome}</p>
                    </div>
                    <p className="text-2xl font-black text-orange-600">{formatKz(quota.valor)}</p>
                  </div>
                  {quota.status === 'atrasado' && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">
                      <AlertTriangle size={11} />
                      Quota em atraso — podem aplicar-se juros
                    </div>
                  )}
                </div>

                {/* Selector de método */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Método de Pagamento</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: 'multicaixa',    label: 'Multicaixa',    icon: <Smartphone size={18} /> },
                      { key: 'cartao',        label: 'Cartão',        icon: <CreditCard size={18} /> },
                      { key: 'transferencia', label: 'Transferência', icon: <Building2 size={18} />  },
                    ] as { key: Metodo; label: string; icon: React.ReactNode }[]).map(m => (
                      <button
                        key={m.key}
                        onClick={() => setMetodo(m.key)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all',
                          metodo === m.key
                            ? 'border-orange-400 bg-orange-50 text-orange-700'
                            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50',
                        )}
                      >
                        {m.icon}
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formulário por método */}
                {metodo === 'cartao' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500">Número do Cartão</label>
                      <div className="relative">
                        <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={numero}
                          onChange={e => setNumero(maskCard(e.target.value))}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className="w-full pl-9 pr-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono tracking-widest"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500">Nome no Cartão</label>
                      <input
                        type="text"
                        value={nome}
                        onChange={e => setNome(e.target.value.toUpperCase())}
                        placeholder="NOME APELIDO"
                        className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 uppercase tracking-wider"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500">Validade</label>
                        <input
                          type="text"
                          value={validade}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setValidade(v.length > 2 ? `${v.slice(0,2)}/${v.slice(2)}` : v);
                          }}
                          placeholder="MM/AA"
                          maxLength={5}
                          className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500">CVV</label>
                        <input
                          type="password"
                          value={cvv}
                          onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono"
                        />
                      </div>
                    </div>
                    {/* Cartões de teste */}
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-500 space-y-1">
                      <p className="font-semibold text-zinc-600">Cartões de teste:</p>
                      <p>Sucesso: <span className="font-mono text-zinc-700">4242 4242 4242 4242</span></p>
                      <p>Recusado: <span className="font-mono text-zinc-700">4000 0000 0000 0002</span></p>
                      <p>Validade: qualquer data futura · CVV: qualquer 3 dígitos</p>
                    </div>
                  </div>
                )}

                {metodo === 'multicaixa' && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1">
                      <p className="font-semibold">Como funciona o Multicaixa Express:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                        <li>Introduz o teu número de telefone</li>
                        <li>Receberás uma notificação no telemóvel</li>
                        <li>Confirma o pagamento na app Multicaixa</li>
                      </ol>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500">Número de Telefone</label>
                      <div className="relative">
                        <Smartphone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="tel"
                          value={telefone}
                          onChange={e => setTelefone(e.target.value)}
                          placeholder="+244 9XX XXX XXX"
                          className="w-full pl-9 pr-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {metodo === 'transferencia' && (
                  <div className="space-y-3">
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Dados Bancários</p>
                      {[
                        { label: 'Banco',   value: 'Banco BIC Angola' },
                        { label: 'IBAN',    value: 'AO06 0040 0000 1234 5678 1011 2' },
                        { label: 'Titular', value: 'Condomínio Residencial' },
                        { label: 'Valor',   value: formatKz(quota.valor) },
                        { label: 'Ref.',    value: `QUOTA-${quota.mes.toString().padStart(2,'0')}-${quota.ano}-${quota.unidadeNumero}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between">
                          <span className="text-zinc-500 text-xs">{label}</span>
                          <span className="font-semibold text-zinc-900 text-xs font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500">Referência da Transferência</label>
                      <input
                        type="text"
                        value={refTransf}
                        onChange={e => setRefTransf(e.target.value)}
                        placeholder="Introduz a referência da transferência"
                        className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                      <p className="text-xs text-zinc-400">Após efectuar a transferência, introduz a referência para confirmar.</p>
                    </div>
                  </div>
                )}

                {/* Botão de pagamento */}
                <button
                  onClick={handlePagar}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-orange-500/20"
                >
                  <Lock size={15} />
                  Pagar {formatKz(quota.valor)}
                </button>

                {/* Segurança */}
                <div className="flex items-center justify-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1"><ShieldCheck size={11} />Pagamento seguro</span>
                  <span className="flex items-center gap-1"><Lock size={11} />SSL 256-bit</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs text-zinc-400 pb-4">
          © {new Date().getFullYear()} CONDO. — Sistema de Gestão de Condomínios
        </p>
      </div>
    </main>
  );
}
