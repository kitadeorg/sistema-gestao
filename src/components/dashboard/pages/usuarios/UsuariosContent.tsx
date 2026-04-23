'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, RefreshCw, ShieldAlert, PhoneCall } from 'lucide-react';
import {
  getUsers,
  deleteUser,
  toggleUserStatus,
  type UserData,
} from '@/lib/firebase/users';
import UsuariosTable from './UsuariosTable';
import UserModal from './UserModal';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type RoleFilter        = UserData['role'] | 'todos';
type StatusFilter      = UserData['status'] | 'todos';
type EmailStatusFilter = 'todos' | 'contactar'; // 'contactar' = bounce + spam + erro

export default function UsuariosContent() {
  const { user, userData, loading: authLoading } = useAuthContext();

  const canAccess =
    userData?.role === 'admin' || userData?.role === 'gestor';

  const [users, setUsers]                         = useState<UserData[]>([]);
  const [loading, setLoading]                     = useState(false);
  const [searchTerm, setSearchTerm]               = useState('');
  const [roleFilter, setRoleFilter]               = useState<RoleFilter>('todos');
  const [statusFilter, setStatusFilter]           = useState<StatusFilter>('todos');
  const [emailStatusFilter, setEmailStatusFilter] = useState<EmailStatusFilter>('todos');
  const [isModalOpen, setIsModalOpen]             = useState(false);
  const [editingUser, setEditingUser]             = useState<UserData | null>(null);

  /* ── Carregar utilizadores ── */

  const fetchUsers = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Erro ao carregar utilizadores:', err);
    } finally {
      setLoading(false);
    }
  }, [canAccess]);

  useEffect(() => {
    if (!authLoading && user && userData) {
      if (canAccess) {
        fetchUsers();
      } else {
        setLoading(false);
      }
    }
  }, [fetchUsers, authLoading, user, userData, canAccess]);

  /* ── Filtros ── */

  const EMAIL_STATUS_ALERTA = ['email_bounce', 'email_spam', 'email_erro'];

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      searchTerm === '' ||
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole        = roleFilter === 'todos' || u.role === roleFilter;
    const matchesStatus      = statusFilter === 'todos' || u.status === statusFilter;
    const matchesEmailStatus =
      emailStatusFilter === 'todos' ||
      (emailStatusFilter === 'contactar' && EMAIL_STATUS_ALERTA.includes(u.emailStatus ?? ''));

    return matchesSearch && matchesRole && matchesStatus && matchesEmailStatus;
  });

  /* ── Handlers ── */

  const handleEdit = (user: UserData) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    toast('Eliminar utilizador?', {
      description: 'Esta acção não pode ser desfeita.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await deleteUser(userId);
            await fetchUsers();
            toast.success('Utilizador eliminado com sucesso.');
          } catch (err: any) {
            console.error('Erro ao eliminar:', err);
            toast.error(err?.message ?? 'Erro ao eliminar utilizador.');
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  const handleToggleStatus = async (
    userId: string,
    currentStatus: UserData['status'],
  ) => {
    if (currentStatus === 'pendente') {
      toast.warning('Utilizador pendente deve activar a conta através da tela de login.');
      return;
    }
    try {
      await toggleUserStatus(userId, currentStatus);
      await fetchUsers();
      toast.success('Estado do utilizador actualizado.');
    } catch (err: any) {
      console.error('Erro ao alternar status:', err);
      toast.error(err?.message ?? 'Erro ao alternar status.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSuccess = () => {
    handleCloseModal();
    fetchUsers();
  };

  /* ── Contadores ── */

  const paraContactar = users.filter((u) =>
    EMAIL_STATUS_ALERTA.includes(u.emailStatus ?? ''),
  ).length;

  const counts = {
    total:        users.length,
    ativos:       users.filter((u) => u.status === 'ativo').length,
    inativos:     users.filter((u) => u.status === 'inativo').length,
    pendentes:    users.filter((u) => u.status === 'pendente').length,
    paraContactar,
  };

  /* ── Guards ── */

  if (authLoading) {
    return (
      <div className="p-10 text-center text-zinc-500 text-sm">
        A carregar permissões...
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900">Acesso Restrito</h2>
        <p className="text-zinc-600 max-w-sm mt-2">
          Não tem permissão para visualizar a lista de utilizadores.
          Apenas Administradores e Gestores podem aceder a esta página.
        </p>
      </div>
    );
  }

  /* ── Render ── */

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Usuários</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gerir utilizadores da plataforma
          </p>
        </div>

        {userData?.role === 'admin' && (
          <button
            onClick={() => {
              setEditingUser(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors"
          >
            <Plus size={16} />
            Novo Usuário
          </button>
        )}
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',     value: counts.total,        color: 'bg-zinc-100 text-zinc-700',       filter: null },
          { label: 'Ativos',    value: counts.ativos,       color: 'bg-emerald-50 text-emerald-700',  filter: null },
          { label: 'Inativos',  value: counts.inativos,     color: 'bg-red-50 text-red-700',          filter: null },
          { label: 'Pendentes', value: counts.pendentes,    color: 'bg-amber-50 text-amber-700',      filter: null },
          {
            label: 'Contactar',
            value: counts.paraContactar,
            color: counts.paraContactar > 0
              ? 'bg-rose-50 text-rose-700 border-rose-200 cursor-pointer hover:bg-rose-100 transition-colors'
              : 'bg-zinc-50 text-zinc-400',
            filter: 'contactar' as EmailStatusFilter,
          },
        ].map((item) => (
          <div
            key={item.label}
            onClick={() => {
              if (item.filter) {
                setEmailStatusFilter((prev) =>
                  prev === item.filter ? 'todos' : item.filter!,
                );
              }
            }}
            className={cn(
              'rounded-xl px-4 py-3 border border-zinc-200',
              item.color,
              emailStatusFilter === item.filter && item.filter && 'ring-2 ring-rose-400',
            )}
          >
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">
              {item.label}
            </p>
            <p className="text-2xl font-bold mt-1">{item.value}</p>
            {item.filter && counts.paraContactar > 0 && (
              <p className="text-xs mt-1 opacity-70 flex items-center gap-1">
                <PhoneCall size={10} />
                e-mail não entregue
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Aviso de pendentes para contactar */}
      {counts.paraContactar > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-start gap-3">
          <PhoneCall size={16} className="mt-0.5 flex-shrink-0 text-rose-500" />
          <div>
            <p className="font-semibold">
              {counts.paraContactar} utilizador{counts.paraContactar > 1 ? 'es' : ''} com e-mail não entregue
            </p>
            <p className="text-rose-700">
              O convite não chegou ao destino (bounce, spam ou erro de entrega). Contacte-os por outro meio para confirmar o e-mail correcto.
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
          />
        </div>

        {/* Filtro Role */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white"
        >
          <option value="todos">Todos os Roles</option>
          <option value="admin">Administrador</option>
          <option value="gestor">Gestor</option>
          <option value="sindico">Síndico</option>
          <option value="funcionario">Funcionário</option>
          <option value="morador">Morador</option>
        </select>

        {/* Filtro Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white"
        >
          <option value="todos">Todos os Status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="pendente">Pendente</option>
        </select>

        {/* Filtro Email Status */}
        <select
          value={emailStatusFilter}
          onChange={(e) => setEmailStatusFilter(e.target.value as EmailStatusFilter)}
          className={cn(
            'px-4 py-2.5 rounded-xl border text-sm bg-white',
            emailStatusFilter === 'contactar'
              ? 'border-rose-300 text-rose-700'
              : 'border-zinc-200',
          )}
        >
          <option value="todos">Todos os E-mails</option>
          <option value="contactar">⚠️ Para Contactar</option>
        </select>

        {/* Refresh */}
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          title="Recarregar"
        >
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      {/* Aviso para Gestores */}
      {userData?.role === 'gestor' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Apenas <b>Administradores</b> podem criar, editar ou eliminar utilizadores.
        </div>
      )}

      {/* Tabela */}
      <UsuariosTable
        users={filteredUsers}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
      />

      {/* Modal */}
      {isModalOpen && (
        <UserModal
          user={editingUser}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}