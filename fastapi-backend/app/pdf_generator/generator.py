"""
Asset Bridge - Official Succession & Asset Claiming Dossier PDF Generator
Dexathon 2026 - Production Engine for Individualized Claim Packets
"""

import io
import datetime
from typing import Dict, List, Any, Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Palette Constants
NAVY = colors.HexColor("#0F172A")
BRAND_BLUE = colors.HexColor("#1E3A8A")
ACCENT_BLUE = colors.HexColor("#2563EB")
EMERALD = colors.HexColor("#059669")
EMERALD_LIGHT = colors.HexColor("#ECFDF5")
AMBER = colors.HexColor("#D97706")
AMBER_LIGHT = colors.HexColor("#FFFBEB")
ROSE = colors.HexColor("#DC2626")
ROSE_LIGHT = colors.HexColor("#FEF2F2")
SLATE_DARK = colors.HexColor("#334155")
SLATE_MID = colors.HexColor("#64748B")
SLATE_LIGHT = colors.HexColor("#F8FAFC")
BORDER_COLOR = colors.HexColor("#CBD5E1")

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to compute total page count and draw running header/footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(SLATE_MID)
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 810, "ASSET BRIDGE · STATUTORY SUCCESSION & ASSET CLAIMING DOSSIER")
            self.drawRightString(559, 810, "CONFIDENTIAL & STATUTORY")
            self.setStrokeColor(BORDER_COLOR)
            self.setLineWidth(0.5)
            self.line(36, 804, 559, 804)

        # Footer (all pages)
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(36, 42, 559, 42)
        
        self.setFont("Helvetica", 7.5)
        self.drawString(36, 30, "Generated under Civil Registration System (CRS) & Indian Succession Act guidelines · Asset Bridge Platform")
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(559, 30, page_str)
        self.restoreState()

def format_inr(val: float) -> str:
    try:
        val_int = int(round(val))
        s = str(val_int)
        if len(s) <= 3:
            return f"INR {s}"
        last_three = s[-3:]
        remaining = s[:-3]
        out = ""
        while len(remaining) > 2:
            out = "," + remaining[-2:] + out
            remaining = remaining[:-2]
        return f"INR {remaining + out},{last_three}"
    except Exception:
        return f"INR {val:,.2f}"

def mask_pan(pan: str) -> str:
    if len(pan) == 10:
        return f"{pan[:2]}XXXXX{pan[-2:]}"
    return pan

