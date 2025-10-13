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

import { StatelessModel, IActionQueue } from 'kombo';

import { RequestArgs } from '../translations/api.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { findCurrQueryMatch, RecognizedQueries } from '../../../query/index.js';
import { IAppServices } from '../../../appServices.js';
import { pipe, List, Dict, tuple } from 'cnc-tskit';
import { tap } from 'rxjs/operators';
import { Backlink, BacklinkConf } from '../../../page/tile.js';
import { filterByMinFreq, TreqSubsetsAPI, WordEntry } from './api.js';
import { ColorScaleFunctionGenerator } from '../../../page/theme.js';

export interface MultiSrcTranslationRow {
    idx: number;
    heading: string;
    cells: Array<MultiSrcTranslationCell>;
}

export interface MultiSrcTranslationCell {
    abs: number;
    perc: number;
    color?: string;
}

/**
 * TranslationSubset specifies a subset of packages/subcorpora we
 * search the translation in.
 */
export interface TranslationSubset {
    ident: string;
    label: string;
    packages: Array<string>;
    translations: Array<WordEntry>;
}

// transpose "package-first" oriented data structure to "word first" and emit values for each row
export const flipRowColMapper = <T>(
    subsets: Array<TranslationSubset>,
    maxNumLines: number,
    mapFn: (row: MultiSrcTranslationRow) => T
): Array<T> => {
    const numRows = Math.min(...subsets.map((s) => s.translations.length));
    const numCols = subsets.length;
    const tmp: Array<MultiSrcTranslationRow> = [];

    for (let i = 0; i < numRows; i += 1) {
        const row: Array<MultiSrcTranslationCell> = [];
        for (let j = 0; j < numCols; j += 1) {
            const t = subsets[j].translations[i];
            row.push({
                abs: t.freq,
                perc: t.score,
                color: t.color,
            });
        }

        const fitem = subsets[0].translations[i];
        const variants = Dict.fromEntries(
            pipe(
                subsets,
                List.flatMap((subs) => subs.translations[i].translations),
                List.map((v) => {
                    const ans: [string, true] = [v.word, true];
                    return ans;
                })
            )
        );
        tmp.push({
            idx: i,
            heading:
                Dict.size(variants) > 1
                    ? fitem.firstTranslatLc
                    : fitem.translations[0].word,
            cells: [...row],
        });
    }
    return pipe(
        tmp,
        List.sorted(
            (v1, v2) =>
                v2.cells.reduce((acc, curr) => acc + curr.perc, 0) -
                v1.cells.reduce((acc, curr) => acc + curr.perc, 0)
        ),
        List.slice(0, maxNumLines),
        List.map((row) => mapFn(row))
    );
};

/**
 * TranslationsSubsetsModelState is a state for package/subcorpus based
 * translation tile where we show how the translation differs when using
 * different data as sources for translation.
 */
export interface TranslationsSubsetsModelState {
    minItemFreq: number;
    lang1: string;
    lang2: string;
    isBusy: boolean;
    error: string;
    isAltViewMode: boolean;
    subsets: Array<TranslationSubset>;
    highlightedRowIdx: number;
    maxNumLines: number;
    backlinks: Array<Backlink>;
    backlinkConf: BacklinkConf;
}

export interface TreqSubsetModelArgs {
    dispatcher: IActionQueue;
    appServices: IAppServices;
    initialState: TranslationsSubsetsModelState;
    tileId: number;
    api: TreqSubsetsAPI;
    queryMatches: RecognizedQueries;
    scaleColorGen: ColorScaleFunctionGenerator;
}

export class TreqSubsetModel extends StatelessModel<TranslationsSubsetsModelState> {
    public static readonly UNMATCHING_ITEM_COLOR = '#878787';

    private readonly tileId: number;

    private readonly api: TreqSubsetsAPI;

    private readonly queryMatches: RecognizedQueries;

    private readonly appServices: IAppServices;

    private readonly scaleColorGen: ColorScaleFunctionGenerator;

