'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import {
  Building2, Shield, BarChart3, Users,
  Wrench, Bell, ArrowRight, CheckCircle2,
  ChevronDown, Menu, X, Star,
} from 'lucide-react';

// ─────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────

function Navbar({ onCta }: { onCta: () => void }) {
  const [scrolled,   setScrolled]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    { label: 'Funcionalidades', href: '#features' },
    { label: 'Como funciona',   href: '#how' },
    { label: 'Planos',          href: '#pricing' },
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.svg" alt="CONDO." width={120} height={29} priority className="h-7 sm:h-8 w-auto" />
        </Link>

        {/* Links desktop */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.href} href={l.href}
               className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA desktop */}
        <div className="hidden md:flex items-center gap-3">
          <button onClick={onCta}
            className="px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:text-zinc-900 transition-colors">
            Entrar
          </button>
          <button onClick={onCta}
            className="px-5 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors">
            Começar agora
          </button>
        </div>

        {/* Hamburger mobile */}
        <button onClick={() => setMenuOpen(v => !v)}
          className="md:hidden p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-zinc-100 px-4 py-4 space-y-1">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
               className="block px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors">
              {l.label}
            </a>
          ))}
          <div className="pt-3 border-t border-zinc-100 space-y-2">
            <button onClick={onCta}
              className="w-full px-4 py-2.5 text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
              Entrar
            </button>
            <button onClick={onCta}
              className="w-full px-4 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors">
              Começar agora
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────

