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
import {
    GramatikatModel,
    HeatmapConfig,
    remapTagValueOrder,
    WordData,
} from '../model.js';
import * as React from 'react';
import { List, pipe } from 'cnc-tskit';
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
import { Actions } from '../actions.js';
import { colIsSetAsHidden } from './common.js';
import { gramPropTolabelGen } from '../labels.js';
import { GramatikatPoS } from '../api.js';
import * as S from './style.js';

type SAVProps = WordData & {
    tileId: number;
    advancedViewUncommonOnly: boolean;
    heatmapConfigs: Array<HeatmapConfig>;
};

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme,
    model: GramatikatModel
): React.FC<SAVProps> {
    const globalComponents = ut.getComponents();

    // --------------- <AttrValSelectionItem /> --------------------------

    const AttrValSelectionItem: React.FC<{
        tileId: number;
        pos: GramatikatPoS;
        heatmapConf: HeatmapConfig;
        groupKey: string;
    }> = ({ tileId, pos, heatmapConf, groupKey }) => {
        const handleGroupVisibilityChange = (
            evt: React.ChangeEvent<HTMLInputElement>
        ) => {
            dispatcher.dispatch(Actions.SetXGroupedVisibility, {
                tileId,
                tag: evt.target.value,
                pos,
                visible:
                    !heatmapConf.conf.activeGroupedColVals[evt.target.value],
            });
        };

        return (
            <label>
                {ut.translate(
                    gramPropTolabelGen(heatmapConf.conf.columnsProps[0])(
                        groupKey
                    )
                )}
                <input
                    type="checkbox"
                    value={groupKey}
                    checked={!!heatmapConf.conf.activeGroupedColVals[groupKey]}
                    onChange={handleGroupVisibilityChange}
                />
            </label>
        );
    };

    // --------------- <AdvancedViewUncommonOnlySelector /> --------------------

    const AdvancedViewUncommonOnlySelector: React.FC<{
        tileId: number;
        selected: boolean;
    }> = ({ tileId, selected }) => {
        const handleChange = () => {
            dispatcher.dispatch(Actions.ToggleAdvancedViewUncommonOnly, {
                tileId,
                value: !selected,
            });
        };

        return (
            <S.AdvancedViewUncommonOnlySelector>
                <li>
                    <label>
                        {ut.translate('gramatikat__only_significant_items_sel')}
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={handleChange}
                        />
                    </label>
                </li>
            </S.AdvancedViewUncommonOnlySelector>
        );
    };

    // --------------- <SingleWordAdvancedView /> --------------------------

    const SingleWordAdvancedView: React.FC<SAVProps> = ({
        lemmaData,
        pos,
        tileId,
        heatmapConfigs,
        advancedViewUncommonOnly,
    }) => {
        const activeConf = List.find((v) => v.isActive, heatmapConfigs);

        const propPosMap = remapTagValueOrder([
            ...activeConf.conf.columnsProps,
            activeConf.conf.rowsProp,
        ]);

        // Group variants by the first column property to enable filtering
        const groupedVariants = pipe(
            lemmaData.variants.filter((v) => v['mean'] !== undefined),
            List.groupBy((v) => {
                return v.valSet[propPosMap[activeConf.conf.columnsProps[0]]];
            })
        );

        // Filter variants based on active grouped column values
        const filteredVariants = activeConf?.conf.switchableGroupColVals
            ? pipe(
                  groupedVariants,
                  List.filter(
                      ([groupKey]) =>
                          !colIsSetAsHidden(
                              activeConf.conf.activeGroupedColVals,
                              groupKey
                          )
                  ),
                  List.flatMap(([, variants]) => variants),
                  advancedViewUncommonOnly
                      ? List.filter((v) => v.uncommonValue !== 'none')
                      : (x) => x
              )
            : lemmaData.variants.filter((v) => v['mean'] !== undefined);

        return (
            <S.SingleWordAdvancedView>
                {activeConf?.conf.switchableGroupColVals ? (
                    <S.GroupedAttrSelector>
                        {List.map(
                            ([groupKey], i) => (
                                <li key={`${i}:${groupKey}`}>
                                    <AttrValSelectionItem
                                        tileId={tileId}
                                        groupKey={groupKey}
                                        heatmapConf={activeConf}
                                        pos={pos}
                                    />
                                </li>
                            ),
                            groupedVariants
                        )}
                    </S.GroupedAttrSelector>
                ) : null}
                <AdvancedViewUncommonOnlySelector
                    tileId={tileId}
                    selected={advancedViewUncommonOnly}
                />
                <globalComponents.ResponsiveWrapper
                    render={(width: number, height: number) => (
                        <S.AdvancedChart $maxHeight={`${height}px`}>
                            <ComposedChart
                                layout="vertical"
                                data={filteredVariants}
                                margin={{
                                    top: 35,
                                    right: 50,
                                    left: 100,
                                    bottom: 10,
                                }}
                                height={50 + 55 * List.size(filteredVariants)}
                                width={width}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 'dataMax']} />
                                <YAxis
                                    type="category"
                                    dataKey="readableTag"
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
                                            <span
                                                style={{ marginRight: '20px' }}
                                            >
                                                <span
                                                    style={{
                                                        display: 'inline-block',
                                                        width: '30px',
                                                        height: '3px',
                                                        backgroundColor:
                                                            '#8884d8',
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
                                                        backgroundColor:
                                                            '#ff7300',
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
                                    dataKey="proportion"
                                    fill="#ff7300"
                                    shape="circle"
                                />
                            </ComposedChart>
                        </S.AdvancedChart>
                    )}
                />
            </S.SingleWordAdvancedView>
        );
    };

    return SingleWordAdvancedView;
}
