// Ficheiro: src/components/dashboard/pages/usuarios/UsuariosContent.tsx
// Este código já está correto. O erro é no componente <UsuariosTable />

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, RefreshCw, ShieldAlert } from 'lucide-react';
import { getUsers, deleteUser, toggleUserStatus, type UserData } from '@/lib/firebase/users';
import UsuariosTable from './UsuariosTable';
import UserModal from './UserModal';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';

type RoleFilter = UserData['role'] | 'todos';
type StatusFilter = UserData['status'] | 'todos';

export default function UsuariosContent() {
  const { user, userData, loading: authLoading } = useAuthContext();

  const canAccess = userData?.role === 'admin' || userData?.role === 'gestor';

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

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

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      searchTerm === '' ||
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'todos' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'todos' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleEdit = (user: UserData) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este utilizador?')) return;
    try {
      await deleteUser(userId);
      await fetchUsers();
    } catch (err) {
      console.error('Erro ao eliminar:', err);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: UserData['status']) => {
    try {
      await toggleUserStatus(userId, currentStatus);
      await fetchUsers();
    } catch (err) {
      console.error('Erro ao alternar status:', err);
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

  const counts = {
    total: users.length,
    ativos: users.filter((u) => u.status === 'ativo').length,
    inativos: users.filter((u) => u.status === 'inativo').length,
    pendentes: users.filter((u) => u.status === 'pendente').length,
  };

  if (authLoading) return <div className="p-10 text-center">A carregar permissões...</div>;

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900">Acesso Restrito</h2>
        <p className="text-zinc-600 max-w-sm mt-2">
          Não tem permissão para visualizar a lista de utilizadores. Apenas Administradores e Gestores podem aceder a esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Usuários</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerir utilizadores da plataforma</p>
        </div>

        {userData?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors"
          >
            <Plus size={16} />
            Novo Usuário
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'bg-zinc-100 text-zinc-700' },
          { label: 'Ativos', value: counts.ativos, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Inativos', value: counts.inativos, color: 'bg-red-50 text-red-700' },
          { label: 'Pendentes', value: counts.pendentes, color: 'bg-amber-50 text-amber-700' },
        ].map((item) => (
          <div key={item.label} className={cn('rounded-xl px-4 py-3 border border-zinc-200', item.color)}>
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">{item.label}</p>
            <p className="text-2xl font-bold mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
         <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)} className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white">
           <option value="todos">Todos os Roles</option>
           <option value="admin">Admin</option>
           <option value="gestor">Gestor</option>
           <option value="sindico">Síndico</option>
           <option value="funcionario">Funcionário</option>
           <option value="morador">Morador</option>
        </select>
        <button onClick={fetchUsers} disabled={loading} className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50">
           <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      <UsuariosTable
        users={filteredUsers}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
      />

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