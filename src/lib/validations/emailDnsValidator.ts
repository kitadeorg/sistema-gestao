// src/lib/validations/emailDnsValidator.ts

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface EmailValidationResult {
  email: string;
  valid: boolean;
  reason?: 'invalid_format' | 'no_mx_record' | 'dns_error';
}

export interface BatchValidationResult {
  valid: EmailValidationResult[];
  invalid: EmailValidationResult[];
}

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const CLOUDFLARE_DNS_API = 'https://cloudflare-dns.com/dns-query';

// Cache em memória para não repetir consultas do mesmo domínio na mesma sessão
const domainCache = new Map<string, boolean>();

// ─────────────────────────────────────────────
// UTILITÁRIOS INTERNOS
// ─────────────────────────────────────────────

/**
 * Verifica se o e-mail tem formato básico válido.
 * Não substitui validação completa — é apenas o primeiro filtro.
 */
function hasValidFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Extrai o domínio de um e-mail.
 * Ex: "user@gmail.com" → "gmail.com"
 */
function extractDomain(email: string): string {
  return email.trim().toLowerCase().split('@')[1];
}

/**
 * Consulta os registos MX do domínio via API DNS-over-HTTPS do Cloudflare.
 * Retorna true se existir pelo menos um registo MX (ou seja, o domínio
 * tem servidores de e-mail configurados).
 *
 * Usa cache em memória para evitar consultas repetidas ao mesmo domínio.
 */
async function hasMxRecord(domain: string): Promise<boolean> {
  if (domainCache.has(domain)) {
    return domainCache.get(domain)!;
  }

  const url = `${CLOUDFLARE_DNS_API}?name=${encodeURIComponent(domain)}&type=MX`;

  const response = await fetch(url, {
    headers: { Accept: 'application/dns-json' },
  });

  if (!response.ok) {
    throw new Error(`DNS query failed for domain "${domain}": ${response.status}`);
  }

  const data = await response.json();

  // A Cloudflare devolve { Status: 0, Answer: [...] }
  // Status 0 = sem erros. Answer com registos MX = domínio válido.
  const hasMx =
    data.Status === 0 &&
    Array.isArray(data.Answer) &&
    data.Answer.some((record: { type: number }) => record.type === 15); // 15 = MX

  domainCache.set(domain, hasMx);
  return hasMx;
}

// ─────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────

/**
 * Valida um único e-mail:
 * 1. Verifica formato básico.
 * 2. Consulta registos MX do domínio via Cloudflare.
 *
 * @param email - Endereço de e-mail a validar.
 * @returns EmailValidationResult com valid=true se passou nos dois filtros.
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const normalized = email.trim().toLowerCase();

  if (!hasValidFormat(normalized)) {
    return { email: normalized, valid: false, reason: 'invalid_format' };
  }

  const domain = extractDomain(normalized);

  try {
    const mx = await hasMxRecord(domain);
    if (!mx) {
      return { email: normalized, valid: false, reason: 'no_mx_record' };
    }
    return { email: normalized, valid: true };
  } catch {
    return { email: normalized, valid: false, reason: 'dns_error' };
  }
}

/**
 * Valida uma lista de e-mails em paralelo (Promise.allSettled).
 * Separa automaticamente os válidos dos inválidos.
 *
 * @param emails - Array de endereços de e-mail.
 * @returns BatchValidationResult com duas listas: valid e invalid.
 *
 * @example
 * const { valid, invalid } = await validateEmailBatch([
 *   'joao@gmail.com',
 *   'maria@gamil.con',
 *   'pedro@outlook.com',
 * ]);
 */
export async function validateEmailBatch(emails: string[]): Promise<BatchValidationResult> {
  const results = await Promise.allSettled(emails.map(validateEmail));

  const valid: EmailValidationResult[] = [];
  const invalid: EmailValidationResult[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.valid) {
        valid.push(result.value);
      } else {
        invalid.push(result.value);
      }
    } else {
      // Promise rejeitada por erro inesperado — trata como inválido
      invalid.push({
        email: emails[index].trim().toLowerCase(),
        valid: false,
        reason: 'dns_error',
      });
    }
  });

  return { valid, invalid };
}


export function clearDomainCache(): void {
  domainCache.clear();
}