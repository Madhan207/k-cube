"""
agreements/generator.py
Generates DOCX and PDF loan agreements matching the EXACT reference document.
Font: Fira Sans Condensed 12pt, fully justified body text, superscript ordinals,
      indented bold headings, two-column signature block, grey-alt amortization table.
"""
import io
import hashlib
import logging
import urllib.request
from decimal import Decimal
from datetime import datetime, date
from pathlib import Path

logger = logging.getLogger(__name__)

from docx import Document as DocxDocument
from docx.shared import Pt, Inches, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
# pyrefly: ignore [missing-import]
from num2words import num2words
from django.conf import settings
from django.utils import timezone  


DIGIT_WORDS = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
}

# ─────────────────────────────────────────────────────────────────────────────
# FONT SETUP  — download Fira Sans Condensed TTF once; register with ReportLab
# ─────────────────────────────────────────────────────────────────────────────
_FONTS_DIR = Path(__file__).parent / 'fonts'
_FIRA_FILES = {
    'FiraSansCondensed':            'FiraSansCondensed-Regular.ttf',
    'FiraSansCondensed-Bold':       'FiraSansCondensed-Bold.ttf',
    'FiraSansCondensed-Italic':     'FiraSansCondensed-Italic.ttf',
    'FiraSansCondensed-BoldItalic': 'FiraSansCondensed-BoldItalic.ttf',
}
_FIRA_REGISTERED = False

def _register_fira_fonts():
    """Register Fira Sans Condensed TTF fonts with ReportLab (once per process)."""
    global _FIRA_REGISTERED
    if _FIRA_REGISTERED:
        return True
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        _FONTS_DIR.mkdir(parents=True, exist_ok=True)
        for reg_name, fname in _FIRA_FILES.items():
            path = _FONTS_DIR / fname
            if not path.exists():
                logger.warning(f'Font file missing: {path}')
                return False
            pdfmetrics.registerFont(TTFont(reg_name, str(path)))
        pdfmetrics.registerFontFamily(
            'FiraSansCondensed',
            normal='FiraSansCondensed',
            bold='FiraSansCondensed-Bold',
            italic='FiraSansCondensed-Italic',
            boldItalic='FiraSansCondensed-BoldItalic',
        )
        _FIRA_REGISTERED = True
        return True
    except Exception as e:
        logger.warning(f'Could not register Fira Sans Condensed: {e}')
        return False


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _ensure_date(v):
    """Safely convert any date-like value to a date object."""
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, str):
        v = v.strip()
        # Try ISO short date (YYYY-MM-DD) — the most common format from Django
        try:
            return date.fromisoformat(v[:10])   # fromisoformat handles YYYY-MM-DD
        except Exception:
            pass
        # Try full datetime strings
        for fmt in ('%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%dT%H:%M:%S.%f'):
            try:
                return datetime.strptime(v, fmt).date()
            except Exception:
                pass
    return date.today()


def get_ordinal(n: int) -> str:
    if 11 <= (n % 100) <= 13:
        return f"{n}th"
    return f"{n}" + {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')


def ordinal_suffix(n: int) -> str:
    """Return only the suffix: 'st', 'nd', 'rd', 'th'."""
    if 11 <= (n % 100) <= 13:
        return 'th'
    return {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')


def format_effective_date_parts(dt_val):
    """Return (day_number, suffix, month_year_str) for superscript rendering."""
    d = _ensure_date(dt_val)
    return d.day, ordinal_suffix(d.day), d.strftime('%B, %Y')


def format_date_mdy(dt_val) -> str:
    d = _ensure_date(dt_val)
    # %-d is Linux-only; use strftime + lstrip for Windows compatibility
    return f"{d.strftime('%B')} {d.day}, {d.year}"


def format_date_numeric(dt_val) -> str:
    d = _ensure_date(dt_val)
    return f"{d.month}/{d.day}/{d.year}"


def amount_in_words_ref(amount, short_unit="Rs") -> str:
    try:
        val_f = float(amount)
        val_int = int(val_f)
        w = num2words(val_int, lang='en').replace('-', ' ')
        return f"{val_f:,.2f} Rupees ({w} {short_unit})"
    except Exception:
        return f"{amount} Rupees"


def rate_in_words_ref(rate) -> str:
    try:
        val_f = float(rate)
        parts = f"{val_f:.2f}".split('.')
        int_part = int(parts[0])
        w1 = num2words(int_part, lang='en')
        dec_words = " ".join(DIGIT_WORDS[d] for d in parts[1])
        return f"{val_f:.2f} ({w1} point {dec_words})"
    except Exception:
        return f"{rate}"


def get_weekday_name(dt_val) -> str:
    d = _ensure_date(dt_val)
    return d.strftime('%A')


def compute_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


# ─────────────────────────────────────────────────────────────────────────────
# DOCX XML HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _set_font(run, name='Times New Roman', size_pt=11, bold=False, italic=False,
              underline=False, color_rgb=None, superscript=False):
    run.bold = bold
    run.italic = italic
    run.underline = underline
    run.font.name = name
    run.font.size = Pt(size_pt)
    if color_rgb:
        run.font.color.rgb = RGBColor(*color_rgb)
    if superscript:
        run.font.superscript = True
    # Set East Asian font too
    rPr = run._r.get_or_add_rPr()
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:ascii'), name)
    rFonts.set(qn('w:hAnsi'), name)
    rFonts.set(qn('w:cs'), name)
    rPr.insert(0, rFonts)


def _para_spacing(para, before=0, after=6, line=None):
    pf = para.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    if line is not None:
        from docx.shared import Pt as _Pt
        pf.line_spacing = _Pt(line)


def _set_cell_bg(cell, fill_hex):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)


