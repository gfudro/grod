/**
 * IndexedDB storage for saves. One record is the current game; when a
 * game is replaced (new game, import, a save that can't be loaded) the
 * old record is moved to an "archive-…" key instead of being deleted —
 * a player's save never disappears silently.
 */

const DB_NAME = 'grod';
const STORE = 'saves';
const CURRENT_KEY = 'current';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(request.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export function readCurrentSave(): Promise<unknown> {
  return run('readonly', (store) => store.get(CURRENT_KEY));
}

export async function writeCurrentSave(save: unknown): Promise<void> {
  await run('readwrite', (store) => store.put(save, CURRENT_KEY));
}

/** Moves the current save (if any) to an archive key, leaving no current game. */
export async function archiveCurrentSave(): Promise<void> {
  const current = await readCurrentSave();
  if (current === undefined) return;
  await run('readwrite', (store) => store.put(current, `archive-${new Date().toISOString()}`));
  await run('readwrite', (store) => store.delete(CURRENT_KEY));
}

/** Asks the browser not to evict our data under storage pressure (Safari). */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Not supported or refused — saves still work, just less protected.
  }
}
