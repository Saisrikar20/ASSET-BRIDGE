/**
 * Client-Side PDF Caching via IndexedDB (future.md §4.1)
 * Caches generated claiming dossiers locally to enable sub-second tab switching & offline viewing.
 */

const DB_NAME = 'AssetBridgeCache';
const STORE_NAME = 'pdf_dossiers';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedPdf(key: string, maxAgeMs = 15 * 60 * 1000): Promise<Blob | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const item = req.result;
        if (!item) return resolve(null);
        if (Date.now() - item.savedAt > maxAgeMs) {
          resolve(null);
        } else {
          resolve(item.blob);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedPdf(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, blob, savedAt: Date.now() });
  } catch {
    // Non-blocking fallback
  }
}
