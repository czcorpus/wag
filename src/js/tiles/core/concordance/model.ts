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
    AttrViewMode, ConcData, ConcResponse, createInitialLinesData, Line, ViewMode
} from '../../../api/vendor/mquery/concordance/common.js';
import { ConcApiArgs, MQueryConcApi } from '../../../api/vendor/mquery/concordance/index.js';
import { mkLemmaMatchQuery } from '../../../api/vendor/mquery/common.js';
import { CollWithExamplesResponse } from '../colloc/common.js';
import { IDataStreaming } from '../../../page/streaming.js';
import { CorpusInfoAPI } from '../../../api/vendor/mquery/corpusInfo.js';
import { HTTPResponse as TranslatHTTPResponse } from '../translations/api.js';


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
    api:MQueryConcApi;
    infoApi?:CorpusInfoAPI;
    queryMatches:RecognizedQueries;
    initState:ConcordanceTileState;
    queryType:QueryType;
}

export type SupportedForeignResponses = CollWithExamplesResponse | TranslatHTTPResponse;

function isCollWithExamplesResponse(v:SupportedForeignResponses):v is CollWithExamplesResponse {
    return Array.isArray(v['colls']) && v['resultType'] === 'collWithExamples';
}

function isTranslationResponse(v:SupportedForeignResponses):v is TranslatHTTPResponse {
    return Array.isArray(v['lines']) && v['sum'] !== undefined;
}


function transformSupportedForeignResponse(resp:SupportedForeignResponses):Array<Line> {
    if (isCollWithExamplesResponse(resp)) {
        return pipe(
            resp.colls,
            List.flatMap(x => x.examples),
            List.map(ex => ({
                ...ex,
                metadata: []
            }))
        );

    } else if (isTranslationResponse(resp)) {
        return pipe(
            resp.lines,
            List.map(
                item => item.to.error ?
                    [{
                        ref: '',
                        text: [{
                            type: 'token' as 'token',
                            word: `-- ${item.to.error} -- `,
                            matchType: 'kwic' as 'kwic',
                            strong: true,
                            attrs:{}
                        }],
                        interactionId: item.to.examples?.interactionId,
                        alignedText: [],
                        metadata: []
                    } as Line] :
                    List.map(
                        text => ({
                            ref: text.ref,
                            text: text.text,
                            alignedText: text.alignedText,
                            metadata: text.metadata,
                            interactionId: item.to.examples.interactionId
                        }),
                        item.to.examples.text
                    )
            ),
            List.flatMap(
                item => item
            )
        );

    } else {
        throw new Error('unknown foreign response');
    }
}

/**
 *
 */
export class ConcordanceTileModel extends StatefulModel<ConcordanceTileState> {

    private readonly concApi:MQueryConcApi;

    private readonly queryMatches:RecognizedQueries;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly queryType:QueryType;

    private readonly readDataFromTile:number|null;

    private readonly infoApi:CorpusInfoAPI|undefined;

    public static readonly CTX_SIZES = [8, 10, 18, 28];

    constructor({dispatcher, tileId, appServices, api, infoApi, queryMatches, initState,
            queryType, readDataFromTile}:ConcordanceTileModelArgs) {
        super(dispatcher, initState);
        this.concApi = api;
        this.infoApi = infoApi;
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
                            if (action.payload.resp.corpname) { // this applies for foreign data conc.
                                state.corpname = action.payload.resp.corpname;
                            }
                            if (action.payload.resp.alignedCorpname) {
                                state.otherCorpname = action.payload.resp.alignedCorpname;
                                state.viewMode = ViewMode.ALIGN
                            }
                            if (state.backlinks[action.payload.queryIdx] === null) {
                                state.backlinks[action.payload.queryIdx] = this.concApi.getBacklink(action.payload.queryIdx);
                            }
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
                            state.backlinks = List.map(_ => null, this.queryMatches);
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
                    subgroup.registerTileRequest<CollWithExamplesResponse>(
                        {
                            tileId: this.tileId,
                            otherTileId: this.readDataFromTile,
                            contentType: 'application/json',
                        }
                    ).pipe(
                        map<CollWithExamplesResponse, [ConcResponse, number]> (
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
                this.infoApi.call(
                    this.appServices.dataStreaming().startNewSubgroup(this.tileId),
                    this.tileId,
                    0,
                    {
                        corpname: this.state.corpname,
                        lang: this.appServices.getISO639UILang()
                    }
                ).subscribe({
                    next: data => {
                        this.dispatchSideEffect({
                            name: GlobalActions.GetSourceInfoDone.name,
                            payload: {
                                tileId: this.readDataFromTile,
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
                                tileId: this.readDataFromTile,
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
            action => {
                if (this.concApi instanceof MQueryConcApi) {
                    const url = this.concApi.requestBacklink(this.stateToArgs(
                        findCurrQueryMatch(this.queryMatches[action.payload.backlink.queryId]),
                        action.payload.backlink.queryId,
                        null
                    ));
                    window.open(url.toString(),'_blank');

                } else {
                    alert('TODO - not implemented yet');
                    // TODO
                }
            }
        );

        this.addActionHandler(
            GlobalActions.SubqItemHighlighted,
            action => {
                this.changeState(
                    state => {
                        state.concordances[state.visibleQueryIdx].lines = pipe(
                            state.concordances[state.visibleQueryIdx].lines,
                            List.map(
                                v => ({
                                    ...v,
                                    highlighted: v.interactionId === action.payload.interactionId
                                })
                            )
                        );
                    }
                );
            }
        );

        this.addActionHandler(
            GlobalActions.SubqItemDehighlighted,
            action => {
                this.changeState(
                    state => {
                        state.concordances[state.visibleQueryIdx].lines = pipe(
                            state.concordances[state.visibleQueryIdx].lines,
                            List.map(
                                v => ({
                                    ...v,
                                    highlighted: false
                                })
                            )
                        );
                    }
                );
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
        return new Observable<ConcApiArgs>((observer) => {
            try {
                pipe(
                    this.queryMatches,
                    List.slice(0, this.queryType !== QueryType.CMP_QUERY ? 1 : this.queryMatches.length),
                    List.map((
                        queryMatch, queryIdx) => this.stateToArgs(
                            findCurrQueryMatch(queryMatch),
                            queryIdx,
                            otherLangCql
                        )
                    ),
                    List.forEach(args => observer.next(args)),
                );
                observer.complete();

            } catch (e) {
                observer.error(e);
            }

        }).pipe(
            mergeMap(args => this.concApi.call(streaming, this.tileId, args.queryIdx, args))
        )
    }

    private reloadData(
        streaming:IDataStreaming,
        otherLangCql:string
    ):void {
        this.getDataFromStream(
            typeof this.readDataFromTile === 'number' ?
                streaming.registerTileRequest<SupportedForeignResponses>(
                    {
                        tileId: this.tileId,
                        queryIdx: 0, // TODO
                        otherTileId: this.readDataFromTile,
                        otherTileQueryIdx: 0, // TODO
                        contentType: 'application/json',
                    }
                ).pipe(
                    map(
                        resp => tuple(
                            {
                                concSize: 0,
                                ipm: 0,
                                lines: transformSupportedForeignResponse(resp),
                                corpname: isTranslationResponse(resp) ? resp.fromCorp : undefined,
                                alignedCorpname: isTranslationResponse(resp) ? resp.toCorp : undefined,
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
                            resp
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