function Hero({ onCta }: { onCta: () => void }) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center pt-16 sm:pt-20 px-4 sm:px-6 text-center bg-gradient-to-b from-white to-zinc-50">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto space-y-6 sm:space-y-8"
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-orange-700 text-xs sm:text-sm font-semibold">
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          Plataforma de gestão multi-condomínio
        </div>

        {/* Título */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-zinc-900 leading-none tracking-tight">
          Gestão de<br />
          <span className="text-[#FF6600]">Condomínios</span><br />
          simplificada
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed">
          Controle vários condomínios a partir de uma única plataforma.
          Moradores, finanças, ocorrências e equipa — tudo num só lugar.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button onClick={onCta}
            className="w-full sm:w-auto px-8 py-4 bg-[#FF6600] text-white font-bold rounded-2xl hover:bg-[#e65c00] transition-all shadow-xl shadow-orange-500/30 active:scale-95 flex items-center justify-center gap-2 text-base sm:text-lg">
            Começar gratuitamente
            <ArrowRight size={20} />
          </button>
          <a href="#features"
            className="w-full sm:w-auto px-8 py-4 border border-zinc-200 text-zinc-700 font-semibold rounded-2xl hover:bg-zinc-50 transition-colors text-base sm:text-lg text-center">
            Ver funcionalidades
          </a>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-4 text-sm text-zinc-400">
          {['Sem cartão de crédito', 'Configuração em minutos', 'Suporte incluído'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500" />
              {t}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Hero image */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-12 sm:mt-16 w-full max-w-4xl mx-auto px-4"
      >
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-200">
          <Image
            src="/hero-image.png"
            alt="Dashboard CONDO."
            width={1200}
            height={700}
            className="w-full h-auto object-cover"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        </div>
      </motion.div>

      {/* Scroll hint */}
      <a href="#features" className="mt-10 flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-600 transition-colors">
        <span className="text-xs">Explorar</span>
        <ChevronDown size={18} className="animate-bounce" />
      </a>
    </section>
  );
}

// ─────────────────────────────────────────────
// FEATURES
// ─────────────────────────────────────────────

const FEATURES = [
  {
    icon: Building2,
    color: 'bg-orange-50 text-orange-600',
    title: 'Multi-Condomínio',
    desc: 'Gere vários condomínios a partir de um único painel. Alterne entre eles com um clique.',
  },
  {
    icon: BarChart3,
    color: 'bg-blue-50 text-blue-600',
    title: 'Financeiro Completo',
    desc: 'Fluxo de caixa, pagamentos, inadimplência e relatórios em tempo real.',
  },
  {
    icon: Users,
    color: 'bg-emerald-50 text-emerald-600',
    title: 'Gestão de Moradores',
    desc: 'Cadastro, quotas, visitantes e comunicação directa com os moradores.',
  },
  {
    icon: Bell,
    color: 'bg-amber-50 text-amber-600',
    title: 'Ocorrências',
    desc: 'Registo e acompanhamento de ocorrências com notificações automáticas.',
  },
  {
    icon: Wrench,
    color: 'bg-purple-50 text-purple-600',
    title: 'Manutenção',
    desc: 'Planeamento e controlo de tarefas de manutenção preventiva e correctiva.',
  },
  {
    icon: Shield,
    color: 'bg-zinc-100 text-zinc-700',
    title: 'Segurança e Acessos',
    desc: 'Controlo de visitantes, portaria e permissões por perfil de utilizador.',
  },
];

function Features() {
  return (
    <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-900 tracking-tight mb-4">
            Tudo o que precisas
          </h2>
          <p className="text-zinc-500 text-base sm:text-lg max-w-2xl mx-auto">
            Uma plataforma completa para gerir condomínios de forma profissional e eficiente.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="p-5 sm:p-6 rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all bg-white"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon size={20} />
              </div>
              <h3 className="font-bold text-zinc-900 mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────────

const STEPS = [
  { n: '01', title: 'Cria a tua conta',       desc: 'Regista-te e configura o teu perfil de administrador em minutos.' },
  { n: '02', title: 'Adiciona os condomínios', desc: 'Importa ou cria os condomínios que vais gerir na plataforma.' },
  { n: '03', title: 'Convida a equipa',        desc: 'Adiciona síndicos, funcionários e moradores com os seus perfis de acesso.' },
  { n: '04', title: 'Gere em tempo real',      desc: 'Acompanha finanças, ocorrências e manutenção a partir do dashboard.' },
];

function HowItWorks() {
  return (
    <section id="how" className="py-16 sm:py-24 px-4 sm:px-6 bg-zinc-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-900 tracking-tight mb-4">
            Como funciona
          </h2>
          <p className="text-zinc-500 text-base sm:text-lg max-w-xl mx-auto">
            Começa a gerir os teus condomínios em 4 passos simples.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative"
            >
              {/* Linha conectora */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-zinc-200 -translate-x-4 z-0" />
              )}
              <div className="relative z-10">
                <div className="w-12 h-12 bg-[#FF6600] text-white rounded-2xl flex items-center justify-center font-black text-sm mb-4 shadow-lg shadow-orange-500/20">
                  {s.n}
                </div>
                <h3 className="font-bold text-zinc-900 mb-2">{s.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────

const PLANS = [
  {
    name: 'Básico',
    price: 'Grátis',
    period: '',
    desc: 'Para começar a gerir um condomínio.',
    features: ['1 condomínio', 'Até 50 unidades', 'Moradores e ocorrências', 'Suporte por email'],
    cta: 'Começar grátis',
    highlight: false,
  },
  {
    name: 'Profissional',
    price: '29€',
    period: '/mês',
    desc: 'Para gestores com múltiplos condomínios.',
    features: ['Até 10 condomínios', 'Unidades ilimitadas', 'Financeiro completo', 'Relatórios avançados', 'Suporte prioritário'],
    cta: 'Experimentar 14 dias',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    desc: 'Para grandes portfólios e empresas.',
    features: ['Condomínios ilimitados', 'API personalizada', 'Integração contabilística', 'Gestor de conta dedicado'],
    cta: 'Falar com vendas',
    highlight: false,
  },
];
{/** 
function Pricing({ onCta }: { onCta: () => void }) {
  return (
    <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-900 tracking-tight mb-4">
            Planos simples
          </h2>
          <p className="text-zinc-500 text-base sm:text-lg max-w-xl mx-auto">
            Sem surpresas. Cancela quando quiseres.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-start">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`rounded-2xl p-6 sm:p-8 border ${
                p.highlight
                  ? 'border-[#FF6600] bg-zinc-900 text-white shadow-2xl shadow-orange-500/20 scale-105'
                  : 'border-zinc-200 bg-white'
              }`}
            >
              {p.highlight && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FF6600] text-white text-xs font-bold rounded-full mb-4">
                  <Star size={11} />
                  Mais popular
                </div>
              )}
              <h3 className={`font-bold text-lg mb-1 ${p.highlight ? 'text-white' : 'text-zinc-900'}`}>{p.name}</h3>
              <p className={`text-sm mb-4 ${p.highlight ? 'text-zinc-400' : 'text-zinc-500'}`}>{p.desc}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className={`text-3xl sm:text-4xl font-black ${p.highlight ? 'text-white' : 'text-zinc-900'}`}>{p.price}</span>
                <span className={`text-sm ${p.highlight ? 'text-zinc-400' : 'text-zinc-500'}`}>{p.period}</span>
              </div>
              <ul className="space-y-2.5 mb-8">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={15} className={p.highlight ? 'text-[#FF6600]' : 'text-emerald-500'} />
                    <span className={p.highlight ? 'text-zinc-300' : 'text-zinc-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={onCta}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  p.highlight
                    ? 'bg-[#FF6600] text-white hover:bg-[#e65c00]'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                {p.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
*/}
// ─────────────────────────────────────────────
// CTA FINAL
// ─────────────────────────────────────────────

function CtaSection({ onCta }: { onCta: () => void }) {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-zinc-900">
      <div className="max-w-3xl mx-auto text-center space-y-6 sm:space-y-8">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
          Pronto para simplificar<br />a tua gestão?
        </h2>
        <p className="text-zinc-400 text-base sm:text-lg">
          Junta-te a centenas de gestores que já usam o CONDO. para gerir os seus condomínios.
        </p>
        <button
          onClick={onCta}
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF6600] text-white font-bold rounded-2xl hover:bg-[#e65c00] transition-all shadow-xl shadow-orange-500/30 active:scale-95 text-base sm:text-lg"
        >
          Começar agora — é grátis
          <ArrowRight size={20} />
        </button>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-500 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Image src="/logo.svg" alt="CONDO." width={100} height={24} className="h-6 w-auto opacity-60" />
        <p className="text-xs text-center sm:text-left">
          © {new Date().getFullYear()} CONDO. — Sistema de Gestão de Condomínios
        </p>
        <div className="flex gap-4 text-xs">
          <a href="#" className="hover:text-zinc-300 transition-colors">Privacidade</a>
          <a href="#" className="hover:text-zinc-300 transition-colors">Termos</a>
          <a href="#" className="hover:text-zinc-300 transition-colors">Contacto</a>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// PAGE PRINCIPAL
// ─────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Redirecionar para dashboard se já estiver autenticado
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  const goToAuth = () => router.push('/autenticacao');

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 antialiased">
      <Navbar onCta={goToAuth} />
      <Hero onCta={goToAuth} />
      <Features />
      <HowItWorks />
      <CtaSection onCta={goToAuth} />
      <Footer />
    </div>
  );
}