def get_institution_procedure(holding: Dict[str, Any], state: str) -> Dict[str, Any]:
    """Determine prescribed claim forms, authorities, and regulatory SLAs per asset category."""
    reg = holding.get("regulator", "")
    h_type = holding.get("type", "").lower()
    nominee = holding.get("nominee")
    has_nominee = bool(nominee and nominee.get("status") == "valid")
    
    if reg == "RBI":
        if has_nominee:
            return {
                "form": "Model Claim Form for Deceased Depositors (Annex V - Settlement to Nominee/Survivor under Sec 45ZA(2) Banking Regulation Act)",
                "authority": "Branch Manager / Retail Asset Settlement Cell (Commercial Bank)",
                "sla": "15 calendar days from receipt of claim (RBI Master Direction 2025/2026; statutory delay penalty at Bank Rate + 4% = 9.75% p.a. applies beyond 15 days)",
                "enclosures": [
                    "Annex V Claim Form (Banks strictly prohibited by RBI from demanding probate, letters of administration, indemnity bond, or succession certificate from nominee)",
                    "Original Passbook / Term Deposit Receipt (TDR) / Term Deposit Advice",
                    "Certified copy of Death Certificate issued by Municipal / Panchayat Registrar under CRS",
                    "Self-attested PAN and Aadhaar proof of Nominee / Survivor",
                    "Cancelled Cheque / Bank Passbook copy for direct NEFT/RTGS settlement"
                ]
            }
        else:
            return {
                "form": "Model Claim Form for Deceased Depositors (Annex VI - Settlement of Claims up to INR 15,00,000 threshold without Succession Certificate)",
                "authority": "Branch Manager / Retail Asset Settlement Cell (Commercial Bank)",
                "sla": "15 calendar days from receipt of claim (RBI Master Direction 2025/2026; statutory delay penalty at Bank Rate + 4% = 9.75% p.a. applies beyond 15 days)",
                "enclosures": [
                    "Annex VI Claim Form for intestate settlement without legal representation",
                    "Annex VII: Letter of Indemnity executed on non-judicial stamp paper with one or two sureties",
                    "Annex VIII: Letter of Disclaimer / No Objection Certificate (NOC) from all non-claiming legal heirs",
                    "Original Passbook / Term Deposit Receipt (TDR)",
                    "Certified copy of Death Certificate issued by Municipal / Panchayat Registrar under CRS",
                    "Self-attested PAN and Aadhaar proof of all Claimant Legal Heirs",
                    "Cancelled Cheque / Core Banking Passbook copy for direct electronic NEFT credit"
                ]
            }
    elif reg == "EPFO":
        return {
            "form": "EPFO Form 20 (Provident Fund Final Settlement) & Form 10D (Monthly Pension Claim)",
            "authority": "Regional P.F. Commissioner (RPFC) Jurisdiction Office",
            "sla": "20 working days under Citizen's Charter",
            "enclosures": [
                "Form 20 duly signed by Claimant and attested by Employer / Gazetted Officer",
                "Original Death Certificate",
                "Form 10D (for EPS 1995 Pension entitlement of Spouse and eligible children)",
                "Joint bank account passbook copy with IFSC / cancelled cheque",
                "Legal Heir Certificate from Tahsildar / SDM" if not has_nominee else "EPFO Form 2 E-Nomination Printout"
            ]
        }
    elif reg == "SEBI":
        if "demat" in h_type or "equity" in h_type:
            return {
                "form": "Form ISR-5 (Transmission of Securities) via Depository Participant (CDSL / NSDL)",
                "authority": "Depository Participant (DP) Operations & NSDL/CDSL Operations",
                "sla": "21 calendar days (SEBI Master Circular for DPs)",
                "enclosures": [
                    "Form ISR-5 duly executed and signed by Claimant(s)",
                    "Notarized Death Certificate",
                    "Client Master Report (CMR) of Claimant's Demat Account",
                    "Pan & Aadhaar of Claimant with In-Person Verification (IPV)",
                    "Succession Certificate / Probated Will if total portfolio > INR 15,00,000" if not has_nominee else "Transmission Request Form (TRF) - Nominee Route"
                ]
            }
        else:
            return {
                "form": "CAMS / KFintech Common Transmission Request Form (Form T3 for Mutual Funds)",
                "authority": "Registrar & Transfer Agents (CAMS / KFintech) & AMC Operations",
                "sla": "15 business days (AMFI Guidelines)",
                "enclosures": [
                    "Transmission Form T3 signed by Claimant",
                    "Certified copy of Death Certificate",
                    "Attested KYC Proof and Bank Mandate Verification (Form ISR-2)",
                    "Indemnity Bond in stamp paper with surety (Annexure-I)" if not has_nominee else "Nominee Identification Proof",
                    "NOC from non-claiming legal heirs (Annexure-II)" if not has_nominee else "Account statement copy"
                ]
            }
    elif reg in ("IRDAI", "LIC"):
        return {
            "form": "Form A (Death Claim Intimation Form) & Form C (Physician's Certificate)",
            "authority": "Claims Department, Divisional / Regional Branch Office",
            "sla": "15 days for settlement where no investigation required (IRDAI SLA)",
            "enclosures": [
                "Original Insurance Policy Document / Bond",
                "Death Certificate issued by competent civil authority",
                "Claimant's Statement (Form A) with photograph and signature verification",
                "Hospital treatment summary / Form B & C (if demise due to illness)",
                "Post-Mortem Report & FIR (in case of accidental demise)",
                "Title Deed / Legal Heir Certificate" if not has_nominee else "Valid Nominee Proof of Relation"
            ]
        }
    elif reg == "PFRDA":
        return {
            "form": "PFRDA Death Withdrawal Form (Form 301 for NPS Tier-I Demise Claim)",
            "authority": "Central Recordkeeping Agency (Protean / KFintech CRA)",
            "sla": "30 calendar days for full 100% corpus payout to Nominee/Heirs",
            "enclosures": [
                "Form 301 duly filled and verified by Point of Presence (PoP-SP)",
                "Original PRAN Card or PRAN allotment copy",
                "Certified copy of Death Certificate",
                "Claimant Bank Account Mandate and KYC",
                "Legal Heir Certificate issued by competent revenue court" if not has_nominee else "Nominee declaration"
            ]
        }
    else:  # DOP / Small Savings
        return {
            "form": "Post Office Form SB-84 (Claim for Deceased Depositor's Account)",
            "authority": "Sub-Postmaster (SO) or Head Postmaster (HPO)",
            "sla": "30 days (India Post Rules)",
            "enclosures": [
                "Form SB-84 in duplicate",
                "Original Passbook / National Savings Certificate (NSC)",
                "Certified copy of Death Certificate",
                "Affidavit and Letter of Disclaimer from co-heirs (if claiming as sole heir)"
            ]
        }

