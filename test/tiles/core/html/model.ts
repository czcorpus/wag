import { TestModelWrapper } from '../../../framework';

import * as sinon from 'sinon';
import { assert } from 'chai';
import { of } from 'rxjs';

import { HtmlModel, HtmlModelArgs } from '../../../../src/js/tiles/core/html/model';
import { RawHtmlAPI } from '../../../../src/js/tiles/core/html/service';
import { HtmlModelState } from '../../../../src/js/tiles/core/html/common';
import { QueryMatch } from '../../../../src/js/common/query';
import { ActionName } from '../../../../src/js/models/actions';


describe('HtmlTile model', function () {
    let htmlApiStub;
    let testHtmlModel;

    this.beforeAll(function () {
        htmlApiStub = sinon.createStubInstance(RawHtmlAPI, {
            call: of('fake html response')
        });

        testHtmlModel = new TestModelWrapper<HtmlModelArgs>(
            HtmlModel,
            {
                service: htmlApiStub,
                initState: {} as HtmlModelState,
                queryMatches: [[{isCurrent: true} as QueryMatch]]
            } as HtmlModelArgs
        );
    });

    this.afterAll(function () {
        sinon.restore();
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