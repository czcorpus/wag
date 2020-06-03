/*
 * Copyright 2020 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import { ajax$ } from '../../src/js/page/ajax';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { of } from 'rxjs';
import * as rxjsAjax from 'rxjs/ajax';

describe('ajax$', function () {
    let ajaxStub:sinon.SinonStub;

    this.beforeAll(function () {
        ajaxStub = sinon.stub(rxjsAjax, 'ajax').returns(of({
            response: 'response',
            originalEvent: null,
            xhr: null,
            request: null,
            status: null,
            responseText: null,
            responseType: null
        }));
    });

    this.beforeEach(function () {
        ajaxStub.resetHistory();
    });

    this.afterAll(function () {
        sinon.restore();
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
