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
import { Action, ActionDispatcher, SEDispatcher, StatelessModel } from 'kombo';
import { of as rxOf } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { AppServices } from '../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';
import { LemmaFreqApi, RequestArgs, SummaryDataRow } from './api';

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
    currLemmaIdent:number;
    flevelDistrb:Immutable.List<FlevelDistribItem>;
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

    private readonly waitForTile:number;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    constructor(dispatcher:ActionDispatcher, initialState:SummaryModelState, tileId:number, api:LemmaFreqApi,
            waitForTile:number, appServices:AppServices) {
        super(dispatcher, initialState);
        this.tileId = tileId;
        this.api = api;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        newState.data = Immutable.List<SummaryDataRow>();

                    } else {
                        newState.data = Immutable.List<SummaryDataRow>(action.payload.data);
                        newState.currLemmaIdent = -1;
                    }
                    return newState;
                }
                return state;
            },
            [ActionName.HighlightLemma]: (state, action:Actions.HighlightLemma) => {
                const newState = this.copyState(state);
                newState.currLemmaIdent = action.payload.ident;
                return newState;
            },
            [ActionName.UnhighlightLemma]: (state, _) => {
                const newState = this.copyState(state);
                newState.currLemmaIdent = -1;
                return newState;
            }
        }
    }

    sideEffects(state:SummaryModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend((action:Action) => {
                    if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                        if (action.error) {
                            dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                name: GlobalActionName.TileDataLoaded,
                                error: new Error(this.appServices.translate('global__failed_to_obtain_required_data')),
                                payload: {
                                    tileId: this.tileId,
                                    isEmpty: true,
                                    data: [],
                                    concId: null
                                }
                            });
                            return true;
                        }
                        const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                        this.api
                            .call(stateToAPIArgs(state, payload.data.conc_persistence_op_id))
                            .pipe(
                                concatMap(
                                    (data) => rxOf({
                                        concId: data.concId,
                                        data: data.data.map(v => {
                                            const flevel = Math.log(v.abs / state.corpusSize * 1e9) / Math.log(10);
                                            const srch = state.flevelDistrb.find(candid => ~~Math.round(candid.flevel) === ~~Math.round(flevel));
                                            return {
                                                ident: v.ident,
                                                lemma: v.lemma,
                                                pos: v.pos.split(/\s+/).map(v => this.appServices.importExternalMessage(posTable[v])).join(', '),
                                                abs: v.abs,
                                                ipm: v.abs / state.corpusSize * 1e6,
                                                flevel: flevel,
                                                percSimilarWords: srch ? srch.rel : -1
                                            }
                                        })
                                    })
                                )
                            ).subscribe(
                                (data) => {
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: data.data.length === 0,
                                            data: data.data,
                                            concId: data.concId
                                        }
                                    });
                                },
                                (err) => {
                                    console.log(err);
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        error: err,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: true,
                                            data: [], // TODO
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