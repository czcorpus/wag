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
import { List, Maths, Dict } from 'cnc-tskit';
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

    // Transform data into format suitable for stacked bar chart
    // Pairs singular (S) and plural (P) forms for each case (1-7)
    const transformDataForChart = (
        variants: Array<{ value: string; proportion: number }>
    ) => {
        const dataMap = Dict.fromEntries(
            List.map((item) => [item.value, item.proportion], variants)
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

    const GramatikatTile: React.FC<CoreTileComponentProps> = (props) => {
        const state = useModel(model);
        const chartData = transformDataForChart(state.data.variants);

        return (
            <globalComponents.TileWrapper
                tileId={props.tileId}
                isBusy={state.isBusy}
                error={state.error}
                hasData={!List.empty(state.data.variants)}
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
            </globalComponents.TileWrapper>
        );
    };

    return GramatikatTile;
}
