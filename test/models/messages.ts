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

import { TestModelWrapper } from '../framework';

import { restore } from 'sinon';
import { assert } from 'chai';

import { MessagesModel, MessagesState } from '../../src/js/models/messages';
import { ActionName } from '../../src/js/models/actions';
import { SystemMessageType } from '../../src/js/common/types';


describe('MessagesModel', function () {
    function setupModel():TestModelWrapper<MessagesModel, MessagesState> {
        return new TestModelWrapper(
            (dispatcher, appServices) => new MessagesModel(
                dispatcher,
                appServices
            )
        );
    }

    this.afterEach(function () {
        restore();
    });

    describe('messages actions', function () {
        it('adds message', function (done) {
            setupModel()
            .checkState(
                {name: ActionName.AddSystemMessage, payload: {type: SystemMessageType.ERROR, text: 'message', ttl: 1, ident: 'one'}},
                ActionName.AddSystemMessage,
                state => {
                    assert.deepEqual(state.systemMessages, [{type: SystemMessageType.ERROR, text: 'message', ttl: 1, ident: 'one'}]);
                    done();
                }
            );
        });

        it('remove message', function (done) {
            const testModel = setupModel();
            testModel.dispatcher.dispatch(
                {name: ActionName.AddSystemMessage, payload: {type: SystemMessageType.ERROR, text: 'message', ttl: 1, ident: 'one'}}
            );
            testModel.dispatcher.dispatch(
                {name: ActionName.AddSystemMessage, payload: {type: SystemMessageType.ERROR, text: 'message', ttl: 1, ident: 'two'}}
            );
            testModel.dispatcher.dispatch(
                {name: ActionName.AddSystemMessage, payload: {type: SystemMessageType.ERROR, text: 'message', ttl: 1, ident: 'three'}}
            );

            testModel.checkState(
                {name: ActionName.RemoveSystemMessage, payload: {ident: 'two'}},
                ActionName.RemoveSystemMessage,
                state => {
                    assert.deepEqual(state.systemMessages, [
                        {type: SystemMessageType.ERROR, text: 'message', ttl: 1, ident: 'one'},
                        {type: SystemMessageType.ERROR, text: 'message', ttl: 1, ident: 'three'}
                    ]);
                    done();
                }
            );
        });
    });
});