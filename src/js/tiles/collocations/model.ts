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
import * as Rx from '@reactivex/rxjs';
import { StatelessModel, ActionDispatcher, Action, SEDispatcher } from 'kombo';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {ActionName as ConcActionName, Actions as ConcActions} from '../concordance/actions';
import {ActionName, DataRow, Actions, CollApiArgs, DataHeading, CollocMetric, SrchContextType} from './common';
import { KontextCollAPI } from './service';
import { AppServices } from '../../appServices';
import { SystemMessageType } from '../../abstract/types';


export interface CollocModelArgs {
    dispatcher:ActionDispatcher;
    tileId:number;
    appServices:AppServices;
    service:KontextCollAPI;
    initState:CollocModelState;
    waitForTile:number;
}

export interface CollocModelState {
    isBusy:boolean;
    tileId:number;
    isTweakMode:boolean;
    error:string|null;
    widthFract:number;
    corpname:string;
    concId:string;
    cattr:string;
    ctxSize:number;
    ctxType:SrchContextType;
    cminfreq:number;
    cminbgr:number;
    cbgrfns:Array<CollocMetric>;
    csortfn:CollocMetric;
    data:Immutable.List<DataRow>;
    heading:DataHeading;
    citemsperpage:number;
}


const ctxToRange = (ctxType:SrchContextType, range:number):[number, number] => {
    switch (ctxType) {
        case SrchContextType.BOTH:
            return [-1 * range, range];
        case SrchContextType.LEFT:
            return [-1 * range, 0];
        case SrchContextType.RIGHT:
            return [0, range];
        default:
            throw new Error('unknown ctxType ' + ctxType);
    }
};


export const stateToArgs = (state:CollocModelState, concId:string):CollApiArgs => {
    const [cfromw, ctow] = ctxToRange(state.ctxType, state.ctxSize);
    return {
        corpname: state.corpname,
        q: `~${concId ? concId : state.concId}`,
        cattr: state.cattr,
        cfromw: cfromw,
        ctow: ctow,
        cminfreq: state.cminfreq,
        cminbgr: state.cminbgr,
        cbgrfns: state.cbgrfns,
        csortfn: state.csortfn,
        citemsperpage: state.citemsperpage,
        format: 'json'
    };
}


export class CollocModel extends StatelessModel<CollocModelState> {

    private readonly service:KontextCollAPI;

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

    private static readonly BASE_WC_FONT_SIZE = 30;

    constructor({dispatcher, tileId, waitForTile, appServices, service, initState}:CollocModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.service = service;
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
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse)  => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [GlobalActionName.DisableTileTweakMode]: (state, action:GlobalActions.DisableTileTweakMode) => {
                let newState:CollocModelState;
                if (action.payload['ident'] === this.tileId) {
                    newState = this.copyState(state);
                    newState.isTweakMode = false;

                } else {
                    newState = state;
                }
                return newState;
            },
            [ActionName.DataLoadDone]: (state, action:Actions.DataLoadDone) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.concId = action.payload.concId;
                    newState.isBusy = false;
                    if (action.error) {
                        newState.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        newState.error = this.appServices.translate('global__not_enough_data_to_show_result');

                    } else {
                        const minVal = Math.min(...action.payload.data.map(v => v.stats[0]));
                        const scaledTotal = action.payload.data.map(v => v.stats[0] - minVal).reduce((curr, acc) => acc + curr, 0);
                        newState.data = Immutable.List<DataRow>(action.payload.data.map(item => {
                            const wcFontSizeRatio = scaledTotal > 0 ? (item.stats[0] - minVal) / scaledTotal : 1;
                            return {
                                str: item.str,
                                stats: item.stats,
                                freq: item.freq,
                                nfilter: item.nfilter,
                                pfilter: item.pfilter,
                                wcFontSize: Math.round(wcFontSizeRatio * 100 + CollocModel.BASE_WC_FONT_SIZE)
                            }
                        }));

                        newState.heading =
                            [{label: 'Abs', ident: ''}]
                            .concat(
                                action.payload.heading
                                    .map((v, i) => this.measureMap[v.ident] ? {label: this.measureMap[v.ident], ident: v.ident} : null)
                                    .filter(v => v !== null)
                            );
                    }
                    return newState;
                }
                return state;
            },
            [ActionName.SetSrchContextType]: (state, action:Actions.SetSrchContextType) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    newState.ctxType = action.payload.ctxType;
                    return newState;

                }
                return state;
            }
        }
    }

    private requestData(state:CollocModelState, concId:string, prevActionErr:Error|null, seDispatch:SEDispatcher):void {
        new Rx.Observable((observer:Rx.Observer<CollApiArgs>) => {
            if (prevActionErr) {
                observer.error(prevActionErr);

            } else {
                observer.next(stateToArgs(state, concId));
                observer.complete();
            }
        })
        .concatMap(args => this.service.call(args))
        .subscribe(
            (data) => {
                seDispatch<Actions.DataLoadDone>({
                    name: ActionName.DataLoadDone,
                    payload: {
                        tileId: this.tileId,
                        heading: data.collHeadings,
                        data: data.data,
                        concId: data.concId,
                    }
                });
            },
            (err) => {
                this.appServices.showMessage(SystemMessageType.ERROR, err);
                seDispatch({
                    name: ActionName.DataLoadDone,
                    payload: {},
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
                        if (action.name === ConcActionName.DataLoadDone && action.payload['tileId'] === this.waitForTile) {
                            const payload = (action as ConcActions.DataLoadDone).payload;
                            this.requestData(state, payload.data.conc_persistence_op_id, action.error, seDispatch);
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