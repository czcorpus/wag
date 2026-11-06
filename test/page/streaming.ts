import { expect } from 'chai';
import { HTTP } from 'cnc-tskit';

import { DataStreaming } from '../../src/js/page/streaming.js';
import { DataStreamingCache } from '../../src/js/page/streamingCache.js';

const mkReq = (url: string, body: unknown = '') => ({
    tileId: 1,
    queryIdx: 0,
    url,
    method: HTTP.Method.GET,
    body,
    contentType: 'application/json',
});

describe('DataStreaming', () => {
    it('supports interrupting the stream and cancelling subscriptions', () => {
        const streaming = new DataStreaming({
            id: null,
            tileIds: [1],
            rootUrl: null,
            tilesReadyTimeoutSecs: 1000,
            userSession: null,
            apiReporting: null,
        });

        expect(() => streaming.cancel()).to.not.throw();
    });
});

describe('DataStreamingCache', () => {
    it('returns stored events for an identical request regardless of tile', () => {
        const cache = new DataStreamingCache();
        cache.set(mkReq('http://foo/bar?q=1'), ['{"a":1}']);
        expect(
            cache.get({ ...mkReq('http://foo/bar?q=1'), tileId: 5 })
        ).to.deep.equal(['{"a":1}']);
        expect(cache.get(mkReq('http://foo/bar?q=2'))).to.be.undefined;
        expect(cache.get(mkReq('http://foo/bar?q=1', 'x'))).to.be.undefined;
    });

    it('does not cache empty requests or empty responses', () => {
        const cache = new DataStreamingCache();
        cache.set(mkReq(''), ['{}']);
        cache.set(mkReq('http://foo'), []);
        expect(cache.size()).to.equal(0);
        expect(cache.get(mkReq(''))).to.be.undefined;
    });

    it('evicts least recently used entries', () => {
        const cache = new DataStreamingCache(2);
        cache.set(mkReq('http://a'), ['a']);
        cache.set(mkReq('http://b'), ['b']);
        cache.get(mkReq('http://a'));
        cache.set(mkReq('http://c'), ['c']);
        expect(cache.size()).to.equal(2);
        expect(cache.get(mkReq('http://b'))).to.be.undefined;
        expect(cache.get(mkReq('http://a'))).to.deep.equal(['a']);
        expect(cache.get(mkReq('http://c'))).to.deep.equal(['c']);
    });
});

class MemStorage {
    data: { [k: string]: string } = {};
    quota = Infinity;
    getItem(k: string) {
        return this.data[k] ?? null;
    }
    setItem(k: string, v: string) {
        const used = Object.values(this.data).reduce((a, x) => a + x.length, 0);
        if (used - (this.data[k]?.length ?? 0) + v.length > this.quota) {
            throw new Error('QuotaExceededError');
        }
        this.data[k] = v;
    }
    removeItem(k: string) {
        delete this.data[k];
    }
}

describe('DataStreamingCache with storage', () => {
    it('restores data from storage in a new instance', () => {
        const storage = new MemStorage();
        const c1 = new DataStreamingCache(10, storage);
        c1.set(mkReq('http://a'), ['a']);
        c1.set(mkReq('http://b'), ['b']);
        const c2 = new DataStreamingCache(10, storage);
        expect(c2.size()).to.equal(2);
        expect(c2.get(mkReq('http://a'))).to.deep.equal(['a']);
    });

    it('removes evicted entries from storage', () => {
        const storage = new MemStorage();
        const c1 = new DataStreamingCache(1, storage);
        c1.set(mkReq('http://a'), ['a']);
        c1.set(mkReq('http://b'), ['b']);
        expect(Object.keys(storage.data)).to.have.length(2); // index + 1 entry
        const c2 = new DataStreamingCache(1, storage);
        expect(c2.get(mkReq('http://a'))).to.be.undefined;
        expect(c2.get(mkReq('http://b'))).to.deep.equal(['b']);
    });

    it('does not store an entry exceeding the whole quota', () => {
        const storage = new MemStorage();
        storage.quota = 200;
        const c1 = new DataStreamingCache(10, storage);
        c1.set(mkReq('http://a'), ['a']);
        c1.set(mkReq('http://b'), ['y'.repeat(500)]);
        expect(c1.get(mkReq('http://b'))).to.be.undefined;
        expect(c1.size()).to.equal(0);
    });

    it('drops oldest stored entries when quota is exceeded', () => {
        const storage = new MemStorage();
        storage.quota = 400;
        const c1 = new DataStreamingCache(10, storage);
        c1.set(mkReq('http://a'), ['x'.repeat(150)]);
        c1.set(mkReq('http://b'), ['y'.repeat(150)]);
        expect(c1.size()).to.equal(1);
        const c2 = new DataStreamingCache(10, storage);
        expect(c2.get(mkReq('http://a'))).to.be.undefined;
        expect(c2.get(mkReq('http://b'))).to.deep.equal(['y'.repeat(150)]);
    });

    it('clears storage', () => {
        const storage = new MemStorage();
        const c1 = new DataStreamingCache(10, storage);
        c1.set(mkReq('http://a'), ['a']);
        c1.clear();
        expect(Object.keys(storage.data)).to.have.length(0);
    });
});

describe('DataStreamingCache.createSessionCache', () => {
    const origWindow = (globalThis as any).window;

    const mockWindow = (storage: MemStorage, navType: string) => {
        (globalThis as any).window = {
            sessionStorage: storage,
            performance: {
                getEntriesByType: () => [{ type: navType }],
            },
        };
    };

    afterEach(() => {
        (globalThis as any).window = origWindow;
    });

    it('keeps cached data on regular navigation', () => {
        const storage = new MemStorage();
        new DataStreamingCache(10, storage).set(mkReq('http://a'), ['a']);
        mockWindow(storage, 'navigate');
        const cache = DataStreamingCache.createSessionCache();
        expect(cache.get(mkReq('http://a'))).to.deep.equal(['a']);
    });

    it('clears cached data on page reload', () => {
        const storage = new MemStorage();
        storage.setItem('other.app.key', 'x');
        new DataStreamingCache(10, storage).set(mkReq('http://a'), ['a']);
        mockWindow(storage, 'reload');
        const cache = DataStreamingCache.createSessionCache();
        expect(cache.size()).to.equal(0);
        expect(cache.get(mkReq('http://a'))).to.be.undefined;
        expect(storage.data).to.deep.equal({ 'other.app.key': 'x' });
    });
});
