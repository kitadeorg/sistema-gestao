'use client';

import React from 'react';
import { Pencil, Trash2, UserCheck, UserX, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import type { UserData, EmailDeliveryStatus } from '@/lib/firebase/users';

type UsuariosTableProps = {
  users: UserData[];
  loading?: boolean;
  onEdit: (user: UserData) => void;
  onDelete: (userId: string) => void;
  onToggleStatus: (userId: string, currentStatus: UserData['status']) => void;
};

// ─────────────────────────────────────────────
// HELPERS DE LABEL / BADGE
// ─────────────────────────────────────────────

function roleLabel(role: UserData['role']) {
  switch (role) {
    case 'admin':       return 'Administrador';
    case 'gestor':      return 'Gestor de Portfólio';
    case 'sindico':     return 'Síndico';
    case 'funcionario': return 'Funcionário';
    case 'morador':     return 'Morador';
    default:            return role;
  }
}

function RoleBadge({ role }: { role: UserData['role'] }) {
  const classes =
    role === 'admin'
      ? 'bg-red-50 text-red-700 border-red-200'
      : role === 'gestor'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : role === 'sindico'
          ? 'bg-purple-50 text-purple-700 border-purple-200'
          : role === 'funcionario'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-orange-50 text-orange-700 border-orange-200';

  return (
    <span className={cn('inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold border', classes)}>
      {roleLabel(role)}
    </span>
  );
}

function StatusBadge({ status }: { status: UserData['status'] }) {
  const classes =
    status === 'ativo'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'inativo'
        ? 'bg-zinc-100 text-zinc-700 border-zinc-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';

  const label =
    status === 'ativo' ? 'Ativo' : status === 'inativo' ? 'Inativo' : 'Pendente';

  return (
    <span className={cn('inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold border', classes)}>
      {label}
    </span>
  );
}

/**
 * Badge de rastreio de entrega do e-mail de convite.
 * Mostra undefined como "Aguardando" (convite ainda não disparado).
 */
function EmailStatusBadge({ status }: { status?: EmailDeliveryStatus }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border bg-zinc-50 text-zinc-400 border-zinc-200">
        <Clock size={10} />
        Aguardando
      </span>
    );
  }

  switch (status) {
    case 'email_entregue':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
          <CheckCircle2 size={10} />
          Entregue
        </span>
      );
    case 'email_bounce':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border bg-rose-50 text-rose-700 border-rose-200">
          <XCircle size={10} />
          Bounce
        </span>
      );
    case 'email_spam':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border bg-orange-50 text-orange-700 border-orange-200">
          <AlertTriangle size={10} />
          Spam
        </span>
      );
    case 'email_erro':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertTriangle size={10} />
          Erro Envio
        </span>
      );
  }
}

// ─────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      <div className="p-4 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function UsuariosTable({
  users,
  loading = false,
  onEdit,
  onDelete,
  onToggleStatus,
}: UsuariosTableProps) {
  const { user: firebaseUser, userData } = useAuthContext();

  const isAdmin    = userData?.role === 'admin';
  const currentUid = firebaseUser?.uid;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-3">
      {!isAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Apenas <b>Administradores</b> podem atribuir permissões, editar, desativar ou eliminar utilizadores.
        </div>
      )}

      {/* ── Desktop table ── */}
      <div className="hidden md:block rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Email</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Perfil</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Convite</th>
              <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">
                  Nenhum utilizador encontrado.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf     = !!currentUid && u.id === currentUid;
                const canManage  = isAdmin;
                const canDelete  = canManage && !isSelf;
                const canToggle  = canManage && !isSelf;
                const toggleLabel = u.status === 'ativo' ? 'Desativar' : 'Ativar';

                // Linha com fundo suave se e-mail problemático
                const rowAlert =
                  u.emailStatus === 'email_bounce' ||
                  u.emailStatus === 'email_spam' ||
                  u.emailStatus === 'email_erro';

                return (
                  <tr
                    key={u.id}
                    className={cn(
                      'transition-colors',
                      rowAlert ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-zinc-50/60',
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{u.nome}</p>
                        <p className="text-xs text-zinc-500 truncate">{u.telefone ?? ''}</p>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-sm text-zinc-700 truncate">{u.email}</p>
                    </td>

                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>

                    {/* ── Nova coluna: estado do convite ── */}
                    <td className="px-4 py-3">
                      <EmailStatusBadge status={u.emailStatus} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEdit(u)}
                          disabled={!canManage}
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors',
                            canManage
                              ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed',
                          )}
                          title={canManage ? 'Editar' : 'Apenas admin'}
                        >
                          <Pencil size={16} />
                          Editar
                        </button>

                        <button
                          onClick={() => onToggleStatus(u.id, u.status)}
                          disabled={!canToggle}
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors',
                            canToggle
                              ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed',
                          )}
                          title={
                            canToggle
                              ? toggleLabel
                              : isSelf
                                ? 'Não pode alterar a sua própria conta'
                                : 'Apenas admin'
                          }
                        >
                          {u.status === 'ativo' ? <UserX size={16} /> : <UserCheck size={16} />}
                          {toggleLabel}
                        </button>

                        <button
                          onClick={() => onDelete(u.id)}
                          disabled={!canDelete}
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors',
                            canDelete
                              ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed',
                          )}
                          title={
                            canDelete
                              ? 'Eliminar'
                              : isSelf
                                ? 'Não pode eliminar a sua própria conta'
                                : 'Apenas admin'
                          }
                        >
                          <Trash2 size={16} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">
            Nenhum utilizador encontrado.
          </div>
        ) : (
          users.map((u) => {
            const isSelf     = !!currentUid && u.id === currentUid;
            const canManage  = isAdmin;
            const canDelete  = canManage && !isSelf;
            const canToggle  = canManage && !isSelf;
            const toggleLabel = u.status === 'ativo' ? 'Desativar' : 'Ativar';

            const rowAlert =
              u.emailStatus === 'email_bounce' ||
              u.emailStatus === 'email_spam' ||
              u.emailStatus === 'email_erro';

            return (
              <div
                key={u.id}
                className={cn(
                  'rounded-2xl border p-4',
                  rowAlert ? 'border-rose-200 bg-rose-50/40' : 'border-zinc-200 bg-white',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-900 truncate">{u.nome}</p>
                    <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                    {u.telefone && (
                      <p className="text-xs text-zinc-500 truncate">{u.telefone}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <RoleBadge role={u.role} />
                    <StatusBadge status={u.status} />
                    {/* Badge de convite no mobile */}
                    <EmailStatusBadge status={u.emailStatus} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onEdit(u)}
                    disabled={!canManage}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold border transition-colors',
                      canManage
                        ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed',
                    )}
                  >
                    <Pencil size={14} />
                    Editar
                  </button>

                  <button
                    onClick={() => onToggleStatus(u.id, u.status)}
                    disabled={!canToggle}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold border transition-colors',
                      canToggle
                        ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed',
                    )}
                  >
                    {u.status === 'ativo' ? <UserX size={14} /> : <UserCheck size={14} />}
                    {toggleLabel}
                  </button>

                  <button
                    onClick={() => onDelete(u.id)}
                    disabled={!canDelete}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold border transition-colors',
                      canDelete
                        ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed',
                    )}
                  >
                    <Trash2 size={14} />
                    Apagar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}