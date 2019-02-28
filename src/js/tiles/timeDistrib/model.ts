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
import {Observable, Observer} from 'rxjs';
import {concatMap, map} from 'rxjs/operators';
import { StatelessModel, Action, SEDispatcher } from 'kombo';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {ActionName as ConcActionName, Actions as ConcActions} from '../concordance/actions';
import {ActionName, Actions, DataItemWithWCI} from './common';
import {wilsonConfInterval, AlphaLevel} from './stat';
import { AppServices } from '../../appServices';
import { ConcApi, QuerySelector, ViewMode, ConcResponse } from '../../common/api/concordance';
import {stateToArgs as concStateToArgs} from '../../common/models/concordance';
import { WdglanceMainFormModel } from '../../models/query';
import { ApiResponse as ReduceResponse} from '../../common/api/concReduce';
import {GeneralSingleCritFreqBarModelState, stateToAPIArgs} from '../../common/models/freq';
import { FreqDistribAPI, APIResponse, DataRow } from '../../common/api/kontextFreqs';


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


export interface TimeDistribModelState extends GeneralSingleCritFreqBarModelState<DataItemWithWCI> {
    subcnames:Immutable.List<string>;
    subcDesc:string;
    timeAxisLegend:string;
    alphaLevel:AlphaLevel;
}

const roundFloat = (v:number):number => Math.round(v * 100) / 100;

const calcIPM = (v:DataRow|DataItemWithWCI, domainSize:number) => Math.round(v.freq / domainSize * 1e6 * 100) / 100;

/**
 *
 */
export class TimeDistribModel extends StatelessModel<TimeDistribModelState> {

    private static readonly MIN_DATA_ITEMS_TO_SHOW = 2;

    private readonly api:FreqDistribAPI;

    private readonly concApi:ConcApi|null;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly mainForm:WdglanceMainFormModel;

    private unfinishedChunks:Immutable.Map<string, boolean>; // subcname => done

