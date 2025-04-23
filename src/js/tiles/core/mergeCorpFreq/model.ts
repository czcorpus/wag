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

import { StatelessModel, IActionQueue, SEDispatcher } from 'kombo';
import { Dict, List, pipe, tuple } from 'cnc-tskit';
import * as domtoimage from 'dom-to-image-more';
import { concatMap, map, tap } from 'rxjs/operators';
import { of as rxOf } from 'rxjs';

import { IAppServices } from '../../../appServices.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { findCurrQueryMatch, QueryMatch, testIsDictMatch } from '../../../query/index.js';
import { MergeCorpFreqModelState, ModelSourceArgs } from './common.js';
import { Actions } from './actions.js';
import { DataRow, MergeFreqsApi } from './api.js';
import { MQueryFreqArgs } from '../../../api/vendor/mquery/freqs.js';
import { mkLemmaMatchQuery } from '../../../api/vendor/mquery/common.js';
import { BacklinkConf } from '../../../page/tile.js';
import { SystemMessageType } from '../../../types.js';


export interface MergeCorpFreqModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:IAppServices;
    freqApi:MergeFreqsApi;
    initState:MergeCorpFreqModelState;
    downloadLabel:string;
}

export class MergeCorpFreqModel extends StatelessModel<MergeCorpFreqModelState> {

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly freqApi:MergeFreqsApi;

    private readonly downloadLabel:string;

