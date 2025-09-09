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

import { StatelessModel, IActionQueue } from 'kombo';
import { pipe, List, tuple } from 'cnc-tskit';

import { IAppServices } from '../appServices.js';
import { MultiDict } from '../multidict.js';
import { Input, Forms } from '../page/forms.js';
import { SystemMessageType } from '../types.js';
import { AvailableLanguage } from '../page/hostPage.js';
import { QueryType, QueryTypeMenuItem, matchesPos, RecognizedQueries, findCurrQueryMatch, queryTypeToAction } from '../query/index.js';
import { QueryValidator } from '../query/validation.js';
import { Actions } from './actions.js';
import { LayoutManager } from '../page/layout.js';
import { MainPosAttrValues, TranslatLanguage } from '../conf/index.js';
import urlJoin from 'url-join';


export interface QueryFormModelState {
    queries:Array<Input>;
    initialQueryType:QueryType;
    multiWordQuerySupport:number;
    instanceSwitchMenu:Array<{label:string; url:string}>;
    queryType:QueryType;
    availQueryTypes:Array<QueryType>;
    currTranslatLanguage:string;
    translatLanguages:Array<TranslatLanguage>;
    queryTypesMenuItems:Array<QueryTypeMenuItem>;
    errors:Array<Error>;
    queryMatches:RecognizedQueries;
    isAnswerMode:boolean;
    uiLanguages:Array<AvailableLanguage>;
    maxCmpQueries:number;
    lemmaSelectorModalVisible:boolean;
    modalSelections:Array<number>;
    mainPosAttr:MainPosAttrValues;
}



/**
 * QueryFormModel handles both user entered raw query and switching between already found lemmas.
 */
export class QueryFormModel extends StatelessModel<QueryFormModelState> {

    private readonly appServices:IAppServices;

    private readonly queryValidator:QueryValidator;

    constructor(dispatcher:IActionQueue, appServices:IAppServices, initialState:QueryFormModelState) {
        super(dispatcher, initialState);
        this.appServices = appServices;
        this.queryValidator = new QueryValidator(this.appServices);

        this.addActionHandler(
            Actions.ChangeQueryInput,
            (state, action) => {
                state.errors = [];
                state.queries[action.payload.queryIdx] =
                    Forms.updateFormInput(state.queries[action.payload.queryIdx], {value: action.payload.value, isValid: true});
            }
        );

        this.addActionHandler(
            Actions.ChangeCurrQueryMatch,
            (state, action) => {
                const group = state.queryMatches[action.payload.queryIdx];
                state.queryMatches[action.payload.queryIdx] = List.map(
                    v => ({
                        ...v,
                        isCurrent: matchesPos(
                            v, state.mainPosAttr, action.payload[state.mainPosAttr]) && v.word == action.payload.word &&
                                v.lemma === action.payload.lemma ? true : false
                    }),
                    group
                );
            },
            (state, action, dispatch) => {
                this.submitCurrLemma(state);
            }
        );

        this.addActionHandler(
            Actions.ChangeTranslatLanguage,
            (state, action) => {
                state.currTranslatLanguage = action.payload.lang;
            }
        );

        this.addActionHandler(
            Actions.ChangeQueryType,
            null,
            (state, action, dispatch) => {
                window.location.href = this.appServices.createActionUrl(
                    queryTypeToAction(action.payload.queryType),
                    pipe(
                        state.queries,
                        List.map(v => tuple('q', v.value))
                    )
                );
            }
        );

        this.addActionHandler(
            Actions.SubmitQuery,
            (state, action) => {
                this.checkAndSubmitUserQuery(state);
            },
            (state, action, dispatch) => {
                state.errors.forEach(err => {
                    this.appServices.showMessage(SystemMessageType.ERROR, err.message);
                });
            }
        );

        this.addActionHandler(
            Actions.AddCmpQueryInput,
            (state, action) => {
                if (state.queries.length < state.maxCmpQueries) {
                    state.queries.push(Forms.newFormValue('', true));
                }
            },
            (state, action, dispatch) => {
                if (state.queries.length >= state.maxCmpQueries) {
                    this.appServices.showMessage(SystemMessageType.INFO, this.appServices.translate('global__maximum_limit_of_compared_queries'));
                }
            }
        );

        this.addActionHandler(
            Actions.RemoveCmpQueryInput,
            (state, action) => {
                state.queries.splice(action.payload.queryIdx, 1);
            }
        );

        this.addActionHandler(
            Actions.ShowQueryMatchModal,
            (state, action) => {
                state.lemmaSelectorModalVisible = true;
            }
        );

        this.addActionHandler(
            Actions.HideQueryMatchModal,
            (state, action) => {
                state.lemmaSelectorModalVisible = false;
            }
        );

        this.addActionHandler(
            Actions.SelectModalQueryMatch,
            (state, action) => {
                state.modalSelections[action.payload.queryIdx] = action.payload.variantIdx;
            }
        );

        this.addActionHandler(
            Actions.ApplyModalQueryMatchSelection,
            (state, action) => {
                state.lemmaSelectorModalVisible = false;
                state.modalSelections.forEach((sel, idx) => {
                    state.queryMatches[idx] = state.queryMatches[idx].map((v, i2) => ({
                        lemma: v.lemma,
                        word: v.word,
                        pos: v.pos,
                        upos: v.upos,
                        abs: v.abs,
                        ipm: v.ipm,
                        arf: v.arf,
                        flevel: v.flevel,
                        isCurrent: i2 === sel
                    }))
                });
            },
            (state, action, dispatch) => {
                this.submitCurrLemma(state);
            }
        );
    }

