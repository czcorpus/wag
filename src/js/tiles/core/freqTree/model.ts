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
import { map, mergeMap, reduce, tap, concatMap } from 'rxjs/operators';
import { Dict, List, pipe, Ident } from 'cnc-tskit';

import { AppServices } from '../../../appServices';
import { BacklinkArgs, FreqTreeAPI, APILeafResponse, APIVariantsResponse } from '../../../common/api/kontext/freqTree';
import { GeneralCritFreqTreeModelState, stateToAPIArgs, FreqTreeDataBlock } from '../../../common/models/freqTree';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';
import { QueryMatch } from '../../../common/query';
import { ConcApi, mkMatchQuery, QuerySelector } from '../../../common/api/kontext/concordance';
import { isConcLoadedPayload, ConcLoadedPayload } from '../concordance/actions';
import { createInitialLinesData } from '../../../common/models/concordance';
import { ViewMode, ConcResponse } from '../../../common/api/abstract/concordance';
import { callWithExtraVal } from '../../../common/api/util';


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
    appServices:AppServices;
    concApi:ConcApi;
    freqTreeApi:FreqTreeAPI;
    backlink:Backlink|null;
    initState:FreqTreeModelState;
}

type SingleQuerySingleBlockArgs = {queryId:number; blockId:number; lemma:QueryMatch; concId:string};


export class FreqTreeModel extends StatelessModel<FreqTreeModelState> {

    protected readonly concApi:ConcApi;

    protected readonly freqTreeApi:FreqTreeAPI;

    protected readonly appServices:AppServices;

    protected readonly tileId:number;

    protected readonly waitForTiles:Array<number>;

    private readonly backlink:Backlink|null;

    constructor({dispatcher, tileId, waitForTiles, appServices, concApi, freqTreeApi, backlink, initState}:FreqComparisonModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTiles = waitForTiles;
        this.appServices = appServices;
        this.concApi = concApi;
        this.freqTreeApi = freqTreeApi;
        this.backlink = backlink;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                if (this.waitForTiles.length > 0) {
                    this.suspend({}, (action, syncData) => {
                        if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTiles[0]) {
                            if (isConcLoadedPayload(action.payload)) {
                                const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                                if (action.error) {
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: true,
                                            data: null,
                                            concPersistenceIDs: null,
                                            corpusName: state.corpname
                                        },
                                        error: new Error(this.appServices.translate('global__failed_to_obtain_required_data')),
                                    });
                                    return null;
                                }
                                this.loadTreeData(this.composeConcordances(state, payload.concPersistenceIDs), state, dispatch);

                            } else {
                                // if foreign tile response does not send concordances, load as standalone tile
                                this.loadTreeData(this.loadConcordances(state), state, dispatch);
                            }
                            return null;
                        }
                        return syncData;
                    });

                } else {
                    this.loadTreeData(this.loadConcordances(state), state, dispatch);
                }
            }
        );
        this.addActionHandler<Actions.SetActiveBlock>(
            ActionName.SetActiveBlock,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.activeBlock = action.payload.idx;
                }
            }
        );
        this.addActionHandler<Actions.SetZoom>(
            ActionName.SetZoom,
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
        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
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
                        state.error = action.error.message;
                        state.isBusy = false;

                    } else {
                        state.frequencyTree = pipe(
                            action.payload.data,
                            Dict.toEntries(),
                            List.sort(([key1,], [key2,]) => key1.localeCompare(key2)),
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
        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.concApi.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
                    .subscribe(
                        (data) => {
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                payload: {
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                error: err

                            });
                        }
                    );
                }
            }
        );
    }

    loadConcordances(state:FreqTreeModelState):Observable<[ConcResponse, SingleQuerySingleBlockArgs]> {
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
                    this.concApi.stateToArgs(
                        {
                            querySelector: QuerySelector.CQL,
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
                        origQuery: mkMatchQuery(args.lemma, state.posQueryGenerator),
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

    loadTreeData(concResp:Observable<[{concPersistenceID:string;}, {blockId:number; queryId:number; lemma:QueryMatch; concId:string;}]> ,state:FreqTreeModelState, dispatch:SEDispatcher):void {
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
                                [this.appServices.translateDbValue(
                                    state.corpname,
                                    resp.filter[state.fcritTrees[args.blockId][0]]
                                )]:resp.data.map(item => ({
                                    ...item,
                                    name: this.appServices.translateDbValue(state.corpname, item.name)}
                                ))
                            }
                        }
                    },
                    acc.dataTree
                );
                acc.concIds[args.queryId] = args.concId;
                return acc;
            }, {concIds: List.map(_ => null, state.lemmaVariants), dataTree: {}})
        ).subscribe(
            acc => {
                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: acc.dataTree.size === 0,
                        data: acc.dataTree,
                        concPersistenceIDs: acc.concIds,
                        corpusName: state.corpname
                    }
                });
            },
            error => {
                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
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
        );
    }
}

export const factory = (
    dispatcher:IActionQueue,
    tileId:number,
    waitForTiles:Array<number>,
    appServices:AppServices,
    concApi:ConcApi,
    freqTreeApi:FreqTreeAPI,
    backlink:Backlink|null,
    initState:FreqTreeModelState) => {

    return new FreqTreeModel({
        dispatcher,
        tileId,
        waitForTiles,
        appServices,
        concApi,
        freqTreeApi,
        backlink,
        initState
    });
}
