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
import { SEDispatcher, StatelessModel, IActionDispatcher } from 'kombo';
import { Observable } from 'rxjs';
import { map, mergeMap, reduce, tap } from 'rxjs/operators';
import { Dict, Maths, pipe, List, tuple } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { DataItemWithWCI, SubchartID, DataLoadedPayload } from './common.js';
import { Actions } from './common.js';
import { findCurrQueryMatch, RecognizedQueries, testIsDictMatch } from '../../../query/index.js';
import { Backlink } from '../../../page/tile.js';
import { MainPosAttrValues } from '../../../conf/index.js';
import { MQueryTimeDistribStreamApi, TimeDistribArgs, TimeDistribResponse } from '../../../api/vendor/mquery/timeDistrib.js';
import { callWithExtraVal } from '../../../api/util.js';
import { mkLemmaMatchQuery } from '../../../api/vendor/mquery/common.js';
import { SystemMessageType } from '../../../types.js';
import { IDataStreaming } from '../../../page/streaming.js';
import { CorpusInfoAPI } from '../../../api/vendor/mquery/corpusInfo.js';


export enum FreqFilterQuantity {
    ABS = 'abs',
    ABS_PERCENTILE = 'pabs',
    IPM = 'ipm',
    IPM_PERCENTILE = 'pipm'
}

export enum AlignType {
    RIGHT = 'right',
    LEFT = 'left'
}

export enum LoadingStatus {
    IDLE = 0,
    BUSY_LOADING_MAIN = 1,
    BUSY_LOADING_CMP = 2,
}

export interface TimeDistribModelState {
    corpname:string;
    subcnames:Array<string>;
    subcDesc:string;
    error:string;
    alphaLevel:Maths.AlphaLevel;
    posQueryGenerator:[string, string];
    mainPosAttr:MainPosAttrValues;
    isTweakMode:boolean;
    data:Array<Array<DataItemWithWCI>>;
    dataCmp:Array<DataItemWithWCI>;
    useAbsFreq:boolean;
    displayObserved:boolean;
    wordCmp:string;
    wordCmpInput:string;
    wordMainLabels:Array<string>; // a copy from mainform state used to attach a legend
    mainBacklinks:Array<Backlink>;
    cmpBacklink:Backlink;
    fcrit:string;
    fromYear:number;
    toYear:number;
    maxItems:number;
    refArea:[number,number];
    averagingYears:number;
    units:string;
    zoom:[number, number];
    loadingStatus:LoadingStatus;
}


const roundFloat = (v:number):number => Math.round(v * 100) / 100;

const calcIPM = (v:DataItemWithWCI, domainSize:number) => Math.round(v.freq / domainSize * 1e6 * 100) / 100;


interface DataFetchArgsOwn {
    wordMainLabel:string;
    targetId:SubchartID;
    queryIdx:number;
}

export interface TimeDistribModelArgs {
    dispatcher:IActionDispatcher;
    initState:TimeDistribModelState;
    tileId:number;
    api:MQueryTimeDistribStreamApi;
    infoApi:CorpusInfoAPI;
    appServices:IAppServices;
    queryMatches:RecognizedQueries;
}

function dateToSortNumber(s:string):number {
    const coeff = [9, 5, 0];
    if (/^\d{4}-\d{2}(-\d{2})?$/.exec(s)) {
        return List.reduce<string, number>(
            (acc, v, i) => acc + (parseInt(v) << coeff[i]),
            0,
            s.split('-')
        );
    }
    if (!/^\d+$/.exec(s)) {
        console.warn(`Invalid datetime value ${s}`);
    }
    return parseInt(s);
}

/**
 *
 */
export class TimeDistribModel extends StatelessModel<TimeDistribModelState> {

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly queryMatches:RecognizedQueries;

    private readonly api:MQueryTimeDistribStreamApi;

    private readonly infoApi:CorpusInfoAPI;

