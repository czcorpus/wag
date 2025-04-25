/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
 *                Faculty of Arts, Charles University
 *
 * .pipe()

 Licensed under the Apache License, Version 2.0 (the "License");
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

import { SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable } from 'rxjs';
import { mergeMap, tap, reduce, map } from 'rxjs/operators';
import { List, pipe, tuple } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import {
    RecognizedQueries, QueryType, QueryMatch, findCurrQueryMatch
} from '../../../query/index.js';
import { Backlink } from '../../../page/tile.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import {
    AttrViewMode, ConcData, ConcResponse, createInitialLinesData, ViewMode
} from '../../../api/vendor/mquery/concordance/common.js';
import { ConcApiArgs, MQueryConcApi } from '../../../api/vendor/mquery/concordance/index.js';
import { mkLemmaMatchQuery } from '../../../api/vendor/mquery/common.js';
import { collWithExamplesResponse } from '../colloc/common.js';


export interface ConcordanceTileState {
    tileId:number;
    queries:Array<string>;
    corpname:string;
    otherCorpname:string;
    subcname:string;
    subcDesc:string;
    pageSize:number;
    attr_vmode:AttrViewMode;
    viewMode:ViewMode;
    sentenceStruct:string;
    metadataAttrs:Array<{value:string; label:string}>;
    attrs:Array<string>;
    posQueryGenerator:[string, string];
    concordances:Array<ConcData>;
    visibleQueryIdx:number;
    isBusy:boolean;
    error:string|null;
    isTweakMode:boolean;
    isMobile:boolean;
    widthFract:number;
    kwicWindow:number;
    initialKwicWindow:number;
    backlinks:Array<Backlink>;
    disableViewModes:boolean;
    visibleMetadataLine:number;

    /**
     * If true, then the tile won't show
     * ipm and abs. freq. as we expect that
     * the tile just shows examples of a phenomenon
     * from a different tile
     * (e.g. coll => examples of coll words)
     */
    isExamplesMode:boolean;
}


export interface ConcordanceTileModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    readDataFromTile:number|null;
    appServices:IAppServices;
    service:MQueryConcApi;
    queryMatches:RecognizedQueries;
    initState:ConcordanceTileState;
    queryType:QueryType;
}


export class ConcordanceTileModel extends StatelessModel<ConcordanceTileState> {

    private readonly concApi:MQueryConcApi;

    private readonly queryMatches:RecognizedQueries;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly queryType:QueryType;

    private readonly readDataFromTile:number|null;

    public static readonly CTX_SIZES = [8, 10, 18, 28];

