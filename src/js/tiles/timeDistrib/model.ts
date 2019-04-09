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
import { Action, SEDispatcher, StatelessModel } from 'kombo';
import { Observable, Observer } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';

import { AppServices } from '../../appServices';
import { ConcApi, ConcResponse, QuerySelector, ViewMode } from '../../common/api/kontext/concordance';
import { APIResponse, DataRow, FreqDistribAPI } from '../../common/api/kontext/freqs';
import { stateToArgs as concStateToArgs } from '../../common/models/concordance';
import { GeneralSingleCritFreqBarModelState, stateToAPIArgs } from '../../common/models/freq';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { WdglanceMainFormModel, findCurrLemmaVariant } from '../../models/query';
import { ConcLoadedPayload } from '../concordance/actions';
import { DataItemWithWCI, DataLoadedPayload, SubchartID } from './common';
import { AlphaLevel, wilsonConfInterval } from './stat';
import { Actions, ActionName } from './common';
import { callWithRequestId } from '../../common/api/util';


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
    posQueryGenerator:[string, string];
    isTweakMode:boolean;
    dataCmp:Immutable.List<DataItemWithWCI>;
    wordCmp:string;
}

interface ConcResponseWithTarget extends ConcResponse {
    subchartId:SubchartID;
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
        this.unfinishedChunks = Immutable.Map<string, boolean>(initState.subcnames.flatMap(
                v => Immutable.List([[this.mkChunkId(v, SubchartID.MAIN), false], [this.mkChunkId(v, SubchartID.SECONDARY), false]])));
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                this.unfinishedChunks = this.mapChunkStatusOf(v => true).toMap();
                const newState = this.copyState(state);
                newState.data = Immutable.List<DataItemWithWCI>();
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    if (action.error) {
                        this.unfinishedChunks = this.mapChunkStatusOf((v, k) => false, action.payload.subchartId).toMap();
                        newState.data = Immutable.List<DataItemWithWCI>();
                        newState.error = action.error.message;
                        newState.isBusy = false;

                    } else if (action.payload.data.length < TimeDistribModel.MIN_DATA_ITEMS_TO_SHOW && !this.hasUnfinishedCHunks(action.payload.subchartId)) {
                        newState.data = Immutable.List<DataItemWithWCI>();

                    } else {
                        newState.data = this.mergeChunks(
                            newState,
                            Immutable.List<DataItemWithWCI>(action.payload.data)
                        );

                        this.unfinishedChunks = this.unfinishedChunks.set(this.mkChunkId(action.payload.subcname, action.payload.subchartId), false);
                        if (!this.hasUnfinishedCHunks(action.payload.subchartId)) {
                            newState.isBusy = false;
                        }
                    }
                    return newState;
                }
                return state;
            },
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
            [ActionName.ChangeCmpWord]: (state, action:Actions.ChangeCmpWord) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.wordCmp = action.payload.value;
                    return newState;
                }
                return state;

            },
            [ActionName.SubmitCmpWord]: (state, action:Actions.SubmitCmpWord) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    console.log('TODO !!! submit: ', newState.wordCmp);
                    return newState;
                }
                return state;
            }
        };
    }

    private mkChunkId(subcname:string, subchartId:SubchartID):string {
        return `${subchartId}:${subcname}`;
    }

    private mapChunkStatusOf(mapFn:((v:boolean, k:string) => boolean), subchartId?:SubchartID):Immutable.Map<string, boolean> {
        return this.unfinishedChunks.map((v, k) => (subchartId && k.startsWith(subchartId) || !subchartId) ? mapFn(v, k) : v).toMap();
    }

    private hasUnfinishedCHunks(subchartId:SubchartID):boolean {
        return this.unfinishedChunks.filter((v, k) => k.startsWith(subchartId)).includes(true);
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


    private getFreqs(concCalc:Observable<[APIResponse, SubchartID]>, state:TimeDistribModelState, seDispatch:SEDispatcher) {
        concCalc.subscribe(
            resp => {
                const [data, subchartId] = resp;
                const dataFull = data.data.map<DataItemWithWCI>(v => {
                    return {
                        datetime: v.name,
                        freq: v.freq,
                        norm: v.norm,
                        ipm: -1,
                        ipmInterval: [-1, -1]
                    };
                });

                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        subchartId: subchartId,
                        isEmpty: dataFull.length === 0,
                        data: dataFull,
                        subcname: data.usesubcorp,
                        concId: data.concId
                    }
                });
            },
            error => {
                console.error(error);
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        subchartId: null,
                        isEmpty: true,
                        data: null,
                        subcname: null,
                        concId: null
                    },
                    error: error
                });
            }
        );
    }

    private loadData(state:TimeDistribModelState, dispatch:SEDispatcher, target:SubchartID):void {
        if (this.waitForTile > -1) { // in this case we rely on a concordance provided by other tile
            this.suspend((action:Action) => {
                if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                    const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                    const ans = new Observable((observer:Observer<{concId: string}>) => {
                        if (action.error) {
                            observer.error(new Error(this.appServices.translate('global__failed_to_obtain_required_data')));

                        } else {
                            observer.next({concId: payload.data.conc_persistence_op_id});
                            observer.complete();
                        }
                    })
                    .pipe(
                        concatMap(args => callWithRequestId(
                            this.api,
                            stateToAPIArgs<DataItemWithWCI>(state, args.concId, state.subcnames.get(0)),
                            target
                        ))
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
            const formState = this.mainForm.getState();
            state.subcnames.toArray().map(subcname =>
                callWithRequestId(
                    this.concApi,
                    concStateToArgs(
                        {
                            querySelector: QuerySelector.CQL,
                            corpname: state.corpname,
                            otherCorpname: undefined,
                            subcname: subcname,
                            subcDesc: null,
                            kwicLeftCtx: -1,
                            kwicRightCtx: 1,
                            pageSize: 10,
                            loadPage: 1,
                            shuffle: false,
                            attr_vmode: 'mouseover',
                            viewMode: ViewMode.KWIC,
                            tileId: this.tileId,
                            attrs: Immutable.List<string>(['word']),
                            concId: null,
                            posQueryGenerator: state.posQueryGenerator
                        },
                        findCurrLemmaVariant(formState.lemmas),
                        null
                    ),
                    target

                ).pipe(
                    map<[ConcResponse, SubchartID], ConcResponseWithTarget>(
                        (resp) => ({
                            conc_persistence_op_id: resp[0].conc_persistence_op_id,
                            messages: resp[0].messages,
                            Lines: resp[0].Lines,
                            fullsize: resp[0].fullsize,
                            concsize: resp[0].concsize,
                            result_arf: resp[0].result_arf,
                            result_relative_freq: resp[0].result_relative_freq,
                            query: resp[0].query,
                            corpname: resp[0].corpname,
                            usesubcorp: resp[0].usesubcorp,
                            subchartId: resp[1]
                        })
                    ),
                    map(v => ({
                        subcname: v.usesubcorp,
                        concId: v.conc_persistence_op_id,
                        subchartId: v.subchartId
                    })),
                    concatMap(args => callWithRequestId(
                        this.api,
                        stateToAPIArgs(state, args.concId, args.subcname),
                        args.subchartId
                    ))
                )

            ).forEach(resp => {
                this.getFreqs(
                    resp,
                    state,
                    dispatch
                );
            });
        }
    }

    sideEffects(state:TimeDistribModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.loadData(state, dispatch, SubchartID.MAIN);
            break;
        }
    }

}