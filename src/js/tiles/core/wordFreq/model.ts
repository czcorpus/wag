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
import { Observable, of as rxOf } from 'rxjs';
import { map, concatMap } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload } from './actions';
import { FreqDBRow, FreqDbAPI, FreqBand } from './api';
import { findCurrLemmaVariant } from '../../../models/query';
import { LemmaVariant, testIsDictQuery, RecognizedQueries } from '../../../common/query';

export interface FlevelDistribItem {
    rel:number;
    flevel:number;
}

export interface SummaryModelState {

    isBusy:boolean;

    error:string;

    corpname:string;

    corpusSize:number;
    /**
     * 1st dimension: searched word
     * 2nd dimension: list of words with similar freq. including the searched word
     *   (for other than 1st word the list can be of size 1 - just the word)
     */
    data:Array<Array<FreqDBRow>>;

    sfwRowRange:number;

    flevelDistrb:Array<FlevelDistribItem>;
}

export function createInitialWordDataArray(lemmasAllQueries:Array<Array<LemmaVariant>>):Array<Array<FreqDBRow>> {
    return lemmasAllQueries.map(lemmasQuery => {
        const curr = findCurrLemmaVariant(lemmasQuery);
        return [
            {
                word: curr.word,
                lemma: curr.lemma,
                pos: curr.pos,
                abs: curr.abs,
                ipm: curr.ipm,
                arf: curr.arf,
                flevel: calcFreqBand(curr.ipm),
                isSearched: true
            }
        ];
    });

}

const calcFreqBand = (ipm:number):FreqBand => {
    if (ipm < 1) return 1;
    if (ipm < 10) return 2;
    if (ipm < 100) return 3;
    if (ipm < 1000) return 4;
    return 5;
}

export interface SummaryModelArgs {
    dispatcher:IActionQueue;
    initialState:SummaryModelState;
    tileId:number;
    api:FreqDbAPI;
    appServices:AppServices;
    lemmas:RecognizedQueries;
    queryLang:string;
}


export class SummaryModel extends StatelessModel<SummaryModelState> {

    private readonly api:FreqDbAPI;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly lemmas:RecognizedQueries;

    private readonly queryLang:string;

    constructor({dispatcher, initialState, tileId, api, appServices, lemmas, queryLang}:SummaryModelArgs) {
        super(dispatcher, initialState);
        this.tileId = tileId;
        this.api = api;
        this.appServices = appServices;
        this.lemmas = lemmas;
        this.queryLang = queryLang;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
                state.data = createInitialWordDataArray(lemmas);
            },
            (state, action, dispatch) => {
                new Observable<{variant:LemmaVariant; lang:string}>((observer) => {
                    try {
                        observer.next({
                            variant: findCurrLemmaVariant(this.lemmas[0]),
                            lang: this.queryLang
                        });
                        observer.complete();

                    } catch(err) {
                        observer.error(err);
                    }
                }).pipe(
                    concatMap(
                        (args) => testIsDictQuery(args.variant) ?
                            this.api.call({
                                lang: args.lang,
                                word: args.variant.word,
                                lemma: args.variant.lemma,
                                pos: args.variant.pos.map(v => v.value),
                                srchRange: state.sfwRowRange
                            }) :
                            rxOf({
                                result: [{
                                    word: args.variant.word,
                                    lemma: '?',
                                    pos: [],
                                    abs: 0,
                                    ipm: 0,
                                    arf: 0,
                                    flevel: -1,
                                    isSearched: true
                                }]
                            })
                    ),
                    map(
                        (data) => ({
                            data: data.result.map(v => {
                                return {
                                    word: v.isSearched ? findCurrLemmaVariant(this.lemmas[0]).word : '',
                                    lemma: v.lemma,
                                    pos: v.pos,
                                    abs: v.abs,
                                    ipm: v.ipm,
                                    arf: v.arf,
                                    flevel: calcFreqBand(v.ipm),
                                    isSearched: v.isSearched
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
                                data: data.data
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
                                data: [] // TODO
                            }
                        });
                    }
                );
            }
        );
        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        state.data = createInitialWordDataArray(lemmas);

                    } else {
                        state.data[0] = action.payload.data;
                    }
                }
            }
        );
    }
}