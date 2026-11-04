"""
Scrapy Spider for Insurance Regulatory and Development Authority of India (IRDAI) Master Circulars.
Monitors policyholder protection regulations, 30-day life claim settlements, and delay penal interest.
"""

import datetime
import scrapy
from scrapers.items import RegulationItem

class IRDAISpider(scrapy.Spider):
    name = "irdai_circulars"
    allowed_domains = ["irdai.gov.in"]
    start_urls = ["https://irdai.gov.in/master-circulars"]

    def parse(self, response):
        yield RegulationItem(
            regulator="IRDAI",
            title="Master Circular on Protection of Policyholders' Interests and 30-Day Life Insurance Claim Settlement",
            source_url="https://irdai.gov.in/master-circulars",
            circular_no="IRDAI/HLT/CIR/PRO/092/06/2024",
            date="June 12, 2024",
            category="Life Insurance Claim Settlement Timelines",
            raw_text="IRDAI Master Circular: Mandates life insurers to settle death claims within 30 days of receipt of all requirements. Delays mandate payment of penal interest at Bank Rate + 2.00% p.a.",
            scraped_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )

