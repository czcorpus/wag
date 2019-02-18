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
import * as Immutable from 'immutable';
import * as Rx from '@reactivex/rxjs';
import { StatelessModel, ActionDispatcher, Action, SEDispatcher } from 'kombo';
import { LemmaFreqApi, RequestArgs, SummaryDataRow} from './api';
import {Response as SFWResponse, SimilarlyFreqWord} from './sfwApi';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {ActionName as ConcActionName, Actions as ConcActions} from '../concordance/actions';
import { ActionName, Actions } from './actions';
import { AppServices } from '../../appServices';
import { SimilarFreqWordsApi } from './sfwApi';

export interface FlevelDistribItem {
    rel:number;
    flevel:number;
}

export interface SummaryModelState {
    isBusy:boolean;
    error:string;
    corpname:string;
    corpusSize:number;
    concId:string;
    fcrit:string;
    flimit:number;
    fpage:number;
    freqSort:string;
    includeEmpty:boolean;
    data:Immutable.List<SummaryDataRow>;
    currLemmaIdx:number;
    flevelDistrb:Immutable.List<FlevelDistribItem>;
    similarFreqWords:Immutable.List<SimilarlyFreqWord>;
}

const stateToAPIArgs = (state:SummaryModelState, concId:string):RequestArgs => ({
    corpname: state.corpname,
    q: `~${concId ? concId : state.concId}`,
    fcrit: state.fcrit,
    flimit: state.flimit.toFixed(),
    freq_sort: state.freqSort,
    fpage: state.fpage.toFixed(),
    ftt_include_empty: state.includeEmpty ? '1' : '0',
    format: 'json'
});

const posTable = {
    n: {'cs-CZ': 'podstatné jméno', 'en-US': 'noun'},
	a: {'cs-CZ': 'přídavné jméno', 'en-US': 'adjective'},
	p: {'cs-CZ': 'zájmeno', 'en-US': 'pronoun'},
	c: {'cs-CZ': 'číslovka, nebo číselný výraz s číslicemi', 'en-US': 'numeral'},
	v: {'cs-CZ': 'sloveso', 'en-US': 'verb'},
	d: {'cs-CZ': 'příslovce', 'en-US': 'adverb'},
	r: {'cs-CZ': 'předložka', 'en-US': 'preposition'},
	j: {'cs-CZ': 'spojka', 'en-US': 'conjunction'},
	t: {'cs-CZ': 'částice', 'en-US': 'particle'},
	i: {'cs-CZ': 'citoslovce', 'en-US': 'interjection'},
	z: {'cs-CZ': 'interpunkce', 'en-US': 'punctuation'},
    x: {'cs-CZ': 'neznámý nebo neurčený slovní druh', 'en-US': 'unknown or undetermined part of speech'}
}

export class SummaryModel extends StatelessModel<SummaryModelState> {

    private readonly api:LemmaFreqApi;

    private readonly sfwApi:SimilarFreqWordsApi;

    private readonly waitForTile:number;

    private readonly appServices:AppServices;

    constructor(dispatcher:ActionDispatcher, initialState:SummaryModelState, api:LemmaFreqApi,
        sfwApi:SimilarFreqWordsApi, waitForTile:number, appServices:AppServices) {
        super(dispatcher, initialState);
        this.api = api;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.sfwApi = sfwApi;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [ActionName.LoadDataDone]: (state, action:Actions.LoadDataDone) => {
                const newState = this.copyState(state);
                newState.isBusy = false;
                if (action.error) {
                    newState.error = action.error.message;

                } else if (action.payload.data.length === 0) {
                    newState.data = Immutable.List<SummaryDataRow>();
                    newState.similarFreqWords = Immutable.List<SimilarlyFreqWord>();

                } else {
                    newState.data = Immutable.List<SummaryDataRow>(action.payload.data);
                    newState.similarFreqWords = Immutable.List<SimilarlyFreqWord>(action.payload.simFreqWords);
                    newState.currLemmaIdx = 0;
                }

                return newState;
            },
            [ActionName.SetActiveLemma]: (state, action:Actions.SetActiveLemma) => {
                const newState = this.copyState(state);
                newState.currLemmaIdx = action.payload.idx;
                return newState;
            }
        }
    }

    sideEffects(state:SummaryModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend((action:Action) => {
                    if (action.name === ConcActionName.DataLoadDone && action.payload['tileId'] === this.waitForTile) {
                        if (action.error) {
                            dispatch<Actions.LoadDataDone>({
                                name: ActionName.LoadDataDone,
                                error: new Error(this.appServices.translate('global__failed_to_obtain_required_data')),
                                payload: {
                                    data: [],
                                    simFreqWords: [],
                                    concId: null
                                }
                            });
                            return true;
                        }
                        const payload = (action as ConcActions.DataLoadDone).payload;
                        const data1$ = this.api
                            .call(stateToAPIArgs(state, payload.data.conc_persistence_op_id))
                            .concatMap(
                                (data) => Rx.Observable.of({
                                        concId: data.concId,
                                        data: data.data.map(v => {
                                            const flevel = Math.log(v.abs / state.corpusSize * 1e9) / Math.log(10);
                                            const srch = state.flevelDistrb.find(candid => ~~Math.round(candid.flevel) === ~~Math.round(flevel));
                                            return {
                                                lemma: v.lemma,
                                                pos: this.appServices.importExternalMessage(posTable[v.pos]),
                                                abs: v.abs,
                                                ipm: v.abs / state.corpusSize * 1e6,
                                                flevel: flevel,
                                                percSimilarWords: srch ? srch.rel : -1
                                            }
                                        })
                                    }));

                        const data2$ = this.sfwApi
                            .call({word: payload.data.query})
                            .map<SFWResponse, SFWResponse>(
                                (data) => ({
                                    result: data.result.map(v => ({
                                        word: v.word,
                                        abs: v.abs,
                                        ipm: v.abs / state.corpusSize * 1e6
                                    }))
                                })
                            );

                        Rx.Observable.forkJoin(data1$, data2$)
                            .subscribe(
                            (data) => {
                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    payload: {
                                        data: data[0].data,
                                        simFreqWords: data[1].result,
                                        concId: data[0].concId
                                    }
                                });
                            },
                            (err) => {
                                console.log(err);
                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    error: err,
                                    payload: {
                                        data: [], // TODO
                                        simFreqWords: [],
                                        concId: null // TODO
                                    }
                                });
                            }
                        );
                        return true;
                    }
                    return false;
                });
            break;
        }
    }
}