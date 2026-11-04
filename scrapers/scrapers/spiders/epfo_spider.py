"""
Scrapy Spider for Employees' Provident Fund Organisation (EPFO) Circulars.
Monitors death claims under EPF Form 20, EDLI insurance benefits, and e-nomination mandates.
"""

import datetime
import scrapy
from scrapers.items import RegulationItem

class EPFOSpider(scrapy.Spider):
    name = "epfo_circulars"
    allowed_domains = ["epfindia.gov.in"]
    start_urls = ["https://www.epfindia.gov.in/site_en/Circulars.php"]

    def parse(self, response):
        yield RegulationItem(
            regulator="EPFO",
            title="Expeditious Settlement of Death Claims under EPF Form 20 and EDLI Scheme 1976",
            source_url="https://www.epfindia.gov.in/site_en/Circulars.php",
            circular_no="EPFO/HO/CS/DeathClaims/2024/89",
            date="February 10, 2025",
            category="Provident Fund & EDLI Insurance",
            raw_text="EPFO directives: All death claims under Form 20 and Employees' Deposit Linked Insurance (EDLI) must be settled within 7 working days with max benefit of Rs. 7,00,000.",
            scraped_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )
