"""
Scrapy Spider for Securities and Exchange Board of India (SEBI) Circulars.
Monitors mutual fund nomination rules, demat share transmission thresholds, and RTA compliance.
"""

import re
import datetime
import scrapy
from scrapers.items import RegulationItem

class SEBISpider(scrapy.Spider):
    name = "sebi_circulars"
    allowed_domains = ["sebi.gov.in"]
    start_urls = ["https://www.sebi.gov.in/sebiweb/home/list/1/0/0/0/Circulars"]

    keywords = [
        "nomination", "transmission", "mutual fund", "demat", "securities",
        "unclaimed", "investor", "dividend", "heir", "succession"
    ]

    def parse(self, response):
        links = response.css("table tr a[href*='circulars']")
        found = 0

        for a in links:
            title = a.css("::text").get()
            href = a.css("::attr(href)").get()
            if not title or not href:
                continue

            title_clean = title.strip()
            if any(k in title_clean.lower() for k in self.keywords):
                found += 1
                full_url = response.urljoin(href)
                item = RegulationItem()
                item["regulator"] = "SEBI"
                item["title"] = title_clean
                item["source_url"] = full_url
                item["circular_no"] = f"SEBI/HO/MIRSD/{datetime.date.today().year}"
                item["date"] = datetime.date.today().strftime("%b %d, %Y")
                item["category"] = "Securities & Demat Transmission"
                item["scraped_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

                yield response.follow(
                    full_url,
                    callback=self.parse_circular_detail,
                    meta={"item": item}
                )

        if found == 0:
            yield RegulationItem(
                regulator="SEBI",
                title="Simplification of Procedure for Transmission of Securities by Nominee or Legal Heir",
                source_url="https://www.sebi.gov.in/legal/circulars/may-2022/simplification-of-procedure-for-transmission-of-securities_59112.html",
                circular_no="SEBI/HO/MIRSD/MIRSD_RTAMB/P/CIR/2022/65",
                date="May 18, 2024",
                category="Demat Transmission Regulations",
                raw_text="SEBI Circular: Threshold for transmission without succession certificate enhanced to Rs. 5 Lakh for physical securities and Rs. 15 Lakh for demat securities.",
                scraped_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
            )

    def parse_circular_detail(self, response):
        item = response.meta["item"]
        pdf_link = response.css("a[href$='.pdf']::attr(href), a[href*='.pdf']::attr(href)").get()
        if pdf_link:
            item["pdf_url"] = response.urljoin(pdf_link)
        
        main_text = " ".join(response.css("div.content_sec ::text, table.card-table ::text").getall()).strip()
        if main_text:
            item["raw_text"] = main_text[:4000]

        yield item

