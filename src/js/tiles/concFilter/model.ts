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
import { map } from 'rxjs/operators';
import { StatelessModel, ActionDispatcher, Action, SEDispatcher } from 'kombo';
import * as Immutable from 'immutable';
import { AppServices } from '../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { isSubqueryPayload, SubQueryItem } from '../../common/types';
import { ConcApi, FilterRequestArgs, QuerySelector, ViewMode, PNFilter, ConcResponse, Line } from '../../common/api/kontext/concordance';
import { Observable, merge } from 'rxjs';
import { isConcLoadedPayload } from '../concordance/actions';
import { CollExamplesLoadedPayload } from './actions';


export interface ConcFilterModelState {
    isBusy:boolean;
    isTweakMode:boolean;
    isMobile:boolean;
    widthFract:number;
    error:string;
    corpname:string;
    posAttrs:Immutable.List<string>;
    attrVmode:'mouseover';
    viewMode:ViewMode;
    itemsPerSrc:number;
    lines:Immutable.List<Line>;
}


export class ConcFilterModel extends StatelessModel<ConcFilterModelState> {

    private readonly api:ConcApi;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private waitingForTiles:Immutable.Map<number, string|Array<SubQueryItem>|null>;

    constructor(dispatcher:ActionDispatcher, tileId:number, waitForTiles:Array<number>, appServices:AppServices, api:ConcApi, initState:ConcFilterModelState) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.api = api;
        this.waitingForTiles = Immutable.Map<number, string|Array<SubQueryItem>|null>(waitForTiles.map(v => [v, null]));
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse)  => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                newState.lines = newState.lines.clear();
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<CollExamplesLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    newState.lines = newState.lines.concat(action.payload.data).toList();
                    return newState;
                }
                return state;
            },
            [GlobalActionName.SubqItemHighlighted] : (state, action:GlobalActions.SubqItemHighlighted) => {
               const srchIdx = state.lines.findIndex(v => v.interactionId === action.payload.interactionId);
               if (srchIdx > -1) {
                    const newState = this.copyState(state);
                    const line = state.lines.get(srchIdx);
                    newState.lines = newState.lines.set(srchIdx, {
                        Left: line.Left,
                        Kwic: line.Kwic,
                        Right: line.Right,
                        Align: line.Align,
                        toknum: line.toknum,
                        interactionId: line.interactionId,
                        isHighlighted: true
                    });
                    return newState;
               }
               return state;
            },
            [GlobalActionName.SubqItemDehighlighted] : (state, action:GlobalActions.SubqItemDehighlighted) => {
               const srchIdx = state.lines.findIndex(v => v.interactionId === action.payload.interactionId);
               if (srchIdx > -1) {
                const newState = this.copyState(state);
                const line = state.lines.get(srchIdx);
                newState.lines = newState.lines.set(srchIdx, {
                    Left: line.Left,
                    Kwic: line.Kwic,
                    Right: line.Right,
                    Align: line.Align,
                    toknum: line.toknum,
                    interactionId: line.interactionId,
                    isHighlighted: false
                });
                return newState;
           }
               return state;
            },
        };
    }


    private loadFreqs(state:ConcFilterModelState, concId:string, queries:Array<SubQueryItem>):Array<Observable<ConcResponse>> {
        return queries.map(subq => {
            const args:FilterRequestArgs = {
                queryselector: QuerySelector.CQL,
                cql: `[word="${subq.value}"]`,            // TODO escape stuff
                corpname: state.corpname,
                kwicleftctx: undefined,
                kwicrightctx: undefined,
                async: '0',
                pagesize: '5',
                fromp: '1', // TODO choose randomly stuff??
                attr_vmode: state.attrVmode,
                attrs: state.posAttrs.join(','),
                viewmode: state.viewMode,
                shuffle: 1,
                q: '~' + concId,
                format: 'json',
                pnfilter: PNFilter.POS,
                filfl: 'f',
                filfpos: -3,
                filtpos: 3,
                inclkwic: 0
            };
            return this.api.call(args).pipe(
                map(v => ({
                    conc_persistence_op_id: v.conc_persistence_op_id,
                    messages: v.messages,
                    Lines: v.Lines.map(line => ({
                        Left: line.Left,
                        Kwic: line.Kwic,
                        Right: line.Right,
                        Align: line.Align,
                        toknum: line.toknum,
                        interactionId: subq.interactionId
                    })),
                    fullsize: v.fullsize,
                    concsize: v.concsize,
                    result_arf: v.result_arf,
                    result_relative_freq: v.result_relative_freq,
                    query: v.query,
                    corpname: v.corpname,
                    usesubcorp: v.usesubcorp
                }))
            );
        });
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
                                let subq:Array<SubQueryItem>;
                                this.waitingForTiles.forEach((v, k) => {
                                    if (typeof v === 'string') {
                                        conc = v;

                                    } else {
                                        subq = v;
                                    }
                                });
                                merge(...this.loadFreqs(state, conc, subq)).subscribe(
                                    (data) => {
                                        seDispatch<GlobalActions.TileDataLoaded<CollExamplesLoadedPayload>>({
                                            name: GlobalActionName.TileDataLoaded,
                                            payload: {
                                                tileId: this.tileId,
                                                isEmpty: false, // here we cannot assume final state
                                                data: data.Lines.slice(0, state.itemsPerSrc)
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