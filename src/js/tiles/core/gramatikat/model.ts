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
    GramatikatCatSet,
    GramatikatFreq,
    GramatikatPoS,
    isErrorLemmaInfo,
    LemmaInfo,
    LemmaProfileResponse,
    Summary,
    tagCodeToHuman,
} from './api.js';
import { IDataStreaming } from '../../../page/streaming.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import {
    RecognizedQueries,
    QueryMatch,
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
    pos: GramatikatPoS;
    missingPos: boolean;
}

export type UncommonValue = 'over' | 'under' | 'none';

export interface HeatmapStaticConfig {
    label: string;

    /**
     * Defines which properties (at most two) are in the columns.
     * These values must match (including their order) the
     * columnsTags.
     * E.g.: columnsProps: ['polarity', 'tense'] means, that
     * in the tag value listings the values must be [polarity]-[tense]
     *
     * Also, in case the values are two, the first one will be grouped.
     *
     */
    columnsProps: Array<GramatikatCatSet>;
    columnsTags: Array<string>;
    activeGroupedColVals: { [code: string]: boolean };
    switchableGroupColVals: boolean;
    rowsTags: Array<string>;
    rowsProp: GramatikatCatSet;
}

export interface HeatmapConfig {
    conf: HeatmapStaticConfig;
    isActive: boolean;
}

export interface ViewOptions {
    heatmaps: {
        verbs: Array<HeatmapConfig>;
        nouns: Array<HeatmapConfig>;
        adjectives: Array<HeatmapConfig>;
    };
}

const wagPosToGramatikat = (pos: string): GramatikatPoS | undefined => {
    switch (pos) {
        case 'N':
        case 'NOUN':
        case 'PROPN':
            return 'nouns';
        case 'A':
        case 'ADJ':
            return 'adjectives';
        case 'V':
        case 'VERB':
        case 'AUX':
            return 'verbs';
        default:
            return undefined;
    }
};

export function getHeatmapConfList(
    opts: ViewOptions,
    pos: GramatikatPoS
): Array<HeatmapConfig> | undefined {
    switch (pos) {
        case 'adjectives':
            return opts.heatmaps.adjectives;
        case 'nouns':
            return opts.heatmaps.nouns;
        case 'verbs':
            return opts.heatmaps.verbs;
        default:
            return undefined;
    }
}

export function setHeatmapConfList(
    opts: ViewOptions,
    pos: GramatikatPoS,
    values: Array<HeatmapConfig>
): void {
    switch (pos) {
        case 'adjectives':
            opts.heatmaps.adjectives = values;
        case 'nouns':
            opts.heatmaps.nouns = values;
        case 'verbs':
            opts.heatmaps.verbs = values;
        default:
            return;
    }
}

export function getActiveHeatmapConf(
    opts: ViewOptions,
    pos: GramatikatPoS
): HeatmapConfig | undefined {
    const conf = getHeatmapConfList(opts, pos);
    if (conf === undefined) {
        return undefined;
    }
    return List.find((v) => v.isActive, conf);
}

export interface GramatikatState {
    corpname: string;
    currQueryMatches: Array<QueryMatch>;

    /**
     * For each queryIdx, we keep data about a lemma and its PoS
     */
    data: Array<WordData>;
    advancedViewUncommonOnly: boolean;
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

const attachCalcStats = (wordData: WordData, pos: GramatikatPoS) => {
    pipe(
        wordData.lemmaData.variants,
        List.forEach((v) => {
            const tag = v.valSet.join(' ');
            const summary = List.find(
                (s) => s.valSet.join(' ') === tag,
                wordData.posData.summaries
            );

            // Always add readableTag
            v.readableTag = tagCodeToHuman(pos, v.valSet.join(''), 'mutable');

            // Only add mean and uncommonValue if we have summary data and sufficient frequency
            if (
                summary &&
                summary.mean !== undefined &&
                v.proportion * wordData.lemmaData.totalFreq > 10
            ) {
                v['mean'] = summary.mean;
                v.uncommonValue = 'none';
                if (v.proportion > summary.quartiles[2]) {
                    v.uncommonValue = 'over';
                } else if (v.proportion < summary.quartiles[0]) {
                    v.uncommonValue = 'under';
                }
            } else {
                v.uncommonValue = 'none';
            }
        })
    );
};

export function remapTagValueOrder(ourOrder: Array<GramatikatCatSet>): {
    [prop: string]: number;
} {
    const apiPropOrder = [
        'tense',
        'gender',
        'number',
        'case',
        'degree',
        'polarity',
        'mood',
        'person',
        'voice',
        'aspect',
    ];
    return pipe(
        ourOrder,
        List.filter((v) => !!v),
        List.map((v) => tuple(v, apiPropOrder.indexOf(v))),
        List.sortedBy(([, idx]) => idx),
        List.map(([v], i) => tuple(v, i)),
        Dict.fromEntries()
    );
}

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

