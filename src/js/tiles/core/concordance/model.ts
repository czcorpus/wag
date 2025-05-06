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

import { StatefulModel, IFullActionControl } from 'kombo';
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
import { IDataStreaming } from '../../../page/streaming.js';


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
    dispatcher:IFullActionControl;
    tileId:number;
    readDataFromTile:number|null;
    appServices:IAppServices;
    service:MQueryConcApi;
    queryMatches:RecognizedQueries;
    initState:ConcordanceTileState;
    queryType:QueryType;
}


export class ConcordanceTileModel extends StatefulModel<ConcordanceTileState> {

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
            action => {
                if (action.payload.isMobile !== this.state.isMobile) {
                    this.changeState(
                        state => {
                            state.isMobile = action.payload.isMobile;
                            if (action.payload.isMobile) {
                                state.kwicWindow = ConcordanceTileModel.CTX_SIZES[0];

                            } else {
                                state.kwicWindow = state.initialKwicWindow;
                            }
                        }
                    );
                }

                if (this.state.concordances.some(conc => conc.lines.length > 0)) {
                    const subgroup = this.appServices.dataStreaming().startNewSubgroup(this.tileId);
                    this.reloadData(subgroup, null);
                }
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.EnableTileTweakMode,
            action => action.payload.ident === this.tileId,
            action => {
                this.changeState(
                    state => {
                        state.isTweakMode = true;
                    }
                );
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.DisableTileTweakMode,
            action => action.payload.ident === this.tileId,
            action => {
                this.changeState(
                    state => {
                        state.isTweakMode = false;
                    }
                );
            }
        );

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            action => {
                this.changeState(
                    state => {
                        state.isBusy = true;
                        state.error = null;
                    }
                );
                this.reloadData(this.appServices.dataStreaming(), null);
            }
        );

