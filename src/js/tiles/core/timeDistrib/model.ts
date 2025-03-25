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
import { Observable, of as rxOf } from 'rxjs';
import { map, mergeMap, reduce, tap } from 'rxjs/operators';
import { Dict, Maths, pipe, List } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { findCurrQueryMatch } from '../../../models/query.js';
import { DataItemWithWCI, SubchartID, DataLoadedPayload } from './common.js';
import { Actions } from './common.js';
import { QueryMatch, RecognizedQueries } from '../../../query/index.js';
import { Backlink, BacklinkWithArgs, createAppBacklink } from '../../../page/tile.js';
import { MainPosAttrValues } from '../../../conf/index.js';
import { MQueryTimeDistribStreamApi, TimeDistribResponse } from 'src/js/api/vendor/mquery/timeDistrib.js';


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
    concId?:string;
    error:string;
    alphaLevel:Maths.AlphaLevel;
    posQueryGenerator:[string, string];
    customApiArgs:{[k:string]:string};
    mainPosAttr:MainPosAttrValues;
    isTweakMode:boolean;
    data:Array<DataItemWithWCI>;
    dataCmp:Array<DataItemWithWCI>;
    useAbsFreq:boolean;
    displayObserved:boolean;
    wordCmp:string;
    wordCmpInput:string;
    wordMainLabel:string; // a copy from mainform state used to attach a legend
    backlinks:Array<BacklinkWithArgs<{}>>;
    refArea:[number,number];
    zoom:[number, number];
    loadingStatus:LoadingStatus; // this is little bit redundant with isBusy but we need this
    subcBacklinkLabel:{[subc:string]:string};
}


const roundFloat = (v:number):number => Math.round(v * 100) / 100;

const calcIPM = (v:DataItemWithWCI, domainSize:number) => Math.round(v.freq / domainSize * 1e6 * 100) / 100;


interface DataFetchArgsOwn {
    subcName:string;
    wordMainLabel:string;
    targetId:SubchartID;
    concId:string;
    origQuery:string;
}

export interface TimeDistribModelArgs {
    dispatcher:IActionDispatcher;
    initState:TimeDistribModelState;
    tileId:number;
    api:MQueryTimeDistribStreamApi;
    waitForTile:number;
    waitForTilesTimeoutSecs:number;
    appServices:IAppServices;
    queryMatches:RecognizedQueries;
    backlink:Backlink;
    queryDomain:string;
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

    private readonly waitForTile:number;

    private readonly waitForTilesTimeoutSecs:number;

    private readonly queryMatches:RecognizedQueries;

    private readonly queryDomain:string;

    private readonly backlink:Backlink;

    private readonly api:MQueryTimeDistribStreamApi;


    constructor({
        dispatcher,
        initState,
        tileId,
        api,
        waitForTile,
        waitForTilesTimeoutSecs,
        appServices,
        queryMatches,
        queryDomain,
        backlink
    }:TimeDistribModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.waitForTilesTimeoutSecs = waitForTilesTimeoutSecs;
        this.appServices = appServices;
        this.queryMatches = queryMatches;
        this.queryDomain = queryDomain;
        this.backlink = backlink;
        this.api = api;

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.data = [];
                state.backlinks = [];
                state.dataCmp = [];
                state.loadingStatus = LoadingStatus.BUSY_LOADING_MAIN;
                state.error = null;
            },
            (state, action, dispatch) => {
                this.loadData(
                    state,
                    true,
                    SubchartID.MAIN,
                    rxOf(findCurrQueryMatch(this.queryMatches[0])),
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
                    state.data = [];
                    state.dataCmp = [];
                    state.error = this.appServices.normalizeHttpApiError(action.error);
                }
            }
        );

        this.addActionSubtypeHandler(
            Actions.PartialTileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                if (action.payload.data) {
                    state.data = this.mergeChunks(
                        action.payload.overwritePrevious ? [] : state.data, action.payload.data, state.alphaLevel);

                } else if (action.payload.dataCmp) {
                    state.dataCmp = this.mergeChunks(
                        action.payload.overwritePrevious ? [] : state.dataCmp, action.payload.dataCmp, state.alphaLevel);
                }
                if (action.payload.wordMainLabel) {
                    state.wordMainLabel = action.payload.wordMainLabel;
                }
                if (this.backlink?.isAppUrl) {
                    state.backlinks = [createAppBacklink(this.backlink)];
                } else {
                    state.backlinks.push(action.payload.backlink);
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
                    false,
                    SubchartID.SECONDARY,
                    this.appServices.queryLemmaDbApi(
                        this.tileId,
                        this.queryDomain,
                        state.wordCmp,
                        state.mainPosAttr
                    ).pipe(
                        map(v => v.result[0])
                    ),
                    dispatch
                );
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.GetSourceInfo,
            action => action.payload.tileId === this.tileId,
            (state, action) => state,
            (state, action, dispatch) => {
                this.api.getSourceDescription(
                    this.tileId, false, this.appServices.getISO639UILang(), action.payload['corpusId']

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
                        concId: args.concId,
                        overwritePrevious: resp.overwritePrevious,
                        backlink: this.api.createBackLink(
                            state.backlinks[0],
                            state.corpname,
                            findCurrQueryMatch(this.queryMatches[0])
                        )
                    };
                    if (ans.backlink && Dict.hasKey(args.subcName, state.subcBacklinkLabel)) {
                        ans.backlink.label = state.subcBacklinkLabel[args.subcName];
                    }
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
        multicastRequest:boolean,
        target:SubchartID,
        lemmaVariant:Observable<QueryMatch>,
        dispatch:SEDispatcher
    ):void {

        const data = lemmaVariant.pipe(
            mergeMap((lv:QueryMatch) => {
                if (lv && lv.abs > 0) {
                    const query = pipe(
                        lv.lemma.split(' '),
                        List.map(v => `[lemma="${v}"]`),
                        v => v.join(' ')
                    );
                    return rxOf<DataFetchArgsOwn>(
                        {
                            concId: null,
                            subcName: state.subcnames[0],
                            wordMainLabel: lv.lemma,
                            targetId: target,
                            origQuery: query
                        }
                    );
                }
            }),
            mergeMap(
                (args) => {
                    return rxOf<[TimeDistribResponse, DataFetchArgsOwn]>([
                        {
                            corpName: state.corpname,
                            subcorpName: args.subcName,
                            concPersistenceID: null,
                            data: []
                        },
                        args
                    ]);
                }
            )
        );

        this.getFreqs(state, data, dispatch);
    }

}
