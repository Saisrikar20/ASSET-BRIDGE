"""
Asset Bridge - Unified Scrapy Crawler Runner
Launches Scrapy crawlers programmatically across all government regulatory spiders.
Can be invoked locally via npm run crawl:regulations or in CI/CD via GitHub Actions.
"""

import os
import sys
import argparse
from pathlib import Path

# Add project roots to sys.path
SCRAPERS_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRAPERS_DIR.parent
BACKEND_DIR = ROOT_DIR / "fastapi-backend"

if str(SCRAPERS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRAPERS_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("SCRAPY_SETTINGS_MODULE", "scrapers.settings")

from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings

from scrapers.spiders.rbi_spider import RBISpider
from scrapers.spiders.sebi_spider import SEBISpider
from scrapers.spiders.epfo_spider import EPFOSpider
from scrapers.spiders.irdai_spider import IRDAISpider

SPIDERS = {
    "rbi": RBISpider,
    "sebi": SEBISpider,
    "epfo": EPFOSpider,
    "irdai": IRDAISpider,
}

def run_crawlers(target: str = "all", log_level: str = "INFO"):
    """Execute Scrapy crawler process for specified regulators."""
    settings = get_project_settings()
    settings.set("LOG_LEVEL", log_level)

    process = CrawlerProcess(settings)
    target_clean = target.lower().strip()

    if target_clean == "all":
        for name, spider_cls in SPIDERS.items():
            print(f"[RUNNER] Queuing Scrapy spider: {name} ({spider_cls.name})")
            process.crawl(spider_cls)
    elif target_clean in SPIDERS:
        spider_cls = SPIDERS[target_clean]
        print(f"[RUNNER] Queuing single Scrapy spider: {target_clean} ({spider_cls.name})")
        process.crawl(spider_cls)
    else:
        raise ValueError(f"Unknown spider target: '{target}'. Available: {list(SPIDERS.keys())} or 'all'.")

    print("[RUNNER] Starting Scrapy engine...")
    process.start()
    print("[RUNNER] Crawling completed successfully.")

def main():
    parser = argparse.ArgumentParser(description="Asset Bridge Regulatory Scrapy Runner")
    parser.add_argument("--spider", choices=["all", "rbi", "sebi", "epfo", "irdai"], default="all", help="Target spider to run")
    parser.add_argument("--log-level", choices=["DEBUG", "INFO", "WARNING", "ERROR"], default="INFO", help="Scrapy log level")
    args = parser.parse_args()

    run_crawlers(target=args.spider, log_level=args.log_level)

if __name__ == "__main__":
    main()
