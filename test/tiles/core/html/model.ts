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

import { TestModelWrapper } from '../../../framework.js';

import sinon from 'sinon';
import { assert } from 'chai';
import { of as rxOf } from 'rxjs';

import { HtmlModel } from '../../../../src/js/tiles/core/html/model.js';
import { RawHtmlAPI, HtmlApiArgs } from '../../../../src/js/api/vendor/wdglance/html.js';
import { IGeneralHtmlAPI } from '../../../../src/js/api/abstract/html.js';
import { HtmlModelState } from '../../../../src/js/tiles/core/html/common.js';
import { QueryMatch } from '../../../../src/js/query/index.js';
import { Actions } from '../../../../src/js/models/actions.js';
import * as query from '../../../../src/js/models/query.js';
import { HTTP } from 'cnc-tskit';

const queryM = {...query};


describe('HtmlTile model', function () {

    let htmlApiStub:IGeneralHtmlAPI<HtmlApiArgs>;

    let testHtmlModel:TestModelWrapper<HtmlModel, HtmlModelState>;

    this.beforeEach(function () {
        htmlApiStub = sinon.createStubInstance(RawHtmlAPI, {
            call: rxOf('fake html response')
        });
        sinon.stub(queryM, 'findCurrQueryMatch').returns({lemma: 'anything'} as QueryMatch);

        testHtmlModel = new TestModelWrapper<HtmlModel, HtmlModelState>(
            (dispatcher, appServices) => new HtmlModel({
                dispatcher,
                appServices,
                tileId: 1,
                service: htmlApiStub,
                initState: {
                    isBusy: false,
                    tileId: 1,
                    error: null,
                    widthFract: 1,
                    data: null,
                    args: {},
                    lemmaArg: '',
                    sanitizeHTML: false,
                    backlink: {url: '', label: '', method: HTTP.Method.GET, args: {}}
                },
                queryMatches: [[{isCurrent: true} as QueryMatch]],
                backlink: {url: '', label: '', method: HTTP.Method.GET}
            })
        );
    });

    this.afterEach(function () {
        sinon.restore();
    });

    it('gets initial data', function (done) {
        testHtmlModel.checkState(
            {name: Actions.RequestQueryResponse.name},
            Actions.TileDataLoaded.name,
            state => {
                assert.equal(state.data, 'fake html response');
                done();
            }
        );
    });
});