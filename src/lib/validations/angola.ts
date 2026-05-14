/**
 * angola.ts
 * Validadores e máscaras para formatos angolanos usados em todo o sistema.
 */

// ─── TELEFONE ─────────────────────────────────────────────────────────────────
// Formato: +244 9XX XXX XXX  (9 dígitos após +244, começa por 9)
// Aceita também: 9XX XXX XXX (sem prefixo) ou 00244...

export function formatTelefone(raw: string): string {
  // Remove tudo excepto dígitos e o + inicial
  let digits = raw.replace(/[^\d]/g, '');

  // Remove prefixo 244 ou 00244 se presente
  if (digits.startsWith('00244')) digits = digits.slice(5);
  else if (digits.startsWith('244')) digits = digits.slice(3);

  // Limita a 9 dígitos
  digits = digits.slice(0, 9);

  // Aplica máscara: 9XX XXX XXX
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function validateTelefone(value: string): string | null {
  if (!value || value.trim() === '') return null; // opcional por defeito

  // Extrai só os dígitos locais (sem prefixo)
  let digits = value.replace(/[^\d]/g, '');
  if (digits.startsWith('00244')) digits = digits.slice(5);
  else if (digits.startsWith('244')) digits = digits.slice(3);

  if (digits.length === 0) return null;
  if (!digits.startsWith('9')) return 'Número angolano deve começar por 9.';
  if (digits.length < 9) return `Número incompleto — faltam ${9 - digits.length} dígito${9 - digits.length !== 1 ? 's' : ''}.`;
  if (digits.length > 9) return 'Número demasiado longo.';
  return null;
}

export function isTelefoneValid(value: string): boolean {
  return validateTelefone(value) === null && value.trim() !== '';
}

// ─── BI / DOCUMENTO ───────────────────────────────────────────────────────────
// Formato BI angolano: 9 dígitos + 2 letras maiúsculas + 3 dígitos = 14 chars
// Ex: 003456789LA042
// (mesmo formato que NIF Singular)

export function formatBI(raw: string): string {
  const upper = raw.toUpperCase();
  const hasLetter = /[A-Z]/.test(upper);

  if (hasLetter) {
    let result = '';
    let d1 = 0, letters = 0, d2 = 0;
    for (const ch of upper) {
      if (d1 < 9 && /\d/.test(ch))                          { result += ch; d1++; }
      else if (d1 === 9 && letters < 2 && /[A-Z]/.test(ch)) { result += ch; letters++; }
      else if (d1 === 9 && letters === 2 && d2 < 3 && /\d/.test(ch)) { result += ch; d2++; }
    }
    return result;
  }
  return upper.replace(/\D/g, '').slice(0, 9);
}

export function validateBI(value: string): string | null {
  if (!value || value.trim() === '') return null; // campo opcional

  // Aceita também passaporte ou outro doc (texto livre com mínimo 5 chars)
  // Se parece um BI (tem letras no meio), valida o formato completo
  const hasLetter = /[A-Z]/i.test(value);

  if (hasLetter) {
    const match = value.toUpperCase().match(/^(\d{9})([A-Z]{2})(\d{3})$/);
    if (!match) {
      const len = value.length;
      if (len < 14) return `BI incompleto — ${14 - len} carácter${14 - len !== 1 ? 'es' : ''} em falta.`;
      return 'Formato inválido. BI: 9 dígitos + 2 letras + 3 dígitos (ex: 003456789LA042).';
    }
    return null;
  }

  // Só dígitos — pode ser passaporte ou outro doc, aceita se tiver ≥ 5 chars
  if (value.replace(/\D/g, '').length < 5) return 'Documento demasiado curto (mínimo 5 caracteres).';
  return null;
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

export function validateEmail(value: string): string | null {
  if (!value || value.trim() === '') return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) return 'Email inválido.';
  return null;
}

// ─── VALORES FINANCEIROS ──────────────────────────────────────────────────────

export interface FinanceiroLimits {
  min?: number;
  max?: number;
  label: string;
  unit?: string;
}

export function validateFinanceiro(value: string | number, limits: FinanceiroLimits): string | null {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return `${limits.label} deve ser um número válido.`;
  if (limits.min !== undefined && n < limits.min)
    return `${limits.label} não pode ser inferior a ${limits.min}${limits.unit ?? ''}.`;
  if (limits.max !== undefined && n > limits.max)
    return `${limits.label} não pode ser superior a ${limits.max}${limits.unit ?? ''}.`;
  return null;
}

// Limites específicos do sistema
export const LIMITES_FINANCEIROS = {
  valorQuota:    { min: 0,   max: 10_000_000, label: 'Valor da quota',    unit: ' Kz' },
  multaAtraso:   { min: 0,   max: 100,        label: 'Multa por atraso',  unit: '%'   },
  jurosMensal:   { min: 0,   max: 50,         label: 'Juros mensal',      unit: '%'   },
  diaVencimento: { min: 1,   max: 28,         label: 'Dia de vencimento', unit: ''    },
  area:          { min: 0.1, max: 100_000,    label: 'Área',              unit: ' m²' },
  fracao:        { min: 0,   max: 9999,       label: 'Fração',            unit: ''    },
  permilagem:    { min: 0,   max: 1000,       label: 'Permilagem',        unit: '‰'   },
} satisfies Record<string, FinanceiroLimits>;