    constructor({
        dispatcher,
        appServices,
        initialState,
        tileId,
        api,
        queryMatches,
        scaleColorGen,
    }: TreqSubsetModelArgs) {
        super(dispatcher, initialState);
        this.api = api;
        this.tileId = tileId;
        this.queryMatches = queryMatches;
        this.appServices = appServices;
        this.scaleColorGen = scaleColorGen;

        this.addActionHandler(
            GlobalActions.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                const srchLemma = findCurrQueryMatch(this.queryMatches[0]);
                this.api
                    .call(
                        this.appServices.dataStreaming(),
                        this.tileId,
                        0,
                        this.stateToArgs(state, srchLemma.lemma)
                    )
                    .pipe(
                        tap((data) => {
                            dispatch<typeof Actions.PartialTileDataLoaded>({
                                name: Actions.PartialTileDataLoaded.name,
                                payload: {
                                    tileId: this.tileId,
                                    subsets: filterByMinFreq(
                                        data.subsets,
                                        state.minItemFreq
                                    ),
                                },
                            });
                        })
                    )
                    .subscribe({
                        next: (translations) => {
                            dispatch<typeof Actions.TileDataLoaded>({
                                name: Actions.TileDataLoaded.name,
                                payload: {
                                    tileId: this.tileId,
                                    isEmpty: Dict.every(
                                        (x) => x.length === 0,
                                        translations.subsets
                                    ),
                                    queryIdx: 0,
                                    translatLanguage: state.lang2,
                                    subqueries: pipe(
                                        translations,
                                        Dict.keys(),
                                        List.map((value) => ({ value }))
                                    ),
                                },
                            });
                        },
                        error: (error) => {
                            dispatch<typeof Actions.TileDataLoaded>({
                                name: Actions.TileDataLoaded.name,
                                payload: {
                                    tileId: this.tileId,
                                    isEmpty: true,
                                    queryIdx: 0,
                                    translatLanguage: state.lang2,
                                    subqueries: [],
                                },
                                error,
                            });
                            console.error(error);
                        },
                    });
            }
        );

        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            (action) => this.tileId === action.payload.tileId,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    state.error = this.appServices.normalizeHttpApiError(
                        action.error
                    );
                }
            }
        );

        this.addActionSubtypeHandler(
            Actions.PartialTileDataLoaded,
            (action) => this.tileId === action.payload.tileId,
            (state, action) => {
                Dict.forEach((translations, subsetId) => {
                    const srchIdx = List.findIndex(
                        (v) => v.ident === subsetId,
                        state.subsets
                    );
                    const val = state.subsets[srchIdx];
                    state.subsets[srchIdx] = {
                        ident: val.ident,
                        label: val.label,
                        packages: val.packages,
                        translations: List.map(
                            (tran) => ({
                                freq: tran.freq,
                                score: tran.score,
                                word: tran.word,
                                translations: tran.translations,
                                firstTranslatLc: tran.firstTranslatLc,
                                color: TreqSubsetModel.UNMATCHING_ITEM_COLOR,
                            }),
                            translations
                        ),
                    };
                    this.mkWordUnion(state);
                    state.backlinks[srchIdx] = this.api.getBacklink(0, srchIdx);
                }, action.payload.subsets);
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
                            dispatch<typeof GlobalActions.GetSourceInfoDone>({
                                name: GlobalActions.GetSourceInfoDone.name,
                                payload: {
                                    data,
                                },
                            });
                        },
                        error: (error) => {
                            console.error(error);
                            dispatch<typeof GlobalActions.GetSourceInfoDone>({
                                name: GlobalActions.GetSourceInfoDone.name,
                                error,
                            });
                        },
                    });
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.FollowBacklink,
            (action) => action.payload.tileId === this.tileId,
            (state, action) => {
                const srchLemma = findCurrQueryMatch(
                    this.queryMatches[action.payload.backlink.queryId]
                );
                const url = this.requestBacklink(
                    state,
                    srchLemma.lemma,
                    state.subsets[action.payload.backlink.subqueryId].packages
                );
                window.open(url.toString(), '_blank');
            }
        );
    }

    private stateToArgs(
        state: TranslationsSubsetsModelState,
        query: string
    ): { [subsetId: string]: RequestArgs } {
        return pipe(
            state.subsets,
            List.map((subset) =>
                tuple(subset.ident, {
                    from: state.lang1,
                    to: state.lang2,
                    multiword: query.split(' ').length > 1,
                    regex: false,
                    lemma: true,
                    ci: true,
                    'pkgs[i]': subset.packages,
                    query: query,
                    order: 'perc',
                    asc: false,
                })
            ),
            Dict.fromEntries()
        );
    }

    private requestBacklink(
        state: TranslationsSubsetsModelState,
        query: string,
        packages: Array<string>
    ): URL {
        const url = new URL(state.backlinkConf.url);
        url.searchParams.set('jazyk1', state.lang1);
        url.searchParams.set('jazyk2', state.lang2);
        url.searchParams.set(
            'viceslovne',
            query.split(' ').length > 1 ? '1' : '0'
        );
        url.searchParams.set('regularni', '0');
        url.searchParams.set('lemma', '1');
        url.searchParams.set('caseInsen', '1');
        url.searchParams.set('hledejCo', query);
        for (const pkg of packages) {
            url.searchParams.append('hledejKde[]', pkg);
        }
        return url;
    }

    private mkWordUnion(state: TranslationsSubsetsModelState): void {
        const allWords = pipe(
            state.subsets,
            List.flatMap((subset) => subset.translations),
            List.groupBy((v) => v.firstTranslatLc),
            List.map(([translat, v]) => {
                const ans: [string, number, number] = [
                    translat,
                    List.reduce((acc, curr) => acc + curr.score, 0, v),
                    List.reduce((acc, curr) => acc + curr.freq, 0, v),
                ];
                return ans;
            })
        );

        const colorMap = pipe(
            allWords,
            List.sortedBy(([, , freq]) => -freq),
            List.map(([word, ,], i) => tuple(word, this.scaleColorGen(0)(i))),
            Dict.fromEntries()
        );

        state.subsets = pipe(
            state.subsets,
            List.map((subset) => ({
                ident: subset.ident,
                label: subset.label,
                packages: subset.packages,
                translations: pipe(
                    allWords,
                    List.sortedBy(([, score]) => score),
                    List.map(([word]) => {
                        const srch = List.find(
                            (v) => v.firstTranslatLc === word,
                            subset.translations
                        );
                        if (srch) {
                            return {
                                freq: srch.freq,
                                score: srch.score,
                                word: srch.word,
                                translations: srch.translations,
                                firstTranslatLc: srch.firstTranslatLc,
                                color: colorMap[word],
                            };
                        }
                        return {
                            freq: 0,
                            score: 0,
                            word: '',
                            translations: [{ word }],
                            firstTranslatLc: word.toLowerCase(),
                            color: TreqSubsetModel.UNMATCHING_ITEM_COLOR,
                        };
                    })
                ),
            }))
        );
    }
}
