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
import { SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { map } from 'rxjs/operators';
import { HTTP } from 'cnc-tskit'

import { Backlink, BacklinkWithArgs } from '../../../page/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { findCurrQueryMatch } from '../../../models/query';
import { DataLoadedPayload } from './actions';
import { ColorScaleFunctionGenerator } from '../../../page/theme';
import { TranslationAPI } from '../../../api/abstract/translations';
import { TranslationsModelState } from '../../../models/tiles/translations';
import { IAppServices } from '../../../appServices';
import { RecognizedQueries } from '../../../query/index';


export type GeneralTranslationsModelState = TranslationsModelState<{}>;


export interface TranslationModelArgs {
    dispatcher:IActionQueue;
    appServices:IAppServices;
    initialState:GeneralTranslationsModelState;
    tileId:number;
    api:TranslationAPI<{}, {}>;
    backlink:Backlink;
    queryMatches:RecognizedQueries;
    scaleColorGen:ColorScaleFunctionGenerator;
}


export class TranslationsModel extends StatelessModel<GeneralTranslationsModelState> {

    private readonly tileId:number;

    private readonly api:TranslationAPI<{}, {}>;

    private readonly queryMatches:RecognizedQueries;

    private readonly backlink:Backlink;

    private readonly scaleColorGen:ColorScaleFunctionGenerator;

    private readonly appServices:IAppServices;

    constructor({dispatcher, appServices, initialState, tileId, api, backlink, queryMatches,
                scaleColorGen}:TranslationModelArgs) {
        super(dispatcher, initialState);
        this.api = api;
        this.backlink = backlink;
        this.queryMatches = queryMatches;
        this.tileId = tileId;
        this.scaleColorGen = scaleColorGen;
        this.appServices = appServices;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                this.loadData(state, dispatch);
            }
        );

        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.translations = [];
                        state.error = action.error.message;

                    } else {
                        state.translations = action.payload.data.translations;
                        state.backLink = this.makeBacklink(state, action.payload.query);
                    }
                }
            }
        );

        this.addActionHandler<GlobalActions.EnableAltViewMode>(
            GlobalActionName.EnableAltViewMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = true;
                }
            }
        );

        this.addActionHandler<GlobalActions.DisableAltViewMode>(
            GlobalActionName.DisableAltViewMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = false;
                }
            }
        );

        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.api.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), action.payload['corpusId'])
                    .subscribe(
                        (data) => {
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                payload: {
                                    tileId: this.tileId,
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                error: err,
                                payload: {
                                    tileId: this.tileId
                                }
                            });
                        }
                    );
                }
            }
        );
    }

    private makeBacklink(state:GeneralTranslationsModelState, query:string):BacklinkWithArgs<{}> {
        return this.backlink ?
            {
                url: this.backlink.url,
                label: this.backlink.label,
                method: this.backlink.method || HTTP.Method.GET,
                args: this.api.stateToPageArgs(state, query)
            } :
            null;
    }

    private loadData(state:GeneralTranslationsModelState, dispatch:SEDispatcher):void {
        const srchLemma = findCurrQueryMatch(this.queryMatches[0]);
        this.api.call(this.api.stateToArgs(state, srchLemma.lemma))
            .pipe(
                map(item => {
                    const lines = item.translations
                        .filter(x => x.freq >= state.minItemFreq)
                        .slice(0, state.maxNumLines);
                    const colors = this.scaleColorGen(0)
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
                            queryId: 0,
                            isEmpty: data.length === 0,
                            query: findCurrQueryMatch(this.queryMatches[0]).lemma, // TODO switch to word and give up dict support
                            subqueries: data.map(v => ({
                                value: {
                                    value: v.firstTranslatLc,
                                    context: [0, 0]
                                },
                                interactionId: v.interactionId,
                                color: v.color
                            })),
                            lang1: state.lang1,
                            lang2: state.lang2,
                            data: {translations: data}
                        }
                    });
                },
                (error) => {
                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                        name: GlobalActionName.TileDataLoaded,
                        payload: {
                            tileId: this.tileId,
                            queryId: 0,
                            isEmpty: true,
                            query: findCurrQueryMatch(this.queryMatches[0]).lemma, // TODO switch to word and give up dict support
                            subqueries: [],
                            lang1: state.lang1,
                            lang2: state.lang2,
                            data: {translations: []}
                        },
                        error: error
                    });
                    console.error(error);
                }
            );
        }
}