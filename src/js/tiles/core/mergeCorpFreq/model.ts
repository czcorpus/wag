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

import { IAppServices } from '../../../appServices.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { QueryMatch } from '../../../query/index.js';
import { MergeCorpFreqModelState } from './common.js';
import { Actions } from './actions.js';
import { isWebDelegateApi } from '../../../types.js';
import { Backlink, createAppBacklink } from '../../../page/tile.js';
import { MergeFreqsApi } from './api.js';





export interface MergeCorpFreqModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    waitForTilesTimeoutSecs:number;
    appServices:IAppServices;
    freqApi:MergeFreqsApi;
    initState:MergeCorpFreqModelState;
    backlink:Backlink;
    downloadLabel:string;
}

export class MergeCorpFreqModel extends StatelessModel<MergeCorpFreqModelState> {

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    private readonly freqApi:MergeFreqsApi;

    private readonly backlink:Backlink;

    private readonly downloadLabel:string;

    constructor({
        dispatcher, tileId, appServices, freqApi, initState, backlink, downloadLabel,
    }:MergeCorpFreqModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.freqApi = freqApi;
        this.backlink = !backlink?.isAppUrl && isWebDelegateApi(this.freqApi) ? this.freqApi.getBackLink(backlink) : backlink;
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
                this.loadFreqs(state, true, state.queryMatches[0], dispatch);
            }
        );

        this.addActionHandler<typeof Actions.PartialTileDataLoaded>(
            Actions.PartialTileDataLoaded.name,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (this.backlink !== null && this.backlink.isAppUrl && state.appBacklink === null) {
                        state.appBacklink = createAppBacklink(this.backlink);
                    }

                    if (state.data[action.payload.queryId] === undefined) {
                        state.data[action.payload.queryId] = [];
                    }

                    state.data[action.payload.queryId] = pipe(
                        state.data[action.payload.queryId],
                        List.concat(action.payload.data.length > 0 ?
                            action.payload.data :
                            [{
                                sourceId: action.payload.sourceId,
                                name: action.payload.valuePlaceholder,
                                freq: 0,
                                ipm: 0,
                                norm: 0,
                                backlink: null,
                                uniqueColor: false
                            }]
                        ),
                        List.filter(v => !!v.name),
                        List.sortAlphaBy(v => {
                            const idx = List.findIndex(s => s.uuid === v.sourceId, state.sources);
                            return `${idx}${v.name}`;
                        })
                    );
                }
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
    }

    private loadFreqs(
        state:MergeCorpFreqModelState,
        multicastRequest:boolean,
        queryMatch:QueryMatch,
        dispatch:SEDispatcher
    ):void {
        this.freqApi.call(
            this.tileId,
            multicastRequest,
            this.freqApi.stateToArgs(state, queryMatch)
        )
    }
}
