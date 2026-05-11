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

import { IFullActionControl, StatefulModel, StatelessModel } from 'kombo';
import { AppServices, IAppServices } from '../../../appServices.js';
import { Backlink } from '../../../page/tile.js';
import {
    GramatikatAPI,
    GramatikatAPIArgs,
    GramatikatAPIResponse,
    GramatikatFreq,
} from './api.js';
import { IDataStreaming } from '../../../page/streaming.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import {
    RecognizedQueries,
    QueryType,
    QueryMatch,
    findCurrQueryMatch,
    testIsDictMatch,
    LemmatizationLevel,
    LemmatizationLevelTest,
} from '../../../query/index.js';
import { mergeMap, Observable } from 'rxjs';
import { List, pipe, tuple } from 'cnc-tskit';
import { Actions } from './actions.js';

export interface GramatikatState {
    corpname: string;
    data: {
        totalFreq: number;
        variants: Array<GramatikatFreq>;
    };
    isBusy: boolean;
    backlinks: Array<Backlink>;
    error: string | undefined;
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
                if (!action.error) {
                    console.log('>>>>> ', action.payload.resp);
                    this.changeState((state) => {
                        state.data = {
                            totalFreq: action.payload.resp.freq,
                            variants: action.payload.resp.proportions,
                        };
                    });
                }
            }
        );
    }

    private stateToArgs(m: QueryMatch, queryIdx: number): GramatikatAPIArgs {
        return {
            lemma: m.lemma,
        };
    }

    private processResponse(
        resp: Observable<[GramatikatAPIResponse, number]>
    ): void {
        resp.subscribe({
            next: ([resp]) => {
                this.dispatchSideEffect<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: false,
                        resp,
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
                        resp: undefined,
                    },
                });
            },
        });
    }

    private loadData(
        streaming: IDataStreaming
    ): Observable<[GramatikatAPIResponse, number]> {
        console.log('******************* LOAD_DATA');
        return new Observable<[GramatikatAPIArgs | null, number]>(
            (observer) => {
                try {
                    pipe(
                        this.queryMatches,
                        List.map((match) => findCurrQueryMatch(match)),
                        List.map((currMatch, queryIdx) =>
                            tuple(
                                testIsDictMatch(currMatch)
                                    ? this.stateToArgs(currMatch, queryIdx)
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
