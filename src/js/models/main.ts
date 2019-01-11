/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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
import {StatelessModel, Action, ActionDispatcher, SEDispatcher, IReducer} from 'kombo';
import { ActionNames, Actions, QueryType } from './actions';
import * as Immutable from 'immutable';
import { AppServices } from '../appServices';
import { SystemMessage } from '../notifications';


export interface WdglanceMainState {
    query:string;
    query2:string;
    queryType:QueryType;
    targetLanguage:string;
    targetLanguage2:string;
    availLanguages:Immutable.List<[string, string]>;
    availQueryTypes:Immutable.List<[QueryType, string]>;
    framesSizes:Immutable.List<[number, number]>;
    systemMessages:Immutable.List<SystemMessage>;
}


export class WdglanceMainFormModel extends StatelessModel<WdglanceMainState> {

    private actionMatch:{[actionName:string]:IReducer<WdglanceMainState, Action>};

    private readonly appServices:AppServices;

    constructor(dispatcher:ActionDispatcher, appServices:AppServices, availLanguages:Array<[string, string]>) {
        super(
            dispatcher,
            {
                query: '', // TODO
                query2: '',
                queryType: QueryType.SINGLE_QUERY,
                availQueryTypes: Immutable.List<[QueryType, string]>([
                    [QueryType.SINGLE_QUERY, appServices.translate('global__single_word_sel')],
                    [QueryType.DOUBLE_QUERY, appServices.translate('global__two_words_compare')]
                ]),
                targetLanguage: availLanguages[0][0],
                targetLanguage2: '',
                availLanguages:Immutable.List<[string, string]>(availLanguages),
                framesSizes:Immutable.List<[number, number]>(),
                systemMessages: Immutable.List<SystemMessage>()
            }
        );

        this.appServices = appServices;

        this.actionMatch = {
            [ActionNames.ChangeQueryInput]: (state, action:Actions.ChangeQueryInput) => {
                const newState = this.copyState(state);
                newState.query = action.payload.value;
                return newState;
            },
            [ActionNames.ChangeQueryInput2]: (state, action:Actions.ChangeQueryInput2) => {
                const newState = this.copyState(state);
                newState.query2 = action.payload.value;
                return newState;
            },
            [ActionNames.ChangeTargetLanguage]: (state, action:Actions.ChangeTargetLanguage) => {
                const newState = this.copyState(state);
                newState.targetLanguage = action.payload.value;
                return newState;
            },
            [ActionNames.ChangeTargetLanguage2]: (state, action:Actions.ChangeTargetLanguage2) => {
                const newState = this.copyState(state);
                newState.targetLanguage2 = action.payload.value;
                return newState;
            },
            [ActionNames.ChangeQueryType]: (state, action:Actions.ChangeQueryType) => {
                const newState = this.copyState(state);
                newState.queryType = action.payload.value;
                return newState;
            },
            [ActionNames.AcknowledgeSizes]: (state, action:Actions.AcknowledgeSizes) => {
                const newState = this.copyState(state);
                newState.framesSizes = Immutable.List<[number, number]>(action.payload.values);
                return newState;
            },
            [ActionNames.AddSystemMessage]: (state, action:Actions.AddSystemMessage) => {
                const newState = this.copyState(state);
                newState.systemMessages = newState.systemMessages.push({
                    type: action.payload.type,
                    text: action.payload.text,
                    ttl: action.payload.ttl,
                    ident: action.payload.ident
                });
                return newState;
            },
            [ActionNames.RemoveSystemMessage]: (state, action:Actions.RemoveSystemMessage) => {
                const newState = this.copyState(state);
                const srchIdx = newState.systemMessages.findIndex(v => v.ident === action.payload['ident']);
                if (srchIdx > -1) {
                    newState.systemMessages = newState.systemMessages.remove(srchIdx);
                }
                return newState;
            }
        }
    }

    reduce(state:WdglanceMainState, action:Action):WdglanceMainState {
        return action.name in this.actionMatch ? this.actionMatch[action.name](state, action) : state;
    }

    sideEffects(state:WdglanceMainState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case ActionNames.ChangeQueryInput:
                //this.queryWritingIn.next(state.query);
            break;
        }
    }

}