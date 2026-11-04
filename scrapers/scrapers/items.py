"""
Scrapy Item models for Asset Bridge Statutory Regulations.
"""

import scrapy

class RegulationItem(scrapy.Item):
    regulator = scrapy.Field()       # "RBI", "SEBI", "EPFO", "IRDAI", "PFRDA", "IEPFA"
    title = scrapy.Field()           # Full title of the circular or notification
    circular_no = scrapy.Field()     # Official reference number (e.g. RBI/DOR/2025-26/170)
    date = scrapy.Field()            # Publication date
    source_url = scrapy.Field()      # Webpage URL
    pdf_url = scrapy.Field()         # Direct link to official PDF if available
    raw_text = scrapy.Field()        # Plain text content extracted from circular or PDF
    category = scrapy.Field()        # Subject category (e.g. "Deceased Depositor Settlement")
    scraped_at = scrapy.Field()      # ISO timestamp
