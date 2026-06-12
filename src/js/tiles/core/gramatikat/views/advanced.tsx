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

import { IActionDispatcher, ViewUtils } from 'kombo';
import { Theme } from '../../../../page/theme.js';
import { GlobalComponents } from '../../../../views/common/index.js';
import { GramatikatModel, WordData } from '../model.js';
import * as React from 'react';
import { List } from 'cnc-tskit';
import {
    CartesianGrid,
    ComposedChart,
    Legend,
    ResponsiveContainer,
    Scatter,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ValueType } from 'recharts/types/component/DefaultTooltipContent.js';

type SAVProps = WordData & { alpha: number };

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme,
    model: GramatikatModel
): React.FC<SAVProps> {
    const globalComponents = ut.getComponents();

    const SingleWordAdvancedView: React.FC<SAVProps> = ({
        lemmaData,
        posData,
        chartData,
        missingPos,
        pos,
        alpha,
    }) => {
        return (
            <div>
                <div
                    style={{
                        width: '80%',
                        height: 100 + 80 * List.size(chartData.items),
                    }}
                >
                    <ResponsiveContainer>
                        <ComposedChart
                            layout="vertical"
                            data={chartData.items}
                            margin={{
                                top: 35,
                                right: 50,
                                left: 100,
                                bottom: 10,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 'auto']} />
                            <YAxis
                                type="category"
                                dataKey="tag"
                                width={150}
                                padding={{ top: 20, bottom: 20 }}
                            />
                            <Tooltip
                                formatter={(value: ValueType) =>
                                    typeof value === 'number'
                                        ? value.toFixed(4)
                                        : value
                                }
                            />
                            <Legend
                                content={() => (
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            marginBottom: '10px',
                                        }}
                                    >
                                        <span style={{ marginRight: '20px' }}>
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '30px',
                                                    height: '3px',
                                                    backgroundColor: '#8884d8',
                                                    verticalAlign: 'middle',
                                                    marginRight: '5px',
                                                }}
                                            ></span>
                                            mean frequency in the category
                                        </span>
                                        <span>
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '10px',
                                                    height: '10px',
                                                    backgroundColor: '#ff7300',
                                                    borderRadius: '50%',
                                                    verticalAlign: 'middle',
                                                    marginRight: '5px',
                                                }}
                                            ></span>
                                            form observed frequency
                                        </span>
                                    </div>
                                )}
                            />
                            {/* Line for mean value */}
                            <Scatter
                                dataKey="mean"
                                fill="#8884d8"
                                shape={(props: any) => {
                                    const { cx, cy } = props;
                                    return (
                                        <line
                                            x1={cx}
                                            y1={cy - 15}
                                            x2={cx}
                                            y2={cy + 15}
                                            stroke="#8884d8"
                                            strokeWidth={5}
                                        />
                                    );
                                }}
                            />
                            {/* Dot for actual frequency */}
                            <Scatter
                                dataKey="value"
                                fill="#ff7300"
                                shape="circle"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return SingleWordAdvancedView;
}
