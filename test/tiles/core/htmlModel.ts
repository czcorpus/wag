import { TestModelWrapper } from '../../framework';

import * as sinon from 'sinon';
import { assert } from 'chai';
import { of } from 'rxjs';

import { HtmlModel, HtmlModelArgs } from '../../../src/js/tiles/core/html/model';
import { RawHtmlAPI } from '../../../src/js/tiles/core/html/service';
import { HtmlModelState } from '../../../src/js/tiles/core/html/common';
import { QueryMatch } from '../../../src/js/common/query';
import { ActionName, Actions } from '../../../src/js/models/actions';


var htmlApiStub = sinon.createStubInstance(RawHtmlAPI, {
    call: of('fake html response')
});
var testModel = new TestModelWrapper<HtmlModelArgs>(
    HtmlModel,
    {
        service: htmlApiStub,
        initState: {} as HtmlModelState,
        queryMatches: [[{isCurrent: true} as QueryMatch]]
    } as HtmlModelArgs
);

describe('HtmlModel', function () {
    it('gets initial data', function (done) {
        testModel.checkState(
            {name: ActionName.RequestQueryResponse},
            ActionName.TileDataLoaded,
            state => {
                assert.equal(state.data, 'fake html response');
                done();
            }
        );
    });
});