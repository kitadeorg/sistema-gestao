
import { query, where, Query, CollectionReference } from 'firebase/firestore';

/**
 * Aplica filtro automático de condomínio (tenant isolation)
 * Admin não é filtrado.
 */
export function withCondominioFilter<T>(
  baseQuery: Query<T> | CollectionReference<T>,
  condominioId: string | null,
  isAdmin: boolean
): Query<T> {

  // ✅ Admin vê tudo
  if (isAdmin) {
    return baseQuery as Query<T>;
  }

  // ❌ Sem condomínio selecionado = retorna vazio
  if (!condominioId) {
    return query(baseQuery as Query<T>, where('condominioId', '==', '__none__'));
  }

  // ✅ Aplica filtro real
  return query(baseQuery as Query<T>, where('condominioId', '==', condominioId));
}