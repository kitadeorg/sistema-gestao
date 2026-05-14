'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import Image from 'next/image';
import { ArrowRight, Home, LayoutDashboard } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsub();
  }, []);

  const handleGoBack = () => {
    if (isLoggedIn) {
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex flex-col items-center justify-center p-6 overflow-hidden">

      {/* Conteúdo por cima */}
      <div className="relative z-10 flex flex-col items-center w-full">

        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/logo.svg"
            alt="CONDO."
            width={140}
            height={34}
            className="h-9 w-auto drop-shadow-sm"
            priority
          />
        </div>

        {/* Card principal */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-md px-10 py-10 flex flex-col items-center text-center">

          {/* 404 + Ilustração sobrepostos dentro do card */}
          <div className="relative flex items-center justify-center w-full" style={{ height: 240 }}>
            {/* 404 grande atrás */}
            <span
              className="absolute font-black leading-none tracking-tighter select-none pointer-events-none text-zinc-200"
              style={{ fontSize: '11rem' }}
              aria-hidden="true"
            >
              404
            </span>
            {/* Ilustração à frente */}
            <div className="relative z-10 mt-4">
              <BoxIllustration />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight mt-2">
            Página Não Encontrada
          </h1>

          {/* Subtítulo */}
          <p className="text-zinc-500 text-base mt-3 leading-relaxed max-w-xs">
            Procuravas uma página, mas encontraste o vazio.
            Até os melhores se perdem às vezes.
          </p>

          {/* Divider laranja */}
          <div className="w-14 h-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full mt-6 mb-7" />

          {/* Botão */}
          <button
            onClick={handleGoBack}
            disabled={isLoggedIn === null}
            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 rounded-2xl text-base font-bold transition-all duration-200 disabled:opacity-40 shadow-lg shadow-orange-500/25 hover:-translate-y-0.5 active:scale-95"
          >
            {isLoggedIn === null ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isLoggedIn ? (
              <>
                <LayoutDashboard size={18} />
                Voltar ao Painel
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                <Home size={18} />
                Ir para o Início
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Código de erro */}
          <p className="mt-5 text-xs text-zinc-400 font-mono">
            HTTP 404 — Page not found
          </p>
        </div>

        {/* Rodapé */}
        <p className="mt-8 text-xs text-zinc-400">
          © {new Date().getFullYear()} CONDO. — Sistema de Gestão de Condomínios
        </p>
      </div>
    </div>
  );
}

// ─── Ilustração SVG da caixa ──────────────────────────────────────────────────

function BoxIllustration() {
  return (
    <svg
      width="260"
      height="220"
      viewBox="0 0 260 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Sombra */}
      <ellipse cx="130" cy="206" rx="62" ry="9" fill="#e4e4e7" />

      {/* Corpo da caixa */}
      <rect x="68" y="128" width="124" height="74" rx="7" fill="#18181b" />

      {/* Linha central vertical */}
      <line x1="130" y1="128" x2="130" y2="202" stroke="#3f3f46" strokeWidth="1.5" />

      {/* Linha horizontal a meio */}
      <line x1="68" y1="165" x2="192" y2="165" stroke="#3f3f46" strokeWidth="1" strokeDasharray="5 4" />

      {/* Tampa esquerda */}
      <path
        d="M68 133 Q66 108 92 104 L130 116 L130 133 Z"
        fill="#27272a"
        stroke="#18181b"
        strokeWidth="1.5"
      />

      {/* Tampa direita */}
      <path
        d="M192 133 Q194 108 168 104 L130 116 L130 133 Z"
        fill="#3f3f46"
        stroke="#18181b"
        strokeWidth="1.5"
      />

      {/* Documento 1 — esquerda, inclinado */}
      <g transform="translate(72, 36) rotate(-20, 22, 44)">
        <rect width="44" height="58" rx="5" fill="white" stroke="#18181b" strokeWidth="2.5" />
        <line x1="9" y1="17" x2="35" y2="17" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="9" y1="26" x2="35" y2="26" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="9" y1="35" x2="26" y2="35" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="9" y1="44" x2="30" y2="44" stroke="#e4e4e7" strokeWidth="2" strokeLinecap="round" />
        <path d="M31 4 L40 13 L31 13 Z" fill="#f4f4f5" stroke="#d4d4d8" strokeWidth="1" />
      </g>

      {/* Documento 2 — direita, inclinado */}
      <g transform="translate(142, 28) rotate(16, 20, 44)">
        <rect width="40" height="52" rx="5" fill="white" stroke="#18181b" strokeWidth="2.5" />
        <line x1="8" y1="15" x2="32" y2="15" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="24" x2="32" y2="24" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="33" x2="22" y2="33" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M28 4 L37 13 L28 13 Z" fill="#f4f4f5" stroke="#d4d4d8" strokeWidth="1" />
      </g>

      {/* Estrela grande — laranja */}
      <path
        d="M214 44 L217 32 L220 44 L232 47 L220 50 L217 62 L214 50 L202 47 Z"
        fill="#f97316"
        opacity="0.9"
      />

      {/* Estrela pequena — laranja */}
      <path
        d="M38 58 L39.8 51 L41.6 58 L48.6 59.8 L41.6 61.6 L39.8 68.6 L38 61.6 L31 59.8 Z"
        fill="#f97316"
        opacity="0.45"
      />

      {/* Pontos decorativos */}
      <circle cx="200" cy="80" r="5" fill="#f97316" opacity="0.25" />
      <circle cx="56" cy="96" r="3.5" fill="#18181b" opacity="0.12" />
      <circle cx="228" cy="96" r="3" fill="#18181b" opacity="0.1" />
    </svg>
  );
}
