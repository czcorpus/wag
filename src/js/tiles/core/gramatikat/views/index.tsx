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
import { GramatikatModel, WordData } from '../model.js';
import {
    CoreTileComponentProps,
    TileComponent,
} from '../../../../page/tile.js';
import * as React from 'react';
import { List, Dict, pipe, tuple, Maths } from 'cnc-tskit';
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
import {
    GramatikatCase,
    GramatikatFreq,
    GramatikatNumber,
    GramatikatPoS,
    Summary,
    Tag,
    tagCodeToHuman,
} from '../api.js';
import { init as multiWordViewInit } from './cmp.js';

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme,
    model: GramatikatModel
): TileComponent {
    const globalComponents = ut.getComponents();
    const MultiWordView = multiWordViewInit(dispatcher, ut, theme);

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

    // ------------------- <SingleWordView /> ------------------------

    const SingleWordView: React.FC<WordData & { alpha: number }> = ({
        lemmaData,
        posData,
        chartData,
        missingPos,
        pos,
        alpha,
    }) => {
        const message = chartData.hasSignificantDeviations
            ? ut.translate('gramatikat__showing_stat_signif_values')
            : ut.translate('gramatikat__there_are_no_stat_signif_values');

        return (
            <div>
                <p>{message}</p>
                <div style={{ width: '80%', height: 600 }}>
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
                {!List.empty(state.data) ? (
                    List.size(state.data) === 1 ? (
                        <SingleWordView
                            lemmaData={List.head(state.data).lemmaData}
                            posData={List.head(state.data).posData}
                            missingPos={List.head(state.data).missingPos}
                            alpha={state.statTestAlpha}
                            pos={List.head(state.data).pos}
                            chartData={List.head(state.data).chartData}
                        />
                    ) : (
                        <MultiWordView
                            lemmaData={List.map((v) => v.lemmaData, state.data)}
                            posData={posInfo}
                            words={state.words}
                            missingPos={List.map(
                                (v) => v.missingPos,
                                state.data
                            )}
                        />
                    )
                ) : null}
            </globalComponents.TileWrapper>
        );
    };

    return GramatikatTile;
}
