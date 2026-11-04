"""
Asset Bridge PDF Generator Service
Produces publication-grade statutory asset claiming dossiers, legal heir distribution schedules,
and formatted claim applications across all 7 Indian regulatory bodies.
"""

from app.pdf_generator.generator import (
    NumberedCanvas,
    generate_claiming_dossier_pdf,
    format_inr,
    mask_pan,
    get_institution_procedure,
    NAVY,
    BRAND_BLUE,
    ACCENT_BLUE,
    EMERALD,
    EMERALD_LIGHT,
    AMBER,
    AMBER_LIGHT,
    ROSE,
    ROSE_LIGHT,
    SLATE_DARK,
    SLATE_MID,
    SLATE_LIGHT,
    BORDER_COLOR,
)

__all__ = [
    "NumberedCanvas",
    "generate_claiming_dossier_pdf",
    "format_inr",
    "mask_pan",
    "get_institution_procedure",
    "NAVY",
    "BRAND_BLUE",
    "ACCENT_BLUE",
    "EMERALD",
    "EMERALD_LIGHT",
    "AMBER",
    "AMBER_LIGHT",
    "ROSE",
    "ROSE_LIGHT",
    "SLATE_DARK",
    "SLATE_MID",
    "SLATE_LIGHT",
    "BORDER_COLOR",
]