    private normalizeQueries(state:QueryFormModelState):void {
        state.queries = List.map(
            formQuery => Forms.updateFormInput(
                formQuery,
                {value: this.queryValidator.normalizeQuery(formQuery.value)}
            ),
            state.queries
        );
    }

    private submitCurrLemma(state:QueryFormModelState):void {
        const args = new MultiDict();
        args.set('pos', findCurrQueryMatch(state.queryMatches[0])[state.mainPosAttr].map(v => v.value).join(' '));
        args.set('lemma', findCurrQueryMatch(state.queryMatches[0]).lemma);

        switch (state.queryType) {
            case QueryType.CMP_QUERY:
                state.queryMatches.slice(1).forEach(m => {
                    args.add('pos', findCurrQueryMatch(m)[state.mainPosAttr].map(v => v.value).join(' '));
                    args.add('lemma', findCurrQueryMatch(m).lemma);
                });
        }

        window.location.href = this.appServices.createActionUrl(this.buildQueryPath(state), args);
    }

    private checkAndSubmitUserQuery(state:QueryFormModelState):void {
        this.normalizeQueries(state);
        state.errors = [];
        this.validateQuery(state);
        if (state.errors.length === 0) {
            window.location.href = this.appServices.createActionUrl(this.buildQueryPath(state));
        }
    }

    private buildQueryPath(state:QueryFormModelState):string {
        const action = queryTypeToAction(state.queryType);

        const queries = state.queryType === QueryType.CMP_QUERY ?
            List.map(v => v.value, state.queries) :
            [state.queries[0].value];


        const translatChunk = state.queryType === QueryType.TRANSLAT_QUERY ?
            state.currTranslatLanguage :
            '';

        return urlJoin(action, translatChunk, queries.join('--'));
    }

    private validateNthQuery(state:QueryFormModelState, idx:number):boolean {
        const errors = this.queryValidator.validateQuery(
            state.queries[idx].value,
            state.multiWordQuerySupport || 1
        );
        state.queries[idx] = Forms.updateFormInput(state.queries[idx], {isValid: errors.length === 0});
        state.errors.push(...errors);
        return errors.length === 0;
    }

    private findEqualQueries(state:QueryFormModelState):Array<string> {
        return pipe(
            state.queries,
            List.groupBy(v => v.value),
            List.filter(([,v]) => v.length > 1),
            List.map(([k,]) => k)
        );
    }

    validateQuery(state:QueryFormModelState):void {
        if (state.queryType === QueryType.SINGLE_QUERY) {
            this.validateNthQuery(state, 0);

        } else if (state.queryType === QueryType.CMP_QUERY) {
            if (state.queries.length < 2) {
                state.errors.push(new Error(this.appServices.translate('global__src_min_two_queries_required_for_cmp')))
            }
            List.forEach(
                (_, idx) => {
                    this.validateNthQuery(state, idx);
                },
                state.queries
            );
            const eqQueries = this.findEqualQueries(state);
            if (eqQueries.length > 0) {
                state.errors.push(new Error(`${this.appServices.translate('global__some_cmp_queries_are_identical')} - ${eqQueries.map(v => `"${v}"`).join(', ')}`));
            }

        } else if (state.queryType === QueryType.TRANSLAT_QUERY) {
            this.validateNthQuery(state, 0);
        }
    }

}

export interface DefaultFactoryArgs {
    dispatcher:IActionQueue;
    appServices:IAppServices;
    translatLanguage:string;
    queryType:QueryType;
    availQueryTypes:Array<QueryType>;
    queryMatches:RecognizedQueries;
    isAnswerMode:boolean;
    uiLanguages:Array<AvailableLanguage>;
    instanceSwitchMenu:Array<{label:string; url:string}>;
    layout:LayoutManager;
    maxCmpQueries:number;
    maxQueryWords:number;
}

export const defaultFactory = ({
    dispatcher,
    appServices,
    translatLanguage,
    queryType,
    availQueryTypes,
    queryMatches,
    isAnswerMode,
    uiLanguages,
    instanceSwitchMenu,
    layout,
    maxCmpQueries,
    maxQueryWords
}:DefaultFactoryArgs) => {

    return new QueryFormModel(
        dispatcher,
        appServices,
        {
            queries: List.map(
                (v, i) => Forms.newFormValue(v[0].word || '', i === 0),
                queryMatches
            ),
            queryType,
            availQueryTypes,
            initialQueryType: queryType,
            queryTypesMenuItems: layout.getQueryTypesMenuItems(),
            currTranslatLanguage: translatLanguage,
            translatLanguages: layout.getTranslatLanguages(),
            errors: [],
            queryMatches,
            isAnswerMode,
            uiLanguages,
            instanceSwitchMenu,
            multiWordQuerySupport: maxQueryWords,
            maxCmpQueries,
            lemmaSelectorModalVisible: false,
            modalSelections: List.map(
                v => v.findIndex(v2 => v2.isCurrent),
                queryMatches
            ),
            mainPosAttr: layout.getLayoutMainPosAttr(),
        }
    );
};
