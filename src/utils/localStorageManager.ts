interface StorageItem<T = any> {
  data: T;
  expiry: number;
  timestamp: number;
}

interface CleanupStats {
  totalKeys: number;
  expiredKeys: number;
  removedKeys: number;
  totalSize: number;
}

export class LocalStorageManager {
  private static readonly ALTINITY_PREFIX = 'altinity_';
  private static readonly DATA_STORAGE_PREFIX = 'dataStorage_';
  private static readonly MAX_QUERY_STATES_PER_DATASOURCE = 50;

  /**
   * Get an item from localStorage with automatic expiry checking
   */
  static getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) {
        return null;
      }

      const parsed: StorageItem<T> = JSON.parse(item);
      const now = Date.now();

      // Check if item has expired
      if (parsed.expiry && now > parsed.expiry) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  /**
   * Set an item in localStorage with optional TTL
   */
  static setItem<T>(key: string, data: T, ttlMinutes?: number): void {
    try {
      const now = Date.now();
      const item: StorageItem<T> = {
        data,
        timestamp: now,
        expiry: ttlMinutes ? now + ttlMinutes * 60 * 1000 : 0,
      };

      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.performEmergencyCleanup();
        // Retry once after cleanup
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (retryError) {
          console.error('Failed to set item even after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Remove an item from localStorage
   */
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
    }
  }

  /**
   * Clean up expired entries with a specific prefix
   */
  static cleanupExpiredByPrefix(prefix: string): CleanupStats {
    const stats: CleanupStats = {
      totalKeys: 0,
      expiredKeys: 0,
      removedKeys: 0,
      totalSize: 0,
    };

    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) {
        continue;
      }

      stats.totalKeys++;

      try {
        const item = localStorage.getItem(key);
        if (!item) {
        continue;
      }

        stats.totalSize += item.length;
        const parsed = JSON.parse(item);

        // Check if expired
        if (parsed.expiry && now > parsed.expiry) {
          keysToRemove.push(key);
          stats.expiredKeys++;
        }
      } catch (error) {
        // If we can't parse it, it's probably corrupted, remove it
        keysToRemove.push(key);
      }
    }

    // Remove expired keys
    keysToRemove.forEach(key => {
      this.removeItem(key);
      stats.removedKeys++;
    });

    return stats;
  }

  /**
   * Clean up all expired Altinity-related entries
   */
  static cleanupAllExpired(): CleanupStats {
    const altinityStats = this.cleanupExpiredByPrefix(this.ALTINITY_PREFIX);
    const dataStorageStats = this.cleanupExpiredByPrefix(this.DATA_STORAGE_PREFIX);

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
  static cleanupOrphanedDatasources(activeDatasourceUids: string[]): number {
    const uidSet = new Set(activeDatasourceUids);
    let removedCount = 0;

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) {
      continue;
    }

      // Check if it's an Altinity datasource key
      if (key.startsWith(this.ALTINITY_PREFIX)) {
        const uidMatch = key.match(/altinity_(?:autocomplete|systemDatabases)_(.+)/);
        if (uidMatch && !uidSet.has(uidMatch[1])) {
          this.removeItem(key);
          removedCount++;
        }
      }
    }

    return removedCount;
  }

  /**
   * Limit query states per datasource to prevent unbounded growth
   */
  static limitQueryStatesPerDatasource(datasourceUid: string, maxStates: number = this.MAX_QUERY_STATES_PER_DATASOURCE): number {
    const prefix = `${this.DATA_STORAGE_PREFIX}`;
    const queryStates: Array<{ key: string; timestamp: number }> = [];

    // Collect all query states for this datasource
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix) || !key.includes(datasourceUid)) {
        continue;
      }

      try {
        const item = localStorage.getItem(key);
        if (!item) {
        continue;
      }

        const parsed = JSON.parse(item);
        queryStates.push({
          key,
          timestamp: parsed.timestamp || 0,
        });
      } catch (error) {
        // Remove corrupted entries
        this.removeItem(key);
      }
    }

    // If we're within limit, nothing to do
    if (queryStates.length <= maxStates) {
      return 0;
    }

    // Sort by timestamp (oldest first)
    queryStates.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries
    const toRemove = queryStates.length - maxStates;
    for (let i = 0; i < toRemove; i++) {
      this.removeItem(queryStates[i].key);
    }

    return toRemove;
  }

  /**
   * Emergency cleanup when quota is exceeded
   */
  static performEmergencyCleanup(): void {
    console.warn('Performing emergency localStorage cleanup due to quota exceeded');
    
    // First, try to remove all expired entries
    this.cleanupAllExpired();

    // If still not enough space, remove oldest entries
    const allKeys: Array<{ key: string; timestamp: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || (!key.startsWith(this.ALTINITY_PREFIX) && !key.startsWith(this.DATA_STORAGE_PREFIX))) {
        continue;
      }

      try {
        const item = localStorage.getItem(key);
        if (!item) {
        continue;
      }

        const parsed = JSON.parse(item);
        allKeys.push({
          key,
          timestamp: parsed.timestamp || 0,
        });
      } catch (error) {
        // Remove corrupted entries
        this.removeItem(key);
      }
    }

    // Remove oldest 25% of entries
    allKeys.sort((a, b) => a.timestamp - b.timestamp);
    const removeCount = Math.floor(allKeys.length * 0.25);
    
    for (let i = 0; i < removeCount; i++) {
      this.removeItem(allKeys[i].key);
    }
  }

  /**
   * Get storage statistics
   */
  static getStorageStats(): {
    totalKeys: number;
    altinityKeys: number;
    dataStorageKeys: number;
    estimatedSize: number;
  } {
    let totalKeys = 0;
    let altinityKeys = 0;
    let dataStorageKeys = 0;
    let estimatedSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) {
      continue;
    }

      totalKeys++;

      if (key.startsWith(this.ALTINITY_PREFIX)) {
        altinityKeys++;
      } else if (key.startsWith(this.DATA_STORAGE_PREFIX)) {
        dataStorageKeys++;
      }

      const value = localStorage.getItem(key);
      if (value) {
        // Rough estimation: each character is 2 bytes in UTF-16
        estimatedSize += (key.length + value.length) * 2;
      }
    }

    return {
      totalKeys,
      altinityKeys,
      dataStorageKeys,
      estimatedSize,
    };
  }

  /**
   * Clear all Altinity-related entries (use with caution)
   */
  static clearAllAltinityData(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) {
      continue;
    }

      if (key.startsWith(this.ALTINITY_PREFIX) || key.startsWith(this.DATA_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => this.removeItem(key));
  }
}

