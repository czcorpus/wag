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
import { IFullActionControl, StatefulModel } from 'kombo';

import { IAppServices } from '../../../appServices.js';
import { Backlink } from '../../../page/tile.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { QueryMatch, testIsDictMatch } from '../../../query/index.js';
import { mkLemmaMatchQuery } from '../../../api/vendor/mquery/common.js';
import { DataRow, MQueryFreqArgs, MQueryFreqDistribAPI } from '../../../api/vendor/mquery/freqs.js';
import { SystemMessageType } from '../../../types.js';
import { mergeMap, Observable } from 'rxjs';
import { List, pipe, tuple } from 'cnc-tskit';
import { callWithExtraVal } from '../../../api/util.js';


export interface FreqDataBlock {
    word:string;
    isReady:boolean;
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
    freqData:Array<FreqDataBlock>;
    backlinks:Array<Backlink>;
    subqSyncPalette:boolean;
    isAltViewMode:boolean;
    isBusy:boolean;
    error:string;
    pixelsPerCategory:number;
}

export interface FreqBarModelArgs {
    dispatcher:IFullActionControl;
    queryMatches:Array<QueryMatch>;
    tileId:number;
    readDataFromTile:number|null;
    appServices:IAppServices;
    api:MQueryFreqDistribAPI;
    initState:FreqBarModelState;
}


export class FreqBarModel extends StatefulModel<FreqBarModelState> {

    readonly CHART_LABEL_MAX_LEN = 20;

    private readonly api:MQueryFreqDistribAPI;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly queryMatches:Array<QueryMatch>;

    constructor({
        dispatcher,
        tileId,
        appServices,
        api,
        queryMatches,
        initState
    }:FreqBarModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.queryMatches = queryMatches;
        this.appServices = appServices;
        this.api = api;

        this.addActionHandler(
            GlobalActions.SetScreenMode,
            action => {
                console.log('SET SCREEN MODE: ', action.payload);
            }
        );

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
                        List.forEach(item => {item.isReady = false;}, state.freqData);
                        state.isBusy = true;
                        state.error = null;
                    }
                );

                new Observable<[MQueryFreqArgs, {queryIdx:number;}]>((observer) => {
                    try {
                        pipe(
                            this.queryMatches,
                            List.map((currMatch, queryIdx) =>
                                tuple(
                                    this.stateToArgs(currMatch),
                                    {
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
                        appServices.callAPIWithExtraVal(
                            this.api,
                            this.appServices.dataStreaming(),
                            this.tileId,
                            pass.queryIdx,
                            args,
                            pass,
                        )
                    ),
                ).subscribe({
                    next: ([data, pass]) => {
                        this.changeState(
                            state => {
                                state.freqData[pass.queryIdx].rows = data.data;
                                state.freqData[pass.queryIdx].isReady = true;
                                state.backlinks[pass.queryIdx] = this.api.getBacklink(pass.queryIdx);
                            }
                        )
                    },
                    complete: () => {
                        this.changeState(
                            state => {
                                state.isBusy = false;
                            }
                        )
                    },
                    error: error => {

                        this.changeState(
                            state => {
                                state.freqData = List.map(
                                    match => ({word: match.word, isReady: true, rows: []}),
                                    this.queryMatches
                                );
                                state.backlinks = List.map(_ => null, this.queryMatches);
                                state.error = this.appServices.normalizeHttpApiError(error);
                                state.isBusy = false;
                            }
                        )
                        this.appServices.showMessage(SystemMessageType.ERROR, error);
                    }
                });
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

        this.addActionSubtypeHandler(
            GlobalActions.FollowBacklink,
            action => action.payload.tileId === this.tileId,
            action => {
                const args = this.stateToArgs(this.queryMatches[action.payload.backlink.queryId]);
                this.api.requestBacklink(args).subscribe({
                    next: url => {
                        window.open(url.toString(),'_blank');
                    },
                    error: err => {
                        this.appServices.showMessage(SystemMessageType.ERROR, err);
                    },
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
