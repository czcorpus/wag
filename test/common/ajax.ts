import { ajax$ } from '../../src/js/common/ajax';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { of } from 'rxjs';
import * as rxjsAjax from 'rxjs/ajax';

describe('ajax$', function () {
    var ajaxStub = sinon.stub(rxjsAjax, 'ajax').returns(of({response: 'response'}));
    
    this.beforeEach(function () {
        ajaxStub.resetHistory();
    });
    
    this.afterAll(function () {
        ajaxStub.restore();
    });

    it('wraps ajax() properly in case of a non-error response', function (done) {
        ajax$('get', 'anywhere', {}).subscribe(
            value => {},
            err => done(err),
            () => {
                assert.equal(ajaxStub.callCount, 1);
                done()
            }
        );
    });

});