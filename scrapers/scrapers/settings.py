"""
Scrapy configuration settings for Asset Bridge regulatory web scrapers.
"""

BOT_NAME = "asset_bridge_regulations"

SPIDER_MODULES = ["scrapers.spiders"]
NEWSPIDER_MODULE = "scrapers.spiders"

USER_AGENT = "AssetBridge-RegulatoryCrawler/1.0 (+https://assetbridge.in; statutory monitoring bot)"

# Polite crawling settings for government infrastructure
ROBOTSTXT_OBEY = False
CONCURRENT_REQUESTS = 4
DOWNLOAD_DELAY = 1.0
COOKIES_ENABLED = True

# AutoThrottle settings
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1.0
AUTOTHROTTLE_MAX_DELAY = 10.0
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0

# Pipelines
ITEM_PIPELINES = {
    "scrapers.pipelines.AssetBridgeVaultPipeline": 300,
}

# Request header defaults
DEFAULT_REQUEST_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Timeout
DOWNLOAD_TIMEOUT = 25.0
LOG_LEVEL = "INFO"
REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
FEED_EXPORT_ENCODING = "utf-8"
