'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LogOut, Bell, Settings, User, ChevronDown, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/**
 * Hook customizado para gerenciar um dropdown simples.
 */
function useDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);
  return { isOpen, toggle, close };
}

/**
 * Cabeçalho principal da área do dashboard.
 * Exibe o logo, ações rápidas e o perfil do usuário com dropdown.
 * Os dados do usuário são obtidos através do AuthContext.
 */
export function DashboardHeader() {
  const { user: firebaseUser, userData, loading } = useAuthContext();
  const profileDropdown = useDropdown();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowConfirm(false);
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Não foi possível sair. Tenta novamente.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Não renderiza nada enquanto os dados de autenticação estão a ser carregados
  if (loading) {
    return (
      <header className="bg-white h-16 border-b border-zinc-100 flex items-center justify-between px-4 sm:px-6 lg:px-8 animate-pulse">
        <div className="h-7 w-32 bg-zinc-200 rounded-md"></div>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-zinc-200"></div>
          <div className="w-10 h-10 rounded-full bg-zinc-200"></div>
        </div>
      </header>
    );
  }

  if (!userData || !firebaseUser) {
    return null; // ou um cabeçalho de "não logado"
  }

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <ConfirmDialog
        open={showConfirm}
        title="Tem a certeza que deseja sair?"
        message="A sua sessão será encerrada."
        confirmLabel="Sair"
        onConfirm={handleLogout}
        onCancel={() => setShowConfirm(false)}
        loading={isLoggingOut}
      />
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white font-bold">M</span>
            <h1 className="hidden sm:block text-xl font-bold text-gray-800">
              MULTI<span className="text-orange-500">.</span>GEST
            </h1>
          </Link>

          {/* Ações e Perfil */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              title="Notificações"
            >
              <Bell className="w-5 h-5" />
            </button>

            {/* Dropdown de Perfil */}
            <div className="relative">
              <button
                onClick={profileDropdown.toggle}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                {/* Avatar */}
                <div className="w-8 h-8 bg-zinc-200 rounded-full flex items-center justify-center overflow-hidden">
                  {firebaseUser.photoURL ? (
                    <img src={firebaseUser.photoURL} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-zinc-600">{userData.nome?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {/* Nome e Role (visível em telas maiores) */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-800">{userData.nome}</p>
                  <p className="text-xs text-gray-500 capitalize">{userData.role}</p>
                </div>
                <ChevronDown size={16} className={`hidden md:block text-gray-500 transition-transform ${profileDropdown.isOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Menu Dropdown */}
              {profileDropdown.isOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={profileDropdown.close}></div>
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-zinc-100 rounded-xl shadow-lg p-2 z-20 animate-in fade-in slide-in-from-top-2">
                    <Link href="/dashboard/profile" onClick={profileDropdown.close} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-zinc-600 hover:bg-zinc-50">
                      <User size={16} /> Meu Perfil
                    </Link>
                    <Link href="/dashboard/settings" onClick={profileDropdown.close} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-zinc-600 hover:bg-zinc-50">
                      <Settings size={16} /> Definições
                    </Link>
                    <div className="h-px bg-zinc-100 my-1"></div>
                    <button
                      onClick={() => { profileDropdown.close(); setShowConfirm(true); }}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut size={16} />}
                      {isLoggingOut ? 'A sair...' : 'Sair'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}