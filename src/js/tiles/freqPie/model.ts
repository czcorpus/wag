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
import {Observable, Observer} from 'rxjs';
import {concatMap} from 'rxjs/operators';
import { StatelessModel, ActionDispatcher, Action, SEDispatcher } from 'kombo';
import { MultiCritQueryArgs, MultiBlockFreqDistribAPI, BacklinkArgs } from '../../common/api/kontextFreqs';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {Actions as ConcActions, ConcLoadedPayload} from '../concordance/actions';
import {Actions, ActionName, DataLoadedPayload} from './actions';
import { AppServices } from '../../appServices';
import { puid } from '../../common/util';
import { GeneralMultiCritFreqBarModelState, FreqDataBlock, createBackLink } from '../../common/models/freq';
import { BacklinkWithArgs, Backlink } from '../../common/types';


export interface FreqPieDataRow {
    name:string;
    percent:number;
}

export interface FreqPieModelState extends GeneralMultiCritFreqBarModelState<FreqPieDataRow> {
    activeBlock:number;
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

    private readonly tileId:number;

    private readonly waitForTile:number;

    private readonly api:MultiBlockFreqDistribAPI;

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
                            label: state.critLabels.get(i)
                        })));
                        newState.backlink = createBackLink(state, this.backlink, action.payload.concId);

                    } else {
                        newState.blocks = Immutable.List<FreqDataBlock<FreqPieDataRow>>(action.payload.blocks.map((block, i) => {
                            const totalFreq = block.data.reduce((acc, curr) => acc + curr.freq, 0);
                            return {
                                data: Immutable.List<FreqPieDataRow>(block.data.map(v => ({
                                    name: v.name,
                                    percent: v.freq / totalFreq * 100
                                }))),
                                ident: puid(),
                                label: state.critLabels.get(i)
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
                                    blocks: [],
                                    concId: null,
                                    tileId: this.tileId
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
                        }).pipe(concatMap(args => this.api.call(stateToAPIArgs(state, payload.data.conc_persistence_op_id))))
                        .subscribe(
                            resp => {
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        blocks: resp.blocks,
                                        concId: resp.concId,
                                        tileId: this.tileId
                                    }
                                });
                            },
                            error => {
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        blocks: null,
                                        concId: null,
                                        tileId: this.tileId
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