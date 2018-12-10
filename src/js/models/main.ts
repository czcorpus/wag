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
import {StatelessModel, Action, ActionDispatcher, SEDispatcher} from 'kombo';
import { ActionNames } from './actions';
import * as Immutable from 'immutable';


export interface WdglanceMainState {
    query:string;
    targetLanguage:string;
    availLanguages:Immutable.List<[string, string]>;
}


export class WdglanceMainFormModel extends StatelessModel<WdglanceMainState> {


    constructor(dispatcher:ActionDispatcher, availLanguages:Array<[string, string]>) {
        super(
            dispatcher,
            {
                query: '', // TODO
                targetLanguage: availLanguages[0][0],
                availLanguages:Immutable.List<[string, string]>(availLanguages)
            }
        );

    }

    reduce(state:WdglanceMainState, action:Action):WdglanceMainState {
        let newState:WdglanceMainState;

        switch (action.type) {
            case ActionNames.ChangeQueryInput:
                newState = this.copyState(state);
                newState.query = action.payload['value']; // TODO
            break;
            case ActionNames.ChangeTargetLanguage:
                newState = this.copyState(state);
                newState.targetLanguage = action.payload['value']; // TODO
            break;
            default:
                newState = state;
            break;
        }
        return newState;
    }

    sideEffects(state:WdglanceMainState, action:Action, dispatch:SEDispatcher):void {
        switch (action.type) {
            case ActionNames.ChangeQueryInput:
                //this.queryWritingIn.next(state.query);
            break;
        }
    }

}