        this.addActionSubtypeHandler(
            Actions.PartialTileDataLoaded,
            action => action.payload.tileId === this.tileId,
            action => {
                // note: error is handled via TileDataLoaded
                if (!action.error) {
                    this.changeState(
                        state =>  {
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
                    );
                }
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.TileDataLoaded,
            action => action.payload.tileId === this.tileId,
            action => {
                this.changeState(
                    state => {
                        state.isBusy = false;
                        if (action.error) {
                            state.concordances = createInitialLinesData(this.queryMatches.length);
                            state.error = this.appServices.normalizeHttpApiError(action.error);
                            state.backlinks = [];
                        }
                    }
                );
            }
        );

        this.addActionSubtypeHandler(
            Actions.LoadNextPage,
            action => action.payload.tileId === this.tileId,
            action => {
                this.changeState(
                    state => {
                        state.isBusy = true;
                        state.error = null;
                        state.concordances[state.visibleQueryIdx].loadPage = state.concordances[state.visibleQueryIdx].currPage + 1;
                    }
                );
                this.reloadData(this.appServices.dataStreaming().startNewSubgroup(this.tileId), null);
            }
        );

        this.addActionSubtypeHandler(
            Actions.LoadPrevPage,
            action => action.payload.tileId === this.tileId,
            action => {
                this.changeState(
                    state => {
                        state.isBusy = true;
                        state.error = null;
                        state.concordances[state.visibleQueryIdx].loadPage = state.concordances[state.visibleQueryIdx].currPage - 1;
                    }
                );
                this.reloadData(this.appServices.dataStreaming().startNewSubgroup(this.tileId), null);
            }
        );

        this.addActionSubtypeHandler(
            Actions.SetViewMode,
            action => action.payload.tileId === this.tileId,
            action => {
                this.changeState(
                    state => {
                        state.isBusy = true;
                        state.error = null;
                        state.viewMode = action.payload.mode;
                    }
                );
                this.reloadData(this.appServices.dataStreaming().startNewSubgroup(this.tileId), null);
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.TileSubgroupReady,
            action => typeof this.readDataFromTile === 'number' && this.readDataFromTile === action.payload.mainTileId,
            action => {
                const subgroup = this.appServices.dataStreaming().getSubgroup(action.payload.subgroupId);
                this.getDataFromStream(
                    subgroup.registerTileRequest<collWithExamplesResponse>(
                        {
                            tileId: this.tileId,
                            otherTileId: this.readDataFromTile,
                            contentType: 'application/json',
                        }
                    ).pipe(
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
                    )
                );
            }
        )

        this.addActionSubtypeHandler(
            GlobalActions.GetSourceInfo,
            action => action.payload.tileId === this.tileId,
            action => {
                this.concApi.getSourceDescription(
                    this.appServices.dataStreaming().startNewSubgroup(this.tileId),
                    this.tileId,
                    this.appServices.getISO639UILang(),
                    this.state.corpname

                ).subscribe({
                    next: data => {
                        this.dispatchSideEffect({
                            name: GlobalActions.GetSourceInfoDone.name,
                            payload: {
                                tileId: this.tileId,
                                data: data
                            }
                        });
                    },
                    error: err => {
                        console.error(err);
                        this.dispatchSideEffect({
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
            action => {
                this.changeState(
                    state => {
                        state.visibleQueryIdx = action.payload.queryIdx
                    }
                );
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.TileAreaClicked,
            action => action.payload.tileId === this.tileId,
            action => {
                this.changeState(
                    state => {
                        state.visibleMetadataLine = -1;
                    }
                );
            }
        );

        this.addActionSubtypeHandler(
            Actions.ShowLineMetadata,
            action => action.payload.tileId === this.tileId,
            action => {
                this.changeState(
                    state => {
                        state.visibleMetadataLine = action.payload.idx;
                    }
                );
            }
        );

        this.addActionSubtypeHandler(
            Actions.HideLineMetadata,
            action => action.payload.tileId === this.tileId,
            action => {
                this.changeState(
                    state => {
                        state.visibleMetadataLine = -1;
                    }
                );
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.FollowBacklink,
            action => action.payload.tileId === this.tileId,
            state => {
                if (this.concApi instanceof MQueryConcApi) {
                    const url = this.concApi.requestBacklink(this.stateToArgs(
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
        queryMatch:QueryMatch|null,
        queryIdx:number,
        otherLangCql:string|null
    ):ConcApiArgs {
        return {
            corpusName: this.state.corpname,
            q: mkLemmaMatchQuery(queryMatch, this.state.posQueryGenerator),
            rowsOffset: (this.state.concordances[queryIdx].loadPage - 1) * this.state.pageSize,
            maxRows: this.state.pageSize,
            contextWidth: this.state.viewMode === ViewMode.SENT ? 0 : this.state.kwicWindow,
            contextStruct: this.state.viewMode === ViewMode.SENT ? this.state.sentenceStruct : undefined,
            queryIdx
        };
    }

    private loadViaDefaultApi(
        streaming:IDataStreaming,
        otherLangCql:string
    ):Observable<[ConcResponse, number]>  {
        return new Observable<Array<ConcApiArgs>>((observer) => {
            try {
                observer.next(pipe(
                    this.queryMatches,
                    List.slice(0, this.queryType !== QueryType.CMP_QUERY ? 1 : this.queryMatches.length),
                    List.map((
                        queryMatch, queryIdx) => this.stateToArgs(
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
            mergeMap(args => this.concApi.call(streaming, this.tileId, 0, args))
        )
    }

    private reloadData(
        streaming:IDataStreaming,
        otherLangCql:string
    ):void {
        this.getDataFromStream(
            typeof this.readDataFromTile === 'number' ?
                streaming.registerTileRequest<collWithExamplesResponse>(
                    {
                        tileId: this.tileId,
                        otherTileId: this.readDataFromTile,
                        contentType: 'application/json',
                    }
                ).pipe(
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
                this.loadViaDefaultApi(streaming, otherLangCql)
        );
    }

    private getDataFromStream(data:Observable<[ConcResponse, number]>) {

        data.pipe(
            tap(
                ([resp, queryIdx]) => {
                    this.dispatchSideEffect<typeof Actions.PartialTileDataLoaded>({
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
                this.dispatchSideEffect<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: acc.isEmpty,
                        corpusName: this.state.corpname
                    }
                });
            },
            error: err => {
                this.dispatchSideEffect<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        corpusName: this.state.corpname
                    }
                });
            }
        });
    }
}