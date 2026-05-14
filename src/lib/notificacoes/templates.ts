/**
 * templates.ts
 * Templates de mensagens para WhatsApp e SMS.
 * Mantidos num único ficheiro para facilitar tradução e manutenção.
 */

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface TemplateQuotaLembrete {
  moradorNome: string;
  condominioNome: string;
  unidadeNumero: string;
  valor: number;
  dataVencimento: string; // ex: "05/06/2025"
  diasRestantes: number;
}

export interface TemplateQuotaAtrasada {
  moradorNome: string;
  condominioNome: string;
  unidadeNumero: string;
  valor: number;
  mesesAtraso: number;
  dataVencimento: string;
}

export interface TemplateAvisoGeral {
  moradorNome: string;
  condominioNome: string;
  titulo: string;
  conteudo: string;
}

export interface TemplatePagamentoConfirmado {
  moradorNome: string;
  condominioNome: string;
  unidadeNumero: string;
  valor: number;
  mes: number;
  ano: number;
}

export interface TemplateAssembleiaConvocatoria {
  moradorNome: string;
  condominioNome: string;
  titulo: string;
  data: string;
  local?: string;
}

// ─────────────────────────────────────────────
// FORMATAÇÃO
// ─────────────────────────────────────────────

function formatKz(valor: number): string {
  return valor.toLocaleString('pt-AO') + ' Kz';
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function nomeMes(mes: number): string {
  return MESES[(mes - 1) % 12] ?? String(mes);
}

// ─────────────────────────────────────────────
// TEMPLATES WHATSAPP (suportam emojis e formatação)
// ─────────────────────────────────────────────

export const whatsappTemplates = {

  lembreteQuota(p: TemplateQuotaLembrete): string {
    return [
      `🏢 *CONDO. — ${p.condominioNome}*`,
      ``,
      `Olá, *${p.moradorNome.split(' ')[0]}*! 👋`,
      ``,
      `Lembramos que a sua quota mensal vence em *${p.diasRestantes} dia${p.diasRestantes !== 1 ? 's' : ''}* (${p.dataVencimento}).`,
      ``,
      `📋 *Detalhes:*`,
      `• Unidade: ${p.unidadeNumero}`,
      `• Valor: *${formatKz(p.valor)}*`,
      `• Vencimento: ${p.dataVencimento}`,
      ``,
      `Efectue o pagamento antes do prazo para evitar multas. 🙏`,
      ``,
      `_CONDO. — Sistema de Gestão de Condomínios_`,
    ].join('\n');
  },

  quotaAtrasada(p: TemplateQuotaAtrasada): string {
    return [
      `⚠️ *CONDO. — ${p.condominioNome}*`,
      ``,
      `Olá, *${p.moradorNome.split(' ')[0]}*,`,
      ``,
      `A sua quota mensal encontra-se *em atraso* há ${p.mesesAtraso} mês${p.mesesAtraso !== 1 ? 'es' : ''}.`,
      ``,
      `📋 *Detalhes:*`,
      `• Unidade: ${p.unidadeNumero}`,
      `• Valor actual (com multa/juros): *${formatKz(p.valor)}*`,
      `• Vencimento original: ${p.dataVencimento}`,
      ``,
      `Por favor, regularize a sua situação o mais brevemente possível.`,
      `Para mais informações, contacte a administração do condomínio.`,
      ``,
      `_CONDO. — Sistema de Gestão de Condomínios_`,
    ].join('\n');
  },

  avisoGeral(p: TemplateAvisoGeral): string {
    return [
      `📢 *CONDO. — ${p.condominioNome}*`,
      ``,
      `Olá, *${p.moradorNome.split(' ')[0]}*!`,
      ``,
      `*${p.titulo}*`,
      ``,
      p.conteudo,
      ``,
      `_CONDO. — Sistema de Gestão de Condomínios_`,
    ].join('\n');
  },

  avisoUrgente(p: TemplateAvisoGeral): string {
    return [
      `🚨 *URGENTE — ${p.condominioNome}*`,
      ``,
      `Olá, *${p.moradorNome.split(' ')[0]}*!`,
      ``,
      `*${p.titulo}*`,
      ``,
      p.conteudo,
      ``,
      `_CONDO. — Sistema de Gestão de Condomínios_`,
    ].join('\n');
  },

  pagamentoConfirmado(p: TemplatePagamentoConfirmado): string {
    return [
      `✅ *CONDO. — ${p.condominioNome}*`,
      ``,
      `Olá, *${p.moradorNome.split(' ')[0]}*!`,
      ``,
      `O seu pagamento foi *confirmado* com sucesso. 🎉`,
      ``,
      `📋 *Detalhes:*`,
      `• Unidade: ${p.unidadeNumero}`,
      `• Referente a: ${nomeMes(p.mes)}/${p.ano}`,
      `• Valor pago: *${formatKz(p.valor)}*`,
      ``,
      `Obrigado pela pontualidade! 🙏`,
      ``,
      `_CONDO. — Sistema de Gestão de Condomínios_`,
    ].join('\n');
  },

  assembleiaConvocatoria(p: TemplateAssembleiaConvocatoria): string {
    return [
      `📅 *CONDO. — ${p.condominioNome}*`,
      ``,
      `Olá, *${p.moradorNome.split(' ')[0]}*!`,
      ``,
      `Está convocado(a) para a seguinte assembleia:`,
      ``,
      `*${p.titulo}*`,
      `📆 Data: ${p.data}`,
      p.local ? `📍 Local: ${p.local}` : '',
      ``,
      `A sua presença é muito importante. Até lá! 👋`,
      ``,
      `_CONDO. — Sistema de Gestão de Condomínios_`,
    ].filter(l => l !== '').join('\n');
  },

};

// ─────────────────────────────────────────────
// TEMPLATES SMS (sem emojis, texto simples)
// ─────────────────────────────────────────────

export const smsTemplates = {

  lembreteQuota(p: TemplateQuotaLembrete): string {
    return `CONDO. ${p.condominioNome}: Quota de ${formatKz(p.valor)} vence em ${p.diasRestantes} dia(s) (${p.dataVencimento}). Unidade ${p.unidadeNumero}. Efectue o pagamento a tempo.`;
  },

  quotaAtrasada(p: TemplateQuotaAtrasada): string {
    return `CONDO. ${p.condominioNome}: Quota em ATRASO (${p.mesesAtraso} mes). Valor actual: ${formatKz(p.valor)}. Unidade ${p.unidadeNumero}. Regularize urgentemente.`;
  },

  avisoGeral(p: TemplateAvisoGeral): string {
    const conteudoCurto = p.conteudo.length > 100
      ? p.conteudo.substring(0, 97) + '...'
      : p.conteudo;
    return `CONDO. ${p.condominioNome}: ${p.titulo} - ${conteudoCurto}`;
  },

  pagamentoConfirmado(p: TemplatePagamentoConfirmado): string {
    return `CONDO. ${p.condominioNome}: Pagamento de ${formatKz(p.valor)} confirmado. Unidade ${p.unidadeNumero}, ref. ${nomeMes(p.mes)}/${p.ano}. Obrigado!`;
  },

  assembleiaConvocatoria(p: TemplateAssembleiaConvocatoria): string {
    return `CONDO. ${p.condominioNome}: Assembleia "${p.titulo}" em ${p.data}${p.local ? ` - ${p.local}` : ''}. A sua presenca e importante.`;
  },

};
