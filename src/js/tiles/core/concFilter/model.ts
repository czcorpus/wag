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
import { map, concatMap, reduce, tap } from 'rxjs/operators';
import { of as rxOf } from 'rxjs';
import { StatelessModel, Action, SEDispatcher, IActionQueue } from 'kombo';

import { AppServices } from '../../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions, isTileSomeDataLoadedAction } from '../../../models/actions';
import { SubQueryItem, SubqueryPayload, RangeRelatedSubqueryValue, RecognizedQueries } from '../../../common/query';
import { ConcApi, FilterRequestArgs, QuerySelector, FilterPCRequestArgs, QuickFilterRequestArgs } from '../../../common/api/kontext/concordance';
import { Line, ViewMode, ConcResponse } from '../../../common/api/abstract/concordance';
import { Observable } from 'rxjs';
import { isConcLoadedPayload } from '../concordance/actions';
import { CollExamplesLoadedPayload } from './actions';
import { Actions, ActionName } from './actions';
import { normalizeTypography } from '../../../common/models/concordance/normalize';
import { ISwitchMainCorpApi, SwitchMainCorpResponse } from '../../../common/api/abstract/switchMainCorp';
import { Dict, pipe, List } from '../../../common/collections';
import { callWithExtraVal } from '../../../common/api/util';


export interface ConcFilterModelState {
    isBusy:boolean;
    isTweakMode:boolean;
    isMobile:boolean;
    widthFract:number;
    error:string;
    corpName:string;
    otherCorpname:string|null;
    posAttrs:Array<string>;
    attrVmode:'mouseover';
    viewMode:ViewMode;
    itemsPerSrc:number;
    lines:Array<Line>;
    concPersistenceIds:Array<string>;
    metadataAttrs:Array<{value:string; label:string}>;
    visibleMetadataLine:number;
}


type TileWaitSync = {[tileId:string]:boolean};


type SubqueryMapping = {[subq:string]:SubQueryItem<RangeRelatedSubqueryValue>};

interface SourceLoadingData {
    concordanceIds:Array<string>;
    subqueries:SubqueryMapping;
}

interface SingleQueryFreqArgs {
    concId:string;
    queryId:number;
    subqs:SubqueryMapping;
}

export interface ConcFilterModelArgs {
    tileId:number;
    waitForTiles:Array<number>;
    subqSourceTiles:Array<number>;
    dispatcher:IActionQueue;
    appServices:AppServices;
    api:ConcApi;
    switchMainCorpApi:ISwitchMainCorpApi;
    initState:ConcFilterModelState;
    lemmas:RecognizedQueries;
}


export class ConcFilterModel extends StatelessModel<ConcFilterModelState, TileWaitSync> {

    private readonly api:ConcApi;

    private readonly switchMainCorpApi:ISwitchMainCorpApi;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly waitingForTiles:Array<number>;

    private readonly subqSourceTiles:Array<number>;

    private readonly lemmas:RecognizedQueries;

