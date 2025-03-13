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
import { pipe, List } from 'cnc-tskit';

import { IAppServices } from '../appServices.js';
import { MultiDict } from '../multidict.js';
import { Input, Forms } from '../page/forms.js';
import { SystemMessageType } from '../types.js';
import { AvailableLanguage } from '../page/hostPage.js';
import { QueryType, QueryMatch, QueryTypeMenuItem, matchesPos, SearchDomain, RecognizedQueries } from '../query/index.js';
import { QueryValidator } from '../query/validation.js';
import { Actions } from './actions.js';
import { HTTPAction } from '../server/routes/actions.js';
import { LayoutManager } from '../page/layout.js';
import { MainPosAttrValues } from '../conf/index.js';


export interface QueryFormModelState {
    queries:Array<Input>;
    initialQueryType:QueryType;
    multiWordQuerySupport:{[k in QueryType]?:number};
    queryType:QueryType;
    queryDomain:string;
    queryDomain2:string;
    searchDomains:Array<SearchDomain>;
    targetDomains:{[k in QueryType]:Array<[string, string]>};
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

export const findCurrQueryMatch = (queryMatches:Array<QueryMatch>):QueryMatch => {
    const srch = queryMatches.find(v => v.isCurrent);
    return srch ? srch : {
        lemma: undefined,
        word: undefined,
        pos: [],
        upos: [],
        abs: -1,
        ipm: -1,
        arf: -1,
        flevel: null,
        isCurrent: true
    };
};

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
        this.addActionHandler<typeof Actions.ChangeQueryInput>(
            Actions.ChangeQueryInput.name,
            (state, action) => {
                state.errors = [];
                state.queries[action.payload.queryIdx] =
                    Forms.updateFormInput(state.queries[action.payload.queryIdx], {value: action.payload.value, isValid: true});
            }
        );

