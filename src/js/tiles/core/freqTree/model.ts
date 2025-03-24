/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import { SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable, Observer, of as rxOf } from 'rxjs';
import { map, mergeMap, reduce, concatMap } from 'rxjs/operators';
import { Dict, List, pipe, Ident } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import { BacklinkArgs, FreqTreeAPI, APILeafResponse, APIVariantsResponse } from '../../../api/vendor/kontext/freqTree.js';
import { GeneralCritFreqTreeModelState, stateToAPIArgs, FreqTreeDataBlock } from '../../../models/tiles/freqTree.js';
import { Backlink, BacklinkWithArgs } from '../../../page/tile.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { QueryMatch } from '../../../query/index.js';
import { createInitialLinesData } from '../../../models/tiles/concordance/index.js';
import { ViewMode, ConcResponse } from '../../../api/abstract/concordance.js';
import { callWithExtraVal } from '../../../api/util.js';
import { Actions as ConcActions } from '../concordance/actions.js';
import { ConcApi } from '../../../api/vendor/kontext/concordance/v015/index.js';


export interface FreqTreeModelState extends GeneralCritFreqTreeModelState {
    activeBlock:number;
    backlink:BacklinkWithArgs<BacklinkArgs>;
    maxChartsPerLine:number;
    lemmaVariants:Array<QueryMatch>;
    zoomCategory:Array<Array<string|null>>;
    posQueryGenerator:[string, string];
}

export interface FreqComparisonModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    waitForTilesTimeoutSecs:number;
    appServices:IAppServices;
    concApi:ConcApi;
    freqTreeApi:FreqTreeAPI;
    backlink:Backlink|null;
    initState:FreqTreeModelState;
}

type SingleQuerySingleBlockArgs = {queryId:number; blockId:number; lemma:QueryMatch; concId:string};


export class FreqTreeModel extends StatelessModel<FreqTreeModelState> {

    protected readonly concApi:ConcApi;

    protected readonly freqTreeApi:FreqTreeAPI;

    protected readonly appServices:IAppServices;

    protected readonly tileId:number;

    protected readonly waitForTiles:Array<number>;

    protected readonly waitForTilesTimeoutSecs:number;

    private readonly backlink:Backlink|null;

