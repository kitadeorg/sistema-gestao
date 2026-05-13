import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getLogoBase64, getLogoBrancoBase64 } from './logoBase64';

// ─── Paleta ───────────────────────────────────────────────────────────────────
const COR_LARANJA  = [253, 88,  7]   as [number, number, number];
const COR_PRETO    = [15,  15,  15]  as [number, number, number];
const COR_CINZA    = [113, 113, 122] as [number, number, number];
const COR_CINZA_BG = [244, 244, 245] as [number, number, number];
const COR_BRANCO   = [255, 255, 255] as [number, number, number];
const COR_LINHA    = [228, 228, 231] as [number, number, number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataHoje(): string {
  return new Date().toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-PT', {
    hour: '2-digit', minute: '2-digit',
  });
}

function idRelatorio(): string {
  return `RPT-${Date.now().toString(36).toUpperCase()}`;
}

// ─── Cabeçalho das páginas internas ──────────────────────────────────────────

function desenharCabecalho(doc: jsPDF, titulo: string, logoBranco: string) {
  const W = doc.internal.pageSize.getWidth();

  // Barra laranja topo
  doc.setFillColor(...COR_LARANJA);
  doc.rect(0, 0, W, 12, 'F');

  // Logo branco sobre fundo laranja
  if (logoBranco) {
    try {
      doc.addImage(logoBranco, 'PNG', 12, 2.5, 29, 7);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COR_BRANCO);
      doc.text('NETSULCONDO', 14, 8);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COR_BRANCO);
    doc.text('NETSULCONDO', 14, 8);
  }

  // Data + hora à direita
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COR_BRANCO);
  doc.text(`${dataHoje()}  ${horaAgora()}`, W - 14, 8, { align: 'right' });

  // Título da secção
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COR_PRETO);
  doc.text(titulo, 14, 24);

  // Linha separadora
  doc.setDrawColor(...COR_LINHA);
  doc.setLineWidth(0.4);
  doc.line(14, 27, W - 14, 27);
}

// ─── Rodapé das páginas internas ─────────────────────────────────────────────

function desenharRodape(doc: jsPDF, geradoPor: string, id: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const total = (doc as any).internal.getNumberOfPages();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i === 1) continue; // capa não tem rodapé de página

    doc.setDrawColor(...COR_LINHA);
    doc.setLineWidth(0.3);
    doc.line(14, H - 14, W - 14, H - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COR_CINZA);
    doc.text(`Gerado por: ${geradoPor}`, 14, H - 8);
    doc.text(id, W / 2, H - 8, { align: 'center' });
    doc.text(`Página ${i - 1} de ${total - 1}`, W - 14, H - 8, { align: 'right' });
  }
}

// ─── CAPA ─────────────────────────────────────────────────────────────────────

function desenharCapa(
  doc: jsPDF,
  titulo: string,
  descricao: string,
  geradoPor: string,
  id: string,
  logoBase64: string,
) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Linha laranja fina no topo
  doc.setFillColor(...COR_LARANJA);
  doc.rect(0, 0, W, 1.5, 'F');

  // ── Logo real na capa ──
  if (logoBase64) {
    try {
      // Logo colorido na capa (fundo branco), altura 12mm
      doc.addImage(logoBase64, 'PNG', 14, 10, 58, 14);
    } catch {
      _desenharLogoTexto(doc, 14, 22);
    }
  } else {
    _desenharLogoTexto(doc, 14, 22);
  }

  // Data à direita
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COR_CINZA);
  doc.text(dataHoje(), W - 14, 20, { align: 'right' });

  // Linha separadora laranja
  doc.setDrawColor(...COR_LARANJA);
  doc.setLineWidth(0.6);
  doc.line(14, 28, W - 14, 28);

  // ── Corpo da capa ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(42);
  doc.setTextColor(...COR_PRETO);
  doc.text('Relatório', 14, H * 0.58);

  // Barra laranja decorativa
  doc.setFillColor(...COR_LARANJA);
  doc.rect(14, H * 0.60, 40, 1.5, 'F');

  // Nome do relatório
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COR_PRETO);
  doc.text(titulo, 14, H * 0.60 + 12);

  // Descrição
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COR_CINZA);
  const linhasDesc = doc.splitTextToSize(`Descrição: ${descricao}`, W - 28);
  doc.text(linhasDesc, 14, H * 0.60 + 22);

  // ── Rodapé da capa ──
  doc.setFillColor(...COR_LARANJA);
  doc.rect(0, H - 32, W, 32, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COR_BRANCO);
  doc.text('Prepared By:', 14, H - 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(geradoPor, 14, H - 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Gerado por:', W / 2 + 10, H - 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(id, W / 2 + 10, H - 14);
}

function _desenharLogoTexto(doc: jsPDF, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COR_PRETO);
  doc.text('NETSUL', x, y);
  doc.setTextColor(...COR_LARANJA);
  doc.text('CONDO', x + doc.getTextWidth('NETSUL') + 1, y);
  doc.setTextColor(...COR_PRETO);
}

