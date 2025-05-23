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
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { IAppServices } from '../../../appServices.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { SimilarFreqWord } from '../../../api/abstract/similarFreq.js';
import { QueryMatch, RecognizedQueries, QueryType, findCurrQueryMatch } from '../../../query/index.js';
import { List, pipe } from 'cnc-tskit';
import { MainPosAttrValues } from '../../../conf/index.js';
import { SimilarFreqWordsFrodoAPI } from './similarFreq.js';
import { CorpusInfoAPI } from '../../../api/vendor/mquery/corpusInfo.js';


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

    mainPosAttr:MainPosAttrValues;
}


export interface SummaryModelArgs {
    dispatcher:IActionQueue;
    initialState:SummaryModelState;
    tileId:number;
    api:SimilarFreqWordsFrodoAPI;
    sourceInfoApi:CorpusInfoAPI;
    appServices:IAppServices;
    queryMatches:RecognizedQueries;
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

    private readonly api:SimilarFreqWordsFrodoAPI;

    private readonly sourceInfoApi:CorpusInfoAPI;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly queryMatches:RecognizedQueries;

    constructor({
        dispatcher, initialState, tileId, api, sourceInfoApi, appServices,
        queryMatches
    }:SummaryModelArgs) {
        super(dispatcher, initialState);
        this.tileId = tileId;
        this.api = api;
        this.sourceInfoApi = sourceInfoApi;
        this.appServices = appServices;
        this.queryMatches = queryMatches;

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
                state.similarFreqWords = mkEmptySimilarWords(queryMatches);
                state.queryMatches = findCurrentMatches(queryMatches);
            },
            (state, action, dispatch) => this.loadExtendedFreqInfo(
                state

            ).subscribe({
                    next: (data) => {
                        dispatch<typeof Actions.TileDataLoaded>({
                            name: Actions.TileDataLoaded.name,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: false,
                                data: data
                            }
                        });
                    },
                    error: (error) => {
                        console.error(error);
                        dispatch<typeof Actions.TileDataLoaded>({
                            name: Actions.TileDataLoaded.name,
                            error,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: true,
                                data: [] // TODO
                            }
                        });
                    }
                })
        );
        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    state.error = this.appServices.normalizeHttpApiError(action.error);

                } else if (action.payload.data.length === 0) {
                    state.similarFreqWords = mkEmptySimilarWords(queryMatches);

                } else {
                    state.similarFreqWords[0] = action.payload.data;
                }
            }
        );
        this.addActionSubtypeHandler(
            Actions.ExpandLemmaPos,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.expandLemmaPos = action.payload.lemma;
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.GetSourceInfo,
            action => action.payload.tileId === this.tileId,
            null,
            (state, action, dispatch) => {
                this.sourceInfoApi.call(
                    this.appServices.dataStreaming().startNewSubgroup(this.tileId),
                    this.tileId,
                    0,
                    {
                        lang: appServices.getUILang(),
                        corpname: state.corpname,
                    }

                ).subscribe({
                    next: data => {
                        dispatch<typeof GlobalActions.GetSourceInfoDone>({
                            name: GlobalActions.GetSourceInfoDone.name,
                            payload: {
                                data
                            }
                        });
                    },
                    error: error => {
                        console.error(error);
                        dispatch<typeof GlobalActions.GetSourceInfoDone>({
                            name: GlobalActions.GetSourceInfoDone.name,
                            error
                        });
                    }
                });
            }
        );
    }

    private loadExtendedFreqInfo(state:SummaryModelState):Observable<Array<SimilarFreqWord>> {
        return new Observable<{variant:QueryMatch; lang:string, idx:number}>((observer) => {
            try {
                List.forEach(
                    (match, idx) => {
                        observer.next({
                            variant: findCurrQueryMatch(match),
                            lang: this.appServices.getUILang(),
                            idx
                        });
                    },
                    this.queryMatches
                );
                observer.complete();

            } catch(err) {
                observer.error(err);
            }
        }).pipe(
            mergeMap(
                (args) => this.api.call(
                    this.appServices.dataStreaming(),
                    this.tileId,
                    args.idx,
                    args.variant.lemma ?
                        {
                            corpname: state.corpname ? state.corpname : args.lang,
                            word: args.variant.word,
                            lemma: args.variant.lemma,
                            pos: state.mainPosAttr === 'pos' ?
                                List.map(v => v.value, args.variant.pos) :
                                List.map(v => v.value, args.variant.upos),
                            mainPosAttr: state.mainPosAttr,
                            srchRange: state.sfwRowRange
                        } :
                        null
                )
            )
        )
    }
}