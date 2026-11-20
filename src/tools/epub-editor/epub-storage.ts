// IndexedDB Storage Helper for EPUB Editor
const DB_NAME = 'epub_editor_db';
const DB_VERSION = 2;

const STORE_HISTORY = 'history_blobs';
const STORE_CUSTOM_FONT = 'custom_font';
const STORE_BUILT_IN_FONTS = 'built_in_fonts';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY);
      }
      if (!db.objectStoreNames.contains(STORE_CUSTOM_FONT)) {
        db.createObjectStore(STORE_CUSTOM_FONT);
      }
      if (!db.objectStoreNames.contains(STORE_BUILT_IN_FONTS)) {
        db.createObjectStore(STORE_BUILT_IN_FONTS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

async function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore, resolve: (val: T) => void, reject: (err: unknown) => void) => void,
): Promise<T> {
  const db = await openDB();
  try {
    return await new Promise<T>((resolve, reject) => {
      let settled = false;
      const finishResolve = (val: T) => {
        if (!settled) {
          settled = true;
          resolve(val);
        }
      };
      const finishReject = (err: unknown) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      };

      const tx = db.transaction(storeName, mode);
      tx.onabort = () => finishReject(tx.error || new Error('IndexedDB transaction aborted'));
      tx.onerror = () => finishReject(tx.error || new Error('IndexedDB transaction failed'));
      const store = tx.objectStore(storeName);
      executor(store, finishResolve, finishReject);
    });
  }
  finally {
    db.close();
  }
}

// Save Processed EPUB Blob for History Download; returns false if quota exceeded or storage failed.
export async function saveHistoryBlob(id: string, blob: Blob): Promise<boolean> {
  try {
    await runTransaction<void>(STORE_HISTORY, 'readwrite', (store, resolve, reject) => {
      const req = store.put(blob, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  }
  catch (err) {
    console.warn('Failed to save history blob to IndexedDB:', err);
    return false;
  }
}

// Retrieve Processed EPUB Blob by History ID
export async function getHistoryBlob(id: string): Promise<Blob | null> {
  try {
    return await runTransaction<Blob | null>(STORE_HISTORY, 'readonly', (store, resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  catch (err) {
    console.warn('Failed to retrieve history blob:', err);
    return null;
  }
}

// Delete Single History Blob
export async function deleteHistoryBlob(id: string): Promise<void> {
  try {
    await runTransaction<void>(STORE_HISTORY, 'readwrite', (store, resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  catch (err) {
    console.warn('Failed to delete history blob:', err);
  }
}

// Clear All History Blobs
export async function clearAllHistoryBlobs(): Promise<void> {
  try {
    await runTransaction<void>(STORE_HISTORY, 'readwrite', (store, resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  catch (err) {
    console.warn('Failed to clear history blobs:', err);
  }
}

// Save Custom Font File
export async function saveCustomFont(file: File): Promise<boolean> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const fontData = {
      name: file.name,
      type: file.type,
      buffer: arrayBuffer,
    };
    await runTransaction<void>(STORE_CUSTOM_FONT, 'readwrite', (store, resolve, reject) => {
      const req = store.put(fontData, 'active_custom_font');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  }
  catch (err) {
    console.warn('Failed to save custom font to IndexedDB:', err);
    return false;
  }
}

// Load Saved Custom Font File
export async function loadCustomFont(): Promise<File | null> {
  try {
    return await runTransaction<File | null>(STORE_CUSTOM_FONT, 'readonly', (store, resolve, reject) => {
      const request = store.get('active_custom_font');
      request.onsuccess = () => {
        const data = request.result;
        if (!data || !data.buffer) {
          resolve(null);
          return;
        }
        resolve(new File([data.buffer], data.name, { type: data.type }));
      };
      request.onerror = () => reject(request.error);
    });
  }
  catch (err) {
    console.warn('Failed to load custom font from IndexedDB:', err);
    return null;
  }
}

// Clear Saved Custom Font
export async function clearCustomFont(): Promise<void> {
  try {
    await runTransaction<void>(STORE_CUSTOM_FONT, 'readwrite', (store, resolve, reject) => {
      const req = store.delete('active_custom_font');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  catch (err) {
    console.warn('Failed to clear custom font:', err);
  }
}

// Cache Built-in Font ArrayBuffer in IndexedDB for instant offline reuse
export async function saveCachedBuiltInFont(fontId: string, buffer: ArrayBuffer): Promise<void> {
  try {
    await runTransaction<void>(STORE_BUILT_IN_FONTS, 'readwrite', (store, resolve, reject) => {
      const req = store.put(buffer, fontId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  catch (err) {
    console.warn('Failed to cache built-in font in IndexedDB:', err);
  }
}

export async function loadCachedBuiltInFont(fontId: string): Promise<ArrayBuffer | null> {
  try {
    return await runTransaction<ArrayBuffer | null>(STORE_BUILT_IN_FONTS, 'readonly', (store, resolve, reject) => {
      const request = store.get(fontId);
      request.onsuccess = () => resolve(request.result instanceof ArrayBuffer
        ? request.result
        : null);
      request.onerror = () => reject(request.error);
    });
  }
  catch (err) {
    console.warn('Failed to load cached built-in font from IndexedDB:', err);
    return null;
  }
}