// ─── TABELA PADRÃO ────────────────────────────────────────────────────────────

export function adicionarTabela(
  doc: jsPDF,
  headers: string[],
  rows: (string | number)[][],
  startY: number,
  logoBranco = '',
) {
  const W = doc.internal.pageSize.getWidth();

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    margin: { left: 14, right: 14 },
    tableWidth: W - 28,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
      textColor: COR_PRETO,
      lineColor: COR_LINHA,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COR_PRETO,
      textColor: COR_BRANCO,
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: COR_CINZA_BG,
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        desenharCabecalho(doc, '', logoBranco);
      }
    },
  });
}

// ─── KPI CARDS ────────────────────────────────────────────────────────────────

export function adicionarKPIs(
  doc: jsPDF,
  kpis: { label: string; valor: string; sub?: string }[],
  startY: number,
): number {
  const W    = doc.internal.pageSize.getWidth();
  const cols = Math.min(kpis.length, 4);
  const gap  = 4;
  const cardW = (W - 28 - gap * (cols - 1)) / cols;
  const cardH = 22;

  kpis.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x   = 14 + col * (cardW + gap);
    const y   = startY + row * (cardH + gap);

    // Fundo
    doc.setFillColor(...COR_CINZA_BG);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');

    // Borda laranja esquerda
    doc.setFillColor(...COR_LARANJA);
    doc.rect(x, y, 2, cardH, 'F');

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COR_CINZA);
    doc.text(kpi.label, x + 6, y + 7);

    // Valor
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COR_PRETO);
    doc.text(kpi.valor, x + 6, y + 15);

    // Sub
    if (kpi.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COR_CINZA);
      doc.text(kpi.sub, x + 6, y + 20);
    }
  });

  const rows = Math.ceil(kpis.length / cols);
  return startY + rows * (cardH + gap) + 4;
}

// ─── SECÇÃO TÍTULO ────────────────────────────────────────────────────────────

export function adicionarSecao(doc: jsPDF, titulo: string, y: number): number {
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(...COR_LARANJA);
  doc.rect(14, y, 3, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COR_PRETO);
  doc.text(titulo, 20, y + 6);

  doc.setDrawColor(...COR_LINHA);
  doc.setLineWidth(0.3);
  doc.line(14, y + 10, W - 14, y + 10);

  return y + 14;
}

// ─── FUNÇÃO PRINCIPAL ─────────────────────────────────────────────────────────

export interface RelatorioConfig {
  titulo: string;
  descricao: string;
  geradoPor: string;
  secoes: RelatorioSecao[];
}

export interface RelatorioSecao {
  titulo: string;
  kpis?: { label: string; valor: string; sub?: string }[];
  tabela?: {
    headers: string[];
    rows: (string | number)[][];
  };
  texto?: string;
}

export async function gerarRelatorioPDF(config: RelatorioConfig): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const id  = idRelatorio();

  // Carregar as duas versões do logo em paralelo
  const [logoColorido, logoBranco] = await Promise.all([
    getLogoBase64(),
    getLogoBrancoBase64(),
  ]);

  // ── Capa (logo colorido) ──
  desenharCapa(doc, config.titulo, config.descricao, config.geradoPor, id, logoColorido);

  // ── Secções (logo branco no cabeçalho) ──
  config.secoes.forEach((secao) => {
    doc.addPage();
    desenharCabecalho(doc, secao.titulo, logoBranco);

    let y = 34;

    if (secao.kpis?.length) {
      y = adicionarKPIs(doc, secao.kpis, y);
    }

    if (secao.tabela || secao.texto) {
      y = adicionarSecao(doc, secao.titulo, y);
    }

    if (secao.texto) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COR_CINZA);
      const linhas = doc.splitTextToSize(secao.texto, doc.internal.pageSize.getWidth() - 28);
      doc.text(linhas, 14, y);
      y += linhas.length * 5 + 6;
    }

    if (secao.tabela) {
      adicionarTabela(doc, secao.tabela.headers, secao.tabela.rows, y, logoBranco);
    }
  });

  // ── Rodapé em todas as páginas ──
  desenharRodape(doc, config.geradoPor, id);

  // ── Download ──
  const nomeArquivo = `relatorio-${config.titulo.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(nomeArquivo);
}
