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
import { SEDispatcher, IActionQueue } from 'kombo';
import { map } from 'rxjs/operators';
import { List, pipe } from 'cnc-tskit';

import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { ColorScaleFunctionGenerator } from '../../../page/theme.js';
import { IAppServices } from '../../../appServices.js';
import {
    findCurrQueryMatch,
    LemmatizationLevel,
    QueryMatch,
    RecognizedQueries,
} from '../../../query/index.js';
import { RequestArgs, TranslationsModelState, TreqAPI } from './api.js';
import { IDataStreaming } from '../../../page/streaming.js';
import { TileStatelessModel } from '../../../models/tiles/base.js';

export interface TranslationModelArgs {
    dispatcher: IActionQueue;
    appServices: IAppServices;
    initState: TranslationsModelState;
    tileId: number;
    api: TreqAPI;
    dependentTiles: Array<number>;
    lemLevelSupport: Array<LemmatizationLevel>;

    scaleColorGen: ColorScaleFunctionGenerator;
}

export class TranslationsModel extends TileStatelessModel<TranslationsModelState> {
    private readonly scaleColorGen: ColorScaleFunctionGenerator;

    private readonly api: TreqAPI;

    constructor({
        dispatcher,
        appServices,
        initState,
        tileId,
        api,
        dependentTiles,
        lemLevelSupport,
        scaleColorGen,
    }: TranslationModelArgs) {
        super({
            dispatcher,
            initState,
            appServices,
            tileId,
            dependentTiles,
            lemLevelSupport,
        });
        this.scaleColorGen = scaleColorGen;
        this.api = api;

        this.addSearchActionHandler(
            (state, action) => {
                if (!!action.payload?.newQueryMatches) {
                    state.currQueryMatch = action.payload.newQueryMatches;
                }
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch, ds) => {
                this.loadData(state, ds, dispatch);
            }
        );

        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            (action) => this.tileId === action.payload.tileId,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    state.translations = [];
                    state.error = this.appServices.normalizeHttpApiError(
                        action.error
                    );
                } else {
                    state.translations = action.payload.data.translations;
                    state.backlink = this.api.getBacklink(0);
                }
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.EnableAltViewMode,
            (action) => this.tileId === action.payload.ident,
            (state, action) => {
                state.isAltViewMode = true;
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.DisableAltViewMode,
            (action) => this.tileId === action.payload.ident,
            (state, action) => {
                state.isAltViewMode = false;
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.GetSourceInfo,
            (action) => this.tileId === action.payload.tileId,
            null,
            (state, action, dispatch) => {
                this.api
                    .getSourceDescription(
                        appServices
                            .dataStreaming()
                            .startNewSubgroup(this.tileId),
                        this.tileId,
                        appServices.getISO639UILang(),
                        action.payload.corpusId
                    )
                    .subscribe({
                        next: (data) => {
                            dispatch(GlobalActions.GetSourceInfoDone, {
                                data,
                            });
                        },
                        error: (error) => {
                            console.error(error);
                            dispatch(GlobalActions.GetSourceInfoDone, error);
                        },
                    });
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.FollowBacklink,
            (action) => action.payload.tileId === this.tileId,
            (state, action) => {
                const srchLemma = state.currQueryMatch;
                const url = this.api.requestBacklink(state, srchLemma[0].lemma);
                window.open(url.toString(), '_blank');
            }
        );
    }

    private stateToArgs(
        state: TranslationsModelState,
        query: string
    ): RequestArgs {
        return {
            from: state.lang1,
            to: state.lang2,
            multiword: query.split(' ').length > 1,
            regex: false,
            lemma: true,
            ci: true,
            'pkgs[i]': state.searchPackages,
            query: query,
            order: 'perc',
            asc: false,
        };
    }

    private loadData(
        state: TranslationsModelState,
        dsHandler: IDataStreaming,
        dispatch: SEDispatcher
    ): void {
        const srchLemma = state.currQueryMatch;
        this.api
            .call(
                dsHandler,
                this.tileId,
                0,
                this.stateToArgs(state, srchLemma[0].lemma)
            )
            .pipe(
                map((item) => {
                    const colors = this.scaleColorGen(0);
                    return pipe(
                        item.translations,
                        List.filter((x) => x.freq >= state.minItemFreq),
                        List.slice(0, state.maxNumLines),
                        List.map((line, i) => ({
                            freq: line.freq,
                            score: line.score,
                            word: line.word,
                            translations: line.translations,
                            firstTranslatLc: line.firstTranslatLc,
                            color: colors(i),
                        }))
                    );
                })
            )
            .subscribe({
                next: (data) => {
                    dispatch<typeof Actions.TileDataLoaded>({
                        name: Actions.TileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            queryIdx: 0,
                            isEmpty: data.length === 0,
                            query: state.currQueryMatch[0].lemma, // TODO switch to word and give up dict support
                            subqueries: List.map(
                                (v) => ({
                                    value: {
                                        value: v.firstTranslatLc,
                                        context: [0, 0],
                                    },
                                    color: v.color,
                                }),
                                data
                            ),
                            translatLanguage: state.lang2,
                            data: { translations: data },
                        },
                    });
                },
                error: (error) => {
                    dispatch<typeof Actions.TileDataLoaded>({
                        name: Actions.TileDataLoaded.name,
                        payload: {
                            tileId: this.tileId,
                            queryIdx: 0,
                            isEmpty: true,
                            query: state.currQueryMatch[0].lemma, // TODO switch to word and give up dict support
                            subqueries: [],
                            translatLanguage: state.lang1,
                            data: { translations: [] },
                        },
                        error,
                    });
                    console.error(error);
                },
            });
    }
}
