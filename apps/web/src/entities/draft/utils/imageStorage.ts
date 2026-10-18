// Файл картинки клиента для «Своего дизайна» — в IndexedDB: в sessionStorage помещается около 5 МБ строк,
// и картинка вытеснила бы оттуда черновик. Положение картинки — в storage.ts. На сервер файл не уходит.
// Ошибки глушим, как и в storage.ts: картинка просто не переживёт перезагрузку

const DB_NAME = 'brorepack';
const STORE_NAME = 'draft';
const IMAGE_KEY = 'customImage';

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB недоступна'));
  });
};

/** Один запрос в отдельной транзакции; база закрывается сразу после него */
const runRequest = async <T>(
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = createRequest(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Запрос к IndexedDB не выполнился'));
    });
  } finally {
    database.close();
  }
};

export const readDraftImage = async (): Promise<Blob | null> => {
  try {
    const value: unknown = await runRequest('readonly', (store) => store.get(IMAGE_KEY));
    return value instanceof Blob ? value : null;
  } catch {
    return null;
  }
};

export const writeDraftImage = async (blob: Blob): Promise<void> => {
  try {
    await runRequest('readwrite', (store) => store.put(blob, IMAGE_KEY));
  } catch {
    // Приватный режим или нет места — картинка останется только до перезагрузки
  }
};

export const deleteDraftImage = async (): Promise<void> => {
  try {
    await runRequest('readwrite', (store) => store.delete(IMAGE_KEY));
  } catch {
    // Нечего удалять или IndexedDB недоступна
  }
};
