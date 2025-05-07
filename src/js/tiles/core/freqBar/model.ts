/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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
import { Action, IFullActionControl, StatefulModel } from 'kombo';
import { Observable, Observer } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { Dict, Ident } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import { Backlink } from '../../../page/tile.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { QueryMatch, RecognizedQueries, testIsDictMatch } from '../../../query/index.js';
import { mkLemmaMatchQuery } from '../../../api/vendor/mquery/common.js';
import { DataRow, MQueryFreqArgs, MQueryFreqDistribAPI } from '../../../api/vendor/mquery/freqs.js';
import { SystemMessageType } from '../../../types.js';


export interface FreqDataBlock {
    rows:Array<DataRow>;
}


export interface FreqBarModelState {
    corpname:string;
    subcname:string|undefined;
    fcrit:string;
    tileBoxSize:[number, number];
    matchCase:boolean;
    label:string;
    freqType:'tokens'|'text-types';
    posQueryGenerator:[string, string];
    flimit:number;
    fpage:number;
    fmaxitems?:number;
    concId?:string;
    freqData:FreqDataBlock;
    activeBlock:number;
    backlink:unknown; // TODO new backlink implementation
    subqSyncPalette:boolean;
    isAltViewMode:boolean;
    isBusy:boolean;
    error:string;
}

export interface FreqBarModelArgs {
    dispatcher:IFullActionControl;
    queryMatches:Array<QueryMatch>;
    tileId:number;
    readDataFromTile:number|null;
    appServices:IAppServices;
    api:MQueryFreqDistribAPI;
    backlink:Backlink|null;
    initState:FreqBarModelState;
}


export class FreqBarModel extends StatefulModel<FreqBarModelState> {

    protected api:MQueryFreqDistribAPI;

    protected readonly appServices:IAppServices;

    protected readonly tileId:number;

    protected readonly queryMatches:Array<QueryMatch>;

    private readonly backlink:Backlink|null;

    constructor({
        dispatcher,
        tileId,
        appServices,
        api,
        backlink,
        queryMatches,
        initState
    }:FreqBarModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.queryMatches = queryMatches;
        this.appServices = appServices;
        this.api = api;
        this.backlink = null; // TODO new Backlink implementation

        this.addActionHandler(
            GlobalActions.SetScreenMode,
            action => {
                console.log('SET SCREEN MODE: ', action.payload);
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.SetTileRenderSize,
            action => action.payload.tileId === this.tileId,
            action => {
                console.log('SetTileRenderSize: ', action.payload)
            }
        )

        this.addActionSubtypeHandler(
            GlobalActions.EnableAltViewMode,
            action => action.payload.ident === this.tileId,
            action => {
                this.changeState(
                    state => {
                        state.isAltViewMode = true;
                    }
                );
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.DisableAltViewMode,
            action => action.payload.ident === this.tileId,
            action => {
                this.changeState(
                    state => {
                        state.isAltViewMode = false;
                    }
                );
            }
        );

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            action => {
                this.changeState(
                    state => {
                        state.isBusy = true;
                        state.error = null;
                    }
                );
                this.api.call(
                    this.appServices.dataStreaming(),
                    this.tileId,
                    0,
                    this.stateToArgs(this.queryMatches[0])

                ).subscribe({
                    next: data => {
                        this.changeState(
                            state => {
                                state.freqData.rows = data.data;
                                state.isBusy = false;
                            }
                        )
                    },
                    error: error => {
                        this.changeState(
                            state => {
                                state.isBusy = false;
                            }
                        )
                        this.appServices.showMessage(SystemMessageType.ERROR, error);
                    }
                });
            }
        );

        this.addActionSubtypeHandler(
            Actions.SetActiveBlock,
            action => action.payload.tileId === this.tileId,
            action => {
                this.changeState(
                    state => {
                        state.activeBlock = action.payload.idx;
                    }
                );
            }
        );

        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            action => action.payload.tileId === this.tileId,
            action => {
                if (action.error) {
                    this.changeState(
                        state => {
                            state.freqData = {rows: []};
                            state.error = this.appServices.normalizeHttpApiError(action.error);
                            state.isBusy = false;
                        }
                    );

                } else {
                    this.changeState(
                        state => {
                            state.freqData = {
                                rows: action.payload.data ?
                                    action.payload.data.map(v => ({
                                        name: this.appServices.translateResourceMetadata(state.corpname, v.name),
                                        freq: v.freq,
                                        ipm: v.ipm,
                                        norm: v.norm
                                    })) : null
                            };
                            state.isBusy = false;
                            // TODO
                            // state.backlink = this.backlink.isAppUrl ? createAppBacklink(this.backlink) : this.api.createBacklink(state, this.backlink, action.payload.concId);
                        }
                    );
                }
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.GetSourceInfo,
            action => action.payload.tileId === this.tileId,
            action => {
                this.api.getSourceDescription(
                    this.appServices.dataStreaming().startNewSubgroup(this.tileId),
                    this.tileId,
                    this.appServices.getISO639UILang(),
                    this.state.corpname

                ).subscribe({
                    next:(data) => {
                        this.dispatchSideEffect({
                            name: GlobalActions.GetSourceInfoDone.name,
                            payload: {
                                tileId: this.tileId,
                                data: data
                            }
                        });
                    },
                    error:(err) => {
                        console.error(err);
                        this.dispatchSideEffect({
                            name: GlobalActions.GetSourceInfoDone.name,
                            error: err,
                            paylod: {
                                tileId: this.tileId
                            }
                        });
                    }
                });
            }
        );
    };


    private stateToArgs(queryMatch:QueryMatch):MQueryFreqArgs|null {
        if (testIsDictMatch(queryMatch)) {
            return {
                corpname: this.state.corpname,
                path: this.state.freqType === 'tokens' ? 'freqs' : 'text-types',
                queryArgs: {
                    q: mkLemmaMatchQuery(queryMatch, this.state.posQueryGenerator),
                    subcorpus: '', // TODO
                    attr: this.state.fcrit,
                    matchCase: this.state.matchCase ? '1' : '0',
                    maxItems: this.state.fmaxitems,
                    flimit: this.state.flimit
                }
            };
        }
        return null;
    }
}
