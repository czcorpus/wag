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
import { StatelessModel, IActionDispatcher, Action, SEDispatcher } from 'kombo';
import * as Immutable from 'immutable';

import { AppServices } from '../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { isSubqueryPayload, SubQueryItem } from '../../common/query';
import { ConcApi, FilterRequestArgs, QuerySelector, PNFilter, FilterPCRequestArgs } from '../../common/api/kontext/concordance';
import { Line, ViewMode, ConcResponse } from '../../common/api/abstract/concordance';
import { Observable, merge } from 'rxjs';
import { isConcLoadedPayload } from '../concordance/actions';
import { CollExamplesLoadedPayload } from './actions';
import { DataLoadedPayload as CollDataLoadedPayload } from '../collocations/common';
import { Actions, ActionName } from './actions';
import { normalizeTypography } from '../../common/models/concordance/normalize';
import { ISwitchMainCorpApi } from '../../common/api/abstract/switchMainCorp';


export interface ConcFilterModelState {
    isBusy:boolean;
    isTweakMode:boolean;
    isMobile:boolean;
    widthFract:number;
    error:string;
    corpName:string;
    otherCorpname:string|null;
    posAttrs:Immutable.List<string>;
    attrVmode:'mouseover';
    viewMode:ViewMode;
    itemsPerSrc:number;
    lines:Immutable.List<Line>;
    metadataAttrs:Immutable.List<{value:string; label:string}>;
    visibleMetadataLine:number;
}


export class ConcFilterModel extends StatelessModel<ConcFilterModelState> {

    private readonly api:ConcApi;

    private readonly switchMainCorpApi:ISwitchMainCorpApi;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private waitingForTiles:Immutable.Map<number, string|Array<SubQueryItem>|null>;

    private subqSourceTiles:Immutable.Set<number>;

    private numPendingSources:number;

