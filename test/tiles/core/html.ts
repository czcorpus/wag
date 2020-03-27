import { HtmlModel } from '../../../src/js/tiles/core/html/model';
import { RawHtmlAPI } from '../../../src/js/tiles/core/html/service';

import { ActionDispatcher } from 'kombo';
import { ActionName, Actions } from '../../../src/js/models/actions';

import * as sinon from 'sinon';
import { of } from 'rxjs';
import { assert } from 'chai';
import { HtmlModelState } from '../../../src/js/tiles/core/html/common';
import { QueryMatch } from '../../../src/js/common/query';


var dispatcher = new ActionDispatcher();
var htmlApiStub = sinon.createStubInstance(RawHtmlAPI, {
    call: of('fake response')
});

describe('testing html model', function () {
    var lastAction = null;
    dispatcher.registerActionListener((action, dispatch) => {lastAction = action.name});

    var model = new HtmlModel({
        dispatcher: dispatcher,
        tileId: 0,
        appServices: null,
        service: htmlApiStub,
        initState: {tileId: 0} as HtmlModelState,
        queryMatches: [[{isCurrent: true} as QueryMatch]]
    });

    it('does something', function (done) {
        model.addListener(state => {        
            if (lastAction === ActionName.TileDataLoaded) {
                assert.equal(state.data, 'fake response');
                done();
            }
        });

        dispatcher.dispatch<Actions.RequestQueryResponse>({
            name: ActionName.RequestQueryResponse
        });
    });
});