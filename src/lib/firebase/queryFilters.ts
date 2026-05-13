import { query, where, Query, CollectionReference } from 'firebase/firestore';

/**
 * Aplica filtro de condomínio (tenant isolation).
 *
 * - condominioId presente → sempre filtra por ele (qualquer role)
 * - condominioId ausente + isSuperAdmin → sem filtro (vê tudo)
 * - condominioId ausente + não super_admin → retorna vazio
 */
export function withCondominioFilter<T>(
  baseQuery: Query<T> | CollectionReference<T>,
  condominioId: string | null,
  isSuperAdmin: boolean
): Query<T> {

  // Sempre filtra quando o ID está presente
  if (condominioId) {
    return query(baseQuery as Query<T>, where('condominioId', '==', condominioId));
  }

  // Sem condominioId: só super_admin vê tudo
  if (isSuperAdmin) {
    return baseQuery as Query<T>;
  }

  // Qualquer outro role sem condominioId → vazio
  return query(baseQuery as Query<T>, where('condominioId', '==', '__none__'));
}