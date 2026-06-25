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
import {
    getHeatmapConfList,
    GramatikatModel,
    HeatmapConfig,
    remapTagValueOrder,
    UncommonValue,
    WordData,
} from '../model.js';
import {
    CoreTileComponentProps,
    TileComponent,
} from '../../../../page/tile.js';
import * as React from 'react';
import { Ident, List, pipe, tuple } from 'cnc-tskit';
import { init as multiWordViewInit } from './cmp.js';
import * as S from './style.js';
import { GramatikatFreq, GramatikatPoS } from '../api.js';
import { Heatmap } from './heatmap.js';
import { Actions } from '../actions.js';
import {
    attachColorIndexes,
    colIsSetAsHidden,
    HeatmapCell,
    HeatmapCellVal,
    newCell,
} from './common.js';
import { gramPropTolabelGen } from '../labels.js';

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

    const devToIcon = (v: GramatikatFreq): HeatmapCellVal['icon'] => {
        if (v.uncommonValue === 'over') {
            return 'up';
        }
        if (v.uncommonValue === 'under') {
            return 'down';
        }
        return undefined;
    };

    // ------------------- <WordGrammaticalOverview /> ------------------------

    const WordGrammaticalOverview: React.FC<{
        tileId: number;
        lemmaData: {
            totalFreq: number;
            variants: Array<{
                valSet: any;
                proportion: number;
                uncommonValue: UncommonValue;
            }>;
        };
        pos: GramatikatPoS;
        heatmapConf: HeatmapConfig;
    }> = ({ tileId, lemmaData, pos, heatmapConf }) => {
        const propPosMap = remapTagValueOrder([
            ...heatmapConf.conf.columnsProps,
            heatmapConf.conf.rowsProp,
        ]);

        const [, , variantMap] = pipe(
            lemmaData.variants,
            List.filter((v) => v.proportion > 0),
            List.foldl(
                ([minVal, maxVal, mapping], variant) => {
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
                        ? `${col1}-${col2}-${row}`
                        : `-${col2}-${row}`;
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
                    const v = variantMap.get(`${columnTag}-${rowTag}`);
                    return v
                        ? newCell({
                              v: v.proportion * 100,
                              icon: devToIcon(v),
                              id: Ident.puid(),
                              sortedIdx: -1,
                          })
                        : newCell({ v: 0, id: Ident.puid(), sortedIdx: -1 });
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
                            data={data}
                            xLabels={columnLabels}
                            xGroupLabels={xGroupedLabels}
                            yLabels={yLabels}
                            colorMapping={colorMapping}
                        />
                        {heatmapConf.conf.switchableGroupColVals ? (
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
                            </ul>
                        ) : null}
                    </S.WordGrammaticalOverview>
                )}
            />
        );
    };

    // ------------------- <AttrSetSwitch /> -------------------------

    const AttrSetSwitch: React.FC<{
        tileId: number;
        hmConfigs: Array<HeatmapConfig>;
        pos: GramatikatPoS;
    }> = ({ tileId, hmConfigs, pos }) => {
        const handleClick = (idx: number) => () => {
            dispatcher.dispatch(Actions.SelectAttrSet, {
                tileId,
                pos,
                idx,
            });
        };

        return (
            <S.AttrSetSwitch>
                {List.map(
                    (conf, i) => (
                        <li key={conf.conf.label}>
                            <a
                                className={conf.isActive ? 'active' : null}
                                onClick={handleClick(i)}
                            >
                                {ut.translate(conf.conf.label)}
                            </a>
                        </li>
                    ),
                    hmConfigs
                )}
            </S.AttrSetSwitch>
        );
    };

    // ------------------- <SingleWordView /> ------------------------

    const SingleWordView: React.FC<
        WordData & {
            tileId: number;
            heatmapConfigs: Array<HeatmapConfig>;
        }
    > = ({ tileId, lemmaData, pos, heatmapConfigs }) => {
        const activeConf = List.find((v) => v.isActive, heatmapConfigs);
        return (
            <S.SingleWordView>
                <div className="visualisation">
                    <AttrSetSwitch
                        hmConfigs={heatmapConfigs}
                        pos={pos}
                        tileId={tileId}
                    />
                    <div className="sep" />
                    <div className="heatm">
                        <WordGrammaticalOverview
                            tileId={tileId}
                            lemmaData={lemmaData}
                            pos={pos}
                            heatmapConf={activeConf}
                        />
                    </div>
                </div>
                <p className="note">
                    {ut.translate('gramatikat__showing_stat_signif_values')}
                </p>
            </S.SingleWordView>
        );
    };

    // ---------------- <PosWarning /> -------------------------------------

    const PosWarning: React.FC<{ message: string }> = ({ message }) => (
        <S.PosWarning className="pos-warning">
            <img
                className="bulb"
                src={ut.createStaticUrl('lightbulb-blue.svg')}
                alt="light bulb"
            />
            <p>{message}</p>
        </S.PosWarning>
    );

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
                hasData={!List.empty(state.data) || !!state.message}
                sourceIdent={{ corp: state.corpname }}
                backlink={state.backlinks}
                supportsTileReload={props.supportsReloadOnError}
                isSubtileContainer={props.isSubtileContainer}
                issueReportingUrl={props.issueReportingUrl}
            >
                <globalComponents.Subtile
                    tileId={props.tileId}
                    sourceIdent={{ corp: state.corpname }}
                    backlink={state.backlinks}
                    setMaxHeight={true}
                    isBusy={state.isBusy}
                    hasData={!List.empty(state.data) || !!state.message}
                >
                    {props.tileHeader}

                    {state.isTweakMode ? (
                        <Settings tileId={props.tileId} />
                    ) : null}
                    {(() => {
                        if (state.message) {
                            return <PosWarning message={state.message} />;
                        }
                        if (List.empty(state.data)) {
                            return null;
                        }
                        if (List.size(state.data) === 1) {
                            const heatmapConfigs = getHeatmapConfList(
                                state.viewOptions,
                                List.head(state.data).pos
                            );
                            return state.isAltViewMode ? (
                                <AltViewSingle
                                    lemmaData={List.head(state.data).lemmaData}
                                    posData={List.head(state.data).posData}
                                    missingPos={
                                        List.head(state.data).missingPos
                                    }
                                    pos={List.head(state.data).pos}
                                />
                            ) : (
                                <SingleWordView
                                    tileId={props.tileId}
                                    lemmaData={List.head(state.data).lemmaData}
                                    posData={List.head(state.data).posData}
                                    missingPos={
                                        List.head(state.data).missingPos
                                    }
                                    pos={List.head(state.data).pos}
                                    heatmapConfigs={heatmapConfigs}
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
                </globalComponents.Subtile>
                <globalComponents.Subtile
                    tileId={props.tileId}
                    heading={'Grammatical categories and word forms note'}
                    isBusy={false}
                    hasData={true}
                >
                    <p>
                        The relationship between the two tiles is{' '}
                        <strong>as follows ...</strong>
                    </p>
                </globalComponents.Subtile>
            </globalComponents.TileWrapper>
        );
    };

    return GramatikatTile;
}
