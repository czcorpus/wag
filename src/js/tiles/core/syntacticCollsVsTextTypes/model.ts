/*
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2025 Institute of the Czech National Corpus,
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

import { IActionQueue, SEDispatcher, StatelessModel } from 'kombo';

import { Actions as GlobalActions } from '../../../models/actions.js';
import { IAppServices } from '../../../appServices.js';
import { QueryMatch, QueryType } from '../../../query/index.js';
import { SCollsQueryType } from '../syntacticColls/api/scollex.js';
import { IDataStreaming } from '../../../page/streaming.js';
import { Actions } from './common.js';
import { Dict, List, pipe, tuple } from 'cnc-tskit';
import { SCollsTTRequest, WSServerSyntacticCollsTTAPI } from './api.js';
import { Theme } from '../../../page/theme.js';
import { SCollsData } from '../syntacticColls/api/common.js';


export interface TTData {
    id:string;
    label:string;
    data:SCollsData;
}


export interface SyntacticCollsVsTTModelState {
    error:string|undefined;
    corpname:string;
    queryMatch:QueryMatch;
    scollType:SCollsQueryType;
    data:Array<TTData>;
    isBusy:boolean;
}


interface SyntacticCollsModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:IAppServices;
    initState:SyntacticCollsVsTTModelState;
    queryType:QueryType;
    api:WSServerSyntacticCollsTTAPI;
    maxItems:number;
    theme:Theme;
}


export class SyntacticCollsVsTTModel extends StatelessModel<SyntacticCollsVsTTModelState> {

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly queryType:QueryType;

    private readonly api:WSServerSyntacticCollsTTAPI;

    private readonly theme:Theme;


    constructor({
        dispatcher,
        tileId,
        appServices,
        initState,
        queryType,
        api,
        maxItems,
        theme
    }:SyntacticCollsModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.api = api;
        this.theme = theme;

        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                const colors = pipe(
                    state.data,
                    List.flatMap(
                        v => v.data.rows
                    ),
                    List.foldl(
                        (acc, curr) => {
                            acc[curr.value] = acc[curr.value] === undefined ? 1 : acc[curr.value] + 1;
                            return acc;
                        },
                        {} as {[id:string]:number}
                    ),
                    Dict.toEntries(),
                    List.sortedBy(([, v]) => v),
                    List.reversed(),
                    List.map(
                        ([v, num], i) => i < theme.numCategoryColors() ?
                            tuple(v, theme.categoryColor(i)) :
                            tuple(v, undefined)
                    ),
                    Dict.fromEntries()
                );
                state.data = List.map(
                    block => ({
                        ...block,
                        data: {
                            ...block.data,
                            rows: List.map(
                                v => ({...v, color: colors[v.value]}),
                                block.data.rows
                            )
                        }
                    }),
                    state.data
                )
            }
        );

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.data = List.map(
                    item => ({...item, isBusy: true}),
                    state.data
                )
                state.error = null;
            },
            (state, action, seDispatch) => {
                this.reloadData(appServices.dataStreaming(), state, seDispatch);
            }
        );

        this.addActionSubtypeHandler(
            Actions.PartialTileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                if (!action.error) {
                    state.data = List.map(
                        item => {
                            const newEntry = action.payload.data.parts[item.id];
                            return newEntry ?
                                {
                                    ...item,
                                    data: {
                                        rows: newEntry.rows,
                                        examplesQueryTpl: undefined
                                    }
                                } :
                                item
                        },
                        state.data,
                    )

                } else {
                    state.error = `${action.error}`;
                    state.data = List.map(
                        v => ({...v, isBusy: false}),
                        state.data
                    )
                }
            }
        );
    }


    private stateToArgs(state:SyntacticCollsVsTTModelState):SCollsTTRequest {
        if (state.scollType === 'none') {
            return null;
        }
        const args:SCollsTTRequest['args'] = {
            w: state.queryMatch.lemma ? state.queryMatch.lemma : state.queryMatch.word,
            textTypes: List.map(
                item => item.id,
                state.data
            )
        };
        if (state.queryMatch.upos.length > 0) {
            args['pos'] = state.queryMatch.upos[0].value;
        }
        return {
            params: {
                corpname: state.corpname,
                queryType: state.scollType,
            },
            args
        };
    }


    private reloadData(streaming:IDataStreaming, state:SyntacticCollsVsTTModelState, seDispatch:SEDispatcher) {
        this.api.call(
            streaming,
            this.tileId,
            0,
            this.stateToArgs(state)

        ).subscribe({
            next: (data) => {
                seDispatch<typeof Actions.PartialTileDataLoaded>({
                    name: Actions.PartialTileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        data,
                    }
                })
            },
            error: (error) => {
                seDispatch<typeof Actions.PartialTileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        data: undefined,
                    },
                    error,
                })
            },
            complete: () => {
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: false
                    }
                })
            }
        });
    }



}