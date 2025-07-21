interface CleanupStats {
  totalKeys: number;
  expiredKeys: number;
  removedKeys: number;
  totalSize: number;
}

interface StorageRecord {
  key: string;
  data: any;
  expiry: number;
  timestamp: number;
  prefix: string;
}

export class IndexedDBManager {
  private static readonly DB_NAME = 'altinity-clickhouse-grafana';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'storage';
  private static readonly ALTINITY_PREFIX = 'altinity_';
  private static readonly DATA_STORAGE_PREFIX = 'dataStorage_';
  private static readonly MAX_QUERY_STATES_PER_DATASOURCE = 50;
  
  private static dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  private static async initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
          
          // Create indexes for efficient querying
          store.createIndex('expiry', 'expiry', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('prefix', 'prefix', { unique: false });
        }
      };
    });

    return await this.dbPromise;
  }


  /**
   * Extract prefix from key for indexing
   */
  private static getPrefix(key: string): string {
    if (key.startsWith(this.ALTINITY_PREFIX)) {
      return this.ALTINITY_PREFIX;
    }
    if (key.startsWith(this.DATA_STORAGE_PREFIX)) {
      return this.DATA_STORAGE_PREFIX;
    }
    return '';
  }

  /**
   * Get an item from IndexedDB with automatic expiry checking
   */
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.get(key);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const record: StorageRecord | undefined = request.result;
          
          if (!record) {
            resolve(null);
            return;
          }

          const now = Date.now();
          
          // Check if item has expired
          if (record.expiry && now > record.expiry) {
            // Remove expired item asynchronously
            this.removeItem(key).catch(console.error);
            resolve(null);
            return;
          }

          resolve(record.data);
        };
        
        request.onerror = () => {
          console.error(`Failed to get item ${key}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  /**
   * Set an item in IndexedDB with optional TTL
   */
  static async setItem<T>(key: string, data: T, ttlMinutes?: number): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      const now = Date.now();
      const record: StorageRecord = {
        key,
        data,
        timestamp: now,
        expiry: ttlMinutes ? now + ttlMinutes * 60 * 1000 : 0,
        prefix: this.getPrefix(key),
      };

      const request = store.put(record);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error(`Failed to set item ${key}:`, request.error);
          
          // Handle quota exceeded error
          if (request.error?.name === 'QuotaExceededError') {
            this.performEmergencyCleanup().then(() => {
              // Retry once after cleanup
              this.setItem(key, data, ttlMinutes).then(resolve).catch(reject);
            }).catch(reject);
          } else {
            reject(request.error);
          }
        };
      });
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove an item from IndexedDB
   */
  static async removeItem(key: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.delete(key);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error(`Failed to remove item ${key}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
    }
  }

  /**
   * Clean up expired entries with a specific prefix
   */
  static async cleanupExpiredByPrefix(prefix: string): Promise<CleanupStats> {
    const stats: CleanupStats = {
      totalKeys: 0,
      expiredKeys: 0,
      removedKeys: 0,
      totalSize: 0,
    };

    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('prefix');
      
      const request = index.openCursor(IDBKeyRange.only(prefix));
      const now = Date.now();
      const keysToRemove: string[] = [];

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            const record: StorageRecord = cursor.value;
            stats.totalKeys++;
            
            // Estimate size (key + JSON data)
            stats.totalSize += record.key.length + JSON.stringify(record.data).length;
            
            // Check if expired
            if (record.expiry && now > record.expiry) {
              keysToRemove.push(record.key);
              stats.expiredKeys++;
            }
            
            cursor.continue();
          } else {
            // Remove expired keys
            const deletePromises = keysToRemove.map(key => {
              const deleteRequest = store.delete(key);
              return new Promise<void>((resolveDelete, rejectDelete) => {
                deleteRequest.onsuccess = () => {
                  stats.removedKeys++;
                  resolveDelete();
                };
                deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
              });
            });

            Promise.all(deletePromises).then(() => resolve(stats)).catch(reject);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Failed to cleanup expired by prefix ${prefix}:`, error);
      return stats;
    }
  }

  /**
   * Clean up all expired Altinity-related entries
   */
  static async cleanupAllExpired(): Promise<CleanupStats> {
    const altinityStats = await this.cleanupExpiredByPrefix(this.ALTINITY_PREFIX);
    const dataStorageStats = await this.cleanupExpiredByPrefix(this.DATA_STORAGE_PREFIX);

    return {
      totalKeys: altinityStats.totalKeys + dataStorageStats.totalKeys,
      expiredKeys: altinityStats.expiredKeys + dataStorageStats.expiredKeys,
      removedKeys: altinityStats.removedKeys + dataStorageStats.removedKeys,
      totalSize: altinityStats.totalSize + dataStorageStats.totalSize,
    };
  }

  /**
   * Clean up orphaned datasource entries
   */
  static async cleanupOrphanedDatasources(activeDatasourceUids: string[]): Promise<number> {
    const uidSet = new Set(activeDatasourceUids);
    let removedCount = 0;

    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('prefix');
      
      const request = index.openCursor(IDBKeyRange.only(this.ALTINITY_PREFIX));

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            const record: StorageRecord = cursor.value;
            
            // Check if it's an Altinity datasource key
            const uidMatch = record.key.match(/altinity_(?:autocomplete|systemDatabases)_(.+)/);
            if (uidMatch && !uidSet.has(uidMatch[1])) {
              const deleteRequest = store.delete(record.key);
              deleteRequest.onsuccess = () => removedCount++;
            }
            
            cursor.continue();
          } else {
            resolve(removedCount);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to cleanup orphaned datasources:', error);
      return 0;
    }
  }

  /**
   * Limit query states per datasource to prevent unbounded growth
   */
  static async limitQueryStatesPerDatasource(datasourceUid: string, maxStates: number = this.MAX_QUERY_STATES_PER_DATASOURCE): Promise<number> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('prefix');
      
      const request = index.openCursor(IDBKeyRange.only(this.DATA_STORAGE_PREFIX));
      const queryStates: Array<{ key: string; timestamp: number }> = [];

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            const record: StorageRecord = cursor.value;
            
            // Check if this query state belongs to the specified datasource
            if (record.key.includes(datasourceUid)) {
              queryStates.push({
                key: record.key,
                timestamp: record.timestamp || 0,
              });
            }
            
            cursor.continue();
          } else {
            // If we're within limit, nothing to do
            if (queryStates.length <= maxStates) {
              resolve(0);
              return;
            }

            // Sort by timestamp (oldest first)
            queryStates.sort((a, b) => a.timestamp - b.timestamp);

            // Remove oldest entries
            const toRemove = queryStates.length - maxStates;
            const removePromises = queryStates.slice(0, toRemove).map(state => {
              const deleteRequest = store.delete(state.key);
              return new Promise<void>((resolveDelete, rejectDelete) => {
                deleteRequest.onsuccess = () => resolveDelete();
                deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
              });
            });

            Promise.all(removePromises).then(() => resolve(toRemove)).catch(reject);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to limit query states:', error);
      return 0;
    }
  }

  /**
   * Emergency cleanup when quota is exceeded
   */
  static async performEmergencyCleanup(): Promise<void> {
    console.warn('Performing emergency IndexedDB cleanup due to quota exceeded');
    
    try {
      // First, try to remove all expired entries
      await this.cleanupAllExpired();

      // If still not enough space, remove oldest 25% of entries
      const db = await this.initDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('timestamp');
      
      const request = index.openCursor();
      const allRecords: Array<{ key: string; timestamp: number }> = [];

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            const record: StorageRecord = cursor.value;
            
            // Only consider Altinity-related entries
            if (record.prefix === this.ALTINITY_PREFIX || record.prefix === this.DATA_STORAGE_PREFIX) {
              allRecords.push({
                key: record.key,
                timestamp: record.timestamp || 0,
              });
            }
            
            cursor.continue();
          } else {
            // Remove oldest 25% of entries
            const removeCount = Math.floor(allRecords.length * 0.25);
            const removePromises = allRecords.slice(0, removeCount).map(record => {
              const deleteRequest = store.delete(record.key);
              return new Promise<void>((resolveDelete, rejectDelete) => {
                deleteRequest.onsuccess = () => resolveDelete();
                deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
              });
            });

            Promise.all(removePromises).then(() => resolve()).catch(reject);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    totalKeys: number;
    altinityKeys: number;
    dataStorageKeys: number;
    estimatedSize: number;
  }> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.openCursor();
      let totalKeys = 0;
      let altinityKeys = 0;
      let dataStorageKeys = 0;
      let estimatedSize = 0;

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            const record: StorageRecord = cursor.value;
            totalKeys++;
            
            if (record.prefix === this.ALTINITY_PREFIX) {
              altinityKeys++;
            } else if (record.prefix === this.DATA_STORAGE_PREFIX) {
              dataStorageKeys++;
            }

            // Estimate size: key + JSON data
            estimatedSize += record.key.length + JSON.stringify(record.data).length;
            
            cursor.continue();
          } else {
            resolve({
              totalKeys,
              altinityKeys,
              dataStorageKeys,
              estimatedSize: estimatedSize * 2, // UTF-16 estimation
            });
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalKeys: 0,
        altinityKeys: 0,
        dataStorageKeys: 0,
        estimatedSize: 0,
      };
    }
  }

  /**
   * Clear all Altinity-related entries (use with caution)
   */
  static async clearAllAltinityData(): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.openCursor();

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            const record: StorageRecord = cursor.value;
            
            if (record.prefix === this.ALTINITY_PREFIX || record.prefix === this.DATA_STORAGE_PREFIX) {
              cursor.delete();
            }
            
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to clear all Altinity data:', error);
    }
  }
}
