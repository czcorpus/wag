/*
 * Copyright 2026 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2026 Department of Linguistics,
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

import { IFullActionControl, StatefulModel } from 'kombo';
import { IAppServices } from '../../../appServices.js';
import { Backlink } from '../../../page/tile.js';
import {
    GramatikatAPI,
    GramatikatAPIArgs,
    GramatikatFreq,
    LemmaProfileResponse,
    Histogram,
    GramatikatCatSet,
} from './api.js';
import { IDataStreaming } from '../../../page/streaming.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import {
    RecognizedQueries,
    QueryMatch,
    findCurrQueryMatch,
    testIsDictMatch,
} from '../../../query/index.js';
import { mergeMap, Observable, reduce, tap } from 'rxjs';
import { List, pipe, tuple } from 'cnc-tskit';
import { Actions } from './actions.js';
import { SystemMessageType } from '../../../types.js';

export interface GramatikatState {
    corpname: string;

    /**
     * For each queryIdx, we keep data about a lemma and its PoS
     */
    data: Array<{
        lemmaData: {
            totalFreq: number;
            variants: Array<GramatikatFreq>;
        };
        posData: {
            binEdges: Array<number>;
            histograms: Array<Histogram>;
        };
        missingPos: boolean;
    }>;
    catSet: [GramatikatCatSet, GramatikatCatSet];
    isBusy: boolean;
    backlinks: Array<Backlink>;
    error: string | undefined;
    words: Array<string>;
}

export interface ConcordanceTileModelArgs {
    dispatcher: IFullActionControl;
    tileId: number;
    appServices: IAppServices;
    api: GramatikatAPI;
    queryMatches: RecognizedQueries;
    initState: GramatikatState;
}

export class GramatikatModel extends StatefulModel<GramatikatState> {
    private readonly tileId: number;

    private readonly api: GramatikatAPI;

    private readonly queryMatches: RecognizedQueries;

    private readonly appServices: IAppServices;

    constructor({
        dispatcher,
        tileId,
        appServices,
        api,
        queryMatches,
        initState,
    }: ConcordanceTileModelArgs) {
        super(dispatcher, initState);
        this.api = api;
        this.queryMatches = queryMatches;
        this.appServices = appServices;
        this.tileId = tileId;

        this.addActionHandler(GlobalActions.RequestQueryResponse, (action) => {
            this.changeState((state) => {
                state.isBusy = true;
                state.error = null;
            });
            this.processResponse(
                this.loadData(this.appServices.dataStreaming())
            );
        });

        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            (action) => action.payload.tileId === this.tileId,
            (action) => {
                this.changeState((state) => {
                    state.isBusy = false;
                });
            }
        );

        this.addActionSubtypeHandler(
            Actions.PartialTileDataLoaded,
            (action) => action.payload.tileId === this.tileId,
            (action) => {
                if (!action.error) {
                    this.changeState((state) => {
                        state.isBusy = false;
                        state.data[action.payload.queryIdx] = {
                            lemmaData: {
                                totalFreq:
                                    action.payload.resp.lemmaInfo[0].freq,
                                variants:
                                    action.payload.resp.lemmaInfo[0]
                                        .proportions,
                            },
                            posData: {
                                binEdges:
                                    action.payload.resp.posInfo[0].binEdges,
                                histograms:
                                    action.payload.resp.posInfo[0].histograms,
                            },
                            missingPos: action.payload.resp.isAmbiguousPos,
                        };
                    });
                } else {
                    this.changeState((state) => {
                        state.isBusy = false;
                        state.error = `${action.error}`;
                    });
                    this.appServices.showMessage(
                        SystemMessageType.ERROR,
                        action.error
                    );
                }
            }
        );
    }

    private stateToArgs(m: QueryMatch): GramatikatAPIArgs {
        return {
            lemma: m.lemma,
            catSet: this.state.catSet,
            corpus: this.state.corpname,
            pos:
                Array.isArray(m.pos) && !List.empty(m.pos)
                    ? m.pos[0].value
                    : undefined,
        };
    }

    private processResponse(
        resp: Observable<[LemmaProfileResponse, number]>
    ): void {
        resp.pipe(
            tap(([resp, queryIdx]) => {
                this.dispatchSideEffect<typeof Actions.PartialTileDataLoaded>({
                    name: Actions.PartialTileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        queryIdx,
                        resp,
                    },
                });
            }),
            reduce(
                (acc, [resp]) => {
                    return {
                        isEmpty: acc.isEmpty && List.empty(resp.lemmaInfo),
                    };
                },
                { isEmpty: true }
            )
        ).subscribe({
            next: ({ isEmpty }) => {
                this.dispatchSideEffect<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty,
                    },
                });
            },
            error: (err) => {
                this.dispatchSideEffect<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                    },
                });
            },
        });
    }

    private loadData(
        streaming: IDataStreaming
    ): Observable<[LemmaProfileResponse, number]> {
        return new Observable<[GramatikatAPIArgs | null, number]>(
            (observer) => {
                try {
                    pipe(
                        this.queryMatches,
                        List.map((match) => findCurrQueryMatch(match)),
                        List.map((currMatch, queryIdx) =>
                            tuple(
                                testIsDictMatch(currMatch)
                                    ? this.stateToArgs(currMatch)
                                    : null,
                                queryIdx
                            )
                        ),
                        List.forEach((v) => {
                            observer.next(v);
                        })
                    );
                    observer.complete();
                } catch (e) {
                    observer.error(e);
                }
            }
        ).pipe(
            mergeMap(([args, queryIdx]) =>
                this.appServices.callAPI(
                    this.api,
                    streaming,
                    this.tileId,
                    queryIdx,
                    args
                )
            )
        );
    }
}
