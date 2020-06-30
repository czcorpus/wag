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

import { IAppServices } from '../../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload, Actions, ActionName } from './actions';
import { SimilarFreqWord, SimilarFreqDbAPI } from '../../../api/abstract/similarFreq';
import { findCurrQueryMatch } from '../../../models/query';
import { QueryMatch, testIsDictMatch, RecognizedQueries, QueryType, calcFreqBand } from '../../../query/index';
import { List, pipe } from 'cnc-tskit';
import { InternalResourceInfoApi } from '../../../api/vendor/wdglance/freqDbSourceInfo';

export interface FlevelDistribItem {
    rel:number;
    flevel:number;
}

export interface SummaryModelState {

    isBusy:boolean;

    error:string;

    corpname:string;

    corpusSize:number;

    similarFreqWords:Array<Array<SimilarFreqWord>>;

    queryMatches:Array<QueryMatch>;

    sfwRowRange:number;

    flevelDistrb:Array<FlevelDistribItem>;

    expandLemmaPos:string;
}


export interface SummaryModelArgs {
    dispatcher:IActionQueue;
    initialState:SummaryModelState;
    tileId:number;
    api:SimilarFreqDbAPI;
    sourceInfoApi:InternalResourceInfoApi;
    appServices:IAppServices;
    queryMatches:RecognizedQueries;
    queryDomain:string;
    queryType:QueryType;
}

export function findCurrentMatches(matches:RecognizedQueries):Array<QueryMatch> {
    return pipe(
        matches,
        List.flatMap(v => v),
        List.filter(v => v.isCurrent)
    );
}

export function mkEmptySimilarWords(queryMatches:RecognizedQueries):Array<Array<SimilarFreqWord>> {
    return List.repeat(_ => [], queryMatches.length);
}

export class SummaryModel extends StatelessModel<SummaryModelState> {

    private readonly api:SimilarFreqDbAPI;

    private readonly sourceInfoApi:InternalResourceInfoApi;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly queryMatches:RecognizedQueries;

    private readonly queryDomain:string;

    private readonly queryType:QueryType;

    constructor({dispatcher, initialState, tileId, api, sourceInfoApi, appServices, queryMatches, queryDomain, queryType}:SummaryModelArgs) {
        super(dispatcher, initialState);
        this.tileId = tileId;
        this.api = api;
        this.sourceInfoApi = sourceInfoApi;
        this.appServices = appServices;
        this.queryMatches = queryMatches;
        this.queryDomain = queryDomain;
        this.queryType = queryType;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
                state.similarFreqWords = mkEmptySimilarWords(queryMatches);
                state.queryMatches = findCurrentMatches(queryMatches);
            },
            (state, action, dispatch) => {
                (this.queryType === QueryType.CMP_QUERY ?
                    rxOf([]) :
                    this.loadExtendedFreqInfo(state)

                ).subscribe(
                    (data) => {
                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: false,
                                data: data
                            }
                        });
                    },
                    (err) => {
                        console.error(err);
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
                        state.similarFreqWords = mkEmptySimilarWords(queryMatches);

                    } else {
                        state.similarFreqWords[0] = action.payload.data;
                    }
                }
            }
        );
        this.addActionHandler<Actions.ExpandLemmaPos>(
            ActionName.ExpandLemmaPos,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.expandLemmaPos = action.payload.lemma;
                }
            }
        );

        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.sourceInfoApi.call({
                        tileId: this.tileId,
                        queryType: queryType,
                        domain: this.queryDomain,
                        corpname: state.corpname,

                    }).subscribe(
                        (data) => {
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                payload: {
                                    tileId: this.tileId,
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                error: err,
                                payload: {
                                    tileId: this.tileId,
                                }
                            });
                        }
                    );
                }
            }
        );
    }

    private loadExtendedFreqInfo(state:SummaryModelState):Observable<Array<SimilarFreqWord>> {
        return new Observable<{variant:QueryMatch; lang:string}>((observer) => {
            try {
                observer.next({
                    variant: findCurrQueryMatch(this.queryMatches[0]),
                    lang: this.queryDomain
                });
                observer.complete();

            } catch(err) {
                observer.error(err);
            }
        }).pipe(
            concatMap(
                (args) => testIsDictMatch(args.variant) ?
                    this.api.call({
                        domain: args.lang,
                        word: args.variant.word,
                        lemma: args.variant.lemma,
                        pos: List.map(v => v.value, args.variant.pos),
                        srchRange: state.sfwRowRange
                    }) :
                    rxOf<{result:Array<SimilarFreqWord>}>({
                        result: [{
                            lemma: '?',
                            pos: [],
                            ipm: 0,
                            flevel: null
                        }]
                    })
            ),
            map(
                (data) => List.map(
                    v => ({
                        lemma: v.lemma,
                        pos: v.pos,
                        ipm: v.ipm,
                        flevel: calcFreqBand(v.ipm)
                    }),
                    data.result
                )
            )
        )
    }
}