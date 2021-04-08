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
import { Actions } from '../../src/js/models/actions';
import { SystemMessageType } from '../../src/js/types';


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
                {
                    name: Actions.AddSystemMessage.name,
                    payload: {
                        type: SystemMessageType.ERROR, text: 'message', ttl: 1, ident: 'one'
                    }
                },
                Actions.AddSystemMessage.name,
                state => {
                    assert.deepEqual(state.systemMessages, [{type: SystemMessageType.ERROR, text: 'message', ttl: 1, ident: 'one'}]);
                    done();
                }
            );
        });

        it('remove message', function (done) {
            const testModel = setupModel();
            testModel.dispatcher.dispatch(
                {
                    name: Actions.AddSystemMessage.name,
                    payload: {
                        type: SystemMessageType.ERROR, text: 'message', ttl: 1, ident: 'one'
                    }
                }
            );
            testModel.dispatcher.dispatch(
                {
                    name: Actions.AddSystemMessage.name,
                    payload: {
                        type: SystemMessageType.ERROR,
                        text: 'message',
                        ttl: 1,
                        ident: 'two'
                    }
                }
            );
            testModel.dispatcher.dispatch(
                {
                    name: Actions.AddSystemMessage.name,
                    payload: {
                        type: SystemMessageType.ERROR, text: 'message', ttl: 1, ident: 'three'
                    }
                }
            );

            testModel.checkState(
                {
                    name: Actions.RemoveSystemMessage.name,
                    payload: {ident: 'two'}
                },
                Actions.RemoveSystemMessage.name,
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