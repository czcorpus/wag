/*
 * Copyright 2026 Institute of the Czech National Corpus,
 *                Faculty of Arts, Charles University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { TileRequest } from './streaming.js';
import {
    DummySessionStorage,
    ISimpleSessionStorage,
} from '../sessionStorage.js';

/**
 * A storage the cache works with (window.sessionStorage or
 * DummySessionStorage). The cache never calls clear() on it
 * as the storage may be shared with other parts of the application.
 */
export type DataStreamingCacheStorage = Pick<
    ISimpleSessionStorage,
    'getItem' | 'setItem' | 'removeItem'
>;

/**
 * Simple non-cryptographic 53-bit string hash (cyrb53)
 */
function hashKey(str: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

interface StoredCacheEntry {
    key: string;
    events: Array<unknown>;
}

/**
 * DataStreamingCache stores raw (undecoded) server events of successfully
 * finished tile requests so repeated identical requests within a single
 * session (e.g. after switching query matches) do not have to be
 * resolved by the server again. Raw data are stored (and decoded on each
 * replay) so tiles never share mutable response objects.
 *
 * All the data live in the provided storage (typically window.sessionStorage
 * so they survive page navigation within a browser tab):
 *
 * - each entry is stored under STORAGE_PREFIX + hash of the request key
 *   (the full key is stored within the entry to detect hash collisions)
 * - STORAGE_INDEX_KEY contains a list of entry hashes ordered from the least
 *   recently used to the most recently used one (LRU)
 *
 * The number of entries is limited by maxEntries. If the storage quota
 * is exceeded, the least recently used entries are removed. All the storage
 * operations are best-effort - a failure never breaks data loading, it just
 * means the response will not be cached.
 */
export class DataStreamingCache {
    static readonly STORAGE_PREFIX = 'wag.dataStreamingCache.';

    static readonly STORAGE_INDEX_KEY = `${DataStreamingCache.STORAGE_PREFIX}index`;

    private readonly maxEntries: number;

    private readonly storage: DataStreamingCacheStorage;

    constructor(
        maxEntries = 100,
        storage: DataStreamingCacheStorage = new DummySessionStorage()
    ) {
        this.maxEntries = maxEntries;
        this.storage = storage;
    }

    /**
     * Create a cache backed by window.sessionStorage (if available,
     * otherwise an in-memory storage is used). The data live until
     * the browser tab is closed. As a browser does not allow distinguishing
     * a hard reload from a regular one, any page reload clears the cache.
     */
    static createSessionCache(maxEntries = 100): DataStreamingCache {
        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                const cache = new DataStreamingCache(
                    maxEntries,
                    window.sessionStorage
                );
                const nav = window.performance?.getEntriesByType?.(
                    'navigation'
                )[0] as PerformanceNavigationTiming | undefined;
                if (nav?.type === 'reload') {
                    cache.clear();
                }
                return cache;
            }
        } catch (e) {
            // e.g. storage access denied by browser privacy settings
        }
        return new DataStreamingCache(maxEntries);
    }

    static isCacheable(req: TileRequest): boolean {
        return !!req.url;
    }

    private mkKey(req: TileRequest): string {
        return JSON.stringify([
            req.method,
            req.url,
            req.body,
            req.contentType,
            !!req.base64EncodeResult,
            !!req.isEventSource,
        ]);
    }

    private entryKey(hash: string): string {
        return DataStreamingCache.STORAGE_PREFIX + hash;
    }

    private readIndex(): Array<string> {
        try {
            const idx = JSON.parse(
                this.storage.getItem(DataStreamingCache.STORAGE_INDEX_KEY) ||
                    '[]'
            );
            return Array.isArray(idx) ? idx : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Remove the least recently used entry from both the storage
     * and the provided index. Returns false if there is nothing to remove.
     */
    private evictOldest(idx: Array<string>): boolean {
        const oldest = idx.shift();
        if (oldest === undefined) {
            return false;
        }
        this.storage.removeItem(this.entryKey(oldest));
        return true;
    }

    /**
     * Store a value. In case the storage quota is exceeded, the least recently
     * used entries from idx are removed until the value fits. The function
     * may therefore modify idx.
     */
    private setWithEviction(
        key: string,
        mkValue: () => string,
        idx: Array<string>
    ): boolean {
        while (true) {
            try {
                this.storage.setItem(key, mkValue());
                return true;
            } catch (e) {
                if (!this.evictOldest(idx)) {
                    return false;
                }
            }
        }
    }

    private writeIndex(idx: Array<string>): void {
        if (
            !this.setWithEviction(
                DataStreamingCache.STORAGE_INDEX_KEY,
                () => JSON.stringify(idx),
                idx
            )
        ) {
            console.warn('Failed to write data streaming cache index');
        }
    }

    get(req: TileRequest): Array<unknown> | undefined {
        if (!DataStreamingCache.isCacheable(req)) {
            return undefined;
        }
        const key = this.mkKey(req);
        const hash = hashKey(key);
        try {
            const raw = this.storage.getItem(this.entryKey(hash));
            if (!raw) {
                return undefined;
            }
            const entry = JSON.parse(raw) as StoredCacheEntry;
            if (entry.key !== key) {
                return undefined; // hash collision
            }
            // refresh LRU position
            const idx = this.readIndex().filter((h) => h !== hash);
            idx.push(hash);
            this.writeIndex(idx);
            return entry.events;
        } catch (e) {
            console.warn('Failed to read data streaming cache: ', e);
            return undefined;
        }
    }

    set(req: TileRequest, events: Array<unknown>): void {
        if (!DataStreamingCache.isCacheable(req) || events.length === 0) {
            return;
        }
        const key = this.mkKey(req);
        const hash = hashKey(key);
        try {
            const idx = this.readIndex().filter((h) => h !== hash);
            while (idx.length >= this.maxEntries) {
                this.evictOldest(idx);
            }
            const value = JSON.stringify({ key, events } as StoredCacheEntry);
            if (this.setWithEviction(this.entryKey(hash), () => value, idx)) {
                idx.push(hash);
            } else {
                // the entry does not fit even into an empty storage;
                // make sure no older version of it stays there
                this.storage.removeItem(this.entryKey(hash));
            }
            this.writeIndex(idx);
        } catch (e) {
            console.warn('Failed to store data streaming cache: ', e);
        }
    }

    clear(): void {
        try {
            this.readIndex().forEach((h) =>
                this.storage.removeItem(this.entryKey(h))
            );
            this.storage.removeItem(DataStreamingCache.STORAGE_INDEX_KEY);
        } catch (e) {
            console.warn('Failed to clear data streaming cache: ', e);
        }
    }

    size(): number {
        return this.readIndex().length;
    }
}
