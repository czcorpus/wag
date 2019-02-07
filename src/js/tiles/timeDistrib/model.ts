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
import { StatelessModel, Action, SEDispatcher } from 'kombo';
import { TimeDistribAPI, DataItem, QueryArgs } from './api';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {ActionName as ConcActionName, Actions as ConcActions} from '../concordance/actions';
import {ActionName, Actions, DataItemWithWCI} from './common';
import {wilsonConfInterval, AlphaLevel} from './stat';
import { AppServices } from '../../appServices';


export const enum FreqFilterQuantity {
    ABS = 'abs',
    ABS_PERCENTILE = 'pabs',
    IPM = 'ipm',
    IPM_PERCENTILE = "pipm"
}

export const enum AlignType {
    RIGHT = 'right',
    LEFT = 'left'
}

export const enum Dimension {
    FIRST = 1,
    SECOND = 2
}


export interface TimeDistribModelState {
    isBusy:boolean;
    error:string;
    corpname:string;
    subcname:string;
    subcDesc:string;
    concId:string;
    attrTime:string;
    attrValue:string;
    minFreq:string;
    minFreqType:FreqFilterQuantity;
    alignType1:AlignType;
    ctxIndex1:number;
    alignType2:AlignType;
    ctxIndex2:number;
    alphaLevel:AlphaLevel;
    data:Immutable.List<DataItemWithWCI>;
}

const getAttrCtx = (state:TimeDistribModelState, dim:Dimension):string => {

    const POSITION_LA = ['-6<0', '-5<0', '-4<0', '-3<0', '-2<0', '-1<0', '0<0', '1<0', '2<0', '3<0', '4<0', '5<0', '6<0'];

    const POSITION_RA = ['-6>0', '-5>0', '-4>0', '-3>0', '-2>0', '-1>0', '0>0', '1>0', '2>0', '3>0', '4>0', '5>0', '6>0'];

    if (dim === Dimension.FIRST) {
        return state.alignType1 === AlignType.LEFT ? POSITION_LA[state.ctxIndex1] : POSITION_RA[state.ctxIndex1];

    } else if (dim === Dimension.SECOND) {
        return state.alignType2 === AlignType.LEFT ? POSITION_LA[state.ctxIndex2] : POSITION_RA[state.ctxIndex2];
    }
    throw new Error('Unknown dimension ' + dim);
}


const stateToAPIArgs = (state:TimeDistribModelState, concId:string):QueryArgs => {

    return {
        corpname: state.corpname,
        usesubcorp: state.subcname,
        q: `~${concId ? concId : state.concId}`,
        ctfcrit1: '0', // = structural attr
        ctfcrit2: getAttrCtx(state, Dimension.SECOND),
        ctattr1: state.attrTime,
        ctattr2: state.attrValue,
        ctminfreq: state.minFreq,
        ctminfreq_type: state.minFreqType,
        format: 'json'
    };
};


const roundFloat = (v:number):number => Math.round(v * 100) / 100;

const calcIPM = (v:DataItem) => Math.round(v.abs / v.domainSize * 1e6 * 100) / 100;

/**
 *
 */
export class TimeDistribModel extends StatelessModel<TimeDistribModelState> {

    private static readonly MIN_DATA_ITEMS_TO_SHOW = 2;

    private readonly api:TimeDistribAPI;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly waitForTile:number;

    constructor(dispatcher, initState:TimeDistribModelState, tileId:number, waitForTile:number, api:TimeDistribAPI, appServices:AppServices) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [ActionName.LoadDataDone]: (state, action:Actions.LoadDataDone) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.data = Immutable.List<DataItemWithWCI>();
                        newState.error = action.error.message;

                    } else if (action.payload.data.length < TimeDistribModel.MIN_DATA_ITEMS_TO_SHOW) {
                        newState.data = Immutable.List<DataItemWithWCI>();
                        newState.error = this.appServices.translate('global__not_enough_data_to_show_result');

                    } else {
                        newState.data = Immutable.List<DataItemWithWCI>(action.payload.data);
                    }
                    return newState;
                }
                return state;
            }
        };
    }

    sideEffects(state:TimeDistribModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend((action:Action) => {
                    if (action.name === ConcActionName.DataLoadDone && action.payload['tileId'] === this.waitForTile) {
                        const payload = (action as ConcActions.DataLoadDone).payload;
                        new Rx.Observable((observer:Rx.Observer<{}>) => {
                            if (action.error) {
                                observer.error(action.error);

                            } else {
                                observer.next({});
                                observer.complete();
                            }
                        }).concatMap(args => this.api.call(stateToAPIArgs(state, payload.data.conc_persistence_op_id)))
                        .subscribe(
                            resp => {
                                const dataFull = resp.data.map<DataItemWithWCI>(v => {
                                    const confInt = wilsonConfInterval(v.abs, v.domainSize, state.alphaLevel);
                                    return {
                                        datetime: v.datetime,
                                        abs: v.abs,
                                        ipm: calcIPM(v),
                                        interval: [roundFloat(confInt[0] * 1e6), roundFloat(confInt[1] * 1e6)]
                                    };
                                });

                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    payload: {
                                        data: dataFull,
                                        concId: resp.concId,
                                        tileId: this.tileId
                                    }
                                });
                            },
                            error => {
                                dispatch<Actions.LoadDataDone>({
                                    name: ActionName.LoadDataDone,
                                    payload: {
                                        data: null,
                                        concId: null,
                                        tileId: this.tileId
                                    },
                                    error: error
                                });
                            }
                        );
                        return true;
                    }
                    return false;
                });
            break;
        }
    }

}