def _cell_border(cell, top=None, bottom=None, left=None, right=None):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for side, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        if val is not None:
            b = OxmlElement(f'w:{side}')
            b.set(qn('w:val'), val)
            b.set(qn('w:sz'), '4')
            b.set(qn('w:space'), '0')
            b.set(qn('w:color'), '000000')
            tcBorders.append(b)
    tcPr.append(tcBorders)


def _remove_table_borders(table):
    tbl = table._tbl
    tblPr = tbl.tblPr
    if tblPr is None:
        tblPr = OxmlElement('w:tblPr')
        tbl.insert(0, tblPr)
    tblBorders = OxmlElement('w:tblBorders')
    for side in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        b = OxmlElement(f'w:{side}')
        b.set(qn('w:val'), 'none')
        tblBorders.append(b)
    tblPr.append(tblBorders)


# ─────────────────────────────────────────────────────────────────────────────
# DOCX GENERATION — matches reference exactly
# ─────────────────────────────────────────────────────────────────────────────

FONT = 'Fira Sans Condensed'
BODY_SIZE = 12
HEADING_SIZE = 12


def _add_para(doc, text='', bold=False, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY,
              before=0, after=6, indent_left=None, indent_first=None, font_size=12):
    p = doc.add_paragraph()
    p.alignment = alignment
    _para_spacing(p, before=before, after=after)
    if indent_left is not None:
        p.paragraph_format.left_indent = Inches(indent_left)
    if indent_first is not None:
        p.paragraph_format.first_line_indent = Inches(indent_first)
    if text:
        r = p.add_run(text)
        _set_font(r, FONT, font_size, bold=bold)
    return p


def _add_clause_heading(doc, text):
    """Bold clause heading indented to match reference (0.5 inch left)."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    _para_spacing(p, before=8, after=2)
    p.paragraph_format.left_indent = Inches(0.5)
    r = p.add_run(text)
    _set_font(r, FONT, HEADING_SIZE, bold=True)
    return p


def _add_numbered_clause(doc, number, text):
    """Number + tab + text matching reference indented layout."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    _para_spacing(p, before=0, after=6)
    # Left indent = 0.5 so number aligns there, hanging indent brings text to 1.0
    p.paragraph_format.left_indent = Inches(0.5)
    p.paragraph_format.first_line_indent = Inches(-0.3)

    num_run = p.add_run(f"{number}.")
    _set_font(num_run, FONT, BODY_SIZE, bold=True)

    tab_run = p.add_run("\t")
    _set_font(tab_run, FONT, BODY_SIZE)

    body_run = p.add_run(text)
    _set_font(body_run, FONT, BODY_SIZE)
    return p


def _add_ordinal_para(doc, day, suffix, rest, before=0, after=6):
    """
    Adds a paragraph with superscript suffix on the ordinal day number.
    e.g. "This Loan Agreement ... effective the 1^st day of May, 2026"
    """
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    _para_spacing(p, before=before, after=after)

    r1 = p.add_run(f"This Loan Agreement (the \"Agreement\") is made and effective the ")
    _set_font(r1, FONT, BODY_SIZE)

    r_day = p.add_run(str(day))
    _set_font(r_day, FONT, BODY_SIZE, bold=True)

    r_sup = p.add_run(suffix)
    _set_font(r_sup, FONT, 8, bold=True, superscript=True)

    r_rest = p.add_run(f" day of {rest}")
    _set_font(r_rest, FONT, BODY_SIZE, bold=True)
    return p


def _add_witness_para(doc, day, suffix, month_year):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    _para_spacing(p, before=6, after=10)

    r1 = p.add_run("IN WITNESS WHEREOF, the parties have duly affixed their signatures under seal on this ")
    _set_font(r1, FONT, BODY_SIZE)

    r_day = p.add_run(str(day))
    _set_font(r_day, FONT, BODY_SIZE, bold=True)

    r_sup = p.add_run(suffix)
    _set_font(r_sup, FONT, 8, bold=True, superscript=True)

    r_rest = p.add_run(f" day of {month_year}.")
    _set_font(r_rest, FONT, BODY_SIZE, bold=True)
    return p


