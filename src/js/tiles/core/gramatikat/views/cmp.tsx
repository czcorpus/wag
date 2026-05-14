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
import { GramatikatModel } from '../model.js';
import {
    CoreTileComponentProps,
    TileComponent,
} from '../../../../page/tile.js';
import * as React from 'react';
import { List, Maths, Dict, pipe, tuple } from 'cnc-tskit';
import {
    Bar,
    BarChart,
    Legend,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ValueType } from 'recharts/types/component/DefaultTooltipContent.js';
import {
    GramatikatCase,
    GramatikatFreq,
    GramatikatNumber,
    Histogram,
} from '../api.js';

interface MultiWordViewProps {
    posData: {
        binEdges: Array<number>;
        histograms: Array<Histogram>;
    };
    lemmaData: Array<{
        totalFreq: number;
        variants: Array<GramatikatFreq>;
    }>;
    words: Array<string>;
}

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme
): React.FC<MultiWordViewProps> {
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

    // Transform data for radar chart
    // Each data point represents one grammatical case with proportions from all words
    const transformDataForRadar = (
        lemmaDataArray: Array<{
            totalFreq: number;
            variants: Array<GramatikatFreq>;
        }>
    ) => {
        // For each case (1-7), create a data point with values from all words
        const cases = ['1', '2', '3', '4', '5', '6', '7'];

        return List.map((caseNum) => {
            const dataPoint: any = {
                case: getCaseName(caseNum),
            };

            // For each word (lemmaData), get the total proportion for this case
            // (sum of singular and plural), converted to percentage (0-100)
            List.forEach((lemmaData, wordIdx) => {
                const variantsMap = Dict.fromEntries(
                    List.map(
                        (item) => [item.valSet.join(''), item.proportion],
                        lemmaData.variants
                    )
                );

                const singularKey = `S${caseNum}`;
                const pluralKey = `P${caseNum}`;
                const totalProportion =
                    (variantsMap[singularKey] || 0) +
                    (variantsMap[pluralKey] || 0);

                // Convert to percentage (0-100)
                dataPoint[`word${wordIdx}`] = totalProportion * 100;
            }, lemmaDataArray);

            return dataPoint;
        }, cases);
    };

    // -------------------- <SlotHistogram /> ------------------------------

    const SlotHistogram: React.FC<{
        hist: Histogram;
        binEdges: Array<number>;
        proportions: Array<number>;
        words: Array<string>;
    }> = ({ hist, binEdges, proportions, words }) => {
        const data = List.map(
            (count, i) => ({
                pos: binEdges[i],
                count,
            }),
            hist.histogram
        );

        // Find which bin each word's proportion falls into
        const proportionBinIndices = List.map(
            (proportion) =>
                List.findIndex(
                    (edge, i) =>
                        i < binEdges.length - 1 &&
                        proportion >= edge &&
                        proportion < binEdges[i + 1],
                    binEdges
                ),
            proportions
        );

        const CustomBar = (props: any) => {
            const { x, y, width, height, index } = props;

            return (
                <g>
                    <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={theme.categoryColor(0)}
                    />
                    {List.map(
                        (wordIdx) => {
                            const shouldShowCircle =
                                proportionBinIndices[wordIdx] === index;
                            if (!shouldShowCircle) {
                                return null;
                            }
                            // Offset circles vertically for multiple words
                            const yOffset = -4 - wordIdx * 6;
                            return (
                                <circle
                                    key={wordIdx}
                                    cx={x + width / 2}
                                    cy={y + yOffset}
                                    r={2}
                                    fill={theme.categoryColor(wordIdx)}
                                />
                            );
                        },
                        List.range(0, List.size(words))
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

    // -------------------- <MultiWordView /> ------------------------------

    const MultiWordView: React.FC<MultiWordViewProps> = ({
        lemmaData,
        words,
        posData,
    }) => {
        const radarData = transformDataForRadar(lemmaData);
        const wordCount = List.size(lemmaData);
        // Calculate the maximum value across all data points for dynamic scaling
        const maxValue = pipe(
            radarData,
            List.flatMap((dataPoint) =>
                List.map(
                    (idx) => dataPoint[`word${idx}`] || 0,
                    List.range(0, wordCount)
                )
            ),
            List.reduce((max: number, val: number) => Math.max(max, val), 0)
        );

        // Round up to a nice number for better axis labels
        const roundedMax = Math.ceil(maxValue / 10) * 10;
        const domainMax = Math.max(roundedMax, 10); // Ensure minimum of 10

        // Create proportion maps for each word
        const proportionMaps = List.map(
            (lemmaDataItem) =>
                Dict.fromEntries(
                    List.map(
                        (v) => tuple(v.valSet.join(''), v.proportion),
                        lemmaDataItem.variants
                    )
                ),
            lemmaData
        );

        return (
            <div>
                <div style={{ width: '100%', height: 500 }}>
                    <ResponsiveContainer>
                        <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="case" />
                            <PolarRadiusAxis
                                angle={90}
                                domain={[0, domainMax]}
                                tickFormatter={(value: any) =>
                                    typeof value === 'number'
                                        ? `${Maths.roundToPos(value, 1)}%`
                                        : String(value)
                                }
                            />
                            <Tooltip
                                formatter={(value: ValueType) =>
                                    typeof value === 'number'
                                        ? `${Maths.roundToPos(value, 2)}%`
                                        : value
                                }
                            />
                            <Legend />
                            {List.map(
                                (idx) => (
                                    <Radar
                                        key={`word${idx}`}
                                        name={words[idx]}
                                        dataKey={`word${idx}`}
                                        stroke={theme.categoryColor(idx)}
                                        fill={theme.categoryColor(idx)}
                                        fillOpacity={0.3}
                                    />
                                ),
                                List.range(0, wordCount)
                            )}
                        </RadarChart>
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
                            List.map((hist) =>
                                tuple(
                                    hist,
                                    List.map(
                                        (propMap) =>
                                            propMap[hist.valSet.join('')] || 0,
                                        proportionMaps
                                    )
                                )
                            ),
                            List.filter(([hist, proportions]) => {
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
                                // Check if at least one word is not in the largest bin
                                return List.some((proportion) => {
                                    const actualBinIdx = List.findIndex(
                                        (edge, i) =>
                                            proportion >= edge &&
                                            proportion <
                                                posData.binEdges[i + 1],
                                        posData.binEdges
                                    );
                                    return actualBinIdx !== maxIdx;
                                }, proportions);
                            }),
                            List.map(([hist, proportions]) => (
                                <SlotHistogram
                                    key={hist.valSet.join('')}
                                    hist={hist}
                                    binEdges={posData.binEdges}
                                    proportions={proportions}
                                    words={words}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>
        );
    };

    return MultiWordView;
}
