"""
Backward compatibility bridge for app.aggregation.pdf_generator.
Re-exports the PDF Generator service from app.pdf_generator.
"""

from app.pdf_generator import (
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