def _add_sig_line_ordinal(doc, day, suffix, month_year, label, name):
    """
    Adds SIGNED, SEALED, AND DELIVERED / this 1^st day… | Label: _______ Name
    Using a 2-column table with a vertical left border on col 2.
    """
    table = doc.add_table(rows=3, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    # Make table fill the width minus margins
    table.columns[0].width = Inches(3.0)
    table.columns[1].width = Inches(3.5)
    _remove_table_borders(table)

    # Row 0: "SIGNED, SEALED, AND DELIVERED" | "Label: ____________"
    c00 = table.cell(0, 0)
    c01 = table.cell(0, 1)

    p_signed = c00.paragraphs[0]
    r_s = p_signed.add_run("SIGNED, SEALED, AND DELIVERED")
    _set_font(r_s, FONT, BODY_SIZE, bold=True)

    p_label = c01.paragraphs[0]
    r_l = p_label.add_run(f"{label}: ")
    _set_font(r_l, FONT, BODY_SIZE)
    r_line = p_label.add_run("_" * 32)
    _set_font(r_line, FONT, BODY_SIZE)

    # Row 1: "this 1^st day of …" | Name centered below line
    c10 = table.cell(1, 0)
    c11 = table.cell(1, 1)

    p_day = c10.paragraphs[0]
    r_this = p_day.add_run("this ")
    _set_font(r_this, FONT, BODY_SIZE)
    r_d = p_day.add_run(str(day))
    _set_font(r_d, FONT, BODY_SIZE)
    r_sup = p_day.add_run(suffix)
    _set_font(r_sup, FONT, 8, superscript=True)
    r_rest = p_day.add_run(f" day of {month_year}")
    _set_font(r_rest, FONT, BODY_SIZE)

    p_name = c11.paragraphs[0]
    p_name.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_name = p_name.add_run(name)
    _set_font(r_name, FONT, BODY_SIZE, bold=True)

    # Row 2: spacer
    _para_spacing(table.cell(2, 0).paragraphs[0], after=20)
    _para_spacing(table.cell(2, 1).paragraphs[0], after=20)

    return table


def generate_docx(agreement_data: dict) -> bytes:
    """Generate DOCX matching the exact reference document format."""
    doc = DocxDocument()

    # Page margins: 1 inch all sides
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1.25)
        section.right_margin = Inches(1.25)

    # ── PARSE FIELDS ──────────────────────────────────────────────────────────
    start_dt = _ensure_date(agreement_data.get('loan_start_date', agreement_data.get('agreement_date')))
    eff_day, eff_suffix, eff_my = format_effective_date_parts(start_dt)
    eff_full_str = f"{eff_day}{eff_suffix} day of {eff_my}"  # for non-superscript fallback

    first_payment_dt = _ensure_date(agreement_data.get('first_payment_date', agreement_data.get('loan_start_date')))
    first_pay_weekday = get_weekday_name(first_payment_dt)
    end_dt = _ensure_date(agreement_data.get('end_date'))
    end_date_mdy = format_date_mdy(end_dt)

    start_mdy = format_date_mdy(start_dt)

    borrower_name = agreement_data.get('borrower_name', '')
    borrower_address = agreement_data.get('borrower_address', '')
    lender_name = agreement_data.get('lender_name', 'Sakthipriyan MG Flex')
    lender_address = agreement_data.get('lender_address', 'Mallai, Namakkal, 637501')

    principal = agreement_data.get('principal_amount', 0)
    interest_rate = agreement_data.get('interest_rate', 0)
    installment = agreement_data.get('installment_amount', 0)
    freq_lower = str(agreement_data.get('repayment_frequency', 'weekly')).lower()

    p_amt_words = amount_in_words_ref(principal, "Rs")
    rate_words = rate_in_words_ref(interest_rate)
    inst_words = amount_in_words_ref(installment, "Rs")

    schedule = agreement_data.get('amortization_schedule', [])

    # ── TITLE ─────────────────────────────────────────────────────────────────
    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _para_spacing(title_para, before=0, after=12)
    t_run = title_para.add_run("LOAN AGREEMENT")
    _set_font(t_run, FONT, 14, bold=True, underline=True)

    # ── PREAMBLE ──────────────────────────────────────────────────────────────
    _add_ordinal_para(doc, eff_day, eff_suffix, eff_my, before=0, after=8)

    # BETWEEN line
    p_between = doc.add_paragraph()
    p_between.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    _para_spacing(p_between, before=0, after=4)
    rb = p_between.add_run("BETWEEN:")
    _set_font(rb, FONT, BODY_SIZE, bold=True)
    rs = p_between.add_run(f"  {borrower_name} of {borrower_address} (the \"")
    _set_font(rs, FONT, BODY_SIZE)
    rb2 = p_between.add_run("Borrower")
    _set_font(rb2, FONT, BODY_SIZE, bold=True)
    rs2 = p_between.add_run("\")")
    _set_font(rs2, FONT, BODY_SIZE)

    # AND line
    p_and = doc.add_paragraph()
    p_and.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    _para_spacing(p_and, before=0, after=8)
    ra = p_and.add_run("AND:")
    _set_font(ra, FONT, BODY_SIZE, bold=True)
    p_and.add_run("   ")
    rs3 = p_and.add_run(f"  {lender_name} of {lender_address} (the \"")
    _set_font(rs3, FONT, BODY_SIZE)
    rb3 = p_and.add_run("Lender")
    _set_font(rb3, FONT, BODY_SIZE, bold=True)
    rs4 = p_and.add_run("\")")
    _set_font(rs4, FONT, BODY_SIZE)

    # Consideration paragraph
    p_consid = doc.add_paragraph()
    p_consid.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    _para_spacing(p_consid, before=0, after=12)
    rc = p_consid.add_run(
        "IN CONSIDERATION OF the mutual covenants and promises made by the parties hereto, the Borrower "
        "and the Lender (individually, each a \"Party\" and collectively, the \"Parties\") covenant and "
        "agree as follows."
    )
    _set_font(rc, FONT, BODY_SIZE)

    # ── CLAUSES ───────────────────────────────────────────────────────────────
    clauses = [
        ("LOAN AMOUNT",
         f"The Lender promises to loan {p_amt_words} to the Borrower and the Borrower "
         f"promises to repay this principal amount to the Lender, with interest payable on the "
         f"unpaid principal at the rate of {rate_words} percent per annum, beginning on {start_mdy}."),

        ("PAYMENT",
         f"This Loan will be repaid in consecutive {freq_lower} installments in the amount of "
         f"{inst_words} of principal and interest on the {first_pay_weekday} of each week "
         f"commencing the week following the beginning of the loan under this Agreement and "
         f"continuing until {end_date_mdy} with the balance then owing under this Agreement "
         f"being paid at that time."),

        ("DEFAULT",
         "Notwithstanding anything to the contrary in this Agreement, if the Borrower defaults "
         "in the performance of any obligation under this Agreement, then the Lender may declare "
         "the principal amount owing and interest due under this Agreement at that time to be "
         "immediately due and payable."),

        ("COSTS",
         "All costs, expenses and expenditures including, and without limitation, the complete "
         "legal costs incurred by the Lender in enforcing this Agreement as a result of any "
         "default by the Borrower, will be added to the principal then outstanding and will "
         "immediately be paid by the Borrower."),

        ("GOVERNING LAW",
         "This Agreement will be construed in accordance with and governed by the laws of India."),

        ("SEVERABILITY",
         "The clauses and paragraphs contained in this Agreement are intended to be read and "
         "construed independently of each other. If any term, covenant, condition or provision "
         "of this Agreement is held by a court of competent jurisdiction to be invalid, void or "
         "unenforceable, it is the parties' intent that such provision be reduced in scope by "
         "the court only to the extent deemed necessary by that court to render the provision "
         "reasonable and enforceable and the remainder of the provisions of this Agreement will "
         "in no way be affected, impaired or invalidated as a result."),

        ("BINDING EFFECT",
         "This Agreement will pass to the benefit of and be binding upon the respective heirs, "
         "executors, administrators, successors and permitted assigns of the Borrower and Lender. "
         "The Borrower waives presentment for payment, notice of non-payment, protest, and "
         "notice of protest."),

        ("AMENDMENTS",
         "This Agreement may only be amended or modified by a written instrument executed by "
         "both the Borrower and the Lender."),

        ("GENERAL PROVISIONS",
         "Headings are inserted for the convenience of the parties only and are not to be "
         "considered when interpreting this Agreement. Words in the singular mean and include "
         "the plural and vice versa. Words in the masculine mean and include the feminine and "
         "vice versa."),

        ("ENTIRE AGREEMENT",
         "This Agreement constitutes the entire agreement between the parties and there are no "
         "further items or provisions, either oral or otherwise."),
    ]

    for i, (heading, body) in enumerate(clauses, start=1):
        _add_clause_heading(doc, heading)
        _add_numbered_clause(doc, i, body)

    # ── IN WITNESS / SIGNATURE ────────────────────────────────────────────────
    _add_witness_para(doc, eff_day, eff_suffix, eff_my)

    _add_sig_line_ordinal(doc, eff_day, eff_suffix, eff_my, "Borrower", borrower_name)
    _add_sig_line_ordinal(doc, eff_day, eff_suffix, eff_my, "Lender", lender_name)

    # ── PAGE BREAK + AMORTIZATION ─────────────────────────────────────────────
    doc.add_page_break()

    # Amortization title
    sched_title = doc.add_paragraph()
    sched_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _para_spacing(sched_title, before=0, after=12)
    st_run = sched_title.add_run("AMORTIZATION SCHEDULE")
    _set_font(st_run, FONT, 13, bold=True)

    # Meta block
    for label, value in [
        ("Loan Amount:", f"{float(principal):,.2f} Rupees"),
        ("Loan Start Date:", format_date_mdy(start_dt)),
        ("Loan End Date:", format_date_mdy(end_dt)),
        ("Interest Rate:", f"{float(interest_rate):.2f}% per annum"),
    ]:
        mp = doc.add_paragraph()
        _para_spacing(mp, before=0, after=2)
        r_lbl = mp.add_run(label)
        _set_font(r_lbl, FONT, BODY_SIZE, bold=True)
        r_val = mp.add_run(f"  {value}")
        _set_font(r_val, FONT, BODY_SIZE)

    # Spacer
    _add_para(doc, '', before=6, after=4)

    # Table headers
    headers = ['#', 'Date', 'Payment (Rupees)', 'Principal Paid (Rupees)', 'Interest Charged', 'Balance (Rupees)']
    col_widths = [Inches(0.5), Inches(0.95), Inches(1.3), Inches(1.45), Inches(1.2), Inches(1.2)]

    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Header row
    hdr_row = table.rows[0]
    for i, (hdr, w) in enumerate(zip(headers, col_widths)):
        cell = hdr_row.cells[i]
        cell.width = w
        _set_cell_bg(cell, 'D3D3D3')
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(hdr)
        _set_font(r, FONT, 11, bold=True)

    # Schedule rows
    grey = 'E8E8E8'
    white = 'FFFFFF'
    for idx, row in enumerate(schedule):
        inst_no = row.get('installment_no', idx)
        due_date_raw = row.get('due_date', '')
        payment = row.get('payment', '0.00')
        principal_paid = row.get('principal_paid', '0.00')
        interest = row.get('interest_charged', '0.00')
        balance = row.get('remaining_balance', '0.00')

        try:
            due_str = format_date_numeric(_ensure_date(due_date_raw))
        except Exception:
            due_str = str(due_date_raw)

        fill = grey if idx % 2 == 0 else white
        tr = table.add_row()
        cells = tr.cells

        # Set col widths
        for ci, cw in enumerate(col_widths):
            cells[ci].width = cw

        values = [
            ('' if inst_no == 0 else str(inst_no)),
            due_str,
            f"{float(payment):,.2f}",
            f"{float(principal_paid):,.2f}",
            f"{float(interest):,.2f}",
            f"{float(balance):,.2f}",
        ]
        for ci, val in enumerate(values):
            _set_cell_bg(cells[ci], fill)
            cp = cells[ci].paragraphs[0]
            align = WD_ALIGN_PARAGRAPH.CENTER if ci == 0 else WD_ALIGN_PARAGRAPH.RIGHT
            if ci == 1:
                align = WD_ALIGN_PARAGRAPH.CENTER
            cp.alignment = align
            cr = cp.add_run(val)
            _set_font(cr, FONT, 10.5)

    # Total row
    try:
        total_payment = sum(float(r.get('payment', 0)) for r in schedule if r.get('installment_no', 0) > 0)
        total_principal = sum(float(r.get('principal_paid', 0)) for r in schedule if r.get('installment_no', 0) > 0)
        total_interest = sum(float(r.get('interest_charged', 0)) for r in schedule if r.get('installment_no', 0) > 0)
    except Exception:
        total_payment = total_principal = total_interest = 0.0

    tot_row = table.add_row()
    _set_cell_bg(tot_row.cells[0], 'D3D3D3')
    p0 = tot_row.cells[0].paragraphs[0]
    r_tot0 = p0.add_run("Total")
    _set_font(r_tot0, FONT, 10.5, bold=True)

    tot_vals = ['', f"{total_payment:,.2f}", f"{total_principal:,.2f}", f"{total_interest:,.2f}", "0.00"]
    for ci, val in enumerate(tot_vals):
        c = tot_row.cells[ci + 1]
        _set_cell_bg(c, 'D3D3D3')
        cp = c.paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        cr = cp.add_run(val)
        _set_font(cr, FONT, 10.5, bold=True)

    # Save to bytes
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# PDF via ReportLab — matches reference exactly
# ─────────────────────────────────────────────────────────────────────────────

