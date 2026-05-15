# manual.py — NetsulCondo User Manual Generator
# Generates a detailed PDF manual in European Portuguese using ReportLab 4.x
# Run: python manual.py

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether, NextPageTemplate
)
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import Flowable
import datetime

# ─── BRAND COLOURS ───────────────────────────────────────────────────────────
ORANGE       = colors.HexColor("#FF6600")
DARK         = colors.HexColor("#1A1A1A")
LIGHT_GRAY   = colors.HexColor("#F5F5F5")
MID_GRAY     = colors.HexColor("#CCCCCC")
WHITE        = colors.white
TEXT_DARK    = colors.HexColor("#333333")
ORANGE_LIGHT = colors.HexColor("#FFF3EB")
GREEN        = colors.HexColor("#27AE60")
RED          = colors.HexColor("#E74C3C")
BLUE         = colors.HexColor("#2980B9")
YELLOW       = colors.HexColor("#F39C12")
DARK_BLUE    = colors.HexColor("#1A2A4A")

PAGE_W, PAGE_H = A4
MARGIN = 2*cm

# ─── HEADER / FOOTER ─────────────────────────────────────────────────────────
def draw_header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4

    canvas.setFillColor(ORANGE)
    canvas.rect(0, h - 22*mm, w, 22*mm, fill=1, stroke=0)

    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 13)
    canvas.drawString(MARGIN, h - 14*mm, "NETSUL")
    canvas.setFillColor(colors.HexColor("#FFD0A0"))
    canvas.setFont("Helvetica-Bold", 13)
    canvas.drawString(MARGIN + 52, h - 14*mm, "CONDO")

    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica", 9)
    today = datetime.date.today().strftime("%d de %B de %Y")
    canvas.drawRightString(w - MARGIN, h - 14*mm, today)

    canvas.setFillColor(ORANGE)
    canvas.rect(0, 0, w, 18*mm, fill=1, stroke=0)

    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(MARGIN, 11*mm, "NetSul")
    canvas.drawString(MARGIN, 6*mm, "Manual do Utilizador")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w - MARGIN, 11*mm, f"Página {doc.page}")
    canvas.drawRightString(w - MARGIN, 6*mm, "NetsulCondo v1.0")

    canvas.restoreState()


