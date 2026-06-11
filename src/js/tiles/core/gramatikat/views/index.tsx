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

import { IActionDispatcher, useModel, ViewUtils } from 'kombo';
import { Theme } from '../../../../page/theme.js';
import { GlobalComponents } from '../../../../views/common/index.js';
import { init as altViewSingleInit } from './advanced.js';
import { init as settingsViewInit } from './settings.js';
import { GramatikatModel, ViewOptions, WordData } from '../model.js';
import {
    CoreTileComponentProps,
    TileComponent,
} from '../../../../page/tile.js';
import * as React from 'react';
import { Ident, List, pipe, tuple } from 'cnc-tskit';
import { init as multiWordViewInit } from './cmp.js';
import * as S from './style.js';
import { GramatikatFreq, GramatikatPoS, posToCatSet } from '../api.js';
import { Heatmap } from './heatmap.js';
import { Actions } from '../actions.js';
import {
    attachColorIndexes,
    colIsSetAsHidden,
    HeatmapCell,
    HeatmapCellVal,
    newCell,
} from './common.js';

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme,
    model: GramatikatModel
): TileComponent {
    const globalComponents = ut.getComponents();
    const MultiWordView = multiWordViewInit(dispatcher, ut, theme);
    const AltViewSingle = altViewSingleInit(dispatcher, ut, theme, model);
    const Settings = settingsViewInit(dispatcher, ut, theme, model);

    const caseLabels = {
        1: ut.translate('gramatikat__nominative'),
        2: ut.translate('gramatikat__genitive'),
        3: ut.translate('gramatikat__dative'),
        4: ut.translate('gramatikat__accusative'),
        5: ut.translate('gramatikat__vocative'),
        6: ut.translate('gramatikat__locative'),
        7: ut.translate('gramatikat__instrumental'),
    };

    const genderLabels = {
        F: ut.translate('gramatikat__feminine'),
        I: ut.translate('gramatikat__masculine_inanimate'),
        M: ut.translate('gramatikat__masculine_animate'),
        N: ut.translate('gramatikat__neuter'),
    };

    const tenseLabels = {
        P: ut.translate('gramatikat__present'),
        R: ut.translate('gramatikat__past'),
        F: ut.translate('gramatikat__future'),
    };

    const numberLabels = {
        S: ut.translate('gramatikat__singular'),
        P: ut.translate('gramatikat__plural'),
        D: ut.translate('gramatikat__dual'),
    };

    const polarityLabels = {
        A: ut.translate('gramatikat__affirmative'),
        N: ut.translate('gramatikat__negative'),
    };

    const degreeLabels = {
        '1': ut.translate('gramatikat__degree_1'),
        '2': ut.translate('gramatikat__degree_2'),
        '3': ut.translate('gramatikat__degree_3'),
    };

    // ---------------- <PropertiesForVerbs /> ----------------------

    const PropertiesForVerbs: React.FC<{
        lemmaData: {
            totalFreq: number;
            variants: Array<{ valSet: any; proportion: number }>;
        };
        pos: GramatikatPoS;
        viewOptions: ViewOptions;
    }> = ({ lemmaData, pos, viewOptions }) => {
        const tagStruct = posToCatSet(pos);
        const tenseIdx = List.findIndex((v) => v.value === 'tense', tagStruct);
        const numberIdx = List.findIndex(
            (v) => v.value === 'number',
            tagStruct
        );
        const polarityIdx = List.findIndex(
            (v) => v.value === 'polarity',
            tagStruct
        );

        if (tenseIdx < 0 || numberIdx < 0 || polarityIdx < 0) {
            return null;
        }

        // Create a map for quick lookup
        const [minVal, maxVal, variantMap] = pipe(
            lemmaData.variants,
            List.filter((v) => v.proportion > 0),
            List.foldl(
                ([minVal, maxVal, mapping], variant) => {
                    const tense = variant.valSet[tenseIdx];
                    const number = variant.valSet[numberIdx];
                    const polarity = variant.valSet[polarityIdx];
                    const key = `${tense}-${polarity}-${number}`;
                    mapping.set(key, variant);
                    return tuple(
                        variant.proportion < minVal
                            ? variant.proportion
                            : minVal,
                        variant.proportion > maxVal
                            ? variant.proportion
                            : maxVal,
                        mapping
                    );
                },
                tuple(1000, 0, new Map<string, GramatikatFreq>())
            )
        );

        // Prepare grouped bar chart data: one entry per tense
        const tenseAndNegationOrder = [
            'P-A',
            'R-A',
            'F-A',
            'P-N',
            'R-N',
            'F-N',
        ];
        const xLabels = List.map((item, i) => {
            const letters = item.split('-');
            return <span key={`${i}:${item}`}>{tenseLabels[letters[0]]}</span>;
        }, tenseAndNegationOrder);
        const xGroupedLabels = pipe(
            tenseAndNegationOrder,
            List.map((v) => v.split('-')),
            List.groupBy((v) => v[1]),
            List.map(([v, grouped]) => ({
                v: polarityLabels[v],
                span: List.size(grouped),
                tag: v,
                isHidden: colIsSetAsHidden(viewOptions.groupedXVisibility, v),
            }))
        );

        const numberOrder = ['S', 'P', 'D'];
        const yLabels = List.map((item) => numberLabels[item], numberOrder);

        const devToIcon = (v: GramatikatFreq): HeatmapCellVal['icon'] => {
            if (v.deviatesFromMean) {
                if (v.deviatesFromMean === 'over') {
                    return 'up';
                }
                return 'down';
            }
            return undefined;
        };

        const data: Array<Array<HeatmapCell>> = List.map(
            (numo) =>
                List.map((tano) => {
                    const v = variantMap.get(tano + '-' + numo);
                    return v
                        ? newCell({
                              v: v.proportion * 100,
                              icon: devToIcon(v),
                              id: Ident.puid(),
                              sortedIdx: -1,
                          })
                        : newCell({ v: 0, id: Ident.puid(), sortedIdx: -1 });
                }, tenseAndNegationOrder),
            numberOrder
        );

        const colorMapping = attachColorIndexes(data, 0);

        return (
            <>
                <globalComponents.ResponsiveWrapper
                    render={(width: number, height: number) => (
                        <Heatmap
                            data={data}
                            xLabels={xLabels}
                            xGroupLabels={xGroupedLabels}
                            yLabels={yLabels}
                            colorMapping={colorMapping}
                        />
                    )}
                />
            </>
        );
    };

    // ------------------- <PropertiesForNouns /> ------------------------

    const PropertiesForNouns: React.FC<{
        lemmaData: {
            totalFreq: number;
            variants: Array<{ valSet: any; proportion: number }>;
        };
        pos: GramatikatPoS;
        viewOptions: ViewOptions;
    }> = ({ lemmaData, pos, viewOptions }) => {
        const tagStruct = posToCatSet(pos);
        const caseIdx = List.findIndex((v) => v.value === 'case', tagStruct);
        const numberIdx = List.findIndex(
            (v) => v.value === 'number',
            tagStruct
        );
        const genderIdx = List.findIndex(
            (v) => v.value === 'gender',
            tagStruct
        );

        const [, , variantMap] = pipe(
            lemmaData.variants,
            List.filter((v) => v.proportion > 0),
            List.foldl(
                ([minVal, maxVal, mapping], variant) => {
                    const gcase = variant.valSet[caseIdx];
                    const number = variant.valSet[numberIdx];
                    const gender = variant.valSet[genderIdx];
                    const key = `${number}-${gender}-${gcase}`;
                    mapping.set(key, variant);
                    return tuple(
                        variant.proportion < minVal
                            ? variant.proportion
                            : minVal,
                        variant.proportion > maxVal
                            ? variant.proportion
                            : maxVal,
                        mapping
                    );
                },
                tuple(1000, 0, new Map<string, GramatikatFreq>())
            )
        );

        // Prepare grouped bar chart data: one entry per tense
        const numberAndGenderOrder = [
            'D-F',
            'P-F',
            'S-F',
            'D-I',
            'P-I',
            'S-I',
            'D-M',
            'P-M',
            'S-M',
            'D-N',
            'P-N',
            'S-N',
        ];
        const xLabels = List.map((item, i) => {
            const letters = item.split('-');
            return <span key={`${i}:${item}`}>{numberLabels[letters[0]]}</span>;
        }, numberAndGenderOrder);

        const xGroupedLabels = pipe(
            numberAndGenderOrder,
            List.map((v) => v.split('-')),
            List.groupBy((v) => v[1]),
            List.map(([v, grouped]) => ({
                v: genderLabels[v],
                span: List.size(grouped),
                tag: v,
                isHidden: colIsSetAsHidden(viewOptions.groupedXVisibility, v),
            }))
        );
        const caseOrder = ['1', '2', '3', '4', '5', '6', '7'];
        const yLabels = List.map((item) => caseLabels[item], caseOrder);

        const devToIcon = (v: GramatikatFreq): HeatmapCellVal['icon'] => {
            if (v.deviatesFromMean) {
                if (v.deviatesFromMean === 'over') {
                    return 'up';
                }
                return 'down';
            }
            return undefined;
        };

        const data: Array<Array<HeatmapCell>> = List.map(
            (numo) =>
                List.map((tano) => {
                    const v = variantMap.get(tano + '-' + numo);
                    return v
                        ? newCell({
                              v: v.proportion * 100,
                              icon: devToIcon(v),
                              id: Ident.puid(),
                              sortedIdx: -1,
                          })
                        : newCell({ v: 0, id: Ident.puid(), sortedIdx: -1 });
                }, numberAndGenderOrder),
            caseOrder
        );

        const colorMapping = attachColorIndexes(data, 0);

        return (
            <globalComponents.ResponsiveWrapper
                render={(width: number, height: number) => (
                    <Heatmap
                        data={data}
                        xLabels={xLabels}
                        yLabels={yLabels}
                        xGroupLabels={xGroupedLabels}
                        colorMapping={colorMapping}
                    />
                )}
            />
        );
    };

    // ------------------- <PropertiesForAdjs /> ------------------------

    const PropertiesForAdjs: React.FC<{
        tileId: number;
        lemmaData: {
            totalFreq: number;
            variants: Array<{ valSet: any; proportion: number }>;
        };
        pos: GramatikatPoS;
        viewOptions: ViewOptions;
    }> = ({ tileId, lemmaData, pos, viewOptions }) => {
        const tagStruct = posToCatSet(pos);
        const caseIdx = List.findIndex((v) => v.value === 'case', tagStruct);
        const degreeIdx = List.findIndex(
            (v) => v.value === 'degree',
            tagStruct
        );
        const genderIdx = List.findIndex(
            (v) => v.value === 'gender',
            tagStruct
        );
        const [, , variantMap] = pipe(
            lemmaData.variants,
            List.filter((v) => v.proportion > 0),
            List.foldl(
                ([minVal, maxVal, mapping], variant) => {
                    const gcase = variant.valSet[caseIdx];
                    const degree = variant.valSet[degreeIdx];
                    const gender = variant.valSet[genderIdx];
                    const key = `${gender}-${gcase}-${degree}`;
                    mapping.set(key, variant);
                    return tuple(
                        variant.proportion < minVal
                            ? variant.proportion
                            : minVal,
                        variant.proportion > maxVal
                            ? variant.proportion
                            : maxVal,
                        mapping
                    );
                },
                tuple(1000, 0, new Map<string, GramatikatFreq>())
            )
        );

        // Prepare grouped bar chart data: one entry per tense
        const degreeAndGenderOrder = [
            '1-F',
            '1-I',
            '1-M',
            '1-N',
            '2-F',
            '2-I',
            '2-M',
            '2-N',
            '3-F',
            '3-I',
            '3-M',
            '3-N',
        ];
        const xLabels = List.map((item, i) => {
            const letters = item.split('-');
            return <span key={`${i}:${item}`}>{genderLabels[letters[1]]}</span>;
        }, degreeAndGenderOrder);

        const xGroupedLabels = pipe(
            degreeAndGenderOrder,
            List.map((v) => v.split('-')),
            List.groupBy((v) => v[0]),
            List.map(([v, grouped]) => ({
                v: degreeLabels[v],
                span: List.size(grouped),
                tag: v,
                isHidden: colIsSetAsHidden(viewOptions.groupedXVisibility, v),
            }))
        );
        const caseOrder = ['1', '2', '3', '4', '5', '6', '7'];
        const yLabels = List.map((item) => caseLabels[item], caseOrder);

        const devToIcon = (v: GramatikatFreq): HeatmapCellVal['icon'] => {
            if (v.deviatesFromMean) {
                if (v.deviatesFromMean === 'over') {
                    return 'up';
                }
                return 'down';
            }
            return undefined;
        };

        const data: Array<Array<HeatmapCell>> = List.map(
            (caseTag) =>
                List.map((genderAndDegreeTag) => {
                    const dgTmp = genderAndDegreeTag.split('-');
                    const v = variantMap.get(
                        `${dgTmp[1]}-${caseTag}-${dgTmp[0]}`
                    );
                    return v
                        ? newCell({
                              v: v.proportion * 100,
                              icon: devToIcon(v),
                              id: Ident.puid(),
                              sortedIdx: -1,
                          })
                        : newCell({ v: 0, id: Ident.puid(), sortedIdx: -1 });
                }, degreeAndGenderOrder),
            caseOrder
        );

        const colorMapping = attachColorIndexes(data, 0);

        const handleXGroupedVisibilityChng = (
            evt: React.ChangeEvent<HTMLInputElement>
        ) => {
            dispatcher.dispatch(Actions.SetXGroupedVisibility, {
                tileId,
                tag: evt.target.value,
                visible: !viewOptions.groupedXVisibility[evt.target.value],
            });
        };

        return (
            <globalComponents.ResponsiveWrapper
                render={(width: number, height: number) => (
                    <S.PropertiesForAdjs>
                        <Heatmap
                            data={data}
                            xLabels={xLabels}
                            xGroupLabels={xGroupedLabels}
                            yLabels={yLabels}
                            colorMapping={colorMapping}
                        />
                        <ul className="degree-sel">
                            {List.map(
                                (lab, i) => (
                                    <li key={`${i}:${lab}`}>
                                        <label>
                                            {lab.v}
                                            <input
                                                type="checkbox"
                                                value={lab.tag}
                                                checked={
                                                    viewOptions
                                                        .groupedXVisibility[
                                                        lab.tag
                                                    ]
                                                }
                                                onChange={
                                                    handleXGroupedVisibilityChng
                                                }
                                            />
                                        </label>
                                    </li>
                                ),
                                xGroupedLabels
                            )}
                        </ul>
                    </S.PropertiesForAdjs>
                )}
            />
        );
    };

    // ------------------- <SingleWordView /> ------------------------

    const SingleWordView: React.FC<
        WordData & {
            tileId: number;
            alpha: number;
            viewOptions: ViewOptions;
        }
    > = ({ tileId, lemmaData, chartData, pos, viewOptions }) => {
        const message = chartData.hasSignificantDeviations
            ? ut.translate('gramatikat__showing_stat_signif_values')
            : ut.translate('gramatikat__there_are_no_stat_signif_values');

        const renderChart = () => {
            switch (pos) {
                case 'nouns':
                    return (
                        <PropertiesForNouns
                            lemmaData={lemmaData}
                            pos={pos}
                            viewOptions={viewOptions}
                        />
                    );
                case 'verbs':
                    return (
                        <PropertiesForVerbs
                            lemmaData={lemmaData}
                            pos={pos}
                            viewOptions={viewOptions}
                        />
                    );
                case 'adjectives':
                    return (
                        <PropertiesForAdjs
                            tileId={tileId}
                            lemmaData={lemmaData}
                            pos={pos}
                            viewOptions={viewOptions}
                        />
                    );
                default:
                    return null;
            }
        };

        return (
            <S.SingleWordView>
                <div>
                    {renderChart()}
                    <p className="note">{message}</p>
                </div>
            </S.SingleWordView>
        );
    };

    // ---------------- <GramatikatTile /> ---------------------------------

    const GramatikatTile: React.FC<CoreTileComponentProps> = (props) => {
        const state = useModel(model);
        // TODO - currently we only work with the first dataset item (i.e. no frameCatSet)

        const posInfoSrch = List.find((v) => v !== undefined, state.data);
        const posInfo = posInfoSrch ? posInfoSrch.posData : { summaries: [] };

        return (
            <globalComponents.TileWrapper
                tileId={props.tileId}
                isBusy={state.isBusy}
                error={state.error}
                hasData={!List.empty(state.data)}
                sourceIdent={{ corp: state.corpname }}
                backlink={state.backlinks}
                supportsTileReload={props.supportsReloadOnError}
                issueReportingUrl={props.issueReportingUrl}
            >
                {state.isTweakMode ? <Settings tileId={props.tileId} /> : null}
                {(() => {
                    if (List.empty(state.data)) {
                        return null;
                    }
                    if (List.size(state.data) === 1) {
                        return state.isAltViewMode ? (
                            <AltViewSingle
                                lemmaData={List.head(state.data).lemmaData}
                                posData={List.head(state.data).posData}
                                missingPos={List.head(state.data).missingPos}
                                alpha={state.statTestAlpha}
                                pos={List.head(state.data).pos}
                                chartData={List.head(state.data).chartData}
                            />
                        ) : (
                            <SingleWordView
                                tileId={props.tileId}
                                lemmaData={List.head(state.data).lemmaData}
                                posData={List.head(state.data).posData}
                                missingPos={List.head(state.data).missingPos}
                                alpha={state.statTestAlpha}
                                pos={List.head(state.data).pos}
                                chartData={List.head(state.data).chartData}
                                viewOptions={state.viewOptions}
                            />
                        );
                    } else {
                        return state.isAltViewMode ? (
                            <div>advanced view multi-word - TODO</div>
                        ) : (
                            <MultiWordView
                                lemmaData={List.map(
                                    (v) => v.lemmaData,
                                    state.data
                                )}
                                posData={posInfo}
                                words={state.words}
                                missingPos={List.map(
                                    (v) => v.missingPos,
                                    state.data
                                )}
                            />
                        );
                    }
                })()}
            </globalComponents.TileWrapper>
        );
    };

    return GramatikatTile;
}