    constructor(dispatcher:IActionDispatcher, tileId:number, waitForTiles:Array<number>, subqSourceTiles:Array<number>,
                appServices:AppServices, api:ConcApi, switchMainCorpApi:ISwitchMainCorpApi, initState:ConcFilterModelState) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.switchMainCorpApi = switchMainCorpApi;
        this.waitingForTiles = Immutable.Map<number, string|Array<SubQueryItem>|null>(waitForTiles.map(v => [v, null]));
        this.subqSourceTiles = Immutable.Set<number>(subqSourceTiles);
        this.numPendingSources = 0; // this cannot be part of the state (see occurrences in the 'suspend' fn)
        this.appServices = appServices;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse)  => {
                this.waitingForTiles = this.waitingForTiles.map(v => null).toMap();
                this.numPendingSources = 0;
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                newState.lines = newState.lines.clear();
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<CollExamplesLoadedPayload|CollDataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    this.numPendingSources -= 1;
                    if (this.numPendingSources <= 0) {
                        newState.isBusy = false;
                    }
                    newState.lines = newState.lines.concat(action.payload.data).toList();
                    return newState;

                }
                return state;
            },
            [GlobalActionName.SubqItemHighlighted] : (state, action:GlobalActions.SubqItemHighlighted) => {
               const srchIdx = state.lines.findIndex(v => v.interactionId === action.payload.interactionId);
               if (srchIdx > -1) {
                    const newState = this.copyState(state);
                    const line = state.lines.get(srchIdx);
                    newState.lines = newState.lines.set(srchIdx, {
                        left: line.left,
                        kwic: line.kwic,
                        right: line.right,
                        align: line.align,
                        metadata: line.metadata || [],
                        toknum: line.toknum,
                        interactionId: line.interactionId,
                        isHighlighted: true
                    });
                    return newState;
               }
               return state;
            },
            [GlobalActionName.SubqItemDehighlighted] : (state, action:GlobalActions.SubqItemDehighlighted) => {
                const srchIdx = state.lines.findIndex(v => v.interactionId === action.payload.interactionId);
                if (srchIdx > -1) {
                    const newState = this.copyState(state);
                    const line = state.lines.get(srchIdx);
                    newState.lines = newState.lines.set(srchIdx, {
                        left: line.left,
                        kwic: line.kwic,
                        right: line.right,
                        align: line.align,
                        metadata: line.metadata || [],
                        toknum: line.toknum,
                        interactionId: line.interactionId,
                        isHighlighted: false
                    });
                    return newState;
                }
               return state;
            },
            [GlobalActionName.SubqChanged]: (state, action:GlobalActions.SubqChanged) => {
                if (this.waitingForTiles.has(action.payload.tileId)) {
                    this.waitingForTiles = this.waitingForTiles.map(v => typeof v === 'string' ? v : null).toMap();
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    newState.lines = newState.lines.clear();
                    return newState;
                }
                return state;
            },
            [GlobalActionName.TileAreaClicked]: (state, action:GlobalActions.TileAreaClicked) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.visibleMetadataLine = -1;
                    return newState;
                }
                return state;
            },
            [ActionName.ShowLineMetadata]: (state, action:Actions.ShowLineMetadata) => {
                const newState = this.copyState(state);
                newState.visibleMetadataLine = action.payload.idx;
                return newState;
            },
            [ActionName.HideLineMetadata]: (state, action:Actions.HideLineMetadata) => {
                const newState = this.copyState(state);
                newState.visibleMetadataLine = -1;
                return newState;
            }
        };
    }

    private mkConcArgs(state:ConcFilterModelState, subq:SubQueryItem, concId:string):FilterRequestArgs|FilterPCRequestArgs {
        if (state.otherCorpname) {
            return {
                queryselector: QuerySelector.CQL,
                cql: `[lemma="${subq.value}"]`, // TODO escape stuff
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
                format: 'json',
                pnfilter: PNFilter.POS,
                filfl: 'f',
                filfpos: 0,
                filtpos: 0,
                inclkwic: 1
            };

        } else {
            return {
                queryselector: QuerySelector.CQL,
                cql: `[lemma="${subq.value}"]`, // TODO escape stuff
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
                format: 'json',
                pnfilter: PNFilter.POS,
                filfl: 'f',
                filfpos: -3,
                filtpos: 3,
                inclkwic: 0
            };
        }
    }

    private loadFreqs(state:ConcFilterModelState, concId:string, queries:Array<SubQueryItem>):Array<Observable<ConcResponse>> {
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
                            label: state.metadataAttrs.find(v => v.value === item.label, null, {label: item.label, value: null}).label
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

    sideEffects(state:ConcFilterModelState, action:Action, seDispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
            case GlobalActionName.SubqChanged:
                this.suspend(
                    (action:Action) => {
                        if (action.name === GlobalActionName.TileDataLoaded && this.waitingForTiles.has(action.payload['tileId'])) {
                            if (action.error) {
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
                            const basicPayload = (action as GlobalActions.TileDataLoaded<{}>).payload;
                            const payload = action.payload;

                            if (this.subqSourceTiles.contains(basicPayload.tileId) && isSubqueryPayload(payload)) {
                                this.numPendingSources += payload.subqueries.length;
                            }

                            if (isConcLoadedPayload(payload) && this.waitingForTiles.get(basicPayload.tileId) === null) {
                                this.waitingForTiles = this.waitingForTiles.set(
                                    basicPayload.tileId,
                                    payload.data.concPersistenceID
                                );

                            } else if (isSubqueryPayload(payload) && this.waitingForTiles.get(basicPayload.tileId) === null) {
                                this.waitingForTiles = this.waitingForTiles.set(
                                    basicPayload.tileId,
                                    payload.subqueries
                                );
                            }

                            if (!this.waitingForTiles.findKey(v => v === null)) {
                                let conc:string;
                                let subq:Array<SubQueryItem>;
                                this.waitingForTiles.forEach((v, k) => {
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
            break;
        }
    }

}