def draw_cover_page(canvas, doc):
    canvas.saveState()
    w, h = A4

    canvas.setFillColor(ORANGE)
    canvas.rect(0, h - 80*mm, w, 80*mm, fill=1, stroke=0)

    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 28)
    canvas.drawString(MARGIN, h - 40*mm, "NETSUL")
    canvas.setFillColor(colors.HexColor("#FFD0A0"))
    canvas.setFont("Helvetica-Bold", 28)
    canvas.drawString(MARGIN + 110, h - 40*mm, "CONDO")

    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica", 11)
    canvas.drawString(MARGIN, h - 55*mm, "Sistema de Gestão de Condomínios")

    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica", 10)
    today = datetime.date.today().strftime("%d de %B de %Y")
    canvas.drawRightString(w - MARGIN, h - 55*mm, today)

    canvas.setFillColor(DARK)
    canvas.setFont("Helvetica-Bold", 52)
    canvas.drawString(MARGIN, h/2 + 30*mm, "Manual")
    canvas.drawString(MARGIN, h/2 + 5*mm, "do")
    canvas.drawString(MARGIN, h/2 - 20*mm, "Utilizador")

    canvas.setFillColor(ORANGE)
    canvas.rect(MARGIN, h/2 - 27*mm, 60*mm, 3*mm, fill=1, stroke=0)

    canvas.setFillColor(ORANGE)
    canvas.rect(0, 0, w, 22*mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(MARGIN, 14*mm, "Prepared by:")
    canvas.drawString(MARGIN, 8*mm, "NetSul")
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawRightString(w - MARGIN, 14*mm, "Gerado por:")
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(w - MARGIN, 8*mm, "NetsulCondo v1.0")

    canvas.restoreState()


# ─── STYLES ──────────────────────────────────────────────────────────────────
def make_styles():
    styles = getSampleStyleSheet()

    h1 = ParagraphStyle("H1",
        fontSize=22, textColor=DARK, fontName="Helvetica-Bold",
        spaceAfter=4*mm, spaceBefore=8*mm, leading=26)

    h2 = ParagraphStyle("H2",
        fontSize=14, textColor=ORANGE, fontName="Helvetica-Bold",
        spaceAfter=3*mm, spaceBefore=6*mm, leading=18)

    h3 = ParagraphStyle("H3",
        fontSize=11, textColor=DARK, fontName="Helvetica-Bold",
        spaceAfter=2*mm, spaceBefore=4*mm, leading=14)

    body = ParagraphStyle("Body",
        fontSize=9.5, textColor=TEXT_DARK, fontName="Helvetica",
        spaceAfter=2.5*mm, leading=14, alignment=TA_JUSTIFY)

    bullet = ParagraphStyle("Bullet",
        fontSize=9.5, textColor=TEXT_DARK, fontName="Helvetica",
        spaceAfter=1.5*mm, leading=13, leftIndent=10, bulletIndent=0)

    label = ParagraphStyle("Label",
        fontSize=8.5, textColor=colors.HexColor("#888888"), fontName="Helvetica",
        spaceAfter=0.5*mm, leading=11)

    note = ParagraphStyle("Note",
        fontSize=9, textColor=colors.HexColor("#555555"), fontName="Helvetica-Oblique",
        spaceAfter=2*mm, leading=12, leftIndent=8, borderPad=4)

    toc_title = ParagraphStyle("TocTitle",
        fontSize=18, textColor=DARK, fontName="Helvetica-Bold",
        spaceAfter=6*mm, leading=22)

    toc_entry = ParagraphStyle("TocEntry",
        fontSize=10, textColor=TEXT_DARK, fontName="Helvetica",
        spaceAfter=2*mm, leading=14)

    toc_section = ParagraphStyle("TocSection",
        fontSize=9, textColor=colors.HexColor("#888888"), fontName="Helvetica",
        spaceAfter=1*mm, leading=12, leftIndent=12)

    small = ParagraphStyle("Small",
        fontSize=8, textColor=TEXT_DARK, fontName="Helvetica",
        spaceAfter=1*mm, leading=11)

    center = ParagraphStyle("Center",
        fontSize=9.5, textColor=TEXT_DARK, fontName="Helvetica",
        spaceAfter=2*mm, leading=13, alignment=TA_CENTER)

    return dict(h1=h1, h2=h2, h3=h3, body=body, bullet=bullet,
                label=label, note=note, toc_title=toc_title,
                toc_entry=toc_entry, toc_section=toc_section,
                small=small, center=center)


# ─── HELPERS ─────────────────────────────────────────────────────────────────
def orange_bar():
    return HRFlowable(width="100%", thickness=3, color=ORANGE, spaceAfter=3*mm)


def section_header(text, styles):
    """Orange-background section title block."""
    data = [[Paragraph(
        f'<font color="white"><b>{text}</b></font>',
        ParagraphStyle("SH", fontSize=13, fontName="Helvetica-Bold",
                       textColor=WHITE, leading=16))]]
    t = Table(data, colWidths=[PAGE_W - 2*MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), ORANGE),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    return t


def info_table(rows, styles):
    """Two-column key-value table."""
    data = [[Paragraph(f"<b>{k}</b>", styles["label"]),
             Paragraph(v, styles["body"])] for k, v in rows]
    t = Table(data, colWidths=[55*mm, PAGE_W - 2*MARGIN - 55*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), LIGHT_GRAY),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("LINEBELOW",     (0, 0), (-1, -1), 0.5, MID_GRAY),
        ("GRID",          (0, 0), (-1, -1), 0.3, MID_GRAY),
    ]))
    return t


