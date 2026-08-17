import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { IndexedDBManager } from './indexedDBManager';

// jsdom in this Jest setup has no structuredClone, which fake-indexeddb requires.
// JSON cloning is sufficient for the plain values these tests store.
(globalThis as any).structuredClone ??= (v: any) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

const HOUR = 60 * 60 * 1000;

// Write a record whose timestamp/expiry are computed from a spied Date.now (real timers:
// fake timers would stall the IDB microtask machinery).
const setItemAt = async (ts: number, key: string, data: any, ttlMinutes?: number) => {
  const spy = jest.spyOn(Date, 'now').mockReturnValue(ts);
  try {
    await IndexedDBManager.setItem(key, data, ttlMinutes);
  } finally {
    spy.mockRestore();
  }
};

const waitUntil = async (cond: () => Promise<boolean>) => {
  for (let i = 0; i < 50; i++) {
    if (await cond()) {
      return;
    }
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error('condition not reached');
};

beforeEach(() => {
  (IndexedDBManager as any).dbPromise = null;
  (globalThis as any).indexedDB = new IDBFactory();
  (globalThis as any).IDBKeyRange = IDBKeyRange;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getItem / setItem', () => {
  it('round-trips data without TTL (expiry 0 is always returned)', async () => {
    await IndexedDBManager.setItem('altinity_k', { a: 1 });
    expect(await IndexedDBManager.getItem('altinity_k')).toEqual({ a: 1 });
  });

  it('round-trips data with a live TTL', async () => {
    await IndexedDBManager.setItem('altinity_k', 'v', 10);
    expect(await IndexedDBManager.getItem('altinity_k')).toBe('v');
  });

  it('returns null for a missing key', async () => {
    expect(await IndexedDBManager.getItem('nope')).toBeNull();
  });

  it('returns null for an expired record and deletes it', async () => {
    await setItemAt(Date.now() - HOUR, 'altinity_old', 'v', 1);
    expect(await IndexedDBManager.getItem('altinity_old')).toBeNull();
    // deletion is fire-and-forget inside getItem
    await waitUntil(async () => (await IndexedDBManager.getStorageStats()).totalKeys === 0);
  });
});

describe('prefix classification (via getStorageStats)', () => {
  it('classifies altinity_, dataStorage_ and other keys', async () => {
    await IndexedDBManager.setItem('altinity_x', 1);
    await IndexedDBManager.setItem('dataStorage_x', 2);
    await IndexedDBManager.setItem('other_x', 3);
    const stats = await IndexedDBManager.getStorageStats();
    expect(stats).toMatchObject({ totalKeys: 3, altinityKeys: 1, dataStorageKeys: 1 });
  });
});

describe('removeItem', () => {
  it('removes an existing key and tolerates a non-existent one', async () => {
    await IndexedDBManager.setItem('altinity_k', 'v');
    await IndexedDBManager.removeItem('altinity_k');
    expect(await IndexedDBManager.getItem('altinity_k')).toBeNull();
    await expect(IndexedDBManager.removeItem('missing')).resolves.toBeUndefined();
  });
});

describe('cleanupExpiredByPrefix', () => {
  it('removes only expired records under the given prefix', async () => {
    const past = Date.now() - HOUR;
    await setItemAt(past, 'altinity_expired', 'x', 1);
    await IndexedDBManager.setItem('altinity_live', 'y', 10);
    await setItemAt(past, 'dataStorage_expired', 'z', 1);

    const stats = await IndexedDBManager.cleanupExpiredByPrefix('altinity_');
    expect(stats).toEqual({ totalKeys: 2, expiredKeys: 1, removedKeys: 1, totalSize: expect.any(Number) });
    expect(stats.totalSize).toBeGreaterThan(0);
    // other prefix untouched
    expect((await IndexedDBManager.getStorageStats()).totalKeys).toBe(2);
  });

  it('returns zeros on an empty store', async () => {
    expect(await IndexedDBManager.cleanupExpiredByPrefix('altinity_')).toEqual({
      totalKeys: 0,
      expiredKeys: 0,
      removedKeys: 0,
      totalSize: 0,
    });
  });
});

describe('cleanupAllExpired', () => {
  it('sums stats over both prefixes', async () => {
    const past = Date.now() - HOUR;
    await setItemAt(past, 'altinity_expired', 'x', 1);
    await setItemAt(past, 'dataStorage_expired', 'y', 1);
    await IndexedDBManager.setItem('altinity_live', 'z');

    const stats = await IndexedDBManager.cleanupAllExpired();
    expect(stats.totalKeys).toBe(3);
    expect(stats.expiredKeys).toBe(2);
    expect(stats.removedKeys).toBe(2);
    expect((await IndexedDBManager.getStorageStats()).totalKeys).toBe(1);
  });
});

describe('cleanupOrphanedDatasources', () => {
  it('removes datasource keys whose uid is not active; permission_error keys never match an active uid', async () => {
    await IndexedDBManager.setItem('altinity_autocomplete_uid1', 'a');
    await IndexedDBManager.setItem('altinity_systemDatabases_uid2', 'b');
    await IndexedDBManager.setItem('altinity_autocomplete_permission_error_uid1', 'c');
    await IndexedDBManager.setItem('altinity_misc', 'd');

    // The regex captures 'permission_error_uid1', which is never in the uid set,
    // so permission-error caches are dropped even for active datasources.
    const removed = await IndexedDBManager.cleanupOrphanedDatasources(['uid1']);
    expect(removed).toBe(2);
    expect(await IndexedDBManager.getItem('altinity_autocomplete_uid1')).toBe('a');
    expect(await IndexedDBManager.getItem('altinity_systemDatabases_uid2')).toBeNull();
    expect(await IndexedDBManager.getItem('altinity_autocomplete_permission_error_uid1')).toBeNull();
    expect(await IndexedDBManager.getItem('altinity_misc')).toBe('d');
  });
});

describe('limitQueryStatesPerDatasource', () => {
  it('returns 0 when within the limit', async () => {
    await IndexedDBManager.setItem('dataStorage_a_uid1_A', 1);
    expect(await IndexedDBManager.limitQueryStatesPerDatasource('uid1', 3)).toBe(0);
  });

  it('removes the oldest records above the limit; other datasources not counted', async () => {
    const t0 = Date.now() - 5000;
    for (let i = 0; i < 5; i++) {
      await setItemAt(t0 + i * 1000, `dataStorage_ds_uid1_${i}`, i);
    }
    await setItemAt(t0, 'dataStorage_ds_uid2_x', 'other');

    expect(await IndexedDBManager.limitQueryStatesPerDatasource('uid1', 3)).toBe(2);
    // oldest two of uid1 removed, uid2 untouched
    expect(await IndexedDBManager.getItem('dataStorage_ds_uid1_0')).toBeNull();
    expect(await IndexedDBManager.getItem('dataStorage_ds_uid1_1')).toBeNull();
    expect(await IndexedDBManager.getItem('dataStorage_ds_uid1_2')).toBe(2);
    expect(await IndexedDBManager.getItem('dataStorage_ds_uid2_x')).toBe('other');
  });
});

describe('performEmergencyCleanup', () => {
  it('removes the oldest 25% of prefixed records; unprefixed records survive', async () => {
    const t0 = Date.now() - 5000;
    await setItemAt(t0, 'altinity_oldest', 0);
    await setItemAt(t0 + 1000, 'altinity_1', 1);
    await setItemAt(t0 + 2000, 'dataStorage_2', 2);
    await setItemAt(t0 + 3000, 'dataStorage_3', 3);
    await setItemAt(t0, 'unprefixed', 'keep');

    await IndexedDBManager.performEmergencyCleanup();
    // floor(4 * 0.25) = 1 -> only the oldest prefixed record goes
    expect(await IndexedDBManager.getItem('altinity_oldest')).toBeNull();
    expect(await IndexedDBManager.getItem('altinity_1')).toBe(1);
    expect(await IndexedDBManager.getItem('unprefixed')).toBe('keep');
    expect((await IndexedDBManager.getStorageStats()).totalKeys).toBe(4);
  });
});

describe('getStorageStats', () => {
  it('estimates size as 2 * (key length + JSON length)', async () => {
    const key = 'altinity_size';
    const data = { v: 'abc' };
    await IndexedDBManager.setItem(key, data);
    const stats = await IndexedDBManager.getStorageStats();
    expect(stats.estimatedSize).toBe(2 * (key.length + JSON.stringify(data).length));
    expect(stats.estimatedSize).toBeGreaterThan(0);
  });
});

describe('clearAllAltinityData', () => {
  it('deletes prefixed records and keeps unprefixed ones', async () => {
    await IndexedDBManager.setItem('altinity_a', 1);
    await IndexedDBManager.setItem('dataStorage_b', 2);
    await IndexedDBManager.setItem('other_c', 3);
    await IndexedDBManager.clearAllAltinityData();
    const stats = await IndexedDBManager.getStorageStats();
    expect(stats).toMatchObject({ totalKeys: 1, altinityKeys: 0, dataStorageKeys: 0 });
    expect(await IndexedDBManager.getItem('other_c')).toBe(3);
  });
});

describe('error paths when the DB cannot be opened', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const failed = Promise.reject(new Error('db unavailable'));
    failed.catch(() => {}); // avoid unhandled rejection
    (IndexedDBManager as any).dbPromise = failed;
  });

  it('getItem resolves null', async () => {
    expect(await IndexedDBManager.getItem('k')).toBeNull();
  });

  it('removeItem resolves silently', async () => {
    await expect(IndexedDBManager.removeItem('k')).resolves.toBeUndefined();
  });

  it('cleanupExpiredByPrefix returns zero stats', async () => {
    expect(await IndexedDBManager.cleanupExpiredByPrefix('altinity_')).toEqual({
      totalKeys: 0,
      expiredKeys: 0,
      removedKeys: 0,
      totalSize: 0,
    });
  });

  it('cleanupOrphanedDatasources returns 0', async () => {
    expect(await IndexedDBManager.cleanupOrphanedDatasources(['uid'])).toBe(0);
  });

  it('limitQueryStatesPerDatasource returns 0', async () => {
    expect(await IndexedDBManager.limitQueryStatesPerDatasource('uid')).toBe(0);
  });

  it('getStorageStats returns zeros', async () => {
    expect(await IndexedDBManager.getStorageStats()).toEqual({
      totalKeys: 0,
      altinityKeys: 0,
      dataStorageKeys: 0,
      estimatedSize: 0,
    });
  });

  it('clearAllAltinityData resolves silently', async () => {
    await expect(IndexedDBManager.clearAllAltinityData()).resolves.toBeUndefined();
  });

  it('setItem is the only method that rethrows', async () => {
    // performEmergencyCleanup also swallows the failure internally
    await expect(IndexedDBManager.setItem('k', 'v')).rejects.toThrow('db unavailable');
    await expect(IndexedDBManager.performEmergencyCleanup()).resolves.toBeUndefined();
  });
});