        this.addActionHandler<typeof Actions.ChangeCurrQueryMatch>(
            Actions.ChangeCurrQueryMatch.name,
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

        this.addActionHandler<typeof Actions.ChangeTargetDomain>(
            Actions.ChangeTargetDomain.name,
            (state, action) => {
                const prevDomain2 = state.queryDomain2;
                state.queryDomain = action.payload.domain1;
                state.queryDomain2 = action.payload.domain2;
                state.queryType = action.payload.queryType;
                if (state.isAnswerMode && state.queryType === QueryType.TRANSLAT_QUERY &&
                            prevDomain2 !== action.payload.domain2) {
                    this.checkAndSubmitUserQuery(state);
                }
            }
        );

        this.addActionHandler<typeof Actions.ChangeQueryType>(
            Actions.ChangeQueryType.name,
            (state, action) => {
                state.queryType = action.payload.queryType;
                const hasMoreQueries = pipe(state.queries, List.slice(1), List.some(v => v.value !== ''));
                const allowsValidSingleQuery = state.queryType !== QueryType.CMP_QUERY && state.queries[0].value !== '';
                if (state.isAnswerMode && (allowsValidSingleQuery || hasMoreQueries)) {
                    this.checkAndSubmitUserQuery(state);
                }

                if (state.queryType === QueryType.SINGLE_QUERY || state.queryType === QueryType.TRANSLAT_QUERY) {
                    state.queries = state.queries.map(q => Forms.updateFormInput(q, {isRequired: false}));

                } else {
                    state.queries = state.queries.map(q => Forms.updateFormInput(q, {isRequired: true}));
                    if (state.queries.length === 1) {
                        state.queries.push(Forms.newFormValue('', true));
                    }
                }
            }
        );

        this.addActionHandler<typeof Actions.SubmitQuery>(
            Actions.SubmitQuery.name,
            (state, action) => {
                this.checkAndSubmitUserQuery(state);
            },
            (state, action, dispatch) => {
                state.errors.forEach(err => {
                    this.appServices.showMessage(SystemMessageType.ERROR, err.message);
                });
            }
        );

        this.addActionHandler<typeof Actions.AddCmpQueryInput>(
            Actions.AddCmpQueryInput.name,
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

        this.addActionHandler<typeof Actions.RemoveCmpQueryInput>(
            Actions.RemoveCmpQueryInput.name,
            (state, action) => {
                state.queries.splice(action.payload.queryIdx, 1);
            }
        );

        this.addActionHandler<typeof Actions.ShowQueryMatchModal>(
            Actions.ShowQueryMatchModal.name,
            (state, action) => {
                state.lemmaSelectorModalVisible = true;
            }
        );

        this.addActionHandler<typeof Actions.HideQueryMatchModal>(
            Actions.HideQueryMatchModal.name,
            (state, action) => {
                state.lemmaSelectorModalVisible = false;
            }
        );

        this.addActionHandler<typeof Actions.SelectModalQueryMatch>(
            Actions.SelectModalQueryMatch.name,
            (state, action) => {
                state.modalSelections[action.payload.queryIdx] = action.payload.variantIdx;
            }
        );

        this.addActionHandler<typeof Actions.ApplyModalQueryMatchSelection>(
            Actions.ApplyModalQueryMatchSelection.name,
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
        if (state.errors.length === 0) { // we leave the page here, TODO: use some kind of routing
            window.location.href = this.appServices.createActionUrl(this.buildQueryPath(state));
        }
    }

    private buildQueryPath(state:QueryFormModelState):string {
        const action = (
            state.queryType === QueryType.SINGLE_QUERY ? HTTPAction.SEARCH :
            state.queryType === QueryType.CMP_QUERY ? HTTPAction.COMPARE :
            HTTPAction.TRANSLATE
        );

        const domains = [state.queryDomain];
        if (state.queryType === QueryType.TRANSLAT_QUERY) {
            domains.push(state.queryDomain2);
        }

        const queries = [state.queries[0].value];
        if (state.queryType === QueryType.CMP_QUERY) {
            state.queries.slice(1).forEach(v => {
                queries.push(v.value);
            });
        }

        return `${action}${domains.join('--')}/${queries.join('--')}`;
    }

    private validateNthQuery(state:QueryFormModelState, idx:number):boolean {
        const errors = this.queryValidator.validateQuery(
            state.queries[idx].value,
            state.multiWordQuerySupport[state.queryType] || 1
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
            if (state.queryDomain === state.queryDomain2) {
                state.errors.push(new Error(this.appServices.translate('global__src_and_dst_domains_must_be_different')));
            }
        }
    }

}

export interface DefaultFactoryArgs {
    dispatcher:IActionQueue;
    appServices:IAppServices;
    query1Domain:string;
    query2Domain:string;
    queryType:QueryType;
    queryMatches:RecognizedQueries;
    isAnswerMode:boolean;
    uiLanguages:Array<AvailableLanguage>;
    searchDomains:Array<SearchDomain>;
    layout:LayoutManager;
    maxCmpQueries:number;
    maxQueryWords:{[k in QueryType]?:number};
}

export const defaultFactory = ({
    dispatcher,
    appServices,
    query1Domain,
    query2Domain,
    queryType,
    queryMatches,
    isAnswerMode,
    uiLanguages,
    searchDomains,
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
            initialQueryType: queryType,
            queryTypesMenuItems: layout.getQueryTypesMenuItems(),
            queryDomain: query1Domain,
            queryDomain2: query2Domain,
            searchDomains,
            targetDomains: layout.getTargetDomains(),
            errors: [],
            queryMatches,
            isAnswerMode,
            uiLanguages,
            multiWordQuerySupport: maxQueryWords,
            maxCmpQueries,
            lemmaSelectorModalVisible: false,
            modalSelections: List.map(
                v => v.findIndex(v2 => v2.isCurrent),
                queryMatches
            ),
            mainPosAttr: layout.getLayoutMainPosAttr(queryType),
        }
    );
};
