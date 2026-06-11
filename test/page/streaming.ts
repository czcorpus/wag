import { expect } from 'chai';

import { DataStreaming } from '../../src/js/page/streaming.js';

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