def role_table(styles):
    headers = ["Perfil", "Quem é", "O que pode fazer"]
    rows = [
        ["Dono da Plataforma", "Responsável pela NetSul", "Acesso total ao sistema, incluindo o registo de todas as ações"],
        ["Administrador", "Responsável da empresa gestora", "Acesso total, exceto gerir o Dono da Plataforma"],
        ["Gestor de Portfólio", "Gestor que trata de vários condomínios", "Gere múltiplos condomínios e aprova pagamentos"],
        ["Síndico", "Responsável por um condomínio", "Gere um único condomínio; não aprova pagamentos"],
        ["Funcionário", "Porteiro ou técnico de manutenção", "Acesso operacional; só consulta informação financeira"],
        ["Morador", "Residente do condomínio", "Acesso limitado: quotas, ocorrências e votações"],
    ]
    data = [[Paragraph(f"<b>{h}</b>", ParagraphStyle("TH", fontSize=9, fontName="Helvetica-Bold",
                        textColor=WHITE, leading=12)) for h in headers]]
    for r in rows:
        data.append([Paragraph(x, ParagraphStyle("TD", fontSize=8.5, fontName="Helvetica",
                               textColor=TEXT_DARK, leading=12)) for x in r])
    cw = [32*mm, 52*mm, PAGE_W - 2*MARGIN - 32*mm - 52*mm]
    t = Table(data, colWidths=cw, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), DARK),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("GRID",          (0, 0), (-1, -1), 0.4, MID_GRAY),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 5),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def status_badge_table(items, styles):
    """Horizontal badge-like list."""
    data = [[Paragraph(f"<b>{k}</b>: {v}", ParagraphStyle("Badge",
            fontSize=8.5, fontName="Helvetica", textColor=TEXT_DARK, leading=12)) for k, v in items]]
    n = len(items)
    t = Table(data, colWidths=[(PAGE_W - 2*MARGIN) / n] * n)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), ORANGE_LIGHT),
        ("BOX",           (0, 0), (-1, -1), 1, ORANGE),
        ("INNERGRID",     (0, 0), (-1, -1), 0.5, ORANGE),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
    ]))
    return t


def flow_table(steps, styles):
    """Horizontal arrow flow for status transitions."""
    items = []
    for i, s in enumerate(steps):
        items.append(Paragraph(f"<b>{s}</b>", ParagraphStyle("FL",
            fontSize=8.5, fontName="Helvetica-Bold", textColor=WHITE,
            leading=11, alignment=TA_CENTER)))
        if i < len(steps) - 1:
            items.append(Paragraph("→", ParagraphStyle("ARR",
                fontSize=12, textColor=ORANGE, leading=14, alignment=TA_CENTER)))
    ncols = len(steps) * 2 - 1
    data = [items]
    col_w = []
    for i in range(ncols):
        col_w.append(8*mm if i % 2 == 1 else (PAGE_W - 2*MARGIN - 8*mm*(len(steps)-1))/len(steps))
    t = Table(data, colWidths=col_w)
    style_cmds = [
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]
    for i in range(0, ncols, 2):
        style_cmds.append(("BACKGROUND", (i, 0), (i, 0), DARK))
    t.setStyle(TableStyle(style_cmds))
    return t


