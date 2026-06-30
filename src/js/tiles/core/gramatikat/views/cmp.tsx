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
import { HeatmapConfig, remapTagValueOrder, UncommonValue } from '../model.js';
import * as React from 'react';
import { List, pipe, tuple, Ident } from 'cnc-tskit';
import { GramatikatFreq, GramatikatPoS, Summary } from '../api.js';
import { gramPropTolabelGen } from '../labels.js';
import {
    attachColorIndexes,
    colIsSetAsHidden,
    HeatmapCell,
    newCell,
} from './common.js';
import { Actions } from '../actions.js';
import { Heatmap } from './heatmap.js';
import * as S from './style.js';

interface MultiWordViewProps {
    tileId: number;
    heatmapConfigs: Array<HeatmapConfig>;
    posData: {
        pos: GramatikatPoS;
        summaries: Array<Summary>;
    };
    lemmaData: Array<{
        totalFreq: number;
        variants: Array<GramatikatFreq>;
    }>;
    words: Array<string>;
    missingPos: Array<boolean>;
}

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme
): React.FC<MultiWordViewProps> {
    const globalComponents = ut.getComponents();

    // ------------------- <CmpGrammaticalOverview /> ------------------------

    const CmpGrammaticalOverview: React.FC<{
        tileId: number;
        lemmaData: Array<{
            totalFreq: number;
            variants: Array<{
                valSet: any;
                proportion: number;
                uncommonValue: UncommonValue;
            }>;
        }>;
        pos: GramatikatPoS;
        heatmapConf: HeatmapConfig;
    }> = ({ tileId, lemmaData, pos, heatmapConf }) => {
        const propPosMap = remapTagValueOrder([
            ...heatmapConf.conf.columnsProps,
            heatmapConf.conf.rowsProp,
        ]);

        const [, , variantMap] = pipe(
            lemmaData,
            List.map((v, i) => List.map((x) => tuple(i, x), v.variants)),
            List.flatMap((v) => v),
            List.filter(([i, v]) => v.proportion > 0),
            List.foldl(
                ([minVal, maxVal, mapping], [queryIdx, variant]) => {
                    const col1 =
                        variant.valSet[
                            propPosMap[heatmapConf.conf.columnsProps[0]]
                        ];
                    const col2 =
                        variant.valSet[
                            propPosMap[heatmapConf.conf.columnsProps[1]]
                        ];
                    const row = heatmapConf.conf.rowsProp
                        ? variant.valSet[propPosMap[heatmapConf.conf.rowsProp]]
                        : '';
                    const key = heatmapConf.conf.columnsProps[0]
                        ? `${queryIdx}::${col1}-${col2}-${row}`
                        : `${queryIdx}::-${col2}-${row}`;
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

        const columnTags = heatmapConf.conf.columnsTags;
        const columnLabels = List.map(
            (item, i) => (
                <span key={`${i}:${item}`}>
                    {ut.translate(
                        gramPropTolabelGen(heatmapConf.conf.columnsProps[1])(
                            item,
                            1
                        )
                    )}
                </span>
            ),
            columnTags
        );

        const xGroupedLabels = pipe(
            columnTags,
            List.map((v) => v.split('-')),
            List.groupBy((v) => v[0]),
            List.map(([v, grouped]) => ({
                v: v
                    ? ut.translate(
                          gramPropTolabelGen(heatmapConf.conf.columnsProps[0])(
                              v
                          )
                      )
                    : '',
                span: List.size(grouped),
                tag: v,
                isHidden: v
                    ? colIsSetAsHidden(heatmapConf.conf.activeGroupedColVals, v)
                    : false,
            }))
        );
        const rowTags = heatmapConf.conf.rowsTags;
        const yLabels = List.map(
            (item) =>
                ut.translate(
                    gramPropTolabelGen(heatmapConf.conf.rowsProp)(item)
                ),
            rowTags
        );
        const data: Array<Array<HeatmapCell>> = pipe(
            rowTags,
            (values) =>
                !Array.isArray(rowTags) || List.empty(rowTags) ? [''] : values,
            List.map((rowTag) =>
                List.map((columnTag) => {
                    return newCell(
                        ...pipe(
                            lemmaData,
                            List.map((item, i) => {
                                const v = variantMap.get(
                                    `${i}::${columnTag}-${rowTag}`
                                );
                                return v
                                    ? {
                                          v: v.proportion * 100,
                                          icon: v.uncommonValue,
                                          id: Ident.puid(),
                                          sortedIdx: -1,
                                      }
                                    : { v: 0, id: Ident.puid(), sortedIdx: -1 };
                            })
                        )
                    );
                }, columnTags)
            )
        );
        const colorMapping = attachColorIndexes(data, 0);

        const handleXGroupedVisibilityChng = (
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
            <globalComponents.ResponsiveWrapper
                render={(width: number, height: number) => (
                    <S.WordGrammaticalOverview>
                        <Heatmap
                            numCmpWords={List.size(lemmaData)}
                            data={data}
                            xLabels={columnLabels}
                            xGroupLabels={xGroupedLabels}
                            yLabels={yLabels}
                            colorMapping={colorMapping}
                        />
                        {heatmapConf.conf.switchableGroupColVals ? (
                            <S.GroupedAttrSelector>
                                {List.map(
                                    (lab, i) => (
                                        <li key={`${i}:${lab}`}>
                                            <label>
                                                {lab.v}
                                                <input
                                                    type="checkbox"
                                                    value={lab.tag}
                                                    checked={
                                                        heatmapConf.conf
                                                            .activeGroupedColVals[
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
                            </S.GroupedAttrSelector>
                        ) : null}
                    </S.WordGrammaticalOverview>
                )}
            />
        );
    };

    // -------------------- <MultiWordView /> ------------------------------

    const MultiWordView: React.FC<MultiWordViewProps> = ({
        tileId,
        lemmaData,
        words,
        posData,
        missingPos,
        heatmapConfigs,
    }) => {
        const activeConf = List.find((v) => v.isActive, heatmapConfigs);

        return (
            <div>
                <p>TODO - compare mode</p>
                <CmpGrammaticalOverview
                    tileId={tileId}
                    heatmapConf={activeConf}
                    lemmaData={lemmaData}
                    pos={posData.pos}
                />
            </div>
        );
    };

    return MultiWordView;
}
