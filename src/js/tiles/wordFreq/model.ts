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
import { Action, IActionDispatcher, SEDispatcher, StatelessModel } from 'kombo';
import { Observable } from 'rxjs';
import { map, concatMap } from 'rxjs/operators';

import { AppServices } from '../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { DataLoadedPayload } from './actions';
import { FreqDBRow, FreqDbAPI } from './api';
import { posTable } from '../../server/freqdb/common';
import { WdglanceMainFormModel, findCurrLemmaVariant } from '../../models/query';
import { LemmaVariant } from '../../common/query';

export interface FlevelDistribItem {
    rel:number;
    flevel:number;
}

export interface SummaryModelState {
    isBusy:boolean;
    error:string;
    corpname:string;
    corpusSize:number;
    fcrit:string;
    flimit:number;
    fpage:number;
    freqSort:string;
    includeEmpty:boolean;
    data:Immutable.List<FreqDBRow>;
    sfwRowRange:number;
    flevelDistrb:Immutable.List<FlevelDistribItem>;
}


export class SummaryModel extends StatelessModel<SummaryModelState> {

    private readonly api:FreqDbAPI;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly mainForm:WdglanceMainFormModel;

    constructor(dispatcher:IActionDispatcher, initialState:SummaryModelState, tileId:number, api:FreqDbAPI,
            mainForm:WdglanceMainFormModel, appServices:AppServices) {
        super(dispatcher, initialState);
        this.tileId = tileId;
        this.api = api;
        this.appServices = appServices;
        this.mainForm = mainForm;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                newState.data = newState.data.clear();
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        newState.data = Immutable.List<FreqDBRow>();

                    } else {
                        newState.data = Immutable.List<FreqDBRow>(action.payload.data);
                    }
                    return newState;
                }
                return state;
            }
        }
    }

    sideEffects(state:SummaryModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                const formState = this.mainForm.getState();
                new Observable<{variant:LemmaVariant; lang:string}>((observer) => {
                    try {
                        observer.next({
                            variant: findCurrLemmaVariant(formState.lemmas),
                            lang: formState.targetLanguage
                        });
                        observer.complete();

                    } catch(err) {
                        observer.error(err);
                    }
                }).pipe(
                    concatMap(
                        (args) => this.api.call({
                            lang: args.lang,
                            word: args.variant.word,
                            lemma: args.variant.lemma,
                            pos: args.variant.pos,
                            srchRange: state.sfwRowRange
                        })
                    ),
                    map(
                        (data) => ({
                            data: data.result.map(v => {
                                return {
                                    word: v.word,
                                    lemma: v.lemma,
                                    pos: v.pos,
                                    posLabel: this.appServices.importExternalMessage(posTable[v.pos]),
                                    abs: v.abs,
                                    ipm: v.abs / state.corpusSize * 1e6,
                                    arf: v.arf,
                                    flevel: Math.log(v.abs / state.corpusSize * 1e9) / Math.log(10),
                                    isSearched: v.isSearched
                                }
                            })
                        })
                    )
                ).subscribe(
                    (data) => {
                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: data.data.length === 0,
                                data: data.data
                            }
                        });
                    },
                    (err) => {
                        console.log(err);
                        dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                            name: GlobalActionName.TileDataLoaded,
                            error: err,
                            payload: {
                                tileId: this.tileId,
                                isEmpty: true,
                                data: [] // TODO
                            }
                        });
                    }
                );
            break;
        }
    }
}