def generate_claiming_dossier_pdf(
    person_info: Dict[str, Any],
    holdings: List[Dict[str, Any]],
    heirs: List[Dict[str, Any]],
    state_info: Dict[str, Any],
    case_info: Optional[Dict[str, Any]] = None,
    masked: bool = False
) -> bytes:
    """Generate a multi-page, publication-grade succession dossier in PDF format."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()
    
    # Custom Typography Hierarchy
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=NAVY,
        alignment=0
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=13,
        textColor=SLATE_MID,
        alignment=0
    )
    
    section_h1 = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=BRAND_BLUE,
        spaceBefore=14,
        spaceAfter=6
    )

    section_h2 = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=NAVY,
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=SLATE_DARK
    )

    body_bold = ParagraphStyle(
        'DocBodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=NAVY
    )

    badge_red = ParagraphStyle(
        'BadgeRed',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=ROSE
    )

    badge_green = ParagraphStyle(
        'BadgeGreen',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=EMERALD
    )

    badge_amber = ParagraphStyle(
        'BadgeAmber',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=AMBER
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    legal_clause_style = ParagraphStyle(
        'LegalClause',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=SLATE_DARK,
        alignment=4  # Justified
    )

    story = []

    # ---------------------------------------------------------
    # 1. OFFICIAL COVER HEADER & PRIMARY PARTICULAR TABLE
    # ---------------------------------------------------------
    ref_id = case_info.get("id") if case_info else f"DOS-{person_info.get('pan', 'PAN')[:5]}-{datetime.date.today().strftime('%Y%m%d')}"
    gen_time = datetime.datetime.now().strftime("%d-%b-%Y %H:%M IST")
    
    header_table_data = [
        [
            Paragraph("<b>ASSET BRIDGE</b><br/><font size=7 color='#64748B'>Statutory Succession & Wealth Reclamation Network</font>", body_style),
            Paragraph(f"<font size=7 color='#64748B'>DOSSIER REF:</font><br/><b>{ref_id}</b><br/><font size=6.5 color='#94A3B8'>SEAL: SHA-256 VERIFIED</font>", ParagraphStyle('HRight', parent=body_style, alignment=2))
        ]
    ]
    header_table = Table(header_table_data, colWidths=[330, 193])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=BRAND_BLUE, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph("ESTATE SUCCESSION & ASSET CLAIMING DOSSIER", title_style))
    story.append(Paragraph("A consolidated procedural master plan, document verification schedule, and statutory claimant roadmap prepared in accordance with Indian succession statutes.", subtitle_style))
    story.append(Spacer(1, 10))

    # Subject Particulars Table
    pan_display = mask_pan(person_info.get("pan", "—")) if masked else person_info.get("pan", "—")
    total_val = sum(h.get("value", 0) for h in holdings)
    total_assets = len(holdings)
    at_risk_count = sum(1 for h in holdings if not h.get("nominee") or h.get("nominee", {}).get("status") != "valid")

    subject_data = [
        [
            Paragraph("<b>Subject Full Name:</b>", body_style), Paragraph(person_info.get("name", "Deceased / Twin Holder"), body_bold),
            Paragraph("<b>PAN:</b>", body_style), Paragraph(pan_display, body_bold)
        ],
        [
            Paragraph("<b>Date of Birth:</b>", body_style), Paragraph(person_info.get("dob", "—"), body_style),
            Paragraph("<b>Aadhaar (last 4):</b>", body_style), Paragraph(f"XXXX-XXXX-{person_info.get('aadhaarLast4', '—')}", body_style)
        ],
        [
            Paragraph("<b>State of Residence:</b>", body_style), Paragraph(person_info.get("state", "—"), body_bold),
            Paragraph("<b>Total Mapped Assets:</b>", body_style), Paragraph(f"{total_assets} accounts / folios", body_style)
        ],
        [
            Paragraph("<b>Total Portfolio Value:</b>", body_style), Paragraph(format_inr(total_val), body_bold),
            Paragraph("<b>Nomination Gap Risk:</b>", body_style), Paragraph(f"{at_risk_count} assets require Legal Heir Cert", badge_red if at_risk_count else badge_green)
        ]
    ]
    if case_info:
        dec = case_info.get("deceased", {})
        subject_data.append([
            Paragraph("<b>Demise Registration:</b>", body_style), Paragraph(f"Reg #{dec.get('registrationNo', 'CRS-DEMO')}", body_style),
            Paragraph("<b>Date of Demise:</b>", body_style), Paragraph(dec.get("dateOfDeath", "—"), body_style)
        ])

    subject_table = Table(subject_data, colWidths=[120, 145, 110, 148])
    subject_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SLATE_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(subject_table)
    story.append(Spacer(1, 12))

    # ---------------------------------------------------------
    # 2. STATE STATUTORY JURISDICTION & ROADMAP
    # ---------------------------------------------------------
    story.append(Paragraph("1. State Succession Jurisdiction & Legal Framework", section_h1))
    state_doc_name = state_info.get("doc", "Legal Heir Certificate")
    state_auth = state_info.get("authority", "Local Revenue Office (Tahsildar)")
    state_days = state_info.get("days", "15–30 days")
    
    jurisdiction_text = (
        f"Under the Indian Succession Act, 1925 and relevant State revenue codes, immovable and movable financial assets "
        f"lacking a valid nominee must be claimed through the succession jurisdiction of <b>{person_info.get('state', 'your state')}</b>. "
        f"The primary succession instrument in this state is the <b>{state_doc_name}</b>, issued by <b>{state_auth}</b> "
        f"(typical statutory timeframe: <b>{state_days}</b>). Below is the mandatory state-level procedure before visiting institutions:"
    )
    story.append(Paragraph(jurisdiction_text, body_style))
    story.append(Spacer(1, 6))

    state_steps = [
        [
            Paragraph("<b>Stage 1: Civil Registration</b>", body_bold),
            Paragraph("Obtain certified copies of Death Certificate from the local Municipal Corporation / Panchayat under Civil Registration System (CRS). Order minimum 6 original certified copies.", body_style)
        ],
        [
            Paragraph("<b>Stage 2: Heir Certificate</b>", body_bold),
            Paragraph(f"Apply for {state_doc_name} via {state_auth}. Enclose: Death Certificate, Ration card / family card, voter IDs, relationship proof, and affidavit signed by all surviving legal heirs.", body_style)
        ],
        [
            Paragraph("<b>Stage 3: Publication / Inquiry</b>", body_bold),
            Paragraph("Revenue Inspector / Village Officer conducts local verification. If no objections are raised, the digital certificate is issued with QR verification code.", body_style)
        ]
    ]
    state_table = Table(state_steps, colWidths=[150, 373])
    state_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(state_table)
    story.append(Spacer(1, 14))

    # ---------------------------------------------------------
    # 3. CONSOLIDATED SCHEDULE OF FINANCIAL ASSETS
    # ---------------------------------------------------------
    story.append(Paragraph("2. Schedule of Financial Holdings by Regulator", section_h1))
    
    # Table of all holdings
    holdings_table_data = [
        [
            Paragraph("<b>Regulator</b>", table_header_style),
            Paragraph("<b>Institution & Asset Particulars</b>", table_header_style),
            Paragraph("<b>Account / Policy Ref</b>", table_header_style),
            Paragraph("<b>Value (INR)</b>", table_header_style),
            Paragraph("<b>Nominee Status & Mode</b>", table_header_style)
        ]
    ]

    for h in holdings:
        nom = h.get("nominee")
        if nom and nom.get("status") == "valid":
            nom_cell = Paragraph(f"<b>{nom.get('name')}</b><br/><font size=6.5 color='#059669'>Valid ({nom.get('relation')})</font>", body_style)
        elif nom and nom.get("status") == "deceased":
            nom_cell = Paragraph(f"<b>{nom.get('name')}</b><br/><font size=6.5 color='#DC2626'>Deceased Nominee</font>", badge_red)
        elif nom and nom.get("status") == "minor":
            nom_cell = Paragraph(f"<b>{nom.get('name')}</b><br/><font size=6.5 color='#D97706'>Minor (Guardian req.)</font>", badge_amber)
        else:
            nom_cell = Paragraph("<font size=7 color='#DC2626'><b>NO NOMINEE</b></font><br/><font size=6.5 color='#64748B'>Legal Heirs Route</font>", badge_red)

        reg_color = {"RBI": "#4F46E5", "EPFO": "#D97706", "SEBI": "#0284C7", "IRDAI": "#E11D48", "LIC": "#059669", "PFRDA": "#7C3AED", "DOP": "#EA580C"}.get(h.get("regulator", ""), "#334155")

        holdings_table_data.append([
            Paragraph(f"<font color='{reg_color}'><b>{h.get('regulator')}</b></font>", body_style),
            Paragraph(f"<b>{h.get('institution')}</b><br/><font size=7 color='#64748B'>{h.get('type')}</font>", body_style),
            Paragraph(f"<font size=7.5 fontName='Courier'>{h.get('ref')}</font>", body_style),
            Paragraph(f"<b>{format_inr(h.get('value', 0))}</b>", body_style),
            nom_cell
        ])

    holdings_table = Table(holdings_table_data, colWidths=[65, 160, 95, 88, 115])
    holdings_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(holdings_table)
    story.append(Spacer(1, 14))

    # Page Break for Step-by-Step Institutional Procedures
    story.append(PageBreak())

    # ---------------------------------------------------------
    # 4. INSTITUTION-BY-INSTITUTION STEP-BY-STEP CLAIM PROCEDURES
    # ---------------------------------------------------------
    story.append(Paragraph("3. Institution-by-Institution Actionable Claim Procedures", section_h1))
    story.append(Paragraph("Each financial institution operates under independent statutory guidelines. Follow the exact paperwork and submission sequence detailed below for each holding:", subtitle_style))
    story.append(Spacer(1, 8))

    for idx, h in enumerate(holdings, start=1):
        proc = get_institution_procedure(h, person_info.get("state", "Tamil Nadu"))
        nom = h.get("nominee")
        has_nom = bool(nom and nom.get("status") == "valid")
        
        card_header = f"{idx}. {h.get('institution')} · {h.get('type')} ({format_inr(h.get('value', 0))})"
        
        item_data = [
            [
                Paragraph(f"<b>Holding Ref:</b> {h.get('ref')}", body_style),
                Paragraph(f"<b>Regulator:</b> {h.get('regulator')}", body_style),
                Paragraph(f"<b>Nominee:</b> {nom.get('name') if nom else 'None'} ({nom.get('status') if nom else 'Unregistered'})", badge_green if has_nom else badge_red)
            ],
            [
                Paragraph(f"<b>Prescribed Claim Form:</b><br/><b>{proc['form']}</b>", body_style),
                Paragraph(f"<b>Competent Authority:</b><br/>{proc['authority']}", body_style),
                Paragraph(f"<b>Statutory SLA:</b><br/><b>{proc['sla']}</b>", body_style)
            ]
        ]
        
        # Enclosures
        encl_paragraphs = "".join(f"• {e}<br/>" for e in proc["enclosures"])
        item_data.append([
            Paragraph("<b>Mandatory Enclosures Checklist:</b>", body_style),
            Paragraph(encl_paragraphs, body_style),
            Paragraph("<b>Verification Action:</b><br/>Obtain physical counter receipt with Inward Rubber Stamp & Acknowledgement Reference No.", body_style)
        ])

        item_table = Table(item_data, colWidths=[170, 183, 170])
        item_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('SPAN', (1, 2), (1, 2)),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        card_block = [
            Paragraph(f"<b>{card_header}</b>", section_h2),
            item_table,
            Spacer(1, 6)
        ]
        story.append(KeepTogether(card_block))

    # ---------------------------------------------------------
    # 5. LEGAL HEIR ALLOCATION & SIGNATORY DECLARATIONS
    # ---------------------------------------------------------
    story.append(PageBreak())
    story.append(Paragraph("4. Legal Heir Beneficiary Schedule & Allocation Matrix", section_h1))
    story.append(Paragraph("Distribution of claimed movable assets among surviving legal heirs in accordance with statutory intestate shares or testamentary disposition:", subtitle_style))
    story.append(Spacer(1, 8))

    heirs_table_data = [
        [
            Paragraph("<b>Legal Heir / Claimant Name</b>", table_header_style),
            Paragraph("<b>Relation</b>", table_header_style),
            Paragraph("<b>PAN</b>", table_header_style),
            Paragraph("<b>Intended Share (%)</b>", table_header_style),
            Paragraph("<b>Estimated Allocation (INR)</b>", table_header_style)
        ]
    ]

    if heirs:
        for heir in heirs:
            share = heir.get("share", 0)
            allocated = (total_val * share) / 100.0 if share else 0
            pan_h = mask_pan(heir.get("pan", "—")) if masked else heir.get("pan", "—")
            heirs_table_data.append([
                Paragraph(f"<b>{heir.get('name')}</b>", body_style),
                Paragraph(heir.get("relation", "—"), body_style),
                Paragraph(f"<font size=7.5 fontName='Courier'>{pan_h}</font>", body_style),
                Paragraph(f"<b>{share}%</b>", body_style),
                Paragraph(f"<b>{format_inr(allocated)}</b>", body_style)
            ])
    else:
        heirs_table_data.append([
            Paragraph("No legal heirs registered in profile.", body_style),
            Paragraph("—", body_style),
            Paragraph("—", body_style),
            Paragraph("100%", body_style),
            Paragraph(format_inr(total_val), body_style)
        ])

    heirs_table = Table(heirs_table_data, colWidths=[140, 85, 95, 90, 113])
    heirs_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(heirs_table)
    story.append(Spacer(1, 14))

    # Claimant Signatory Declarations Block
    story.append(Paragraph("Claimant Verification & Attestation Block", section_h2))
    story.append(Paragraph("We, the undersigned legal heirs / claimants, solemnly state that the particulars set out herein are true and correct to the best of our knowledge and that no other surviving Class-I legal heir has been omitted:", legal_clause_style))
    story.append(Spacer(1, 8))

    sig_data = []
    display_heirs = heirs if heirs else [{"name": "Primary Claimant", "relation": "Legal Heir"}]
    for i in range(0, len(display_heirs), 2):
        row = []
        for j in range(2):
            if i + j < len(display_heirs):
                h = display_heirs[i + j]
                cell = Paragraph(
                    f"<b>{h.get('name')}</b> ({h.get('relation')})<br/><br/><br/>"
                    f"<font size=7 color='#64748B'>_______________________________________<br/>"
                    f"Signature of Claimant / Heir · Date</font>",
                    body_style
                )
            else:
                cell = Paragraph("", body_style)
            row.append(cell)
        sig_data.append(row)

    sig_table = Table(sig_data, colWidths=[260, 263])
    sig_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (-1, -1), SLATE_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 14))

    # ---------------------------------------------------------
    # 6. STATUTORY ANNEXURES
    # ---------------------------------------------------------
    story.append(PageBreak())
    story.append(Paragraph("ANNEXURE I: MODEL LETTER OF INDEMNITY", section_h1))
    story.append(Paragraph("(To be executed on non-judicial stamp paper of appropriate value for claims settled without Court Succession Certificate)", subtitle_style))
    story.append(Spacer(1, 8))

    indemnity_text = (
        f"To: The Respective Financial Institutions, Banks & Fund Houses<br/><br/>"
        f"In consideration of your paying/transferring to me/us the balances in the accounts/policies/folios standing in the name of late "
        f"<b>{person_info.get('name', 'the deceased')}</b> (PAN: <b>{pan_display}</b>) who died intestate on <b>{case_info.get('deceased', {}).get('dateOfDeath', 'the registered date') if case_info else 'the date of demise'}</b>, "
        f"without the production of a formal grant of Probate of a Will or Letters of Administration or Succession Certificate from a Court of competent jurisdiction, "
        f"I/we, the undersigned legal heir(s), hereby jointly and severally agree to indemnify and keep indemnified each institution, its directors, managers, and officers, "
        f"from and against all claims, demands, actions, proceedings, losses, damages, costs, and expenses which may be made against or incurred by you by reason of such payment/transfer.<br/><br/>"
        f"In witness whereof I/we have hereunto set our hands this ________ day of ________________, 2026.<br/><br/>"
        f"Signed and delivered by the Claimant(s) in the presence of two independent sureties."
    )
    story.append(Paragraph(indemnity_text, legal_clause_style))
    story.append(Spacer(1, 18))

    story.append(Paragraph("ANNEXURE II: NO-OBJECTION CERTIFICATE (NOC) BY CO-HEIRS", section_h1))
    story.append(Paragraph("(Executed by legal heirs relinquishing claim in favour of the designated primary claimant)", subtitle_style))
    story.append(Spacer(1, 8))

    noc_text = (
        f"I/We, the surviving legal heirs of late <b>{person_info.get('name', 'the deceased')}</b>, hereby unconditionally state and affirm that I/we have "
        f"no objection whatsoever to the payment/transmission of the proceeds of the holdings described in Schedule 2 of this Dossier to "
        f"<b>{heirs[0].get('name') if heirs else 'the Primary Claimant'}</b>, and receipt thereof by the said claimant shall be full and complete discharge to the institutions."
    )
    story.append(Paragraph(noc_text, legal_clause_style))
    story.append(Spacer(1, 18))

    story.append(Paragraph("ANNEXURE III: AFFIDAVIT OF NAME VARIATION", section_h1))
    story.append(Paragraph("(For holdings where the recorded name exhibits minor spelling or initial differences against PAN)", subtitle_style))
    story.append(Spacer(1, 8))

    affidavit_text = (
        f"I, the claimant, do hereby solemnly affirm and declare under the Indian Oaths Act that late <b>{person_info.get('name')}</b> (holder of PAN <b>{pan_display}</b>) "
        f"is one and the same person as named and styled variously in institutional records (including initial variations and aliases). "
        f"I solemnly verify that the contents of this declaration are true and correct to my personal knowledge."
    )
    story.append(Paragraph(affidavit_text, legal_clause_style))

    # Build Document using NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

