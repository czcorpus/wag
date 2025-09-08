/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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
import { StatelessModel, IActionQueue, SEDispatcher } from 'kombo';
import { IAppServices } from '../../../appServices.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './common.js';
import { QueryMatch, QueryType } from '../../../query/index.js';
import { map } from 'rxjs/operators';
import { of as rxOf } from 'rxjs';
import { Dict, List } from 'cnc-tskit';
import { SystemMessageType } from '../../../types.js';
import { ScollexSyntacticCollsAPI } from './api/scollex.js';
import { WSServerSyntacticCollsAPI } from './api/wsserver.js';
import { IDataStreaming } from '../../../page/streaming.js';
import { SCERequestArgs, SCollsExamples, SyntacticCollsExamplesAPI } from './eApi/mquery.js';
import { SCollsData, SCollsQueryType, SCollsRequest } from './api/common.js';


export type CollMeasure = 'LMI' | 'LL' | 'LogDice' | 'T-Score';


export interface SyntacticCollsModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:IAppServices;
    initState:SyntacticCollsModelState;
    queryType:QueryType;
    api:ScollexSyntacticCollsAPI|WSServerSyntacticCollsAPI;
    eApi:SyntacticCollsExamplesAPI;
    maxItems:number;
}


export interface SyntacticCollsModelState {
    isBusy:boolean;
    tileId:number;
    isMobile:boolean;
    isAltViewMode:boolean;
    isTweakMode:boolean;
    apiType:'default'|'wss';
    error:string|null;
    widthFract:number;
    corpname:string;
    queryMatch:QueryMatch;
    data:SCollsData;
    displayType:SCollsQueryType;
    label:string;
    availableMeasures:Array<CollMeasure>;
    visibleMeasures:Array<CollMeasure>;
    examplesCache:{[key:string]:SCollsExamples};
    exampleWindowData:SCollsExamples|undefined; // if undefined, the window is closed
}


export class SyntacticCollsModel extends StatelessModel<SyntacticCollsModelState> {

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly queryType:QueryType;

    private readonly api:ScollexSyntacticCollsAPI|WSServerSyntacticCollsAPI;

    private readonly eApi:SyntacticCollsExamplesAPI;

    private readonly maxItems:number;

    constructor({
        dispatcher,
        tileId,
        appServices,
        initState,
        queryType,
        api,
        eApi,
        maxItems
    }:SyntacticCollsModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.queryType = queryType;
        this.api = api;
        this.eApi = eApi;
        this.maxItems = maxItems;

        this.addActionSubtypeHandler(
            GlobalActions.EnableAltViewMode,
            action => action.payload.ident === this.tileId,
            (state, action) => {state.isAltViewMode = true}
        );

        this.addActionSubtypeHandler(
            GlobalActions.DisableAltViewMode,
            action => action.payload.ident === this.tileId,
            (state, action) => {state.isAltViewMode = false}
        );

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, seDispatch) => {
                this.reloadData(appServices.dataStreaming(), state, seDispatch);
            }
        );

        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.exampleWindowData = undefined;
                if (action.error) {
                    console.error(action.error);
                    state.isBusy = false;
                    state.error = this.appServices.normalizeHttpApiError(action.error);
                    this.appServices.showMessage(SystemMessageType.ERROR, state.error);

                } else {
                    state.data = action.payload.data;
                    state.isBusy = false;
                }
            }
        );

        this.addActionSubtypeHandler(
            Actions.ClickForExample,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = true;
            },
            (state, action, dispatch) => {
                let q:string;
                const row = state.data.rows[action.payload.rowId];
                if (!state.data.examplesQueryTpl) {
                    q = this.eApi.makeQuery(
                        state.queryMatch.lemma,
                        row.value,
                        (state.queryMatch.upos[0] || state.queryMatch.pos[0]).value,
                        row.pos,
                        row.deprel,
                        row.mutualDist,
                    );

                } else {
                    q = state.data.examplesQueryTpl.replace('%s', row.value);
                }
                (Dict.hasKey(q, state.examplesCache) ?
                    rxOf(state.examplesCache[q]) :
                    this.eApi.call(
                        this.appServices.dataStreaming().startNewSubgroup(this.tileId),
                        this.tileId,
                        0,
                        this.stateToEapiArgs(state, q)

                    ).pipe(
                        map(
                            data => ({
                                ...data,
                                word1: state.queryMatch.word,
                                word2: row.value
                            })
                        )
                    )
                ).subscribe({
                    next: (data) => {
                        dispatch(
                            Actions.ShowExampleWindow,
                            {
                                tileId: this.tileId,
                                data,
                                query: q
                            }
                        );
                    },
                    error: (error) => {
                        dispatch({
                            name: Actions.ShowExampleWindow.name,
                            payload: { tileId: this.tileId, query: q },
                            error
                        });
                    }
                })
            }
        );

        this.addActionSubtypeHandler(
            Actions.ShowExampleWindow,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.isBusy = false;
                state.exampleWindowData = action.payload.data;
                if (!Dict.hasKey(action.payload.query, state.examplesCache)) {
                    state.examplesCache[action.payload.query] = action.payload.data;
                }
            },
            (state, action, dispatch) => {
                if (action.error) {
                    this.appServices.showMessage(SystemMessageType.ERROR, action.error);
                }
            }
        );

        this.addActionSubtypeHandler(
            Actions.HideExampleWindow,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.exampleWindowData = undefined;
            }
        );

        this.addActionHandler(
            GlobalActions.GetSourceInfo,
            (state, action) => {},
            (state, action, seDispatch) => {},
        );

        this.addActionSubtypeHandler(
            Actions.SetDisplayScore,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.visibleMeasures[action.payload.position] = action.payload.value;
            },
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
    }

    private reloadData(streaming:IDataStreaming, state:SyntacticCollsModelState, seDispatch:SEDispatcher) {
        this.api.call(
            streaming,
            this.tileId,
            0,
            this.stateToArgs(state)

        ).subscribe({
            next: (data) => {
                seDispatch<typeof GlobalActions.OverwriteTileLabel>({
                    name: GlobalActions.OverwriteTileLabel.name,
                    payload: {
                        tileId: this.tileId,
                        value: state.label
                    }
                });
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: List.empty(data.rows),
                        data,
                    }
                })
            },
            error: (error) => {
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: false,
                        data: undefined,
                    },
                    error,
                })
            },
        });
    }


    private stateToArgs(state:SyntacticCollsModelState):SCollsRequest {
        if (state.displayType === 'none') {
            return null;
        }
        const args = {
            w: state.queryMatch.lemma ? state.queryMatch.lemma : state.queryMatch.word,
        };
        if (state.queryMatch.upos.length > 0) {
            args['pos'] = state.queryMatch.upos[0].value;
            args['deprel'] = undefined;
        }
        return {
            params: {
                corpname: state.corpname,
                queryType: state.displayType,
            },
            args
        };
    }

    private stateToEapiArgs(state:SyntacticCollsModelState, q:string):SCERequestArgs {
        return {
            params: {
                corpname: state.corpname,
            },
            args: {
                q
            }
        };
    }
}