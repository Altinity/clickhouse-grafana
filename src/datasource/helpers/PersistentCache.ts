export class SimpleCache {
  // The key under which the cache is stored in sessionStorage
  private storageKey: string = "simpleCache";

  // In-memory cache
  private cache: { [key: string]: any } = {};

  constructor() {
    this.loadCache();
  }

  /**
   * Retrieves the cached value for a given key-object pair.
   * @param key The string key.
   * @param obj The object to namespace the key.
   * @returns The cached value if found; otherwise, null.
   */
  public get(key: string, obj: object): any | null {
    const compositeKey = this.createCompositeKey(key, obj);
    if (compositeKey in this.cache) {
      return this.cache[compositeKey];
    }
    return null;
  }

  /**
   * Stores a value in the cache for a given key-object pair.
   * @param key The string key.
   * @param obj The object to namespace the key.
   * @param value The value to cache.
   */
  public set(key: string, obj: object, value: any): void {
    const compositeKey = this.createCompositeKey(key, obj);
    this.cache[compositeKey] = value;
    this.saveCache();
  }

  /**
   * Clears the entire cache both in-memory and in sessionStorage.
   */
  public clear(): void {
    this.cache = {};
    sessionStorage.removeItem(this.storageKey);
  }

  /**
   * Creates a composite key by combining the key and a stable string representation of the object.
   * @param key The string key.
   * @param obj The object to namespace the key.
   * @returns The composite key as a string.
   */
  private createCompositeKey(key: string, obj: object): string {
    const serializedObj = this.stableStringify(obj);
    return `${key}|${serializedObj}`;
  }

  /**
   * Loads the cache from sessionStorage into the in-memory cache.
   */
  private loadCache(): void {
    const storedCache = sessionStorage.getItem(this.storageKey);
    if (storedCache) {
      try {
        this.cache = JSON.parse(storedCache);
      } catch (error) {
        console.error("Failed to parse cache from sessionStorage:", error);
        this.cache = {};
      }
    }
  }

  /**
   * Saves the in-memory cache to sessionStorage.
   */
  private saveCache(): void {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(this.cache));
    } catch (error) {
      console.error("Failed to save cache to sessionStorage:", error);
    }
  }

  /**
   * Serializes an object into a JSON string with sorted keys to ensure consistency.
   * @param obj The object to serialize.
   * @returns A JSON string with sorted keys.
   */
  private stableStringify(obj: any): string {
    if (obj !== null && typeof obj === "object") {
      if (Array.isArray(obj)) {
        return `[${obj.map((item) => this.stableStringify(item)).join(",")}]`;
      } else {
        const keys = Object.keys(obj).sort();
        return `{${keys.map((key) => `"${key}":${this.stableStringify(obj[key])}`).join(",")}}`;
      }
    } else if (typeof obj === "string") {
      return `"${obj}"`;
    } else {
      return String(obj);
    }
  }
}
