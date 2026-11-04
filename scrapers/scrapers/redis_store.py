"""
Redis Storage Engine for Scrapy Circulars.
Provides in-memory caching, URL set deduplication, stream queuing,
and fallback failover to SQLite Document Vault and local JSONL.
"""

import os
import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("scrapers.redis_store")

try:
    import redis
    HAS_REDIS_LIB = True
except ImportError:
    HAS_REDIS_LIB = False
    redis = None

class RedisRegulationStore:
    """
    Manages statutory regulation caching and distributed crawl queues in Redis.
    If Redis server is offline or REDIS_ENABLED is false, operates in standby mode.
    """

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.enabled = os.getenv("REDIS_ENABLED", "false").lower() in ("true", "1", "yes")
        self.client = None
        self._connected = False

        if self.enabled and HAS_REDIS_LIB:
            try:
                self.client = redis.Redis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                    socket_timeout=3.0
                )
                self.client.ping()
                self._connected = True
                logger.info(f"Connected to Redis store at {self.redis_url}")
            except Exception as e:
                self._connected = False
                logger.info(f"Redis not reachable at {self.redis_url} ({e}); falling back to SQLite Document Vault")
        else:
            if not self.enabled:
                logger.info("Redis store disabled (REDIS_ENABLED=false); using SQLite Document Vault")
            elif not HAS_REDIS_LIB:
                logger.warning("Redis package not installed; using SQLite Document Vault")

    def is_connected(self) -> bool:
        """Check if Redis connection is active and responsive."""
        if not self._connected or not self.client:
            return False
        try:
            return bool(self.client.ping())
        except Exception:
            self._connected = False
            return False

    def is_seen(self, source_url: str) -> bool:
        """Check if URL was already processed using Redis Set."""
        if not self.is_connected():
            return False
        try:
            return bool(self.client.sismember("assetbridge:regulations:seen_urls", source_url))
        except Exception as e:
            logger.warning(f"Redis is_seen error: {e}")
            return False

    def mark_seen(self, source_url: str):
        """Add URL to Redis deduplication set."""
        if not self.is_connected():
            return
        try:
            self.client.sadd("assetbridge:regulations:seen_urls", source_url)
        except Exception as e:
            logger.warning(f"Redis mark_seen error: {e}")

    def store_regulation(self, reg_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Store regulation in Redis:
        1. Hash: assetbridge:regulation:{sha256}
        2. Sorted Set (by timestamp): assetbridge:regulations:timeline
        3. List queue: assetbridge:regulations:queue
        """
        if not self.is_connected():
            return {"stored_in_redis": False, "reason": "Redis offline or disabled"}

        sha256 = reg_data.get("sha256") or reg_data.get("circular_no") or reg_data.get("source_url")
        key = f"assetbridge:regulation:{sha256}"
        try:
            serialized = {k: ("" if v is None else str(v)) for k, v in reg_data.items()}
            self.client.hset(key, mapping=serialized)
            self.mark_seen(reg_data.get("source_url", ""))
            self.client.lpush("assetbridge:regulations:queue", json.dumps(reg_data))
            # Keep queue trimmed to 1000 items
            self.client.ltrim("assetbridge:regulations:queue", 0, 999)
            return {"stored_in_redis": True, "key": key}
        except Exception as e:
            logger.warning(f"Failed to store regulation in Redis: {e}")
            return {"stored_in_redis": False, "error": str(e)}

    def get_regulation(self, sha256: str) -> Optional[Dict[str, str]]:
        """Retrieve stored regulation hash by SHA-256."""
        if not self.is_connected():
            return None
        try:
            data = self.client.hgetall(f"assetbridge:regulation:{sha256}")
            return data if data else None
        except Exception:
            return None

    def list_recent_regulations(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Fetch latest crawled regulations from Redis queue."""
        if not self.is_connected():
            return []
        try:
            items = self.client.lrange("assetbridge:regulations:queue", 0, limit - 1)
            results = []
            for item_str in items:
                try:
                    results.append(json.loads(item_str))
                except Exception:
                    pass
            return results
        except Exception:
            return []

# Singleton instance
redis_store = RedisRegulationStore()
