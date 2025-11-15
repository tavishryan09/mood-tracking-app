// Offline Manager - Handles offline data storage and sync

export class OfflineManager {
  private dbName = 'mood-tracker-offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // Initialize IndexedDB
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('requests')) {
          const requestStore = db.createObjectStore('requests', {
            keyPath: 'id',
            autoIncrement: true,
          });
          requestStore.createIndex('timestamp', 'timestamp', { unique: false });
          requestStore.createIndex('url', 'url', { unique: false });
        }

        if (!db.objectStoreNames.contains('data')) {
          const dataStore = db.createObjectStore('data', { keyPath: 'key' });
          dataStore.createIndex('timestamp', 'timestamp', { unique: false });
          dataStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  // Queue a failed request for later sync
  async queueRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: string
  ): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('requests', 'readwrite');
      const store = tx.objectStore('requests');

      const request = {
        url,
        method,
        headers,
        body,
        timestamp: Date.now(),
      };

      const addRequest = store.add(request);

      addRequest.onsuccess = () => {

        resolve(addRequest.result as number);
      };

      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  // Get all queued requests
  async getQueuedRequests(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('requests', 'readonly');
      const store = tx.objectStore('requests');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }

  // Remove a queued request
  async removeQueuedRequest(id: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('requests', 'readwrite');
      const store = tx.objectStore('requests');
      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = () => {

        resolve();
      };

      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }

  // Clear all queued requests
  async clearQueue(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('requests', 'readwrite');
      const store = tx.objectStore('requests');
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {

        resolve();
      };

      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  // Store data locally
  async storeData(key: string, data: any, type: string = 'unknown'): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('data', 'readwrite');
      const store = tx.objectStore('data');

      const item = {
        key,
        data,
        type,
        timestamp: Date.now(),
      };

      const putRequest = store.put(item);

      putRequest.onsuccess = () => {

        resolve();
      };

      putRequest.onerror = () => reject(putRequest.error);
    });
  }

  // Get stored data
  async getData(key: string): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('data', 'readonly');
      const store = tx.objectStore('data');
      const getRequest = store.get(key);

      getRequest.onsuccess = () => {
        const result = getRequest.result;
        resolve(result ? result.data : null);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Get all data by type
  async getDataByType(type: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('data', 'readonly');
      const store = tx.objectStore('data');
      const index = store.index('type');
      const getRequest = index.getAll(type);

      getRequest.onsuccess = () => resolve(getRequest.result.map((item) => item.data));
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Remove stored data
  async removeData(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('data', 'readwrite');
      const store = tx.objectStore('data');
      const deleteRequest = store.delete(key);

      deleteRequest.onsuccess = () => {

        resolve();
      };

      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }

  // Trigger background sync
  async triggerSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-mood-entries');

      } catch (error) {
        console.error('[OfflineManager] Background sync registration failed:', error);
        // Fallback: manually trigger sync via message
        this.manualSync();
      }
    } else {
      // Fallback for browsers without background sync
      this.manualSync();
    }
  }

  // Manually sync queued requests
  private async manualSync(): Promise<void> {
    const requests = await this.getQueuedRequests();

    for (const request of requests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        if (response.ok) {
          await this.removeQueuedRequest(request.id);

        }
      } catch (error) {
        console.error('[OfflineManager] Failed to sync request:', request.id, error);
      }
    }
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();
