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

import { TestModelWrapper } from '../../../framework';

import { createStubInstance, restore, stub } from 'sinon';
import { assert } from 'chai';
import { of as rxOf } from 'rxjs';

import { HtmlModel } from '../../../../src/js/tiles/core/html/model';
import { RawHtmlAPI, HtmlApiArgs } from '../../../../src/js/common/api/vendor/wdglance/html';
import { IGeneralHtmlAPI } from '../../../../src/js/common/api/abstract/html';
import { HtmlModelState } from '../../../../src/js/tiles/core/html/common';
import { QueryMatch } from '../../../../src/js/common/query/index';
import { ActionName } from '../../../../src/js/models/actions';
import * as query from '../../../../src/js/models/query';


describe('HtmlTile model', function () {

    let htmlApiStub:IGeneralHtmlAPI<HtmlApiArgs>;

    let testHtmlModel:TestModelWrapper<HtmlModel, HtmlModelState>;

    this.beforeEach(function () {
        htmlApiStub = createStubInstance(RawHtmlAPI, {
            call: rxOf('fake html response')
        });
        stub(query, 'findCurrQueryMatch').returns({lemma: 'anything'} as QueryMatch);

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
                    sanitizeHTML: false
                },
                queryMatches: [[{isCurrent: true} as QueryMatch]]
            })
        );
    });

    this.afterEach(function () {
        restore();
    });

    it('gets initial data', function (done) {
        testHtmlModel.checkState(
            {name: ActionName.RequestQueryResponse},
            ActionName.TileDataLoaded,
            state => {
                assert.equal(state.data, 'fake html response');
                done();
            }
        );
    });
});