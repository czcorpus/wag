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
import { Action, ActionDispatcher, SEDispatcher, StatelessModel } from 'kombo';
import { Observable, Observer } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { AppServices } from '../../appServices';
import { BacklinkArgs, MultiBlockFreqDistribAPI, MultiCritQueryArgs, DataRow } from '../../common/api/kontext/freqs';
import { createBackLink, FreqDataBlock, GeneralMultiCritFreqBarModelState } from '../../common/models/freq';
import { Backlink, BacklinkWithArgs } from '../../common/types';
import { puid } from '../../common/util';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { ActionName, Actions, DataLoadedPayload } from './actions';


export interface FreqPieDataRow {
    name:string;
    percent:number;
    isTheRest:boolean;
}

export interface FreqPieModelState extends GeneralMultiCritFreqBarModelState<FreqPieDataRow> {
    activeBlock:number;
    maxNumCategories:number;
    useConsistentPalette:boolean;
    backlink:BacklinkWithArgs<BacklinkArgs>;
}


const stateToAPIArgs = (state:FreqPieModelState, concId:string):MultiCritQueryArgs => ({
    corpname: state.corpname,
    q: `~${concId ? concId : state.concId}`,
    fcrit: state.fcrit.toArray(),
    flimit: state.flimit.toString(),
    freq_sort: state.freqSort,
    fpage: state.fpage.toString(),
    ftt_include_empty: state.fttIncludeEmpty ? '1' : '0',
    format: 'json'
});


export class FreqPieModel extends StatelessModel<FreqPieModelState> {

    protected readonly tileId:number;

    protected readonly waitForTile:number;

    protected readonly api:MultiBlockFreqDistribAPI;

    private readonly appServices:AppServices;

    private readonly backlink:Backlink;

    constructor(dispatcher:ActionDispatcher, initState:FreqPieModelState, tileId:number, waitForTile:number, appServices:AppServices, api:MultiBlockFreqDistribAPI,
                backlink:Backlink) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitForTile = waitForTile;
        this.appServices = appServices;
        this.api = api;
        this.backlink = backlink;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [ActionName.SetActiveBlock]: (state, action:Actions.SetActiveBlock) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.activeBlock = action.payload.idx;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.blocks = Immutable.List<FreqDataBlock<FreqPieDataRow>>(state.fcrit.map((_, i) => ({
                            data: Immutable.List<FreqPieDataRow>(),
                            ident: puid(),
                            label: state.critLabels.get(i)
                        })));
                        newState.error = action.error.message;

                    } else if (action.payload.blocks.length === 0) {
                        newState.blocks = Immutable.List<FreqDataBlock<FreqPieDataRow>>(state.fcrit.map((_, i) => ({
                            data: Immutable.List<FreqPieDataRow>(),
                            ident: puid(),
                            label: action.payload.blockLabels ? action.payload.blockLabels[i] : state.critLabels.get(i)
                        })));
                        newState.backlink = createBackLink(state, this.backlink, action.payload.concId);

                    } else {
                        const dataRowIsIncluded = (d:DataRow, totalFreq:number) => d.freq / totalFreq >= 0.05 &&
                            (d.order < state.maxNumCategories || d.order === undefined);

                        newState.blocks = Immutable.List<FreqDataBlock<FreqPieDataRow>>(action.payload.blocks.map((block, i) => {
                            const totalFreq = block.data.reduce((acc, curr) => acc + curr.freq, 0);
                            const dataSlice = block.data.filter(v => dataRowIsIncluded(v, totalFreq));
                            let data = Immutable.List<FreqPieDataRow>(dataSlice.map(v => ({
                                name: v.name,
                                percent: v.freq / totalFreq * 100,
                                isTheRest: false
                            })));
                            if (data.size < block.data.length) {
                                const otherSlice = block.data.filter(v => !dataRowIsIncluded(v, totalFreq));
                                const totalOther = otherSlice.reduce((acc, curr) => acc + curr.freq, 0);
                                data = data.push({
                                    name: this.appServices.translate('freqpie__other_chart_item'),
                                    percent: totalOther / totalFreq * 100,
                                    isTheRest: true
                                });
                            }
                            return {
                                data: data,
                                ident: puid(),
                                label: action.payload.blockLabels ? action.payload.blockLabels[i] : state.critLabels.get(i)
                            };
                        }));
                        newState.backlink = createBackLink(state, this.backlink, action.payload.concId);
                    }
                    return newState;
                }
                return state;
            }
        }
    }

    sideEffects(state:FreqPieModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend((action:Action) => {
                    if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                        if (action.error) {
                            dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                name: GlobalActionName.TileDataLoaded,
                                payload: {
                                    tileId: this.tileId,
                                    isEmpty: true,
                                    blocks: [],
                                    concId: null
                                },
                                error: new Error(this.appServices.translate('global__failed_to_obtain_required_data'))
                            });
                            return true;
                        }
                        const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;
                        new Observable((observer:Observer<{}>) => {
                            if (action.error) {
                                observer.error(action.error);

                            } else {
                                observer.next({});
                                observer.complete();
                            }
                        }).pipe(concatMap(args => this.api.call(stateToAPIArgs(state, payload.data.concPersistenceID))))
                        .subscribe(
                            resp => {
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: resp.blocks.every(v => v.data.length === 0),
                                        blocks: resp.blocks,
                                        concId: resp.concId
                                    }
                                });
                            },
                            error => {
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: true,
                                        blocks: null,
                                        concId: null
                                    },
                                    error: error
                                });
                            }
                        );
                        return true;
                    }
                    return false;
                });
            break;
        }
    }
}

export const factory = (
        dispatcher:ActionDispatcher,
        initState:FreqPieModelState,
        tileId:number,
        waitForTile:number,
        appServices:AppServices,
        api:MultiBlockFreqDistribAPI,
        backlink:Backlink) => {

    return new FreqPieModel(dispatcher, initState, tileId, waitForTile, appServices, api, backlink);
};