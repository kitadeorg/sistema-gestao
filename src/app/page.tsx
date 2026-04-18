"use client";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import Image from "next/image";
import { useRouter } from "next/navigation";

const poppins = Poppins({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700", "800"] 
});

export default function Home() {
  const router = useRouter();

  // Funções para tornar os botões funcionais
  const handleLogin = () => router.push("/autenticacao");
  const handleRegister = () => router.push("/autenticacao"); // Ou rota de registro se houver

  return (
    <div className={`${poppins.className} min-h-screen bg-white text-zinc-900 antialiased`}>
      
      {/* Menu / Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white">
        <div className="max-w-7xl mx-auto px-8 h-24 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center font-black text-3xl tracking-tighter">
              <span>M</span>
              <div className="w-5 h-5 bg-[#FF6600] rounded-full mx-0.5"></div>
              <span>G</span>
            </div>
            <span className="text-zinc-400 font-medium text-sm tracking-[0.2em] uppercase ml-2">
              Multi Gest
            </span>
          </div>

          {/* Botão Entrar */}
          <button 
            onClick={handleLogin}
            className="bg-black text-white px-10 py-3 rounded-lg font-bold hover:bg-zinc-800 transition-all active:scale-95"
          >
            Entrar
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 min-h-screen flex flex-col md:flex-row items-center justify-between pt-20">
        
        {/* Lado Esquerdo: Textos */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 space-y-8"
        >
          <div className="space-y-1">
            <h1 className="text-6xl md:text-7xl font-extrabold text-black leading-none tracking-tight">
              Gestão de
            </h1>
            <h2 className="text-6xl md:text-7xl font-extrabold text-[#FF6600] leading-none tracking-tight">
              Condomínios
            </h2>
          </div>

          <p className="text-xl text-zinc-400 max-w-lg leading-relaxed">
            Controle vários condomínios a partir de uma única plataforma. 
            Transforme sua operação em uma gestão real de ativos imobiliários.
          </p>

          <button 
            onClick={handleRegister}
            className="px-10 py-5 bg-[#FF6600] text-white font-black rounded-2xl hover:bg-[#e65c00] transition-all shadow-2xl shadow-orange-500/40 active:scale-95 text-xl"
          >
            Criar conta
          </button>
        </motion.div>

        {/* Lado Direito: A Sua Imagem */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 w-full flex justify-end"
        >
          <div className="relative w-full max-w-xl aspect-square">
            <Image 
              src="/hero-image.png" // O nome do arquivo que você salvou na pasta public
              alt="Ilustração de Gestão de Condomínios"
              fill
              className="object-contain"
              priority
            />
          </div>
        </motion.div>

      </main>
    </div>
  );
}