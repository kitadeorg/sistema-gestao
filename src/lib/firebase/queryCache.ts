/**
 * Cache em memória com TTL para queries Firestore pesadas.
 * Evita re-fetches desnecessários quando os dados não mudaram.
 *
 * Uso:
 *   const cache = getQueryCache();
 *   const data  = await cache.get('key', ttlMs, () => fetchFromFirestore());
 */

interface CacheEntry<T> {
  data:      T;
  expiresAt: number;
}

class QueryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Obtém dados do cache ou executa o fetcher se expirado/inexistente.
   * @param key     Chave única (ex: `quotas:${condoIds.join(',')}`)
   * @param ttlMs   Tempo de vida em ms (ex: 60_000 = 1 minuto)
   * @param fetcher Função async que retorna os dados frescos
   */
  async get<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const now   = Date.now();
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (entry && entry.expiresAt > now) {
      return entry.data;
    }

    const data = await fetcher();
    this.store.set(key, { data, expiresAt: now + ttlMs });
    return data;
  }

  /** Invalida uma chave específica */
  invalidate(key: string) {
    this.store.delete(key);
  }

  /** Invalida todas as chaves que começam com um prefixo */
  invalidatePrefix(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  /** Limpa todo o cache */
  clear() {
    this.store.clear();
  }

  /** Número de entradas em cache */
  get size() {
    return this.store.size;
  }
}

// Singleton — partilhado por toda a aplicação
let instance: QueryCache | null = null;

export function getQueryCache(): QueryCache {
  if (!instance) instance = new QueryCache();
  return instance;
}

// TTLs recomendados
export const CACHE_TTL = {
  CONDOMINIOS:  5  * 60_000,  // 5 min — raramente mudam
  QUOTAS:       2  * 60_000,  // 2 min — mudam com pagamentos
  DESPESAS:     3  * 60_000,  // 3 min
  OCORRENCIAS:  1  * 60_000,  // 1 min — mudam com frequência
  MORADORES:    5  * 60_000,  // 5 min
  UNIDADES:     5  * 60_000,  // 5 min
  USUARIOS:     3  * 60_000,  // 3 min
  RANKING:      2  * 60_000,  // 2 min
} as const;
