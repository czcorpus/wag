/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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
import { StatelessModel, IActionQueue } from 'kombo';
import { List } from 'cnc-tskit';

import { IAppServices } from '../appServices.js';
import { SystemMessage } from '../page/notifications.js';
import { Actions } from './actions.js';

export interface MessagesState {
    systemMessages: Array<SystemMessage>;
}

export class MessagesModel extends StatelessModel<MessagesState> {
    private readonly appServices: IAppServices;

    constructor(dispatcher: IActionQueue, appServices: IAppServices) {
        super(dispatcher, {
            systemMessages: [],
        });
        this.appServices = appServices;
        this.addActionHandler<typeof Actions.AddSystemMessage>(
            Actions.AddSystemMessage.name,
            (state, action) => {
                state.systemMessages.push({
                    type: action.payload.type,
                    text: action.payload.text,
                    ttl: action.payload.ttl,
                    ident: action.payload.ident,
                });
            }
        );
        this.addActionHandler<typeof Actions.RemoveSystemMessage>(
            Actions.RemoveSystemMessage.name,
            (state, action) => {
                const srchIdx = List.findIndex(
                    (v) => v.ident === action.payload.ident,
                    state.systemMessages
                );
                if (srchIdx > -1) {
                    state.systemMessages.splice(srchIdx, 1);
                }
            }
        );
    }
}