    constructor({
        dispatcher,
        initState,
        tileId,
        api,
        infoApi,
        appServices,
        queryMatches
    }:TimeDistribModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.queryMatches = queryMatches;
        this.api = api;
        this.infoApi = infoApi;

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.data = List.map(_ => [], this.queryMatches);
                state.mainBacklinks = List.map(_ => null, this.queryMatches);
                state.dataCmp = [];
                state.cmpBacklink = null;
                state.loadingStatus = LoadingStatus.BUSY_LOADING_MAIN;
                state.error = null;
            },
            (state, action, dispatch) => {
                this.loadData(
                    state,
                    appServices.dataStreaming(),
                    SubchartID.MAIN,
                    dispatch
                );
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.TileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.loadingStatus = LoadingStatus.IDLE;
                if (action.error) {
                    state.data = List.map(_ => [], this.queryMatches);
                    state.mainBacklinks = List.map(_ => null, this.queryMatches);
                    state.dataCmp = []; 
                    state.cmpBacklink = null;
                    state.error = this.appServices.normalizeHttpApiError(action.error);
                }
            }
        );

        this.addActionSubtypeHandler(
            Actions.PartialTileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                if (action.payload.data) {
                    state.data[action.payload.queryId] = this.mergeChunks(
                        action.payload.overwritePrevious ? [] : state.data[action.payload.queryId], action.payload.data, state.alphaLevel);
                    state.mainBacklinks[action.payload.queryId] = this.api.getBacklink(action.payload.queryId);

                } else if (action.payload.dataCmp) {
                    state.dataCmp = this.mergeChunks(
                        action.payload.overwritePrevious ? [] : state.dataCmp, action.payload.dataCmp, state.alphaLevel);
                    state.cmpBacklink = this.api.getBacklink(0, 1);
                }
                if (action.payload.wordMainLabel) {
                    state.wordMainLabels[action.payload.queryId] = action.payload.wordMainLabel;
                }
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.EnableTileTweakMode,
            action => action.payload.ident === this.tileId,
            (state, action) => {
                state.isTweakMode = true;
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.DisableTileTweakMode,
            action => action.payload.ident === this.tileId,
            (state, action) => {
                state.isTweakMode = false;
            }
        );

        this.addActionSubtypeHandler(
            Actions.ChangeUseAbsFreq,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.useAbsFreq = action.payload.value;
            }
        );

        this.addActionSubtypeHandler(
            Actions.ChangeDisplayObserved,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.displayObserved = action.payload.value;
            }
        );

        this.addActionSubtypeHandler(
            Actions.ChangeCmpWord,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.wordCmpInput = action.payload.value;
            }
        );

        this.addActionSubtypeHandler(
            Actions.SubmitCmpWord,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.loadingStatus = LoadingStatus.BUSY_LOADING_CMP;
                state.wordCmp = state.wordCmpInput.trim();
                state.dataCmp = [];
            },
            (state, action, dispatch) => {
                this.loadData(
                    state,
                    this.appServices.dataStreaming().startNewSubgroup(this.tileId),
                    SubchartID.SECONDARY,
                    dispatch
                );
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.GetSourceInfo,
            action => action.payload.tileId === this.tileId,
            (state, action) => state,
            (state, action, dispatch) => {
                this.infoApi.call(
                    appServices.dataStreaming().startNewSubgroup(this.tileId),
                    this.tileId,
                    0,
                    {
                        lang: appServices.getISO639UILang(),
                        corpname: action.payload.corpusId,
                    }

                ).subscribe({
                    next: (data) => {
                        dispatch({
                            name: GlobalActions.GetSourceInfoDone.name,
                            payload: {
                                tileId: this.tileId,
                                data: data
                            }
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        dispatch({
                            name: GlobalActions.GetSourceInfoDone.name,
                            error: err,
                            payload: {
                                tileId: this.tileId
                            }
                        });
                    }
                });
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.FollowBacklink,
            action => action.payload.tileId === this.tileId,
            null,
            (state, action, dispatch) => {
                const args = this.stateToArgs(state, action.payload.backlink.queryId, action.payload.backlink.subqueryId === 1);
                this.api.requestBacklink(args).subscribe({
                    next: url => {
                        dispatch(GlobalActions.BacklinkPreparationDone);
                        window.open(url.toString(),'_blank');
                    },
                    error: err => {
                        dispatch(GlobalActions.BacklinkPreparationDone, err);
                        this.appServices.showMessage(SystemMessageType.ERROR, err);
                    },
                });
            }
        );

        this.addActionSubtypeHandler(
            Actions.ZoomMouseLeave,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.refArea = [null, null];
            }
        );

        this.addActionSubtypeHandler(
            Actions.ZoomMouseDown,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.refArea = [action.payload.value, action.payload.value];
            }
        );

        this.addActionSubtypeHandler(
            Actions.ZoomMouseMove,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.refArea[1] = action.payload.value;
            }
        );

        this.addActionSubtypeHandler(
            Actions.ZoomMouseUp,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                if (state.refArea[1] !== state.refArea[0]) {
                    state.zoom = state.refArea[1] > state.refArea[0] ?
                        [state.refArea[0], state.refArea[1]] :
                        [state.refArea[1], state.refArea[0]];
                }
                state.refArea = [null, null];
            }
        );

        this.addActionSubtypeHandler(
            Actions.ZoomReset,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.zoom = [null, null]
            }
        );

        this.addActionHandler<typeof Actions.ChangeTimeWindow>(
            Actions.ChangeTimeWindow.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {state.averagingYears = action.payload.value}
            }
        );

        this.addActionHandler<typeof Actions.ChangeUnits>(
            Actions.ChangeUnits.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {state.units = action.payload.units}
            }
        );
    }

    private mergeChunks(currData:Array<DataItemWithWCI>, newChunk:Array<DataItemWithWCI>, alphaLevel:Maths.AlphaLevel):Array<DataItemWithWCI> {
        return pipe(
            newChunk,
            List.foldl(
                (acc, curr) => {
                    if (acc[curr.datetime] !== undefined) {
                        const tmp = acc[curr.datetime];
                        tmp.freq += curr.freq;
                        tmp.datetime = curr.datetime;
                        tmp.norm += curr.norm;
                        tmp.ipm = calcIPM(tmp, tmp.norm);
                        const confInt = Maths.wilsonConfInterval(tmp.freq, tmp.norm, alphaLevel);
                        tmp.ipmInterval = [roundFloat(confInt[0] * 1e6), roundFloat(confInt[1] * 1e6)];
                        acc[tmp.datetime] = tmp;
                        return acc;

                    } else {
                        const confInt = Maths.wilsonConfInterval(curr.freq, curr.norm, alphaLevel);
                        acc[curr.datetime] = {
                            datetime: curr.datetime,
                            freq: curr.freq,
                            norm: curr.norm,
                            ipm: calcIPM(curr, curr.norm),
                            ipmInterval: [roundFloat(confInt[0] * 1e6), roundFloat(confInt[1] * 1e6)]
                        };
                        return acc;
                    }
                },
                Dict.fromEntries(List.map(v => [v.datetime, v] as [string, DataItemWithWCI], currData))
            ),
            Dict.toEntries(),
            List.map(([,v]) => v),
            List.sortBy(x => dateToSortNumber(x.datetime))
        );
    }


    private getFreqs(
        state:TimeDistribModelState,
        response:Observable<[TimeDistribResponse, DataFetchArgsOwn]>,
        seDispatch:SEDispatcher
    ) {
        response.pipe(
            map(
                ([resp, args]) => {
                    const dataFull = resp.data.map<DataItemWithWCI>(v => ({
                        datetime: v.datetime,
                        freq: v.freq,
                        norm: v.norm,
                        ipm: -1,
                        ipmInterval: [-1, -1]
                    }));
                    let ans:DataLoadedPayload = {
                        tileId: this.tileId,
                        queryId: args.queryIdx,
                        overwritePrevious: resp.overwritePrevious,
                    };
                    if (args.targetId === SubchartID.MAIN) {
                        ans.data = dataFull;
                        ans.wordMainLabel = args.wordMainLabel;

                    } else if (args.targetId === SubchartID.SECONDARY) {
                        ans.dataCmp = dataFull;
                    }
                    return ans;
                }
            ),
            tap(
                data => {
                    seDispatch<typeof Actions.PartialTileDataLoaded>({
                        name: Actions.PartialTileDataLoaded.name,
                        payload: {...data}
                    });
                }
            ),
            reduce(
                (acc, payload) => acc && (payload.dataCmp || payload.data || []).length === 0,
                true
            )
        ).subscribe({
            next: isEmpty => {
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload:{
                        tileId: this.tileId,
                        isEmpty: isEmpty
                    }
                });
            },
            error: error => {
                console.error(error);
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true
                    },
                    error
                });
            }
        });
    }

    private loadData(
        state:TimeDistribModelState,
        dataStreaming:IDataStreaming,
        targetId:SubchartID,
        dispatch:SEDispatcher
    ):void {
        const resp = targetId === SubchartID.MAIN ?
            new Observable<[TimeDistribArgs, {wordMainLabel:string; targetId:SubchartID, queryIdx:number;}]>((observer) => {
                try {
                    pipe(
                        this.queryMatches,
                        List.map(findCurrQueryMatch),
                        List.map((currMatch, queryIdx) =>
                            tuple(
                                testIsDictMatch(currMatch) ?
                                    this.stateToArgs(state, queryIdx) :
                                    null,
                                {
                                    wordMainLabel: currMatch.lemma,
                                    targetId,
                                    queryIdx,
                                },
                            )
                        ),
                        List.forEach(args => observer.next(args)),
                    );
                    observer.complete();
    
                } catch (e) {
                    observer.error(e);
                }
    
            }).pipe(
                mergeMap(([args, pass]) =>
                    callWithExtraVal(
                        dataStreaming,
                        this.api,
                        this.tileId,
                        pass.queryIdx,
                        args,
                        pass,
                    )
                ),
            ) :
            this.api.loadSecondWord(
                dataStreaming,
                this.tileId,
                0,
                this.stateToArgs(state, 0, true),
            ).pipe(
                map(
                    resp => tuple(resp, { wordMainLabel: state.wordCmp, targetId, queryIdx: 0 })
                )
            );
        this.getFreqs(state, resp, dispatch);
    }

    private stateToArgs(state:TimeDistribModelState, queryIdx:number, cmp?:boolean):TimeDistribArgs {
        return {
            corpname: state.corpname,
            q: cmp ? `[word="${state.wordCmp}"]` : mkLemmaMatchQuery(findCurrQueryMatch(this.queryMatches[queryIdx]), state.posQueryGenerator),
            subcorpName: undefined, // TODO
            fromYear: state.fromYear ? state.fromYear + '' : undefined,
            toYear: state.toYear ? state.toYear + '' : undefined,
            fcrit: state.fcrit,
            maxItems: state.maxItems
        }
    }

}
