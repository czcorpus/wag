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
import { Theme } from '../../../page/theme.js';
import { GlobalComponents } from '../../../views/common/index.js';
import { GramatikatModel } from './model.js';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import * as React from 'react';
import { List, Maths, Dict, pipe, tuple } from 'cnc-tskit';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ValueType } from 'recharts/types/component/DefaultTooltipContent.js';
import { GramatikatCase, GramatikatNumber, Histogram } from './api.js';

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme,
    model: GramatikatModel
): TileComponent {
    const globalComponents = ut.getComponents();

    // Convert case number to grammatical case name
    const getCaseName = (caseNum: string): string => {
        const caseNames: { [key: string]: string } = {
            '1': 'Nominative',
            '2': 'Genitive',
            '3': 'Dative',
            '4': 'Accusative',
            '5': 'Vocative',
            '6': 'Locative',
            '7': 'Instrumental',
        };
        return caseNames[caseNum] || `Case ${caseNum}`;
    };

    const casenumToCzech = (v: string) => {
        return (
            {
                S1: '1. pád j. č.',
                S2: '2. pád j. č.',
                S3: '3. pád j. č.',
                S4: '4. pád j. č.',
                S5: '5. pád j. č.',
                S6: '6. pád j. č.',
                S7: '7. pád j. č.',

                P1: '1. pád mn. č.',
                P2: '2. pád mn. č.',
                P3: '3. pád mn. č.',
                P4: '4. pád mn. č.',
                P5: '5. pád mn. č.',
                P6: '6. pád mn. č.',
                P7: '7. pád mn. č.',
            }[v] || '-'
        );
    };

    // Transform data into format suitable for stacked bar chart
    // Pairs singular (S) and plural (P) forms for each case (1-7)
    const transformDataForChart = (
        variants: Array<{
            valSet: [GramatikatNumber, GramatikatCase];
            proportion: number;
        }>
    ) => {
        const dataMap = Dict.fromEntries(
            List.map(
                (item) => [item.valSet.join(''), item.proportion],
                variants
            )
        );

        return List.map(
            (caseNum) => ({
                case: getCaseName(caseNum),
                singular: dataMap[`S${caseNum}`] || 0,
                plural: dataMap[`P${caseNum}`] || 0,
            }),
            ['1', '2', '3', '4', '5', '6', '7']
        );
    };

    const SlotHistogram: React.FC<{
        hist: Histogram;
        binEdges: Array<number>;
        proportion: number;
    }> = ({ hist, binEdges, proportion }) => {
        const data = List.map(
            (count, i) => ({
                pos: binEdges[i],
                count,
            }),
            hist.histogram
        );

        // Find which bin the actual proportion value falls into
        const proportionBinIdx = List.findIndex(
            (edge, i) =>
                i < binEdges.length - 1 &&
                proportion >= edge &&
                proportion < binEdges[i + 1],
            binEdges
        );

        const CustomBar = (props: any) => {
            const { x, y, width, height, index } = props;
            const shouldShowCircle = index === proportionBinIdx;

            return (
                <g>
                    <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={theme.categoryColor(0)}
                    />
                    {shouldShowCircle && (
                        <circle
                            cx={x + width / 2}
                            cy={y - 4}
                            r={2}
                            fill={theme.colorLogoPink}
                        />
                    )}
                </g>
            );
        };

        return (
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'normal', fontSize: '0.75em' }}>
                    {casenumToCzech(hist.valSet.join(''))}
                </div>
                <BarChart
                    width={160}
                    height={110}
                    data={data}
                    margin={{ top: 14, right: 4, left: -10, bottom: 2 }}
                >
                    <XAxis
                        dataKey="pos"
                        tick={{ fontSize: 8 }}
                        interval="preserveStartEnd"
                        tickFormatter={(value) =>
                            typeof value === 'number'
                                ? Maths.roundToPos(value, 2).toString()
                                : value
                        }
                        label={{
                            value: 'position',
                            offset: -2,
                            position: 'insideBottom',
                            fontSize: 8,
                        }}
                    />
                    <YAxis
                        tick={{ fontSize: 8 }}
                        width={50}
                        tickFormatter={(value) =>
                            typeof value === 'number'
                                ? String(Math.round(value * 10) / 10)
                                : value
                        }
                    />
                    <Tooltip
                        formatter={(value: ValueType) =>
                            typeof value === 'number'
                                ? Maths.roundToPos(value, 3)
                                : value
                        }
                    />
                    <Bar
                        dataKey="count"
                        fill={theme.categoryColor(0)}
                        shape={CustomBar}
                    />
                </BarChart>
            </div>
        );
    };

    const GramatikatTile: React.FC<CoreTileComponentProps> = (props) => {
        const state = useModel(model);
        // TODO - currently we only work with the first dataset item (i.e. no frameCatSet)

        const lemmaData = List.head(state.lemmaData);
        const posData = List.head(state.posData);
        const chartData = transformDataForChart(lemmaData.variants);

        const proportionMap = Dict.fromEntries(
            List.map(
                (v) => tuple(v.valSet.join(''), v.proportion),
                lemmaData.variants
            )
        );

        return (
            <globalComponents.TileWrapper
                tileId={props.tileId}
                isBusy={state.isBusy}
                error={state.error}
                hasData={!List.empty(lemmaData.variants)}
                sourceIdent={{ corp: state.corpname }}
                backlink={state.backlinks}
                supportsTileReload={props.supportsReloadOnError}
                issueReportingUrl={props.issueReportingUrl}
            >
                <div style={{ width: '100%', height: 450 }}>
                    <ResponsiveContainer>
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{
                                top: 20,
                                right: 30,
                                left: 100,
                                bottom: 50,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                type="number"
                                label={{
                                    value: 'Proportion',
                                    position: 'insideBottom',
                                    offset: -10,
                                }}
                            />
                            <YAxis type="category" dataKey="case" />
                            <Tooltip
                                formatter={(value: ValueType) =>
                                    typeof value === 'number'
                                        ? Maths.roundToPos(value, 3)
                                        : value
                                }
                            />
                            <Legend
                                verticalAlign="bottom"
                                wrapperStyle={{ paddingTop: '20px' }}
                            />
                            <Bar
                                dataKey="singular"
                                stackId="a"
                                fill={theme.categoryColor(0)}
                                name="Singular"
                            />
                            <Bar
                                dataKey="plural"
                                stackId="a"
                                fill={theme.categoryColor(1)}
                                name="Plural"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {!List.empty(posData.histograms) && (
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            justifyContent: 'center',
                            marginTop: '1.5em',
                            padding: '0 8px',
                        }}
                    >
                        {pipe(
                            posData.histograms,
                            List.map((v) =>
                                tuple(v, proportionMap[v.valSet.join('')] || 0)
                            ),
                            List.filter(([hist, proportion]) => {
                                // Find the bin with maximum count
                                const maxIdx = List.empty(hist.histogram)
                                    ? -1
                                    : List.reduce(
                                          (best, count, i) =>
                                              count > hist.histogram[best]
                                                  ? i
                                                  : best,
                                          0,
                                          hist.histogram
                                      );
                                // Find which bin the actual proportion falls into
                                const actualBinIdx = List.findIndex(
                                    (edge, i) =>
                                        proportion >= edge &&
                                        proportion < posData.binEdges[i + 1],
                                    posData.binEdges
                                );
                                return actualBinIdx !== maxIdx;
                            }),
                            List.map(([hist, proportion]) => (
                                <SlotHistogram
                                    key={hist.valSet.join('')}
                                    hist={hist}
                                    binEdges={posData.binEdges}
                                    proportion={proportion}
                                />
                            ))
                        )}
                    </div>
                )}
            </globalComponents.TileWrapper>
        );
    };

    return GramatikatTile;
}
