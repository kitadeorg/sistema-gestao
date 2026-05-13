'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { submeterAvaliacao, jaAvaliouEsteMes } from '@/lib/firebase/satisfacao';
import { ArrowLeft, Star, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const CATEGORIAS = [
  { key: 'limpeza',      label: 'Limpeza e Higiene',       desc: 'Áreas comuns, jardins, lixo' },
  { key: 'seguranca',    label: 'Segurança',                desc: 'Portaria, câmeras, controlo de acesso' },
  { key: 'manutencao',   label: 'Manutenção',               desc: 'Elevadores, iluminação, reparações' },
  { key: 'comunicacao',  label: 'Comunicação',              desc: 'Avisos, respostas, transparência' },
] as const;

const NOTAS_LABEL: Record<number, string> = {
  1: 'Muito Mau',
  2: 'Mau',
  3: 'Razoável',
  4: 'Bom',
  5: 'Excelente',
};

function StarRating({
  value, onChange, size = 28,
}: {
  value: number; onChange: (v: number) => void; size?: number;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={size}
            className={cn(
              'transition-colors',
              n <= (hover || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-zinc-200 text-zinc-200',
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function AvaliarPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData } = useAuthContext();
  const router = useRouter();

  const [jaAvaliou, setJaAvaliou] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [done, setDone]           = useState(false);

  const [notaGeral, setNotaGeral] = useState(0);
  const [categorias, setCategorias] = useState({
    limpeza:     0,
    seguranca:   0,
    manutencao:  0,
    comunicacao: 0,
  });
  const [comentario, setComentario] = useState('');

  const mesAtual = MESES[new Date().getMonth()];
  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    if (!condoId || !userData?.uid) return;
    jaAvaliouEsteMes(condoId, userData.uid)
      .then(setJaAvaliou)
      .finally(() => setLoading(false));
  }, [condoId, userData?.uid]);

  const setCat = (key: keyof typeof categorias, val: number) =>
    setCategorias(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!userData?.uid || !userData.nome) return;
    if (notaGeral === 0) { toast.error('Seleciona uma nota geral.'); return; }
    const catIncompleta = CATEGORIAS.find(c => categorias[c.key] === 0);
    if (catIncompleta) { toast.error(`Avalia a categoria "${catIncompleta.label}".`); return; }

    setSaving(true);
    try {
      await submeterAvaliacao({
        condominioId: condoId,
        moradorId:    userData.uid,
        moradorNome:  userData.nome,
        nota:         notaGeral as 1|2|3|4|5,
        comentario:   comentario.trim() || undefined,
        categorias:   categorias as any,
      });
      setDone(true);
      toast.success('Avaliação submetida. Obrigado!');
      setTimeout(() => router.replace(`/dashboard/condominio/${condoId}/morador`), 3000);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao submeter avaliação.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-xl mx-auto space-y-6 animate-in fade-in duration-500">

      <Link href={`/dashboard/condominio/${condoId}/morador`} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition">
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Avaliar o Condomínio</h1>
        <p className="text-sm text-zinc-500 mt-1">{mesAtual} {anoAtual} — a tua opinião melhora o condomínio</p>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Obrigado pela avaliação!</h2>
          <p className="text-sm text-zinc-500">A tua opinião ajuda a melhorar o condomínio.</p>
        </div>
      ) : jaAvaliou ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <Star className="w-10 h-10 text-amber-400 mx-auto fill-amber-400" />
          <h2 className="font-bold text-zinc-900">Já avaliaste este mês</h2>
          <p className="text-sm text-zinc-500">Podes submeter uma nova avaliação no próximo mês.</p>
          <Link
            href={`/dashboard/condominio/${condoId}/morador`}
            className="inline-block mt-2 px-4 py-2 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Voltar ao Painel
          </Link>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Nota geral */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-zinc-900">Nota Geral</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Como avalias o condomínio este mês?</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <StarRating value={notaGeral} onChange={setNotaGeral} size={36} />
              {notaGeral > 0 && (
                <p className={cn(
                  'text-sm font-bold',
                  notaGeral >= 4 ? 'text-emerald-600' : notaGeral >= 3 ? 'text-amber-600' : 'text-red-600',
                )}>
                  {NOTAS_LABEL[notaGeral]}
                </p>
              )}
            </div>
          </div>

          {/* Categorias */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-semibold text-zinc-900">Avaliação por Categoria</h3>
            {CATEGORIAS.map(cat => (
              <div key={cat.key} className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-zinc-800">{cat.label}</p>
                  <p className="text-xs text-zinc-400">{cat.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StarRating value={categorias[cat.key]} onChange={v => setCat(cat.key, v)} size={22} />
                  {categorias[cat.key] > 0 && (
                    <span className="text-xs text-zinc-500">{NOTAS_LABEL[categorias[cat.key]]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Comentário */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div>
              <h3 className="font-semibold text-zinc-900">Comentário (opcional)</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Partilha sugestões ou elogios</p>
            </div>
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Ex: A limpeza melhorou muito este mês, mas o elevador ainda precisa de atenção..."
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
            <p className="text-xs text-zinc-400 text-right">{comentario.length}/500</p>
          </div>

          {/* Botão */}
          <button
            onClick={handleSubmit}
            disabled={saving || notaGeral === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-orange-500/20"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" />A submeter...</> : <><Star size={16} />Submeter Avaliação</>}
          </button>

          <p className="text-xs text-zinc-400 text-center">
            A tua avaliação é anónima para os outros moradores. A administração pode ver as avaliações agregadas.
          </p>
        </div>
      )}
    </main>
  );
}
