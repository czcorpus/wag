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
import { StatelessModel, ActionDispatcher, Action, SEDispatcher } from 'kombo';
import * as Immutable from 'immutable';
import { AppServices } from '../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { isSubqueryPayload } from '../../common/types';
import { ConcApi, FilterRequestArgs, QuerySelector, ViewMode, PNFilter, ConcResponse, Line } from '../../common/api/kontext/concordance';
import { Observable, forkJoin } from 'rxjs';
import { isConcLoadedPayload } from '../concordance/actions';
import { CollExamplesLoadedPayload } from './actions';


export interface ConcFilterModelState {
    isBusy:boolean;
    isTweakMode:boolean;
    isMobile:boolean;
    widthFract:number;
    error:string;
    corpname:string;
    lines:Immutable.List<Line>;
}


export class ConcFilterModel extends StatelessModel<ConcFilterModelState> {

    private readonly api:ConcApi;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private waitingForTiles:Immutable.Map<number, string|Array<string>|null>;

    constructor(dispatcher:ActionDispatcher, tileId:number, waitForTiles:Array<number>, appServices:AppServices, api:ConcApi, initState:ConcFilterModelState) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.waitingForTiles = Immutable.Map<number, string|Array<string>>(waitForTiles.map(v => [v, null]));
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse)  => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<CollExamplesLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    newState.lines = Immutable.List<Line>(action.payload.data);
                    return newState;
                }
                return state;
            }
        };
    }


    private loadFreqs(state:ConcFilterModelState, concId:string, queries:Array<string>):Array<Observable<ConcResponse>> {
        return queries.map(subq => {
            const args:FilterRequestArgs = {
                queryselector: QuerySelector.CQL,
                cql: `[word="${subq}"]`,            // TODO escape stuff
                corpname: state.corpname,
                kwicleftctx: undefined,
                kwicrightctx: undefined,
                async: '0',
                pagesize: undefined,
                fromp: '1', // TODO choose randomly stuff??
                attr_vmode: undefined,
                attrs: undefined,
                viewmode: ViewMode.SENT,
                shuffle: 1,
                q: '~' + concId,
                format: 'json',
                pnfilter: PNFilter.POS,
                filfl: 'f',
                filfpos: -3,
                filtpos: 3,
                inclkwic: 0
            };
            return this.api.call(args)
        });
    }

    private mergeConcResponses(resp:Array<ConcResponse>):Array<Line> {
        return resp
            .map(v => v.Lines)
            .reduce(
                (acc, curr) => acc.concat(curr.slice(0, 2)),
                []
            );
    }

    sideEffects(state:ConcFilterModelState, action:Action, seDispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend(
                    (action:Action) => {
                        if (action.name === GlobalActionName.TileDataLoaded && this.waitingForTiles.has(action.payload['tileId'])) {

                            if (action.error) {
                                seDispatch<GlobalActions.TileDataLoaded<CollExamplesLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: true,
                                        data: []
                                    },
                                    error: new Error(this.appServices.translate('global__failed_to_obtain_required_data')),
                                });
                                return true;
                            }
                            const basicPayload = (action as GlobalActions.TileDataLoaded<{}>).payload;
                            const payload = action.payload;

                            if (isConcLoadedPayload(payload) && this.waitingForTiles.get(basicPayload.tileId) === null) {
                                this.waitingForTiles = this.waitingForTiles.set(
                                    basicPayload.tileId,
                                    payload.data.conc_persistence_op_id
                                );

                            } else if (isSubqueryPayload(payload) && this.waitingForTiles.get(basicPayload.tileId) === null) {
                                this.waitingForTiles = this.waitingForTiles.set(
                                    basicPayload.tileId,
                                    payload.subqueries
                                );
                            }

                            if (!this.waitingForTiles.findKey(v => v === null)) {
                                let conc:string;
                                let subq:Array<string>;
                                this.waitingForTiles.forEach((v, k) => {
                                    if (typeof v === 'string') {
                                        conc = v;

                                    } else {
                                        subq = v;
                                    }
                                });
                                forkJoin(this.loadFreqs(state, conc, subq)).subscribe(
                                    (data) => {
                                        seDispatch<GlobalActions.TileDataLoaded<CollExamplesLoadedPayload>>({
                                            name: GlobalActionName.TileDataLoaded,
                                            payload: {
                                                tileId: this.tileId,
                                                isEmpty: !data.some(v => v.Lines.length > 0),
                                                data: this.mergeConcResponses(data)
                                            }
                                        })
                                    },
                                    (err) => {
                                        seDispatch<GlobalActions.TileDataLoaded<CollExamplesLoadedPayload>>({
                                            name: GlobalActionName.TileDataLoaded,
                                            payload: {
                                                tileId: this.tileId,
                                                isEmpty: true,
                                                data: []
                                            },
                                            error: err,
                                        });
                                    }
                                )
                                return true;
                            }
                        }
                        return false;
                    }
                );
            break;
        }
    }

}