    constructor({
        dispatcher,
        tileId,
        appServices,
        api,
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

        this.addSearchActionHandler((action, ds) => {
            this.changeState((state) => {
                state.isBusy = true;
                state.error = action.error ? `${action.error}` : null;
                if (!!action.payload?.newQueryMatches) {
                    state.currQueryMatches = action.payload.newQueryMatches;
                }
            });
            this.processResponse(this.loadData(ds));
        });

        this.addActionSubtypeHandler(
            Actions.TileDataLoaded,
            (action) => action.payload.tileId === this.tileId,
            (action) => {
                console.log('tile data loaded ', action.payload);
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
                        if (
                            !this.isValidLemmaInfo(
                                action.payload.resp.lemmaInfo
                            ) ||
                            !action.payload.resp.pos
                        ) {
                            state.message = this.appServices.translate(
                                'gramatikat__exact_pos_is_required_msg'
                            );
                            if (
                                isErrorLemmaInfo(action.payload.resp.lemmaInfo)
                            ) {
                                console.error(
                                    action.payload.resp.lemmaInfo.detail[0].msg
                                );
                            }
                            return;
                        }
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
                        attachCalcStats(tmp, action.payload.resp.pos);
                        state.data[action.payload.queryIdx] = tmp;
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
                    const hmc = getActiveHeatmapConf(
                        state.viewOptions,
                        action.payload.pos
                    );
                    const numVisible = pipe(
                        hmc.conf.activeGroupedColVals,
                        Dict.filter((v) => v),
                        Dict.size()
                    );
                    if (numVisible === 1 && !action.payload.visible) {
                        this.appServices.showMessage(
                            SystemMessageType.ERROR,
                            'at least one block must be visible'
                        );
                    } else {
                        const activeHmc = (hmc.conf.activeGroupedColVals[
                            action.payload.tag
                        ] = action.payload.visible);
                    }
                });
            }
        );

        this.addActionSubtypeHandler(
            Actions.SelectAttrSet,
            (action) => this.tileId === action.payload.tileId,
            (action) => {
                this.changeState((state) => {
                    state.isBusy = true;
                    const conflist = getHeatmapConfList(
                        state.viewOptions,
                        action.payload.pos
                    );
                    List.forEach((v) => {
                        v.isActive = false;
                    }, conflist);
                    conflist[action.payload.idx].isActive = true;
                    setHeatmapConfList(
                        state.viewOptions,
                        action.payload.pos,
                        conflist
                    );
                });
                this.processResponse(
                    this.loadData(
                        this.appServices
                            .dataStreaming()
                            .startNewSubgroup(tileId, ...dependentTiles)
                    )
                );
            }
        );

        this.addActionSubtypeHandler(
            Actions.ToggleAdvancedViewUncommonOnly,
            (action) => this.tileId === action.payload.tileId,
            (action) => {
                this.changeState((state) => {
                    state.advancedViewUncommonOnly = action.payload.value;
                });
            }
        );
    }

    private stateToArgs(
        state: GramatikatState,
        m: QueryMatch
    ): GramatikatAPIArgs {
        const pos = wagPosToGramatikat(m.pos[0].value);
        const conf = getActiveHeatmapConf(state.viewOptions, pos);

        return {
            lemma: m.lemma,
            catSet: List.filter(
                (item) => !!item,
                [...conf.conf.columnsProps, conf.conf.rowsProp]
            ),
            corpus: this.state.corpname,
            pos: Array.isArray(m.pos) && !List.empty(m.pos) ? pos : undefined,
        };
    }

    private isValidLemmaInfo(lmi: LemmaInfo): boolean {
        return !isErrorLemmaInfo(lmi) && !List.empty(lmi);
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
                        isEmpty:
                            acc.isEmpty ||
                            !this.isValidLemmaInfo(resp.lemmaInfo),
                    };
                },
                { isEmpty: false }
            )
        ).subscribe({
            next: ({ isEmpty }) => {
                console.log('subscribe, isEmpty: ', isEmpty);
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
                        this.state.currQueryMatches,
                        List.map((currMatch, queryIdx) =>
                            tuple(
                                testIsDictMatch(currMatch)
                                    ? this.stateToArgs(this.state, currMatch)
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
