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
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { map } from 'rxjs/operators';

import { HTTPMethod } from '../../../common/types';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { QueryFormModel, findCurrLemmaVariant } from '../../../models/query';
import { DataLoadedPayload } from './actions';
import { PageArgs, TreqAPI } from '../../../common/api/treq';
import { ColorScaleFunctionGenerator } from '../../../common/theme';
import { WordTranslation } from '../../../common/api/abstract/translations';
import { TranslationsModelState } from '../../../common/models/translations';


export type TreqModelState = TranslationsModelState<PageArgs>;


export class TreqModel extends StatelessModel<TreqModelState> {

    private readonly tileId:number;

    private readonly api:TreqAPI;

    private readonly mainForm:QueryFormModel;

    private readonly backlink:Backlink;

    private readonly scaleColorGen:ColorScaleFunctionGenerator;

    constructor(dispatcher:IActionQueue, initialState:TreqModelState, tileId:number, api:TreqAPI,
            backlink:Backlink, mainForm:QueryFormModel, scaleColorGen:ColorScaleFunctionGenerator) {
        super(dispatcher, initialState);
        this.api = api;
        this.backlink = backlink;
        this.mainForm = mainForm;
        this.tileId = tileId;
        this.scaleColorGen = scaleColorGen;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.translations = Immutable.List<WordTranslation>();
                        newState.error = action.error.message;

                    } else {
                        newState.translations = Immutable.List<WordTranslation>(action.payload.data.translations);
                        newState.backLink = this.makeBacklink(state, action.payload.query);
                    }
                    return newState;
                }
                return state;
            },
            [GlobalActionName.EnableAltViewMode]: (state, action:GlobalActions.EnableAltViewMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isAltViewMode = true;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.DisableAltViewMode]: (state, action:GlobalActions.DisableAltViewMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isAltViewMode = false;
                    return newState;
                }
                return state;
            }
        }
    }

    private makeBacklink(state:TreqModelState, query:string):BacklinkWithArgs<PageArgs> {
        return this.backlink ?
            {
                url: this.backlink.url,
                label: this.backlink.label,
                method: this.backlink.method || HTTPMethod.GET,
                args: this.api.stateToPageArgs(state, query)
            } :
            null;
    }

    sideEffects(state:TreqModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                const srchLemma = findCurrLemmaVariant(this.mainForm.getState().lemmas);
                this.api.call(this.api.stateToArgs(state, srchLemma.lemma))
                    .pipe(
                        map(item => {
                            const lines = item.translations
                                .filter(x => x.freq >= state.minItemFreq)
                                .slice(0, state.maxNumLines);
                            const colors = this.scaleColorGen(0, lines.length)
                            return lines.map((line, i) => ({
                                    freq: line.freq,
                                    score: line.score,
                                    word: line.word,
                                    translations: line.translations,
                                    firstTranslatLc: line.firstTranslatLc,
                                    interactionId: line.interactionId,
                                    color: colors(i)
                            }));
                        })
                    )
                    .subscribe(
                        (data) => {
                            dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                name: GlobalActionName.TileDataLoaded,
                                payload: {
                                    tileId: this.tileId,
                                    isEmpty: data.length === 0,
                                    query: this.mainForm.getState().query.value,
                                    subqueries: data.map(v => ({
                                        value: {
                                            value: v.firstTranslatLc,
                                            context: [0, 0]
                                        },
                                        interactionId: v.interactionId,
                                        color: v.color
                                    })),
                                    lang1: this.mainForm.getState().queryLanguage,
                                    lang2: this.mainForm.getState().queryLanguage2,
                                    data: {translations: data}
                                }
                            });
                        },
                        (error) => {
                            dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                name: GlobalActionName.TileDataLoaded,
                                payload: {
                                    tileId: this.tileId,
                                    isEmpty: true,
                                    query: this.mainForm.getState().query.value,
                                    subqueries: [],
                                    lang1: this.mainForm.getState().queryLanguage,
                                    lang2: this.mainForm.getState().queryLanguage2,
                                    data: {translations: []}
                                },
                                error: error
                            });
                            console.log(error);
                        }
                    );
            break;
        }
    }
}