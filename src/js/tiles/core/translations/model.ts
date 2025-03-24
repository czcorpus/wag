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
import { HTTP, List, pipe } from 'cnc-tskit'

import { Backlink, BacklinkWithArgs, createAppBacklink } from '../../../page/tile.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { findCurrQueryMatch } from '../../../models/query.js';
import { Actions } from './actions.js';
import { ColorScaleFunctionGenerator } from '../../../page/theme.js';
import { TranslationAPI } from '../../../api/abstract/translations.js';
import { TranslationsModelState } from '../../../models/tiles/translations.js';
import { IAppServices } from '../../../appServices.js';
import { RecognizedQueries } from '../../../query/index.js';
import { isWebDelegateApi } from '../../../types.js';


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

    constructor({
        dispatcher,
        appServices,
        initialState,
        tileId,
        api,
        backlink,
        queryMatches,
        scaleColorGen}:TranslationModelArgs) {

        super(dispatcher, initialState);
        this.api = api;
        this.backlink = !backlink?.isAppUrl && isWebDelegateApi(this.api) ? this.api.getBackLink(backlink) : backlink;
        this.queryMatches = queryMatches;
        this.tileId = tileId;
        this.scaleColorGen = scaleColorGen;
        this.appServices = appServices;

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                this.loadData(state, dispatch);
            }
        );

        this.addActionHandler(
            Actions.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.translations = [];
                        state.error = this.appServices.normalizeHttpApiError(action.error);

                    } else {
                        state.translations = action.payload.data.translations;
                        state.backLink = this.backlink?.isAppUrl ? createAppBacklink(backlink) : this.makeBacklink(state, action.payload.query);
                    }
                }
            }
        );

        this.addActionHandler(
            GlobalActions.EnableAltViewMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = true;
                }
            }
        );

        this.addActionHandler(
            GlobalActions.DisableAltViewMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = false;
                }
            }
        );

        this.addActionHandler(
            GlobalActions.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.api.getSourceDescription(
                        this.tileId,
                        false,
                        this.appServices.getISO639UILang(),
                        action.payload['corpusId']

                    ).subscribe({
                        next: (data) => {
                            dispatch(
                                GlobalActions.GetSourceInfoDone,
                                {
                                    data
                                }
                            );
                        },
                        error: (error) => {
                            console.error(error);
                            dispatch(
                                GlobalActions.GetSourceInfoDone,
                                error
                            );
                        }
                    });
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
        this.api.call(this.tileId, true, this.api.stateToArgs(state, srchLemma.lemma))
            .pipe(
                map(item => {
                    const colors = this.scaleColorGen(0)
                    return pipe(
                        item.translations,
                        List.filter(x => x.freq >= state.minItemFreq),
                        List.slice(0, state.maxNumLines),
                        List.map(
                            (line, i) => ({
                                freq: line.freq,
                                score: line.score,
                                word: line.word,
                                translations: line.translations,
                                firstTranslatLc: line.firstTranslatLc,
                                interactionId: line.interactionId,
                                color: colors(i)
                            })
                        )
                    );
                })
            )
            .subscribe({
                next: data => {
                    dispatch<typeof Actions.TileDataLoaded>({
                        name: Actions.TileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            queryId: 0,
                            isEmpty: data.length === 0,
                            query: findCurrQueryMatch(this.queryMatches[0]).lemma, // TODO switch to word and give up dict support
                            subqueries: List.map(
                                v => ({
                                    value: {
                                        value: v.firstTranslatLc,
                                        context: [0, 0]
                                    },
                                    interactionId: v.interactionId,
                                    color: v.color
                                }),
                                data
                            ),
                            domain1: state.domain1,
                            domain2: state.domain2,
                            data: {translations: data}
                        }
                    });
                },
                error: error => {
                    dispatch<typeof Actions.TileDataLoaded>({
                        name: Actions.TileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            queryId: 0,
                            isEmpty: true,
                            query: findCurrQueryMatch(this.queryMatches[0]).lemma, // TODO switch to word and give up dict support
                            subqueries: [],
                            domain1: state.domain1,
                            domain2: state.domain2,
                            data: {translations: []}
                        },
                        error
                    });
                    console.error(error);
                }
            });
        }
}