def step_flow(steps, descriptions, styles):
    """Vertical step-by-step flowchart: numbered dark boxes with descriptions."""
    box_style = ParagraphStyle("StepBox",
        fontSize=9, fontName="Helvetica-Bold", textColor=WHITE,
        leading=12, alignment=TA_CENTER)
    desc_style = ParagraphStyle("StepDesc",
        fontSize=9, fontName="Helvetica", textColor=TEXT_DARK,
        leading=12, leftIndent=4)
    arrow_style = ParagraphStyle("StepArrow",
        fontSize=14, fontName="Helvetica-Bold", textColor=ORANGE,
        leading=16, alignment=TA_CENTER)

    rows = []
    for i, (step, desc) in enumerate(zip(steps, descriptions)):
        step_cell = Paragraph(f"<b>{i+1}. {step}</b>", box_style)
        desc_cell = Paragraph(desc, desc_style)
        rows.append([step_cell, desc_cell])
        if i < len(steps) - 1:
            rows.append([Paragraph("▼", arrow_style), Paragraph("", desc_style)])

    col_w = [60*mm, PAGE_W - 2*MARGIN - 60*mm]
    t = Table(rows, colWidths=col_w)
    style_cmds = [
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
    ]
    for i in range(0, len(rows), 2):
        style_cmds.append(("BACKGROUND", (0, i), (0, i), DARK))
        style_cmds.append(("BACKGROUND", (1, i), (1, i), LIGHT_GRAY))
        style_cmds.append(("LINEBELOW",  (0, i), (-1, i), 0.3, MID_GRAY))
    t.setStyle(TableStyle(style_cmds))
    return t


def highlight_box(title, text, styles, color=None):
    """Bordered box with colored title bar and body text — for tips, warnings, notes."""
    if color is None:
        color = ORANGE_LIGHT
    title_style = ParagraphStyle("HBTitle",
        fontSize=10, fontName="Helvetica-Bold", textColor=WHITE,
        leading=13, leftIndent=4)
    body_style = ParagraphStyle("HBBody",
        fontSize=9, fontName="Helvetica", textColor=TEXT_DARK,
        leading=13, leftIndent=4)
    data = [
        [Paragraph(f"<b>{title}</b>", title_style)],
        [Paragraph(text, body_style)],
    ]
    t = Table(data, colWidths=[PAGE_W - 2*MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), ORANGE),
        ("BACKGROUND",    (0, 1), (-1, -1), color),
        ("BOX",           (0, 0), (-1, -1), 1, ORANGE),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
    ]))
    return t


def two_col_list(left_items, right_items, styles):
    """Two-column bullet list side by side."""
    item_style = ParagraphStyle("TwoCol",
        fontSize=9, fontName="Helvetica", textColor=TEXT_DARK,
        leading=13, leftIndent=6)
    max_rows = max(len(left_items), len(right_items))
    data = []
    for i in range(max_rows):
        left = Paragraph(f"• {left_items[i]}" if i < len(left_items) else "", item_style)
        right = Paragraph(f"• {right_items[i]}" if i < len(right_items) else "", item_style)
        data.append([left, right])
    half = (PAGE_W - 2*MARGIN) / 2
    t = Table(data, colWidths=[half, half])
    t.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("LINEAFTER",     (0, 0), (0, -1), 0.5, MID_GRAY),
    ]))
    return t


def bar_chart_table(title, items, styles):
    """Visual bar chart using Table cells with colored fills."""
    title_style = ParagraphStyle("BCTitle",
        fontSize=11, fontName="Helvetica-Bold", textColor=DARK,
        leading=14, spaceAfter=3*mm)
    label_style = ParagraphStyle("BCLabel",
        fontSize=8.5, fontName="Helvetica", textColor=TEXT_DARK, leading=11)
    pct_style = ParagraphStyle("BCPct",
        fontSize=8.5, fontName="Helvetica-Bold", textColor=DARK, leading=11,
        alignment=TA_RIGHT)

    rows = [[Paragraph(title, title_style), Paragraph(""), Paragraph("")]]
    bar_w = PAGE_W - 2*MARGIN - 55*mm - 20*mm
    for label, value, max_val, bar_color in items:
        pct = min(value / max_val, 1.0) if max_val > 0 else 0
        filled = int(pct * 20)
        empty = 20 - filled
        bar_cells = []
        for _ in range(filled):
            bar_cells.append(Paragraph(" ", ParagraphStyle("BF", fontSize=8, leading=10)))
        for _ in range(empty):
            bar_cells.append(Paragraph(" ", ParagraphStyle("BE", fontSize=8, leading=10)))

        bar_data = [[Paragraph(" ", ParagraphStyle("BF", fontSize=8, leading=10))]]
        bar_t = Table([[Paragraph(f"{'█' * filled}{'░' * empty}",
            ParagraphStyle("Bar", fontSize=9, fontName="Helvetica",
                           textColor=bar_color, leading=11))]],
            colWidths=[bar_w])
        bar_t.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ]))
        rows.append([
            Paragraph(label, label_style),
            bar_t,
            Paragraph(f"{value}", pct_style),
        ])

    t = Table(rows, colWidths=[55*mm, bar_w, 20*mm])
    t.setStyle(TableStyle([
        ("SPAN",          (0, 0), (-1, 0)),
        ("BACKGROUND",    (0, 0), (-1, 0), LIGHT_GRAY),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("BOX",           (0, 0), (-1, -1), 0.5, MID_GRAY),
        ("LINEBELOW",     (0, 0), (-1, -1), 0.3, MID_GRAY),
    ]))
    return t


