/*
 * Copyright 2026 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2026 Department of Linguistics,
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

import { IFullActionControl } from 'kombo';
import { IAppServices } from '../../../appServices.js';
import { Backlink } from '../../../page/tile.js';
import {
    GramatikatAPI,
    GramatikatAPIArgs,
    GramatikatFreq,
    GramatikatPoS,
    LemmaProfileResponse,
    posCatToValSet,
    posToCatSet,
    Summary,
    tagCodeToHuman,
} from './api.js';
import { IDataStreaming } from '../../../page/streaming.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import {
    RecognizedQueries,
    QueryMatch,
    findCurrQueryMatch,
    testIsDictMatch,
    LemmatizationLevel,
} from '../../../query/index.js';
import { mergeMap, Observable, reduce, tap } from 'rxjs';
import { Dict, List, pipe, tuple } from 'cnc-tskit';
import { Actions } from './actions.js';
import { SystemMessageType } from '../../../types.js';
import { TileStatefulModel } from '../../../models/tiles/base.js';

export interface WordData {
    lemmaData: {
        totalFreq: number;
        variants: Array<GramatikatFreq>;
    };
    posData: {
        summaries: Array<Summary>;
    };
    chartData: {
        items: Array<ChartData>;
    };
    pos: GramatikatPoS;
    missingPos: boolean;
}

export type UncommonValue = 'over' | 'under' | 'none';

export interface HeatmapConfig {
    label: string;
    columnsTags: Array<string>;
    rowsTags: Array<string>;
}

export interface ViewOptions {
    groupedXVisibility: { [tag: string]: boolean };
    heatmaps: {
        verbs: Array<{ conf: HeatmapConfig; isActive: boolean }>;
        nouns: Array<{ conf: HeatmapConfig; isActive: boolean }>;
        adjectives: Array<{ conf: HeatmapConfig; isActive: boolean }>;
    };
}

export interface GramatikatState {
    corpname: string;

    /**
     * For each queryIdx, we keep data about a lemma and its PoS
     */
    data: Array<WordData>;
    isBusy: boolean;
    backlinks: Array<Backlink>;
    error: string | undefined;

    /**
     * The message attribute is for Gramatikat-specific
     * info/warning messages which are not errors.
     */
    message: string | undefined;
    words: Array<string>;
    isAltViewMode: boolean;
    isTweakMode: boolean;
    viewOptions: ViewOptions;
}

export interface ChartData {
    tag: string;
    tagReadable: string;
    value: number;
    mean: number;
    uncommonValue: UncommonValue;
}

const attachCalcStats = (wordData: WordData, pos: GramatikatPoS) => {
    wordData.chartData = pipe(
        wordData.lemmaData.variants,
        List.filter((v) => v.proportion * wordData.lemmaData.totalFreq > 10), // TODO configurable threshold
        List.map((v) => {
            const tag = v.valSet.join(' ');
            const summary = List.find(
                (s) => s.valSet.join(' ') === tag,
                wordData.posData.summaries
            );
            if (!summary || summary.mean === undefined) {
                throw new Error('missing summary data for the word');
            }
            return tuple(v, summary);
        }),
        List.map(([variant, summary]) => {
            variant.uncommonValue = 'none';
            if (variant.proportion > summary.quartiles[2]) {
                variant.uncommonValue = 'over';
            } else if (variant.proportion < summary.quartiles[0]) {
                variant.uncommonValue = 'under';
            }
            return {
                tag: variant.valSet.join(''),
                tagReadable: tagCodeToHuman(
                    pos,
                    variant.valSet.join(''),
                    'mutable'
                ),
                value: variant.proportion,
                uncommonValue: variant.uncommonValue,
                mean: summary.mean,
            };
        }),
        (values) => ({
            items: values,
        })
    );
};

export interface ConcordanceTileModelArgs {
    dispatcher: IFullActionControl;
    tileId: number;
    appServices: IAppServices;
    api: GramatikatAPI;
    queryMatches: RecognizedQueries;
    initState: GramatikatState;
    lemLevelSupport: Array<LemmatizationLevel>;
    dependentTiles: Array<number>;
}

export class GramatikatModel extends TileStatefulModel<GramatikatState> {
    private readonly api: GramatikatAPI;

    private currQueryMatches: Array<QueryMatch>;

