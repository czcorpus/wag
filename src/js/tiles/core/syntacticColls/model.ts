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
import { StatelessModel, IActionQueue } from 'kombo';
import { IAppServices } from '../../../appServices.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './common.js';
import { BacklinkConf } from '../../../page/tile.js';
import { QueryMatch, QueryType } from '../../../query/index.js';
import { map } from 'rxjs/operators';
import { merge, of as rxOf } from 'rxjs';
import { Dict, List } from 'cnc-tskit';
import { SystemMessageType } from '../../../types.js';
import {
    SCERequestArgs,
    ScollexSyntacticCollsAPI,
    ScollexSyntacticCollsExamplesAPI,
    SCollsData,
    SCollsExamples,
    SCollsQueryType,
    SCollsRequest } from './api.js';
    import { IDataStreaming } from '../../../page/streaming.js';


export interface SyntacticCollsModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:IAppServices;
    initState:SyntacticCollsModelState;
    queryType:QueryType;
    api:ScollexSyntacticCollsAPI;
    eApi:ScollexSyntacticCollsExamplesAPI;
    maxItems:number;
}


export interface SyntacticCollsModelState {
    isBusy:boolean;
    tileId:number;
    isMobile:boolean;
    isAltViewMode:boolean;
    error:string|null;
    widthFract:number;
    corpname:string;
    queryMatch:QueryMatch;
    data:{[key in SCollsQueryType]?:SCollsData};
    displayTypes:Array<SCollsQueryType>;
    examplesCache:{[key:string]:SCollsExamples};
    exampleWindowData:SCollsExamples|undefined; // if undefined, the window is closed
}


export class SyntacticCollsModel extends StatelessModel<SyntacticCollsModelState> {

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly queryType:QueryType;

    private readonly api:ScollexSyntacticCollsAPI;

    private readonly eApi:ScollexSyntacticCollsExamplesAPI;

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
        appServices.dataStreaming().createSubgroup(this.tileId);

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
                merge(...List.map(qType =>
                    this.api.call(appServices.dataStreaming(), this.tileId, this.stateToArgs(state, qType)),
                    state.displayTypes,
                )).subscribe({
                    next: ([qType, data]) => {
                        seDispatch<typeof Actions.TileDataLoaded>({
                            name: Actions.TileDataLoaded.name,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: false,
                                data,
                                qType,
                            }
                        })
                    },
                    error: (error) => {
                        seDispatch<typeof Actions.TileDataLoaded>({
                            name: Actions.TileDataLoaded.name,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: true,
                                data: undefined,
                                qType: undefined,
                            },
                            error,
                        })
                    },
                });
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
                    state.data[action.payload.qType] = action.payload.data;
                    state.data[action.payload.qType].rows = state.data[action.payload.qType].rows.slice(0, this.maxItems);
                    if (List.every(qType => !!state.data[qType], state.displayTypes)) {
                        state.isBusy = false;
                    }
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
                const q = state.data[action.payload.qType].examplesQueryTpl.replace('%s', action.payload.word);
                (Dict.hasKey(q, state.examplesCache) ?
                    rxOf(state.examplesCache[q]) :
                    this.eApi.call(appServices.dataStreaming().getSubgroup(this.tileId), this.tileId, this.stateToEapiArgs(state, q)).pipe(
                        map(
                            data => ({
                                ...data,
                                word1: state.queryMatch.word,
                                word2: action.payload.word
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
    }


    private stateToArgs(state:SyntacticCollsModelState, queryType:SCollsQueryType):SCollsRequest {
        const args = {
            w: state.queryMatch.lemma ? state.queryMatch.lemma : state.queryMatch.word,
        };
        if (state.queryMatch.upos.length > 0) {
            args['pos'] = state.queryMatch.upos[0].value;
        }
        return {
            params: {
                corpname: state.corpname,
                queryType: queryType,
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