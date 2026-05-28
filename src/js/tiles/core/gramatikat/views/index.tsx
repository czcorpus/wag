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
import { GramatikatModel, WordData } from '../model.js';
import {
    CoreTileComponentProps,
    TileComponent,
} from '../../../../page/tile.js';
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
import { init as multiWordViewInit } from './cmp.js';
import * as S from './style.js';

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme,
    model: GramatikatModel
): TileComponent {
    const globalComponents = ut.getComponents();
    const MultiWordView = multiWordViewInit(dispatcher, ut, theme);
    const AltViewSingle = altViewSingleInit(dispatcher, ut, theme, model);

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
            <S.SingleWordView>
                <h2>
                    {ut.translate('gramatikat__significant_deviations_heading')}
                </h2>
                <table className="data">
                    <tbody>
                        {List.map(
                            (item) => (
                                <tr>
                                    <td>{item.tag}</td>
                                    <td className="icon">
                                        {item.value > item.mean ? (
                                            <span className="up">
                                                {'\u25B2'}
                                            </span>
                                        ) : (
                                            <span className="down">
                                                {'\u25BC'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ),
                            chartData.items
                        )}
                    </tbody>
                </table>
                <p>{message}</p>
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
                                lemmaData={List.head(state.data).lemmaData}
                                posData={List.head(state.data).posData}
                                missingPos={List.head(state.data).missingPos}
                                alpha={state.statTestAlpha}
                                pos={List.head(state.data).pos}
                                chartData={List.head(state.data).chartData}
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