    constructor({
        dispatcher,
        tileId,
        appServices,
        api,
        queryMatches,
        initState,
        lemLevelSupport,
        dependentTiles,
    }: ConcordanceTileModelArgs) {
        super({
            dispatcher,
            initState,
            tileId,
            appServices,
            dependentTiles,
            lemLevelSupport,
        });
        this.api = api;
        this.currQueryMatches = List.map(
            (match) => findCurrQueryMatch(match),
            queryMatches
        );

        this.addSearchActionHandler((action, ds) => {
            if (!!action.payload?.newQueryMatches) {
                this.currQueryMatches = action.payload.newQueryMatches;
            }
            this.changeState((state) => {
                state.isBusy = true;
                state.error = null;
            });
            this.processResponse(this.loadData(ds));
        });

        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            (action) => action.payload.tileId === this.tileId,
            (action) => {
                this.changeState((state) => {
                    state.isBusy = false;
                });
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.EnableAltViewMode,
            (action) => action.payload.ident === this.tileId,
            (action) => {
                this.changeState((state) => {
                    state.isAltViewMode = true;
                });
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.DisableAltViewMode,
            (action) => action.payload.ident === this.tileId,
            (action) => {
                this.changeState((state) => {
                    state.isAltViewMode = false;
                });
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.EnableTileTweakMode,
            (action) => action.payload.ident === this.tileId,
            (action) => {
                this.changeState((state) => {
                    state.isTweakMode = true;
                });
            }
        );

        this.addActionSubtypeHandler(
            GlobalActions.DisableTileTweakMode,
            (action) => action.payload.ident === this.tileId,
            (action) => {
                this.changeState((state) => {
                    state.isTweakMode = false;
                });
            }
        );

        this.addActionSubtypeHandler(
            Actions.PartialTileDataLoaded,
            (action) => action.payload.tileId === this.tileId,
            (action) => {
                if (!action.error) {
                    this.changeState((state) => {
                        state.isBusy = false;
                        const tmp = {
                            lemmaData: {
                                totalFreq:
                                    action.payload.resp.lemmaInfo[0].freq,
                                variants:
                                    action.payload.resp.lemmaInfo[0]
                                        .proportions,
                            },
                            posData: {
                                summaries:
                                    action.payload.resp.posInfo[0].summaries,
                            },
                            pos: action.payload.resp.pos,
                            missingPos: action.payload.resp.isAmbiguousPos,
                            chartData: undefined,
                        };
                        if (!action.payload.resp.pos) {
                            state.message = this.appServices.translate(
                                'gramatikat__exact_pos_is_required_msg'
                            );
                            return;
                        }
                        attachCalcStats(tmp, action.payload.resp.pos);
                        state.data[action.payload.queryIdx] = tmp;

                        // opts:
                        const groupedProp = List.find(
                            (v) => v.isGrouped,
                            posToCatSet(action.payload.resp.pos)
                        );
                        state.viewOptions.groupedXVisibility = pipe(
                            posCatToValSet(groupedProp.value),
                            List.map((v, i) =>
                                tuple(
                                    v,
                                    i === 0 ||
                                        action.payload.resp.pos !== 'adjectives'
                                        ? true
                                        : false
                                )
                            ),
                            Dict.fromEntries()
                        );
                    });
                } else {
                    this.changeState((state) => {
                        state.isBusy = false;
                        state.error = `${action.error}`;
                    });
                    this.appServices.showMessage(
                        SystemMessageType.ERROR,
                        action.error
                    );
                }
            }
        );

        this.addActionSubtypeHandler(
            Actions.SetXGroupedVisibility,
            (action) => action.payload.tileId === this.tileId,
            (action) => {
                this.changeState((state) => {
                    const numVisible = pipe(
                        state.viewOptions.groupedXVisibility,
                        Dict.filter((v, _) => v),
                        Dict.size()
                    );
                    if (numVisible === 1 && !action.payload.visible) {
                        this.appServices.showMessage(
                            SystemMessageType.ERROR,
                            'at least one block must be visible'
                        );
                    } else {
                        state.viewOptions.groupedXVisibility[
                            action.payload.tag
                        ] = action.payload.visible;
                    }
                });
            }
        );
    }

    private stateToArgs(m: QueryMatch): GramatikatAPIArgs {
        return {
            lemma: m.lemma,
            catSet: [], // will be added later
            corpus: this.state.corpname,
            pos:
                Array.isArray(m.pos) && !List.empty(m.pos)
                    ? m.pos[0].value
                    : undefined,
        };
    }

    private processResponse(
        resp: Observable<[LemmaProfileResponse, number]>
    ): void {
        resp.pipe(
            tap(([resp, queryIdx]) => {
                this.dispatchSideEffect<typeof Actions.PartialTileDataLoaded>({
                    name: Actions.PartialTileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        queryIdx,
                        resp,
                    },
                });
            }),
            reduce(
                (acc, [resp]) => {
                    return {
                        isEmpty: acc.isEmpty && List.empty(resp.lemmaInfo),
                    };
                },
                { isEmpty: true }
            )
        ).subscribe({
            next: ({ isEmpty }) => {
                this.dispatchSideEffect<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    payload: {
                        tileId: this.tileId,
                        isEmpty,
                    },
                });
            },
            error: (err) => {
                this.dispatchSideEffect<typeof Actions.TileDataLoaded>({
                    name: Actions.TileDataLoaded.name,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                    },
                });
            },
        });
    }

    private loadData(
        streaming: IDataStreaming
    ): Observable<[LemmaProfileResponse, number]> {
        return new Observable<[GramatikatAPIArgs | null, number]>(
            (observer) => {
                try {
                    pipe(
                        this.currQueryMatches,
                        List.map((currMatch, queryIdx) =>
                            tuple(
                                testIsDictMatch(currMatch)
                                    ? this.stateToArgs(currMatch)
                                    : null,
                                queryIdx
                            )
                        ),
                        List.forEach((v) => {
                            observer.next(v);
                        })
                    );
                    observer.complete();
                } catch (e) {
                    observer.error(e);
                }
            }
        ).pipe(
            mergeMap(([args, queryIdx]) =>
                this.appServices.callAPI(
                    this.api,
                    streaming,
                    this.tileId,
                    queryIdx,
                    args
                )
            )
        );
    }
}