def permission_matrix(styles):
    """Full permission matrix: 6 user types vs all modules."""
    col_style = ParagraphStyle("PMCol",
        fontSize=7.5, fontName="Helvetica-Bold", textColor=WHITE,
        leading=10, alignment=TA_CENTER)
    row_style = ParagraphStyle("PMRow",
        fontSize=8, fontName="Helvetica-Bold", textColor=TEXT_DARK,
        leading=10)
    cell_style = ParagraphStyle("PMCell",
        fontSize=10, fontName="Helvetica", textColor=TEXT_DARK,
        leading=12, alignment=TA_CENTER)

    profiles = ["Dono", "Admin", "Gestor", "Síndico", "Func.", "Morador"]
    modules = [
        ("Dashboard",        ["✓", "✓", "✓", "✓", "✓", "✓"]),
        ("Financeiro",       ["✓", "✓", "✓", "✓", "👁", "👁"]),
        ("Quotas",           ["✓", "✓", "✓", "✓", "✗", "👁"]),
        ("Despesas",         ["✓", "✓", "✓", "✓", "✗", "✗"]),
        ("Moradores",        ["✓", "✓", "✓", "✓", "👁", "✗"]),
        ("Unidades",         ["✓", "✓", "✓", "✓", "👁", "✗"]),
        ("Ocorrências",      ["✓", "✓", "✓", "✓", "✓", "✓"]),
        ("Manutenção",       ["✓", "✓", "✓", "✓", "✓", "✗"]),
        ("Comunicação",      ["✓", "✓", "✓", "✓", "✓", "👁"]),
        ("Assembleias",      ["✓", "✓", "✓", "✓", "👁", "✓"]),
        ("Documentos",       ["✓", "✓", "✓", "✓", "👁", "👁"]),
        ("Visitantes",       ["✓", "✓", "✓", "✓", "✓", "✗"]),
        ("Equipa",           ["✓", "✓", "✓", "✓", "✗", "✗"]),
        ("Configurações",    ["✓", "✓", "✓", "✓", "✗", "✗"]),
        ("Portfólio",        ["✓", "✓", "✓", "✗", "✗", "✗"]),
        ("Registo de Ações", ["✓", "👁", "👁", "👁", "✗", "✗"]),
    ]

    header = [Paragraph("Módulo", col_style)] + [Paragraph(p, col_style) for p in profiles]
    data = [header]
    for mod, perms in modules:
        row = [Paragraph(mod, row_style)]
        for p in perms:
            row.append(Paragraph(p, cell_style))
        data.append(row)

    mod_w = 38*mm
    col_w = (PAGE_W - 2*MARGIN - mod_w) / len(profiles)
    t = Table(data, colWidths=[mod_w] + [col_w]*len(profiles), repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), DARK),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("GRID",          (0, 0), (-1, -1), 0.4, MID_GRAY),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",         (1, 0), (-1, -1), "CENTER"),
    ]))
    return t
