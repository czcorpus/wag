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
import { map, concatMap } from 'rxjs/operators';
import { StatelessModel, Action, SEDispatcher, IActionQueue } from 'kombo';

import { AppServices } from '../../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { isSubqueryPayload, SubQueryItem, SubqueryPayload, RangeRelatedSubqueryValue } from '../../../common/query';
import { ConcApi, FilterRequestArgs, QuerySelector, FilterPCRequestArgs, QuickFilterRequestArgs } from '../../../common/api/kontext/concordance';
import { Line, ViewMode, ConcResponse } from '../../../common/api/abstract/concordance';
import { Observable, merge } from 'rxjs';
import { isConcLoadedPayload } from '../concordance/actions';
import { CollExamplesLoadedPayload } from './actions';
import { Actions, ActionName } from './actions';
import { normalizeTypography } from '../../../common/models/concordance/normalize';
import { ISwitchMainCorpApi } from '../../../common/api/abstract/switchMainCorp';
import { Dictop, Listop } from 'montainer';


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
    metadataAttrs:Array<{value:string; label:string}>;
    visibleMetadataLine:number;
}


export class ConcFilterModel extends StatelessModel<ConcFilterModelState> {

    private readonly api:ConcApi;

    private readonly switchMainCorpApi:ISwitchMainCorpApi;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private waitingForTiles:{[k:string]:string|Array<SubQueryItem<RangeRelatedSubqueryValue>>|null};

    private subqSourceTiles:Array<number>;

    private numPendingSources:number;

    constructor(dispatcher:IActionQueue, tileId:number, waitForTiles:Array<number>, subqSourceTiles:Array<number>,
                appServices:AppServices, api:ConcApi, switchMainCorpApi:ISwitchMainCorpApi, initState:ConcFilterModelState) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.switchMainCorpApi = switchMainCorpApi;
        this.waitingForTiles = Dictop.of(waitForTiles.map(v => [v.toFixed(), null])).u();
        this.subqSourceTiles = subqSourceTiles;
        this.numPendingSources = 0; // this cannot be part of the state (see occurrences in the 'suspend' fn)
        this.appServices = appServices;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action)  => {
                this.waitingForTiles = Dictop.of(this.waitingForTiles).map(v => null).u();
                this.numPendingSources = 0;
                state.isBusy = true;
                state.error = null;
                state.lines = [];
            },
            (state, action ,dispatch) => {
                this.handleDataLoad(state, dispatch);
            }
        ).sideEffectAlsoOn(GlobalActionName.SubqChanged);

        this.addActionHandler<GlobalActions.TileDataLoaded<CollExamplesLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (action.error) {
                        state.lines = [];
                        state.isBusy = false;
                        state.error = action.error.message;

                    } else {
                        this.numPendingSources -= 1;
                        if (this.numPendingSources <= 0) {
                            state.isBusy = false;
                        }
                        state.lines = state.lines.concat(action.payload.data);
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
                if (Dictop.of(this.waitingForTiles).hasKey(action.payload.tileId.toFixed()).u0()) {
                    this.waitingForTiles = Dictop.of(this.waitingForTiles).map(v => typeof v === 'string' ? v : null).u();
                    state.isBusy = true;
                    state.lines = [];
                }
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

    private loadFreqs(state:ConcFilterModelState, concId:string, queries:Array<SubQueryItem<RangeRelatedSubqueryValue>>):Array<Observable<ConcResponse>> {
        return queries.map(subq => {
            const args = this.mkConcArgs(state, subq, concId);
            return this.api.call(args).pipe(
                map(v => ({
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
                }))
            );
        });
    }

    private isFromSubqSourceModel(action:Action<{tileId: number} & SubqueryPayload<RangeRelatedSubqueryValue>>):boolean {
        return Listop.of(this.subqSourceTiles).containsValue(action.payload.tileId).u0();
    }

    private handleDataLoad(state:ConcFilterModelState, seDispatch:SEDispatcher) {
        this.suspend(
            (action:GlobalActions.TileDataLoaded<SubqueryPayload<RangeRelatedSubqueryValue> & {tileId:number}>) => {
                if (action.name === GlobalActionName.TileDataLoaded &&
                            Dictop.of(this.waitingForTiles).hasKey(action.payload.tileId.toFixed()).u0()) {
                    if (action.error) {
                        this.waitingForTiles = Dictop.of(this.waitingForTiles).map(v => null).u();
                        seDispatch<GlobalActions.TileDataLoaded<CollExamplesLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: true,
                                data: []
                            },
                            error: new Error(this.appServices.translate('global__failed_to_obtain_required_data')),
                        });
                        return true;
                    }
                    if (this.isFromSubqSourceModel(action) && isSubqueryPayload(action.payload)) {
                        this.numPendingSources += action.payload.subqueries.length;
                    }
                    if (this.isFromSubqSourceModel(action) && this.waitingForTiles[action.payload.tileId.toFixed()] === null) {
                        this.waitingForTiles[action.payload.tileId.toFixed()] = action.payload.subqueries;

                    } else if (isConcLoadedPayload(action.payload) && this.waitingForTiles[action.payload.tileId.toFixed()] === null) {
                        this.waitingForTiles[action.payload.tileId.toFixed()] = action.payload.concPersistenceID;

                    }
                    if (Dictop.of(this.waitingForTiles).find((v, k) => v === null).size().u0() === 0) {
                        let conc:string;
                        let subq:Array<SubQueryItem<RangeRelatedSubqueryValue>>;
                        Dictop.of(this.waitingForTiles).tap((v, k) => {
                            if (typeof v === 'string') {
                                conc = v;

                            } else {
                                subq = v;
                            }
                        });
                        this.switchMainCorpApi.call({
                            concPersistenceID: conc,
                            corpname: state.corpName,
                            align: state.otherCorpname,
                            maincorp: state.otherCorpname

                        }).pipe(
                            concatMap(
                                (resp) => merge(...this.loadFreqs(state, resp.concPersistenceID, subq))
                            )

                        ).subscribe(
                            (data) => {
                                seDispatch<GlobalActions.TileDataLoaded<CollExamplesLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: false, // here we cannot assume final state
                                        data: normalizeTypography(data.lines.slice(0, state.itemsPerSrc))
                                    }
                                });
                            },
                            (err) => {
                                seDispatch<GlobalActions.TileDataLoaded<CollExamplesLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: true,
                                        data: []
                                    },
                                    error: err,
                                });
                            },
                            () => {
                                if (subq.length === 0) {
                                    seDispatch<GlobalActions.TileDataLoaded<CollExamplesLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: true,
                                            data: []
                                        }
                                    });
                                }
                            }
                        );
                        return true;
                    }

                }
                return false;
            }
        );
    }

}