    constructor(dispatcher, initState:TimeDistribModelState, tileId:number, waitForTile:number, api:FreqDistribAPI,
                concApi:ConcApi, appServices:AppServices, mainForm:WdglanceMainFormModel) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.concApi = concApi;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.mainForm = mainForm;
        this.unfinishedChunks = Immutable.Map<string, boolean>(initState.subcnames.map(v => [v, false]));
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                this.unfinishedChunks = this.unfinishedChunks.map(v => true).toMap();
                const newState = this.copyState(state);
                newState.data = Immutable.List<DataItemWithWCI>();
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [ActionName.LoadDataDone]: (state, action:Actions.LoadDataDone) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    if (action.error) {
                        this.unfinishedChunks = this.unfinishedChunks.map(v => false).toMap();
                        newState.data = Immutable.List<DataItemWithWCI>();
                        newState.error = action.error.message;
                        newState.isBusy = false;

                    } else if (action.payload.data.length < TimeDistribModel.MIN_DATA_ITEMS_TO_SHOW && !this.hasUnfinishedCHunks()) {
                        newState.data = Immutable.List<DataItemWithWCI>();

                    } else {
                        newState.data = this.mergeChunks(
                            newState,
                            Immutable.List<DataItemWithWCI>(action.payload.data)
                        );

                        this.unfinishedChunks = this.unfinishedChunks.set(action.payload.subcname, false);
                        if (!this.hasUnfinishedCHunks()) {
                            newState.isBusy = false;
                        }
                    }
                    return newState;
                }
                return state;
            }
        };
    }

    private hasUnfinishedCHunks():boolean {
        return this.unfinishedChunks.includes(true);
    }

    private mergeChunks(state:TimeDistribModelState, newChunk:Immutable.List<DataItemWithWCI>):Immutable.List<DataItemWithWCI> {
        return newChunk.reduce(
            (acc, curr) => {
                if (acc.has(curr.datetime)) {
                    const tmp = acc.get(curr.datetime);
                    tmp.freq += curr.freq;
                    tmp.datetime = curr.datetime;
                    tmp.norm += curr.norm;
                    tmp.ipm = calcIPM(tmp, tmp.norm);
                    const confInt = wilsonConfInterval(tmp.freq, tmp.norm, state.alphaLevel);
                    tmp.ipmInterval = [roundFloat(confInt[0] * 1e6), roundFloat(confInt[1] * 1e6)];
                    return acc.set(tmp.datetime, tmp);

                } else {
                    const confInt = wilsonConfInterval(curr.freq, curr.norm, state.alphaLevel);
                    return acc.set(curr.datetime, {
                        datetime: curr.datetime,
                        freq: curr.freq,
                        norm: curr.norm,
                        ipm: calcIPM(curr, curr.norm),
                        ipmInterval: [roundFloat(confInt[0] * 1e6), roundFloat(confInt[1] * 1e6)]
                    });
                }
            },
            Immutable.Map<string, DataItemWithWCI>(state.data.map(v => [v.datetime, v]))

        ).sort((x1, x2) => parseInt(x1.datetime) - parseInt(x2.datetime)).toList();
    }


    private getFreqs(concCalc:Observable<APIResponse>, state:TimeDistribModelState, seDispatch:SEDispatcher) {
        concCalc.subscribe(
            resp => {
                const dataFull = resp.data.map<DataItemWithWCI>(v => {
                    return {
                        datetime: v.name,
                        freq: v.freq,
                        norm: v.norm,
                        ipm: -1,
                        ipmInterval: [-1, -1]
                    };
                });

                seDispatch<Actions.LoadDataDone>({
                    name: ActionName.LoadDataDone,
                    payload: {
                        data: dataFull,
                        subcname: resp.usesubcorp,
                        concId: resp.concId,
                        tileId: this.tileId
                    }
                });
            },
            error => {
                console.error(error);
                seDispatch<Actions.LoadDataDone>({
                    name: ActionName.LoadDataDone,
                    payload: {
                        data: null,
                        subcname: null,
                        concId: null,
                        tileId: this.tileId
                    },
                    error: error
                });
            }
        );
    }

    sideEffects(state:TimeDistribModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                if (this.waitForTile > -1) { // in this case we rely on a concordance provided by other tile
                    this.suspend((action:Action) => {
                        if (action.name === ConcActionName.DataLoadDone && action.payload['tileId'] === this.waitForTile) {
                            const payload = (action as ConcActions.DataLoadDone).payload;
                            const ans = new Observable((observer:Observer<{concId: string}>) => {
                                if (action.error) {
                                    observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));

                                } else {
                                    observer.next({concId: payload.data.conc_persistence_op_id});
                                    observer.complete();
                                }
                            })
                            .pipe(
                                concatMap(args => this.api.call(stateToAPIArgs<DataItemWithWCI>(state, args.concId, state.subcnames.get(0))))
                            );
                            this.getFreqs(
                                ans,
                                state,
                                dispatch
                            );
                            return true;
                        }
                        return false;
                    });

                } else { // here we must create our own concordance(s)
                    const query = this.mainForm.getState().query.value;
                    state.subcnames.toArray().map(subcname =>
                        this.concApi.call(concStateToArgs(
                            {
                                querySelector: QuerySelector.WORD,
                                corpname: state.corpname,
                                subcname: subcname,
                                kwicLeftCtx: -1,
                                kwicRightCtx: 1,
                                pageSize: 10,
                                loadPage: 1,
                                shuffle: false,
                                attr_vmode: 'mouseover',
                                viewMode: ViewMode.KWIC,
                                tileId: this.tileId,
                                attrs: Immutable.List<string>(['word'])
                            },
                            query

                        )).pipe(
                            map<ConcResponse, ReduceResponse>(
                                (resp) => ({
                                    conc_persistence_op_id: resp.conc_persistence_op_id,
                                    messages: resp.messages,
                                    Lines: resp.Lines,
                                    fullsize: resp.fullsize,
                                    concsize: resp.concsize,
                                    rlines: resp.concsize,
                                    result_arf: resp.result_arf,
                                    result_relative_freq: resp.result_relative_freq,
                                    query: resp.query,
                                    corpname: resp.corpname,
                                    usesubcorp: resp.usesubcorp
                                })
                            ),
                            map(v => ({
                                subcname: v.usesubcorp,
                                concId: v.conc_persistence_op_id
                            })),
                            concatMap(args => this.api.call(stateToAPIArgs(state, args.concId, args.subcname)))
                        )

                    ).forEach(chunk => {
                        this.getFreqs(
                            chunk,
                            state,
                            dispatch
                        );
                    });
                }
            break;
        }
    }

}