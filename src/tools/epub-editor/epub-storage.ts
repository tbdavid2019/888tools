// IndexedDB Storage Helper for EPUB Editor
const DB_NAME = 'hr_epub_editor_db';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('history_blobs')) {
        db.createObjectStore('history_blobs');
      }
      if (!db.objectStoreNames.contains('custom_font')) {
        db.createObjectStore('custom_font');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save Processed EPUB Blob for History Download
export async function saveHistoryBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('history_blobs', 'readwrite');
    tx.objectStore('history_blobs').put(blob, id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save history blob to IndexedDB:', err);
  }
}

// Retrieve Processed EPUB Blob by History ID
export async function getHistoryBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('history_blobs', 'readonly');
    const request = tx.objectStore('history_blobs').get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve history blob:', err);
    return null;
  }
}

// Delete Single History Blob
export async function deleteHistoryBlob(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('history_blobs', 'readwrite');
    tx.objectStore('history_blobs').delete(id);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to delete history blob:', err);
  }
}

// Clear All History Blobs
export async function clearAllHistoryBlobs(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('history_blobs', 'readwrite');
    tx.objectStore('history_blobs').clear();
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to clear history blobs:', err);
  }
}

// Save Custom Font File
export async function saveCustomFont(file: File): Promise<void> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const fontData = {
      name: file.name,
      type: file.type,
      buffer: arrayBuffer,
    };
    const db = await openDB();
    const tx = db.transaction('custom_font', 'readwrite');
    tx.objectStore('custom_font').put(fontData, 'active_custom_font');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save custom font to IndexedDB:', err);
  }
}

// Load Saved Custom Font File
export async function loadCustomFont(): Promise<File | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('custom_font', 'readonly');
    const request = tx.objectStore('custom_font').get('active_custom_font');
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const data = request.result;
        if (!data || !data.buffer) return resolve(null);
        const file = new File([data.buffer], data.name, { type: data.type });
        resolve(file);
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to load custom font from IndexedDB:', err);
    return null;
  }
}

// Clear Saved Custom Font
export async function clearCustomFont(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('custom_font', 'readwrite');
    tx.objectStore('custom_font').delete('active_custom_font');
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to clear custom font:', err);
  }
}