    constructor({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, appServices, concApi,
            freqTreeApi, backlink, initState}:FreqComparisonModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTiles = waitForTiles;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.appServices = appServices;
        this.concApi = concApi;
        this.freqTreeApi = freqTreeApi;
        this.backlink = backlink;

        this.addActionHandler<typeof GlobalActions.RequestQueryResponse>(
            GlobalActions.RequestQueryResponse.name,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                if (this.waitForTiles.length > 0) {
                    this.waitForActionWithTimeout(
                        this.waitForTilesTimeoutSecs * 1000,
                        {},
                        (action, syncData) => {
                            if (ConcActions.isTileDataLoaded(action) && action.payload.tileId === this.waitForTiles[0]) {
                                if (action.error) {
                                    dispatch<typeof GlobalActions.TileDataLoaded>({
                                        name: GlobalActions.TileDataLoaded.name,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: true
                                        },
                                        error: new Error(this.appServices.translate('global__failed_to_obtain_required_data')),
                                    });
                                    return null;
                                }
                                this.loadTreeData(
                                    this.composeConcordances(
                                        state, action.payload.concPersistenceIDs
                                    ),
                                    state,
                                    true,
                                    dispatch
                                );

                            } else {
                                // if foreign tile response does not send concordances, load as standalone tile
                                this.loadTreeData(this.loadConcordances(state, true), state, true, dispatch);
                                return null;
                            }
                            return syncData;
                        }
                    );

                } else {
                    this.loadTreeData(this.loadConcordances(state, true), state, true, dispatch);
                }
            }
        );

        this.addActionHandler<typeof Actions.SetActiveBlock>(
            Actions.SetActiveBlock.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.activeBlock = action.payload.idx;
                }
            }
        );
        this.addActionHandler<typeof Actions.SetZoom>(
            Actions.SetZoom.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.zoomCategory[action.payload.blockId][action.payload.variantId]) {
                        state.zoomCategory[action.payload.blockId][action.payload.variantId] = null;
                    } else {
                        state.zoomCategory[action.payload.blockId][action.payload.variantId] = action.payload.category;
                    }
                }
            }
        );
        this.addActionHandler<typeof Actions.TileDataLoaded>(
            Actions.TileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        console.error(action.error);
                        state.frequencyTree = List.map(
                            _ => ({
                                data: {},
                                ident: Ident.puid(),
                                label: '`',
                                isReady: true
                            }) as FreqTreeDataBlock,
                            state.fcritTrees
                        ),
                        state.error = this.appServices.normalizeHttpApiError(action.error);
                        state.isBusy = false;

                    } else {
                        state.frequencyTree = pipe(
                            action.payload.data,
                            Dict.toEntries(),
                            List.sorted(([key1,], [key2,]) => key1.localeCompare(key2)),
                            List.map(([blockId, data]) => ({
                                data: data,
                                ident: Ident.puid(),
                                label: state.treeLabels ? state.treeLabels[blockId] : '',
                                isReady: true,
                            }) as FreqTreeDataBlock)
                        );
                        state.isBusy = false;
                        state.backlink = null;
                    }
                }
            }
        );
        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            null,
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.concApi.getSourceDescription(this.tileId, false, this.appServices.getISO639UILang(), state.corpname)
                    .subscribe({
                        next: (data) => {
                            dispatch<typeof GlobalActions.GetSourceInfoDone>({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    data: data
                                }
                            });
                        },
                        error: (err) => {
                            console.error(err);
                            dispatch<typeof GlobalActions.GetSourceInfoDone>({
                                name: GlobalActions.GetSourceInfoDone.name,
                                error: err
                            });
                        }
                    });
                }
            }
        );
    }

    loadConcordances(state:FreqTreeModelState, multicastRequest:boolean):Observable<[ConcResponse, SingleQuerySingleBlockArgs]> {
       return rxOf(...state.lemmaVariants).pipe(
            map(
                (lv, i) => ({
                   lemma: lv,
                   queryId: i
                })
            ),
            mergeMap(args =>
                callWithExtraVal(
                    this.concApi,
                    this.tileId,
                    multicastRequest,
                    this.concApi.stateToArgs(
                        {
                            corpname: state.corpname,
                            otherCorpname: undefined,
                            subcname: null,
                            subcDesc: null,
                            kwicLeftCtx: -1,
                            kwicRightCtx: 1,
                            pageSize: 10,
                            shuffle: false,
                            attr_vmode: 'mouseover',
                            viewMode: ViewMode.KWIC,
                            tileId: this.tileId,
                            attrs: [],
                            metadataAttrs: [],
                            queries: [],
                            concordances: createInitialLinesData(state.lemmaVariants.length),
                            posQueryGenerator: state.posQueryGenerator
                        },
                        args.lemma,
                        args.queryId,
                        null
                    ),
                    {
                        corpName: state.corpname,
                        subcName: null,
                        concId: null,
                        queryId: args.queryId,
                        origQuery: this.concApi.mkMatchQuery(args.lemma, state.posQueryGenerator),
                        lemma: args.lemma
                    }
                )
            ),
            concatMap(
                ([concResp, args]) => rxOf(...state.fcritTrees).pipe(
                    map(
                        (_, blockId) => {
                            const ans:[ConcResponse, SingleQuerySingleBlockArgs] = [
                                concResp,
                                {
                                    blockId: blockId,
                                    queryId: args.queryId,
                                    lemma: args.lemma,
                                    concId: concResp.concPersistenceID
                                }
                            ];
                            return ans;
                        }
                    )
                )
            )
        );
    }

    composeConcordances(state:FreqTreeModelState, concIds: Array<string>):Observable<[{concPersistenceID:string;}, {blockId:number; queryId: number; lemma:QueryMatch; concId:string;}]> {
        return new Observable((observer:Observer<[{concPersistenceID:string;}, {blockId: number; queryId: number; lemma:QueryMatch; concId:string;}]>) => {
            state.fcritTrees.forEach((fcritTree, blockId) =>
                state.lemmaVariants.forEach((lemma, queryId) => {
                    observer.next([
                        {concPersistenceID: concIds[queryId]},
                        {blockId: blockId, queryId: queryId, lemma: lemma, concId: concIds[queryId]}
                    ]);
                })
            );
            observer.complete();
        })
    }

    loadTreeData(
        concResp:Observable<[
            {concPersistenceID:string;},
            {blockId:number; queryId:number; lemma:QueryMatch; concId:string;}
        ]>,
        state:FreqTreeModelState,
        multicastRequest:boolean,
        dispatch:SEDispatcher
    ):void {
        concResp.pipe(
            mergeMap(([resp, args]) => {
                args.concId = resp.concPersistenceID;
                return this.freqTreeApi.callVariants(
                    stateToAPIArgs(state, args.blockId, 0),
                    args.lemma,
                    resp.concPersistenceID
                ).pipe(
                    map(resp => [resp, args] as [APIVariantsResponse, {blockId:number; queryId:number; lemma:QueryMatch; concId:string;}])
                )
            }),
            mergeMap(([resp1, args]) =>
                rxOf(...resp1.fcritValues).pipe(
                    mergeMap(fcritValue =>
                        this.freqTreeApi.call(
                            this.tileId,
                            multicastRequest,
                            stateToAPIArgs(state, args.blockId, 1),
                            resp1.concId,
                            {[resp1.fcrit]: fcritValue}
                        )
                    ),
                    map(resp2 => [resp2, args] as [APILeafResponse, {blockId:number; queryId:number; lemma:QueryMatch; concId:string;}])
                )
            ),
            reduce<[APILeafResponse, {blockId:number; queryId:number; lemma:QueryMatch; concId:string;}], {concIds: Array<string>, dataTree: {[k:string]:any}}>((acc, [resp, args]) => {
                // TODO fixed depth merging here
                acc.dataTree = Dict.mergeDict(
                    (oldVal:{}, newVal:{}) => Dict.mergeDict(
                        (old2, new2) => Dict.mergeDict(
                            (_:{}, new3:{}) => new3,
                            new2,
                            old2
                        ),
                        newVal,
                        oldVal
                    ),
                    {
                        [args.blockId]:{
                            [args.lemma.word]:{
                                [this.appServices.translateResourceMetadata(
                                    state.corpname,
                                    resp.filter[state.fcritTrees[args.blockId][0]]
                                )]:resp.data.map(item => ({
                                    ...item,
                                    name: this.appServices.translateResourceMetadata(state.corpname, item.name)}
                                ))
                            }
                        }
                    },
                    acc.dataTree
                );
                acc.concIds[args.queryId] = args.concId;
                return acc;
            }, {concIds: List.map(_ => null, state.lemmaVariants), dataTree: {}})
        ).subscribe({
            next: acc => {
                dispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: acc.dataTree.size === 0,
                        data: acc.dataTree,
                        concPersistenceIDs: acc.concIds,
                        corpusName: state.corpname
                    }
                });
            },
            error: error => {
                dispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        data: null,
                        concPersistenceIDs: null,
                        corpusName: state.corpname
                    },
                    error: error
                });
            }
        });
    }
}

export const factory = (
    dispatcher:IActionQueue,
    tileId:number,
    waitForTiles:Array<number>,
    waitForTilesTimeoutSecs:number,
    appServices:IAppServices,
    concApi:ConcApi,
    freqTreeApi:FreqTreeAPI,
    backlink:Backlink|null,
    initState:FreqTreeModelState) => {

    return new FreqTreeModel({
        dispatcher,
        tileId,
        waitForTiles,
        waitForTilesTimeoutSecs,
        appServices,
        concApi,
        freqTreeApi,
        backlink,
        initState
    });
}
