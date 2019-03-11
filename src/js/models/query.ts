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
import * as Immutable from 'immutable';
import { Action, IActionDispatcher, SEDispatcher, StatelessModel } from 'kombo';

import { AppServices } from '../appServices';
import { Forms } from '../common/data';
import { QueryType, SystemMessageType } from '../common/types';
import { ActionName, Actions } from './actions';


export interface WdglanceMainState {
    query:Forms.Input;
    query2:Forms.Input;
    queryType:QueryType;
    targetLanguage:string;
    targetLanguage2:string;
    availLanguages:Immutable.List<[string, string]>;
    availQueryTypes:Immutable.List<[QueryType, string]>;
    isValid:boolean;
}


export class WdglanceMainFormModel extends StatelessModel<WdglanceMainState> {

    private readonly appServices:AppServices;

    constructor(dispatcher:IActionDispatcher, appServices:AppServices, initialState:WdglanceMainState) {
        super(dispatcher, initialState);
        this.appServices = appServices;

        this.actionMatch = {
            [ActionName.ChangeQueryInput]: (state, action:Actions.ChangeQueryInput) => {
                const newState = this.copyState(state);
                newState.query = Forms.updateFormInput(newState.query, {value: action.payload.value});
                return newState;
            },
            [ActionName.ChangeQueryInput2]: (state, action:Actions.ChangeQueryInput2) => {
                const newState = this.copyState(state);
                newState.query2 = Forms.updateFormInput(newState.query2, {value: action.payload.value});
                return newState;
            },
            [ActionName.ChangeTargetLanguage]: (state, action:Actions.ChangeTargetLanguage) => {
                const newState = this.copyState(state);
                newState.targetLanguage = action.payload.lang1;
                newState.targetLanguage2 = action.payload.lang2;
                newState.queryType = action.payload.queryType;
                return newState;
            },
            [ActionName.ChangeQueryType]: (state, action:Actions.ChangeQueryType) => {
                const newState = this.copyState(state);
                newState.queryType = action.payload.queryType;
                if (newState.queryType === QueryType.SINGLE_QUERY) {
                    newState.query2 = Forms.updateFormInput(newState.query2, {isRequired: false});

                } else {
                    newState.query2 = Forms.updateFormInput(newState.query2, {isRequired: true});
                }
                return newState;
            },
            [ActionName.SubmitQuery]: (state, action:Actions.SubmitQuery) => {
                const newState = this.copyState(state);
                newState.query.value = newState.query.value.trim();
                newState.query2.value = newState.query2.value.trim();
                newState.isValid = this.queryIsValid(newState);
                if (newState.isValid) { // we leave the page here, TODO: use some kind of routing
                    window.location.href = this.appServices.createActionUrl('search/', {
                        q1: state.query.value,
                        q2: state.query2.value,
                        queryType: state.queryType,
                        lang1: state.targetLanguage,
                        lang2: state.targetLanguage2
                    });
                }
                return newState;
            }
        }
    }

    sideEffects(state:WdglanceMainState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case ActionName.ChangeQueryInput:
                //this.queryWritingIn.next(state.query);
            break;
            case ActionName.SubmitQuery:
                if (!state.isValid) {
                    this.appServices.showMessage(
                        SystemMessageType.ERROR,
                        this.appServices.translate('global__form_contains_errors')
                    );
                }
            break;
        }
    }

    queryIsValid(state:WdglanceMainState):boolean {
        let ans = true;
        if (state.query.value === '') {
            state.query = Forms.updateFormInput(state.query, {isValid: false});
            ans = false;

        } else {
            state.query = Forms.updateFormInput(state.query, {isValid: true});
        }
        if (state.queryType === QueryType.CMP_QUERY && state.query2.value === '') {
            state.query2 = Forms.updateFormInput(state.query2, {isValid: false});
            ans = false;

        } else {
            state.query2 = Forms.updateFormInput(state.query2, {isValid: true});
        }
        return ans;
    }

}

export interface DefaultFactoryArgs {
    dispatcher:IActionDispatcher;
    appServices:AppServices;
    query1:string;
    query1Lang:string;
    query2:string;
    query2Lang:string;
    queryType:QueryType;
}

export const defaultFactory = ({dispatcher, appServices, query1, query1Lang, query2,
            query2Lang, queryType}:DefaultFactoryArgs) => {

    return new WdglanceMainFormModel(
        dispatcher,
        appServices,
        {
            query: Forms.newFormValue(query1 || '', true),
            query2: Forms.newFormValue(query2 || '', false),
            queryType: queryType,
            availQueryTypes: Immutable.List<[QueryType, string]>([
                [QueryType.SINGLE_QUERY, appServices.translate('global__single_word_sel')],
                [QueryType.CMP_QUERY, appServices.translate('global__two_words_compare')],
                [QueryType.TRANSLAT_QUERY, appServices.translate('global__word_translate')]
            ]),
            targetLanguage: query1Lang || '',
            targetLanguage2: query2Lang || '',
            availLanguages: Immutable.List<[string, string]>([
                ['cs', 'čeština'],
                ['en', 'English'],
                ['de', 'Deutsch']
            ]),
            isValid: true,
        }
    );
};