def generate_pdf_reportlab(agreement_data: dict) -> bytes:
    """Generate PDF matching the exact reference document using ReportLab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch, cm
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, HRFlowable
    )
    from reportlab.platypus.flowables import KeepTogether

    PAGE_W, PAGE_H = A4
    L_MARGIN = R_MARGIN = 0.85 * inch
    T_MARGIN = B_MARGIN = 1.0 * inch

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=L_MARGIN,
        rightMargin=R_MARGIN,
        topMargin=T_MARGIN,
        bottomMargin=B_MARGIN,
    )

    # ── STYLES ────────────────────────────────────────────────────────────────
    if _register_fira_fonts():
        FONT_REG = 'FiraSansCondensed'
        FONT_BOLD = 'FiraSansCondensed-Bold'
        FONT_ITALIC = 'FiraSansCondensed-Italic'
        FONT_BOLD_ITALIC = 'FiraSansCondensed-BoldItalic'
    else:
        FONT_REG = 'Helvetica'
        FONT_BOLD = 'Helvetica-Bold'
        FONT_ITALIC = 'Helvetica-Oblique'
        FONT_BOLD_ITALIC = 'Helvetica-BoldOblique'

    def S(name, parent_name='Normal', **kw):
        return ParagraphStyle(name, parent=getSampleStyleSheet()[parent_name], **kw)

    title_style = S('AgreementTitle',
                    fontName=FONT_BOLD,
                    fontSize=16,
                    leading=20,
                    alignment=TA_CENTER,
                    underline=1,
                    spaceAfter=14)

    body_style = S('AgreementBody',
                   fontName=FONT_REG,
                   fontSize=12,
                   leading=16,
                   alignment=TA_JUSTIFY,
                   spaceAfter=8)

    bold_inline = S('BoldInline',
                    fontName=FONT_BOLD,
                    fontSize=12,
                    leading=16)

    clause_heading_style = S('ClauseHeading',
                              fontName=FONT_BOLD,
                              fontSize=12,
                              leading=16,
                              leftIndent=0.5 * inch,
                              spaceBefore=10,
                              spaceAfter=2)

    sig_label_style = S('SigLabel',
                         fontName=FONT_BOLD,
                         fontSize=12,
                         leading=16)

    sig_name_style = S('SigName',
                        fontName=FONT_BOLD,
                        fontSize=12,
                        leading=16,
                        alignment=TA_CENTER)

    sig_date_style = S('SigDate',
                        fontName=FONT_REG,
                        fontSize=12,
                        leading=16)

    sched_title_style = S('SchedTitle',
                           fontName=FONT_BOLD,
                           fontSize=14,
                           leading=18,
                           alignment=TA_CENTER,
                           spaceAfter=12)

    sched_meta_style = S('SchedMeta',
                          fontName=FONT_REG,
                          fontSize=11,
                          leading=15,
                          spaceAfter=2)

    sched_hdr_style = S('SchedHdr',
                         fontName=FONT_BOLD,
                         fontSize=11,
                         leading=14,
                         alignment=TA_CENTER)

    sched_cell_style = S('SchedCell',
                          fontName=FONT_REG,
                          fontSize=10.5,
                          leading=14,
                          alignment=TA_RIGHT)

    sched_cell_center = S('SchedCellC',
                           fontName=FONT_REG,
                           fontSize=10.5,
                           leading=14,
                           alignment=TA_CENTER)

    sched_total_style = S('SchedTotal',
                           fontName=FONT_BOLD,
                           fontSize=10.5,
                           leading=14,
                           alignment=TA_RIGHT)

    # ── PARSE DATA ────────────────────────────────────────────────────────────
    start_dt = _ensure_date(agreement_data.get('loan_start_date', agreement_data.get('agreement_date')))
    eff_day, eff_suffix, eff_my = format_effective_date_parts(start_dt)

    first_payment_dt = _ensure_date(agreement_data.get('first_payment_date', agreement_data.get('loan_start_date')))
    first_pay_weekday = get_weekday_name(first_payment_dt)
    end_dt = _ensure_date(agreement_data.get('end_date'))
    end_date_mdy = format_date_mdy(end_dt)
    start_mdy = format_date_mdy(start_dt)

    borrower_name = agreement_data.get('borrower_name', '')
    borrower_address = agreement_data.get('borrower_address', '')
    lender_name = agreement_data.get('lender_name', 'Sakthipriyan MG Flex')
    lender_address = agreement_data.get('lender_address', 'Mallai, Namakkal, 637501')

    principal = agreement_data.get('principal_amount', 0)
    interest_rate = agreement_data.get('interest_rate', 0)
    installment = agreement_data.get('installment_amount', 0)
    freq_lower = str(agreement_data.get('repayment_frequency', 'weekly')).lower()

    p_amt_words = amount_in_words_ref(principal, "Rs")
    rate_words = rate_in_words_ref(interest_rate)
    inst_words = amount_in_words_ref(installment, "Rs")
    schedule = agreement_data.get('amortization_schedule', [])

    # Helper: superscript in ReportLab via <super> tag
    def sup(text):
        return f'<super><font size="8">{text}</font></super>'

    eff_date_rl = f"{eff_day}{sup(eff_suffix)} day of {eff_my}"

    story = []

    # ── TITLE ─────────────────────────────────────────────────────────────────
    story.append(Paragraph('<u><b>LOAN AGREEMENT</b></u>', title_style))

    # ── PREAMBLE ──────────────────────────────────────────────────────────────
    preamble_text = (
        f'This Loan Agreement (the "Agreement") is made and effective the '
        f'<b>{eff_day}{sup(eff_suffix)} day of {eff_my}</b>'
    )
    story.append(Paragraph(preamble_text, body_style))

    between_text = (
        f'<b>BETWEEN:</b>  {borrower_name} of {borrower_address} (the "<b>Borrower</b>")'
    )
    story.append(Paragraph(between_text, body_style))

    and_text = (
        f'<b>AND:</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{lender_name} of {lender_address} (the "<b>Lender</b>")'
    )
    story.append(Paragraph(and_text, body_style))

    consid_text = (
        'IN CONSIDERATION OF the mutual covenants and promises made by the parties hereto, the Borrower '
        'and the Lender (individually, each a "Party" and collectively, the "Parties") covenant and agree as follows.'
    )
    story.append(Paragraph(consid_text, body_style))
    story.append(Spacer(1, 6))

    # ── CLAUSES ───────────────────────────────────────────────────────────────
    clause_body_style = ParagraphStyle(
        'ClauseBody',
        fontName=FONT_REG,
        fontSize=12,
        leading=16,
        alignment=TA_JUSTIFY,
        leftIndent=0.5 * inch,
        firstLineIndent=-0.3 * inch,
        spaceAfter=8,
    )

    def add_clause(num, heading, body_text):
        story.append(Paragraph(f'<b>{heading}</b>', clause_heading_style))
        numbered_text = f'<b>{num}.</b>\t{body_text}'
        story.append(Paragraph(numbered_text, clause_body_style))

    add_clause(1, "LOAN AMOUNT",
               f"The Lender promises to loan {p_amt_words} to the Borrower and the Borrower "
               f"promises to repay this principal amount to the Lender, with interest payable on the "
               f"unpaid principal at the rate of {rate_words} percent per annum, beginning on {start_mdy}.")

    add_clause(2, "PAYMENT",
               f"This Loan will be repaid in consecutive {freq_lower} installments in the amount of "
               f"<b>{inst_words}</b> of principal and interest on the <b>{first_pay_weekday}</b> of each week "
               f"commencing the week following the beginning of the loan under this Agreement and "
               f"continuing until <b>{end_date_mdy}</b> with the balance then owing under this Agreement "
               f"being paid at that time.")

    add_clause(3, "DEFAULT",
               "Notwithstanding anything to the contrary in this Agreement, if the Borrower defaults "
               "in the performance of any obligation under this Agreement, then the Lender may declare "
               "the principal amount owing and interest due under this Agreement at that time to be "
               "immediately due and payable.")

    add_clause(4, "COSTS",
               "All costs, expenses and expenditures including, and without limitation, the complete "
               "legal costs incurred by the Lender in enforcing this Agreement as a result of any "
               "default by the Borrower, will be added to the principal then outstanding and will "
               "immediately be paid by the Borrower.")

    add_clause(5, "GOVERNING LAW",
               "This Agreement will be construed in accordance with and governed by the laws of India.")

    add_clause(6, "SEVERABILITY",
               "The clauses and paragraphs contained in this Agreement are intended to be read and "
               "construed independently of each other. If any term, covenant, condition or provision "
               "of this Agreement is held by a court of competent jurisdiction to be invalid, void or "
               "unenforceable, it is the parties' intent that such provision be reduced in scope by "
               "the court only to the extent deemed necessary by that court to render the provision "
               "reasonable and enforceable and the remainder of the provisions of this Agreement will "
               "in no way be affected, impaired or invalidated as a result.")

    add_clause(7, "BINDING EFFECT",
               "This Agreement will pass to the benefit of and be binding upon the respective heirs, "
               "executors, administrators, successors and permitted assigns of the Borrower and Lender. "
               "The Borrower waives presentment for payment, notice of non-payment, protest, and "
               "notice of protest.")

    add_clause(8, "AMENDMENTS",
               "This Agreement may only be amended or modified by a written instrument executed by "
               "both the Borrower and the Lender.")

    add_clause(9, "GENERAL PROVISIONS",
               "Headings are inserted for the convenience of the parties only and are not to be "
               "considered when interpreting this Agreement. Words in the singular mean and include "
               "the plural and vice versa. Words in the masculine mean and include the feminine and "
               "vice versa.")

    add_clause(10, "ENTIRE AGREEMENT",
               "This Agreement constitutes the entire agreement between the parties and there are no "
               "further items or provisions, either oral or otherwise.")

    # ── IN WITNESS ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 8))
    witness_text = (
        f'IN WITNESS WHEREOF, the parties have duly affixed their signatures under seal on this '
        f'<b>{eff_day}{sup(eff_suffix)} day of {eff_my}</b>.'
    )
    story.append(Paragraph(witness_text, body_style))
    story.append(Spacer(1, 14))

    # ── SIGNATURE BLOCK ───────────────────────────────────────────────────────
    # Two-column table with vertical divider line on right column
    sig_date_text_rl = f'this {eff_day}{sup(eff_suffix)} day of {eff_my}'
    LINE = '_' * 35

    def make_sig_table(label, name):
        left_col = [
            Paragraph('<b>SIGNED, SEALED, AND DELIVERED</b>', sig_label_style),
            Paragraph(sig_date_text_rl, sig_date_style),
        ]
        right_col = [
            Paragraph(f'{label}: {LINE}', sig_date_style),
            Paragraph(f'<b>{name}</b>', sig_name_style),
        ]
        data = [[left_col, right_col]]
        t = Table(data, colWidths=[3.0 * inch, 3.5 * inch])
        t.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEAFTER', (0, 0), (0, 0), 0.5, colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (1, 0), (1, 0), 12),
        ]))
        return t

    story.append(make_sig_table("Borrower", borrower_name))
    story.append(Spacer(1, 20))
    story.append(make_sig_table("Lender", lender_name))
    story.append(Spacer(1, 12))

    # ── PAGE BREAK ────────────────────────────────────────────────────────────
    story.append(PageBreak())

    # ── AMORTIZATION SCHEDULE ─────────────────────────────────────────────────
    story.append(Paragraph('<b>AMORTIZATION SCHEDULE</b>', sched_title_style))
    story.append(Spacer(1, 6))

    # Meta info
    meta_rows = [
        ("Loan Amount:", f"{float(principal):,.2f} Rupees"),
        ("Loan Start Date:", format_date_mdy(start_dt)),
        ("Loan End Date:", format_date_mdy(end_dt)),
        ("Interest Rate:", f"{float(interest_rate):.2f}% per annum"),
    ]
    for lbl, val in meta_rows:
        story.append(Paragraph(f'<b>{lbl}</b>&nbsp;&nbsp;&nbsp;{val}', sched_meta_style))

    story.append(Spacer(1, 12))

    # ── AMORTIZATION TABLE ────────────────────────────────────────────────────
    # Available width = A4 width (8.27") - left (1.25") - right (1.25") = 5.77"
    # Column widths must sum to exactly 5.77 inch
    COL_W = [
        0.47 * inch,   # #
        0.95 * inch,   # Date
        1.30 * inch,   # Payment (Rupees)
        1.45 * inch,   # Principal Paid (Rupees)
        1.20 * inch,   # Interest Charged
        1.20 * inch,   # Balance (Rupees)
    ]  # total = 6.57 inch

    _tot_lbl_style = ParagraphStyle(
        'TotLbl', fontName=FONT_BOLD, fontSize=10.5, leading=14, alignment=TA_CENTER
    )

    tbl_data = [[
        Paragraph('<b>#</b>', sched_hdr_style),
        Paragraph('<b>Date</b>', sched_hdr_style),
        Paragraph('<b>Payment (Rupees)</b>', sched_hdr_style),
        Paragraph('<b>Principal Paid\n(Rupees)</b>', sched_hdr_style),
        Paragraph('<b>Interest Charged</b>', sched_hdr_style),
        Paragraph('<b>Balance (Rupees)</b>', sched_hdr_style),
    ]]

    GREY = colors.HexColor('#E8E8E8')
    WHITE = colors.white
    row_colors = []

    # Header background
    row_colors.append(('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#D3D3D3')))

    for i, row in enumerate(schedule):
        inst_no = row.get('installment_no', i)
        due_date_raw = row.get('due_date', '')
        payment = float(row.get('payment', 0))
        pp = float(row.get('principal_paid', 0))
        ic = float(row.get('interest_charged', 0))
        bal = float(row.get('remaining_balance', 0))
        try:
            due_str = format_date_numeric(_ensure_date(due_date_raw))
        except Exception:
            due_str = str(due_date_raw)

        # Alternate grey / white
        fill = GREY if i % 2 == 0 else WHITE
        ri = i + 1
        row_colors.append(('BACKGROUND', (0, ri), (-1, ri), fill))

        tbl_data.append([
            Paragraph('' if inst_no == 0 else str(inst_no), sched_cell_center),
            Paragraph(due_str, sched_cell_center),
            Paragraph(f'{payment:,.2f}', sched_cell_style),
            Paragraph(f'{pp:,.2f}', sched_cell_style),
            Paragraph(f'{ic:,.2f}', sched_cell_style),
            Paragraph(f'{bal:,.2f}', sched_cell_style),
        ])

    # ── TOTAL ROW ──────────────────────────────────────────────────────────────
    try:
        total_payment   = sum(float(r.get('payment', 0))          for r in schedule if r.get('installment_no', 0) > 0)
        total_principal = sum(float(r.get('principal_paid', 0))   for r in schedule if r.get('installment_no', 0) > 0)
        total_interest  = sum(float(r.get('interest_charged', 0)) for r in schedule if r.get('installment_no', 0) > 0)
    except Exception:
        total_payment = total_principal = total_interest = 0.0

    tot_ri = len(tbl_data)
    row_colors.append(('BACKGROUND', (0, tot_ri), (-1, tot_ri), colors.HexColor('#D3D3D3')))
    tbl_data.append([
        Paragraph('<b>Total</b>', _tot_lbl_style),
        Paragraph('', sched_cell_style),
        Paragraph(f'<b>{total_payment:,.2f}</b>',   sched_total_style),
        Paragraph(f'<b>{total_principal:,.2f}</b>', sched_total_style),
        Paragraph(f'<b>{total_interest:,.2f}</b>',  sched_total_style),
        Paragraph('<b>0.00</b>', sched_total_style),
    ])

    # repeatRows=1 so header repeats on every page of a long schedule
    tbl = Table(tbl_data, colWidths=COL_W, repeatRows=1)
    tbl_style = TableStyle([
        ('BOX',         (0, 0), (-1, -1), 0.5, colors.black),
        ('INNERGRID',   (0, 0), (-1, -1), 0.3, colors.black),
        ('VALIGN',      (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING',   (0, 0), (-1, -1), 5),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
    ] + row_colors)
    tbl.setStyle(tbl_style)
    story.append(tbl)

    doc.build(story)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API  (called from views.py)
# ─────────────────────────────────────────────────────────────────────────────

def generate_pdf_from_html(agreement_data: dict) -> bytes:
    """
    Wrapper kept for API compatibility.
    Always uses ReportLab (WeasyPrint unavailable on Windows without GTK libs).
    """
    return generate_pdf_reportlab(agreement_data)
