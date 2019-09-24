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
import * as Immutable from 'immutable';
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable, Observer } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { AppServices } from '../../appServices';
import { HTTPMethod, SystemMessageType } from '../../common/types';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { ActionName, Actions, DataLoadedPayload } from './common';
import { Backlink, BacklinkWithArgs } from '../../common/tile';
import { DataRow, CollocationApi } from '../../common/api/abstract/collocations';
import { CollocModelState, ctxToRange } from '../../common/models/collocations/collocations';
import { CoreCollRequestArgs } from '../../common/api/kontext/collocations';


export interface CollocModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:AppServices;
    service:CollocationApi<{}>;
    initState:CollocModelState;
    waitForTile:number;
    backlink:Backlink;
}


export class CollocModel extends StatelessModel<CollocModelState> {


    private readonly service:CollocationApi<{}>;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly measureMap = {
        't': 'T-score',
        'm': 'MI',
        '3': 'MI3',
        'l': 'log likelihood',
        's': 'min. sensitivity',
        'd': 'logDice',
        'p': 'MI.log_f',
        'r': 'relative freq.'
    };

    private readonly backlink:Backlink;

    constructor({dispatcher, tileId, waitForTile, appServices, service, initState, backlink}:CollocModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.service = service;
        this.backlink = backlink;
        this.actionMatch = {
            [GlobalActionName.EnableTileTweakMode]: (state, action:GlobalActions.EnableTileTweakMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isTweakMode = true;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.DisableTileTweakMode]: (state, action:GlobalActions.DisableTileTweakMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isTweakMode = false;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.EnableAltViewMode]: (state, action:GlobalActions.EnableAltViewMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isAltViewMode = true;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.DisableAltViewMode]: (state, action:GlobalActions.DisableAltViewMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isAltViewMode = false;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse)  => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.concId = action.payload.concId;
                    newState.isBusy = false;
                    if (action.error) {
                        newState.error = action.error.message;

                    } else {
                        newState.data = Immutable.List<DataRow>(action.payload.data);
                        newState.heading =
                            [{label: 'Abs', ident: ''}]
                            .concat(
                                action.payload.heading
                                    .map((v, i) => this.measureMap[v.ident] ? {label: this.measureMap[v.ident], ident: v.ident} : null)
                                    .filter(v => v !== null)
                            );

                        newState.backlink = this.createBackLink(newState, action);
                    }
                    return newState;
                }
                return state;
            },
            [ActionName.SetSrchContextType]: (state, action:Actions.SetSrchContextType) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    newState.srchRangeType = action.payload.ctxType;
                    return newState;

                }
                return state;
            }
        }
    }

    private createBackLink(state:CollocModelState, action:GlobalActions.TileDataLoaded<DataLoadedPayload>):BacklinkWithArgs<CoreCollRequestArgs> {
        const [cfromw, ctow] = ctxToRange(state.srchRangeType, state.srchRange);
        return this.backlink ?
            {
                url: this.backlink.url,
                method: this.backlink.method || HTTPMethod.GET,
                label: this.backlink.label,
                args: {
                    corpname: state.corpname,
                    q: `~${action.payload.concId}`,
                    cattr: state.tokenAttr,
                    cfromw: cfromw,
                    ctow: ctow,
                    cminfreq: state.minAbsFreq,
                    cminbgr: state.minLocalAbsFreq,
                    cbgrfns: state.appliedMetrics,
                    csortfn: state.sortByMetric,
                    citemsperpage: state.citemsperpage
                }
            } :
            null;
    }

    private requestData(state:CollocModelState, concId:string, prevActionErr:Error|null, seDispatch:SEDispatcher):void {
        new Observable((observer:Observer<{}>) => {
            if (prevActionErr) {
                observer.error(prevActionErr);

            } else {
                observer.next(this.service.stateToArgs(state, concId));
                observer.complete();
            }
        })
        .pipe(concatMap(args => this.service.call(args)))
        .subscribe(
            (data) => {
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: data.data.length === 0,
                        heading: data.collHeadings,
                        data: data.data,
                        concId: data.concId,
                        subqueries: data.data.map(v => ({
                            value: {
                                value: v.str,
                                context: ctxToRange(state.srchRangeType, state.srchRange)
                            },
                            interactionId: v.interactionId
                        })),
                        lang1: null,
                        lang2: null
                    }
                });
            },
            (err) => {
                this.appServices.showMessage(SystemMessageType.ERROR, err);
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        heading: null,
                        data: [],
                        concId: null,
                        subqueries: [],
                        lang1: null,
                        lang2: null
                    },
                    error: err
                });
            }
        );
    }

    sideEffects(state:CollocModelState, action:Action, seDispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend(
                    (action:Action) => {
                        if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                            const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                            if (action.error) {
                                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: true,
                                        data: [],
                                        heading: null,
                                        concId: null,
                                        subqueries: [],
                                        lang1: null,
                                        lang2: null
                                    },
                                    error: new Error(this.appServices.translate('global__failed_to_obtain_required_data')),
                                });
                                return true;
                            }
                            this.requestData(state, payload.data.concPersistenceID, action.error, seDispatch);
                            return true;
                        }
                        return false;
                    }
                );
            break;
            case ActionName.SetSrchContextType:
                this.requestData(state, state.concId, null, seDispatch);
            break;
        }
    }
}