    constructor({dispatcher, tileId, appServices, service, queryMatches, initState,
            queryType, readDataFromTile}:ConcordanceTileModelArgs) {
        super(dispatcher, initState);
        this.concApi = service;
        this.queryMatches = queryMatches;
        this.appServices = appServices;
        this.tileId = tileId;
        this.queryType = queryType;
        this.readDataFromTile = readDataFromTile;

        this.addActionHandler(
            GlobalActions.SetScreenMode,
            (state, action) => {
                if (action.payload.isMobile !== state.isMobile) {
                    state.isMobile = action.payload.isMobile;
                    if (action.payload.isMobile) {
                        state.kwicWindow = ConcordanceTileModel.CTX_SIZES[0];

                    } else {
                        state.kwicWindow = state.initialKwicWindow;
                    }
                }
            },
            (state, action, dispatch) => {
                if (state.concordances.some(conc => conc.lines.length > 0)) {
                    this.reloadData(state, false, null, dispatch);
                }
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.EnableTileTweakMode,
            action => action.payload.ident === this.tileId,
            (state, action) => {
                state.isTweakMode = true;
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.DisableTileTweakMode,
            action => action.payload.ident === this.tileId,
            (state, action) => {
                state.isTweakMode = false;
            }
        );

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                this.reloadData(state, true, null, dispatch);
            }
        );

        this.addActionSubtypeHandler(
            Actions.PartialTileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                // note: error is handled via TileDataLoaded
                if (!action.error) {
                    state.concordances[action.payload.queryIdx] = {
                        concSize: action.payload.resp.concSize,
                        ipm: action.payload.resp.ipm,
                        currPage: state.concordances[action.payload.queryIdx].loadPage,
                        loadPage: state.concordances[action.payload.queryIdx].loadPage,
                        numPages: Math.ceil(action.payload.resp.concSize / state.pageSize),
                        queryIdx: action.payload.queryIdx,
                        lines: action.payload.resp.lines
                    };
                    state.backlinks.push(this.concApi.getBacklink(action.payload.queryIdx));
                }
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.TileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    state.concordances = createInitialLinesData(this.queryMatches.length);
                    state.error = this.appServices.normalizeHttpApiError(action.error);
                    state.backlinks = [];
                }
            }
        );

        this.addActionSubtypeHandler(
            Actions.LoadNextPage,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
                state.concordances[state.visibleQueryIdx].loadPage = state.concordances[state.visibleQueryIdx].currPage + 1;
            },
            (state, action, dispatch) => {
                this.reloadData(state, false, null, dispatch);
            }
        );

        this.addActionSubtypeHandler(
            Actions.LoadPrevPage,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
                state.concordances[state.visibleQueryIdx].loadPage = state.concordances[state.visibleQueryIdx].currPage - 1;
            },
            (state, action, dispatch) => {
                this.reloadData(state, false, null, dispatch);
            }
        );

        this.addActionSubtypeHandler(
            Actions.SetViewMode,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
                state.viewMode = action.payload.mode;
            },
            (state, action, dispatch) => {
                this.reloadData(state, false, null, dispatch);
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.GetSourceInfo,
            action => action.payload.tileId === this.tileId,
            null,
            (state, action, dispatch) => {
                this.concApi.getSourceDescription(this.tileId, false, this.appServices.getISO639UILang(), state.corpname)
                .subscribe({
                    next: data => {
                        dispatch({
                            name: GlobalActions.GetSourceInfoDone.name,
                            payload: {
                                tileId: this.tileId,
                                data: data
                            }
                        });
                    },
                    error: err => {
                        console.error(err);
                        dispatch({
                            name: GlobalActions.GetSourceInfoDone.name,
                            error: err,
                            payload: {
                                tileId: this.tileId,
                            }
                        });
                    }
                });
            }
        );

        this.addActionSubtypeHandler(
            Actions.SetVisibleQuery,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.visibleQueryIdx = action.payload.queryIdx
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.TileAreaClicked,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.visibleMetadataLine = -1;
            }
        );

        this.addActionSubtypeHandler(
            Actions.ShowLineMetadata,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.visibleMetadataLine = action.payload.idx;
            }
        );

        this.addActionSubtypeHandler(
            Actions.HideLineMetadata,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.visibleMetadataLine = -1;
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.FollowBacklink,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                if (this.concApi instanceof MQueryConcApi) {
                    const url = this.concApi.requestBacklink(this.stateToArgs(
                        state,
                        findCurrQueryMatch(this.queryMatches[0]),
                        0, // TODO
                        null
                    ));
                    window.open(url.toString(),'_blank');

                } else {
                    alert('TODO - not implemented yet');
                    // TODO
                }
            }
        );
    }


    private stateToArgs(
        state:ConcordanceTileState,
        queryMatch:QueryMatch|null,
        queryIdx:number,
        otherLangCql:string|null
    ):ConcApiArgs {
        return {
            corpusName: state.corpname,
            q: mkLemmaMatchQuery(queryMatch, state.posQueryGenerator),
            rowsOffset: (state.concordances[queryIdx].loadPage - 1) * state.pageSize,
            maxRows: state.pageSize,
            contextWidth: state.viewMode === ViewMode.SENT ? 0 : state.kwicWindow,
            contextStruct: state.viewMode === ViewMode.SENT ? state.sentenceStruct : undefined,
            queryIdx
        };
    }

    private loadViaDefaultApi(
        state:ConcordanceTileState,
        multicastRequest:boolean,
        otherLangCql:string
    ):Observable<[ConcResponse, number]>  {
        return new Observable<Array<ConcApiArgs>>((observer) => {
            try {
                observer.next(pipe(
                    this.queryMatches,
                    List.slice(0, this.queryType !== QueryType.CMP_QUERY ? 1 : this.queryMatches.length),
                    List.map((
                        queryMatch, queryIdx) => this.stateToArgs(
                            state,
                            findCurrQueryMatch(queryMatch),
                            queryIdx,
                            otherLangCql
                        )
                    )
                ));
                observer.complete();

            } catch (e) {
                observer.error(e);
            }

        }).pipe(
            mergeMap(args => this.concApi.call(this.tileId, multicastRequest, args))
        )
    }

    private reloadData(
        state:ConcordanceTileState,
        multicastRequest:boolean,
        otherLangCql:string,
        dispatch:SEDispatcher
    ):void {
        (
            typeof this.readDataFromTile === 'number' ?
                this.appServices.dataStreaming().registerTileRequest<collWithExamplesResponse>(
                    multicastRequest,
                    {
                        tileId: this.tileId,
                        otherTileId: this.readDataFromTile,
                        contentType: 'application/json',
                    }
                ).pipe(
                    tap(
                        resp => {
                            console.log('resp>>>>> ', resp)
                        }
                    ),
                    map<collWithExamplesResponse, [ConcResponse, number]> (
                        resp => tuple(
                            {
                                concSize: 0,
                                ipm: 0,
                                lines: pipe(
                                    resp.colls,
                                    List.flatMap(x => x.examples),
                                    List.map(ex => ({
                                        ...ex,
                                        metadata: []
                                    }))
                                ),
                                resultType:'concordance'
                            },
                            0
                        ) // TODO upgrade once we support cmp
                    )
                ) :
                this.loadViaDefaultApi(state, multicastRequest, otherLangCql)

        ).pipe(
            tap(
                ([resp, queryIdx]) => {
                    dispatch<typeof Actions.PartialTileDataLoaded>({
                        name: Actions.PartialTileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            queryIdx,
                            resp,
                            domain1: null,
                            domain2: null
                        }
                    });
                }
            ),
            reduce(
                (acc, [resp,]) => {
                    return {
                        isEmpty: acc.isEmpty && resp.lines.length === 0
                    };
                },
                {isEmpty: true}
            )

        ).subscribe({
            next: acc => {
                dispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: acc.isEmpty,
                        corpusName: state.corpname
                    }
                });
            },
            error: err => {
                dispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        corpusName: state.corpname
                    }
                });
            }
        });
    }
}