    constructor({dispatcher, tileId, waitForTiles, subqSourceTiles, appServices, api, switchMainCorpApi, initState, lemmas}:ConcFilterModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.switchMainCorpApi = switchMainCorpApi;
        this.waitingForTiles = [...waitForTiles];
        this.subqSourceTiles = [...subqSourceTiles];
        this.appServices = appServices;
        this.lemmas = lemmas;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action)  => {
                state.isBusy = true;
                state.error = null;
                state.lines = [];
                state.concPersistenceIds = List.repeat(() => '', this.lemmas.length);
            },
            (state, action, dispatch) => {
                this.handleDataLoad(state, false, dispatch);
            }
        );

        this.addActionHandler<GlobalActions.TilePartialDataLoaded<CollExamplesLoadedPayload>>(
            GlobalActionName.TilePartialDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.lines = state.lines.concat(action.payload.data);
                    state.concPersistenceIds[action.payload.queryId] = action.payload.baseConcId;
                }
            }
        );

        this.addActionHandler<GlobalActions.TileDataLoaded<{}>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.error = action.error.message;
                    }
                }
            }
        );

        this.addActionHandler<GlobalActions.SubqItemHighlighted>(
            GlobalActionName.SubqItemHighlighted,
            (state, action) => {
                const srchIdx = state.lines.findIndex(v => v.interactionId === action.payload.interactionId);
                if (srchIdx > -1) {
                    const line = state.lines[srchIdx];
                    state.lines[srchIdx] = {
                        left: line.left,
                        kwic: line.kwic,
                        right: line.right,
                        align: line.align,
                        metadata: line.metadata || [],
                        toknum: line.toknum,
                        interactionId: line.interactionId,
                        isHighlighted: true
                    };
               }
            }
        );
        this.addActionHandler<GlobalActions.SubqItemDehighlighted>(
            GlobalActionName.SubqItemDehighlighted,
            (state, action) => {
                const srchIdx = state.lines.findIndex(v => v.interactionId === action.payload.interactionId);
                if (srchIdx > -1) {
                    const line = state.lines[srchIdx];
                    state.lines[srchIdx] = {
                        left: line.left,
                        kwic: line.kwic,
                        right: line.right,
                        align: line.align,
                        metadata: line.metadata || [],
                        toknum: line.toknum,
                        interactionId: line.interactionId,
                        isHighlighted: false
                    };
                }
            }
        );
        this.addActionHandler<GlobalActions.SubqChanged>(
            GlobalActionName.SubqChanged,
            (state, action) => {
                if (Dict.hasKey(action.payload.tileId.toFixed()), this.waitingForTiles) {
                    state.isBusy = true;
                    state.lines = [];
                }
            },
            (state, action, dispatch) => {
                this.handleDataLoad(state, true, dispatch);
            }
        );
        this.addActionHandler<GlobalActions.TileAreaClicked>(
            GlobalActionName.TileAreaClicked,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.visibleMetadataLine = -1;
                }
            }
        );
        this.addActionHandler<Actions.ShowLineMetadata>(
            ActionName.ShowLineMetadata,
            (state, action) => {
                state.visibleMetadataLine = action.payload.idx;
            }
        );
        this.addActionHandler<Actions.HideLineMetadata>(
            ActionName.HideLineMetadata,
            (state, action) => {
                state.visibleMetadataLine = -1;
            }
        );
        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpName)
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

    private mkConcArgs(state:ConcFilterModelState, subq:SubQueryItem<RangeRelatedSubqueryValue>, concId:string):FilterRequestArgs|FilterPCRequestArgs|QuickFilterRequestArgs {

        const mkContextFilter = (ctx:[number, number], val:string):string =>
            ctx[0] === 0 && ctx[1] === 0 ?
                `p0 0>0 0 [lemma="${val}"]` :
                `P${subq.value.context[0]} ${subq.value.context[1]} 1 [lemma="${subq.value.value}"]`;

        if (state.otherCorpname) {
            return {
                queryselector: QuerySelector.CQL,
                corpname: state.corpName,
                maincorp: state.otherCorpname, // we need to filter using the 2nd language
                align: state.otherCorpname,
                kwicleftctx: undefined,
                kwicrightctx: undefined,
                async: '0',
                pagesize: '5',
                fromp: '1', // TODO choose randomly stuff??
                attr_vmode: state.attrVmode,
                attrs: state.posAttrs.join(','),
                refs: state.metadataAttrs.map(v => '=' + v.value).join(','),
                viewmode: state.viewMode,
                shuffle: 1,
                q: '~' + concId,
                q2: mkContextFilter(subq.value.context, subq.value.value),
                format: 'json',
            };

        } else {
            return {
                queryselector: QuerySelector.CQL,
                corpname: state.corpName,
                kwicleftctx: undefined,
                kwicrightctx: undefined,
                async: '0',
                pagesize: '5',
                fromp: '1', // TODO choose randomly stuff??
                attr_vmode: state.attrVmode,
                attrs: state.posAttrs.join(','),
                refs: state.metadataAttrs.map(v => '=' + v.value).join(','),
                viewmode: state.viewMode,
                shuffle: 1,
                q: '~' + concId,
                q2: mkContextFilter(subq.value.context, subq.value.value),
                format: 'json'
            };
        }
    }

    /**
     *
     * @param state
     * @param concId
     * @param query
     * @return Observable of tuple [base conc ID, queryId, filtered conc response]
     */
    private loadFreqs(state:ConcFilterModelState, concId:string, queryId:number, query:SubQueryItem<RangeRelatedSubqueryValue>):Observable<[string, number, ConcResponse]> {
        return rxOf(query).pipe(
            concatMap(
                subq => callWithExtraVal(
                    this.api,
                    this.mkConcArgs(state, subq, concId),
                    subq
                )
            ),
            map(
                ([v, subq]) => [
                    concId,
                    queryId,
                    {
                        concPersistenceID: v.concPersistenceID,
                        messages: v.messages,
                        lines: v.lines.map(line => ({
                            left: line.left,
                            kwic: line.kwic,
                            right: line.right,
                            align: line.align,
                            metadata: (line.metadata || []).map(item => ({
                                value: item.value,
                                label: (() => {
                                    const srch = state.metadataAttrs.find(v => v.value === item.label);
                                    return srch ? srch.label : item.label;
                                })()
                            })),
                            toknum: line.toknum,
                            interactionId: subq.interactionId
                        })),
                        concsize: v.concsize,
                        arf: v.arf,
                        ipm: v.ipm,
                        query: v.query,
                        corpName: v.corpName,
                        subcorpName: v.subcorpName,
                        align: state.otherCorpname, // TODO not always needed
                        maincorp: state.otherCorpname, // TODO not always needed
                    }
                ]
            )
        );
    }

    private isFromSubqSourceTile(action:Action):action is (Action<{tileId: number} & SubqueryPayload<RangeRelatedSubqueryValue>>) {
        return this.subqSourceTiles.find(v => v === action.payload['tileId'] && action.payload['subqueries']) !== undefined;
    }

    private handleDataLoad(state:ConcFilterModelState, ignoreConc:boolean, seDispatch:SEDispatcher) {
        this.suspend(
            Dict.fromEntries(List.map(v => [v.toFixed(), false], this.waitingForTiles)),
            (action:Action<{tileId:number}>, syncData) => {
                if (isTileSomeDataLoadedAction(action) && Dict.hasKey(action.payload.tileId.toFixed(), syncData)) {
                    if (action.error) {
                        throw action.error;
                    }
                    const ans = {...syncData};
                    if (action.name === GlobalActionName.TileDataLoaded) { // i.e. we don't sync via TilePartialDataLoaded
                        ans[action.payload.tileId.toFixed()] = true;
                    }

                    if (this.isFromSubqSourceTile(action) && ignoreConc || !Dict.hasValue(false, ans)) {
                        return null;

                    } else {
                        return ans;
                    }
                }
                return syncData;
            }

        ).pipe(
            reduce(
                (acc, action) => {
                    const ans = {...acc};
                    const payload = action.payload;
                    if (this.isFromSubqSourceTile(action)) {
                        ans.subqueries = Dict.mergeDict(
                            (old, nw) => nw,
                            pipe(
                                action.payload.subqueries,
                                List.map(v => [v.value.value, v] as [string, SubQueryItem<RangeRelatedSubqueryValue>]),
                                Dict.fromEntries()
                            ),
                            ans.subqueries
                        );

                    } else if (isConcLoadedPayload(payload)) {
                        ans.concordanceIds = [...payload.concPersistenceIDs];
                    }
                    return ans;
                },
                {concordanceIds: state.concPersistenceIds, subqueries:{}} as SourceLoadingData
            ),
            concatMap(
                (data) => rxOf(...List.map<string, SingleQueryFreqArgs>(
                    (concId, i) => ({
                        concId: concId,
                        subqs: data.subqueries,
                        queryId: i
                    }),
                    data.concordanceIds
                ))
            ),
            concatMap(
                (data) => state.otherCorpname ?
                    callWithExtraVal(
                        this.switchMainCorpApi,
                        {
                            concPersistenceID: data.concId,
                            corpname: state.corpName,
                            align: state.otherCorpname,
                            maincorp: state.otherCorpname
                        },
                        data
                    ) :
                    rxOf<[SwitchMainCorpResponse, SingleQueryFreqArgs]>([{concPersistenceID: data.concId}, data])
            ),
            concatMap(
                ([switchResp, args]) => rxOf(...Dict.mapEntries(
                    ([,v]) => {
                        const ans:[string, number, SubQueryItem<RangeRelatedSubqueryValue>] = [switchResp.concPersistenceID, args.queryId, v];
                        return ans;
                    },
                    args.subqs
                ))
            ),
            concatMap(
                ([concId, queryId, resp]) => this.loadFreqs(state, concId, queryId, resp)
            ),
            tap(
                ([baseConcId, queryId, resp]) => {
                    seDispatch<GlobalActions.TilePartialDataLoaded<CollExamplesLoadedPayload>>({
                        name: GlobalActionName.TilePartialDataLoaded,
                        payload: {
                            tileId: this.tileId,
                            queryId: queryId,
                            data: normalizeTypography(resp.lines.slice(0, state.itemsPerSrc)),
                            baseConcId: baseConcId
                        }
                    });
                }
            ),
            reduce(
                (acc, [,,resp]) => acc && resp.lines.length === 0,
                true // is empty
            )
        ).subscribe(
            (isEmpty) => {
                seDispatch<GlobalActions.TileDataLoaded<{}>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: isEmpty
                    }
                })
            },
            (err) => {
                seDispatch<GlobalActions.TileDataLoaded<{}>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true
                    },
                    error: err,
                });
            }
        );
    }
}