    constructor({
        dispatcher, tileId, appServices, freqApi, initState, downloadLabel
    }:MergeCorpFreqModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.freqApi = freqApi;
        this.downloadLabel = downloadLabel ? downloadLabel : 'freq';

        this.addActionHandler<typeof GlobalActions.EnableAltViewMode>(
            GlobalActions.EnableAltViewMode.name,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = true;
                }
            }
        );

        this.addActionHandler<typeof GlobalActions.DisableAltViewMode>(
            GlobalActions.DisableAltViewMode.name,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = false;
                }
            }
        );

        this.addActionHandler<typeof GlobalActions.RequestQueryResponse>(
            GlobalActions.RequestQueryResponse.name,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                // TODO add support for the cmp mode
                this.loadFreqs(state, true, findCurrQueryMatch(state.queryMatches), 0, dispatch);
            }
        );

        this.addActionSubtypeHandler(
            Actions.PartialTileDataLoaded,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                state.backlinks.push(this.freqApi.getBacklink(action.payload.queryId, action.payload.sourceIdx));
                if (state.data[action.payload.queryId] === undefined) {
                    state.data[action.payload.queryId] = [];
                }
                state.data[action.payload.queryId] = state.data[action.payload.queryId].concat(action.payload.data)
            }
        );

        this.addActionHandler<typeof Actions.TileDataLoaded>(
            Actions.TileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.data = [];
                        state.error = this.appServices.normalizeHttpApiError(action.error);
                    }
                }
            }
        )

        this.addActionHandler<typeof GlobalActions.GetSourceInfo>(
            GlobalActions.GetSourceInfo.name,
            (state, action) => {},
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.freqApi.getSourceDescription(this.tileId,
                        false,
                        this.appServices.getISO639UILang(), action.payload.corpusId)
                    .subscribe({
                        next: data => {
                            dispatch({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    tileId: this.tileId,
                                    data: data
                                }
                            });
                        },
                        error: err => {
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
            }
        );

        this.addActionSubtypeHandler(
            Actions.ShowTooltip,
            action => action.payload.tileId === this.tileId && action.payload.dataName !== undefined,
            (state, action) => {
                state.tooltipData = {
                    tooltipX: action.payload.tooltipX,
                    tooltipY: action.payload.tooltipY,
                    caption: state.data.length > 0 ? action.payload.dataName : '-',
                    data: state.queryMatches.length > 1 ?
                        Dict.fromEntries(
                            List.map((v, i) => {
                                    const index = List.findIndex(v => v.name === action.payload.dataName, state.data[i]);
                                    return ([v.word, [
                                        {value: state.data[i] && index >= 0 && state.data[i][index] ? state.data[i][index].ipm : 0, unit: `ipm, ${appServices.translate('global__frequency')}`},
                                        {value: state.data[i] && index >= 0 && state.data[i][index] ? state.data[i][index].freq : 0}
                                    ]])
                                },
                                state.queryMatches
                            )
                        ) : {
                            [appServices.translate('mergeCorpFreq__rel_freq')]: [{value: state.data[0][List.findIndex(v => v.name === action.payload.dataName, state.data[0])].ipm}],
                            [appServices.translate('mergeCorpFreq__abs_freq')]: [{value: state.data[0][List.findIndex(v => v.name === action.payload.dataName, state.data[0])].freq}]
                        }
                };
            }
        );

        this.addActionHandler<typeof Actions.HideTooltip>(
            Actions.HideTooltip.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.tooltipData = null;
                }
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.SaveSVGFigure,
            action => action.payload.tileId === this.tileId,
            (state, action) => {
                let filename:string, ident:string;
                if (state.isAltViewMode) {
                    filename = `${this.downloadLabel}-table`;
                    ident = `${this.tileId}-download-table`;
                } else {
                    filename = `${this.downloadLabel}-figure`;
                    ident = `${this.tileId}-download-figure`;
                }

                domtoimage.toSvg(document.getElementById(ident), {bgcolor: 'white'})
                .then(function (dataUrl) {
                    var link = document.createElement('a');
                    link.download = filename;
                    link.href = dataUrl;
                    link.click();
                });
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.FollowBacklink,
            action => action.payload.tileId === this.tileId,
            null,
            (state, action, dispatch) => {
                const args = this.stateToArgs(
                    state.sources[action.payload.backlink.subqueryId],
                    findCurrQueryMatch(state.queryMatches),
                );
                this.freqApi.requestBacklink(args).subscribe({
                    next: url => {
                        window.open(url.toString(),'_blank');
                    },
                    error: err => {
                        this.appServices.showMessage(SystemMessageType.ERROR, err);
                    },
                });
            }
        );
    }

    private allSourcesToArgs(state:MergeCorpFreqModelState, queryMatch:QueryMatch):Array<MQueryFreqArgs|null> {
        return List.map(
            src => testIsDictMatch(queryMatch) ? this.stateToArgs(src, queryMatch) : null,
            state.sources
        );
    }

    private stateToArgs(state:ModelSourceArgs, queryMatch:QueryMatch, subcname?:string):MQueryFreqArgs {
        return {
            corpname: state.corpname,
            path: state.freqType === 'text-types' ? 'text-types' : 'freqs',
            queryArgs: {
                subcorpus: subcname ? subcname : state.subcname,
                q: mkLemmaMatchQuery(queryMatch, state.posQueryGenerator),
                flimit: state.flimit,
                matchCase: '0',
                attr: state.fcrit,
            }
        };
    }

    private loadFreqs(
        state:MergeCorpFreqModelState,
        multicastRequest:boolean,
        queryMatch:QueryMatch,
        queryId:number,
        seDispatch:SEDispatcher
    ):void {
        this.freqApi.call(
            this.tileId,
            multicastRequest,
            this.allSourcesToArgs(state, queryMatch)

        ).pipe(
            concatMap(
                resp => rxOf(...List.map((x, i) => tuple(i, x), resp))
            ),
            map(
                ([sourceIdx, resp]) => tuple(
                    sourceIdx,
                    {
                        ...resp,
                        freqs: pipe(
                            resp.freqs,
                            state.sources[sourceIdx].isSingleCategory ?
                                List.foldl<DataRow, Array<DataRow>>(
                                    (acc, curr) => {
                                        const freq =  acc[0].freq + curr.freq;
                                        const base = acc[0].base + curr.base;
                                        return [{
                                            word: curr.word, // here we assume, it will be replaced by a placeholder
                                            freq,
                                            base,
                                            ipm: freq / base * 1000000
                                        }]
                                    },
                                    [{
                                        word: '',
                                        freq: 0,
                                        base: 0,
                                        ipm: 0
                                    }]
                                ) :
                                x => x,
                            List.map(
                                (v, i) => ({
                                    ...v,
                                    sourceIdx,
                                    name: state.sources[sourceIdx].valuePlaceholder ?
                                        this.appServices.importExternalMessage(
                                            state.sources[sourceIdx].valuePlaceholder
                                        ) :
                                        `${v.word}`, // here we assume, that `.word` is unique
                                    backlink: null,
                                    uniqueColor: true // TODO
                                })
                            ),

                        )
                    }
                )
             ),
             tap(
                ([sourceIdx, resp]) => {
                    seDispatch<typeof Actions.PartialTileDataLoaded>({
                        name: Actions.PartialTileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            data: resp.freqs,
                            queryId,
                            sourceIdx
                        }
                    });
                }
            ),

        ).subscribe({
            next: ([, resp]) => {
                seDispatch<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload:{
                        tileId: this.tileId,
                        isEmpty: List.empty(resp.freqs)
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
        })
    }
}
