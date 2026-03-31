/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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
import * as React from 'react';

import { IActionDispatcher, ViewUtils, useModel } from 'kombo';
import { GlobalComponents } from '../../../views/common/index.js';
import { WordFormsModel } from './model.js';
import { TileComponent, CoreTileComponentProps } from '../../../page/tile.js';
import { init as wcloudViewInit } from '../../../views/wordCloud/index.js';
import { Theme } from '../../../page/theme.js';
import { List } from 'cnc-tskit';
import { WordFormItem } from './common.js';
import * as S from './style.js';

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme,
    model: WordFormsModel
): TileComponent {
    const globalComponents = ut.getComponents();
    const WordCloud = wcloudViewInit<WordFormItem>(dispatcher, ut, theme);

    // -------------- <TableView /> -------------------------------------

    const TableView: React.FC<{
        roundToPos: number;
        data: Array<WordFormItem>;
    }> = (props) => {
        const extFormatNum = (x: number, pos: number) => {
            if (x < 10 ** -props.roundToPos) {
                return '~0';
            }
            return ut.formatNumber(x, pos);
        };
        return (
            <table className="data">
                <thead>
                    <tr>
                        <th>{ut.translate('wordforms__table_th_form')}</th>
                        <th>{ut.translate('wordforms__table_th_abs')}</th>
                        <th>{ut.translate('wordforms__table_th_share')}</th>
                    </tr>
                </thead>
                <tbody>
                    {List.map(
                        (row, i) => (
                            <tr key={`${i}:${row.value}`}>
                                <td>{row.value}</td>
                                <td className="num">
                                    {ut.formatNumber(row.freq)}
                                </td>
                                <td className="num">
                                    {extFormatNum(row.ratio, props.roundToPos)}%
                                </td>
                            </tr>
                        ),
                        props.data
                    )}
                </tbody>
            </table>
        );
    };

    const WordFormsView: React.FC<CoreTileComponentProps> = (props) => {
        const state = useModel(model);

        const dataTransform = (v: WordFormItem) => ({
            text: v.value,
            value: v.freq,
            tooltip: [
                {
                    label: ut.translate('wordforms__item_ratio'),
                    value: v.ratio,
                    unit: '%',
                    round: state.roundToPos,
                },
            ],
            interactionId: null,
        });

        return (
            <globalComponents.TileWrapper
                tileId={props.tileId}
                isBusy={state.isBusy}
                error={state.error}
                hasData={state.data.length > 0}
                sourceIdent={{ corp: state.corpname }}
                supportsTileReload={props.supportsReloadOnError}
                issueReportingUrl={props.issueReportingUrl}
                backlink={state.backlink}
            >
                <S.WordFormView>
                    <div className="data-view">
                        {state.isAltViewMode ? (
                            <TableView
                                data={state.data}
                                roundToPos={state.roundToPos}
                            />
                        ) : (
                            <globalComponents.ResponsiveWrapper
                                minWidth={props.isMobile ? undefined : 250}
                                widthFract={props.widthFract}
                                render={(width: number, height: number) => (
                                    <WordCloud
                                        width={width}
                                        height={height}
                                        data={state.data}
                                        isMobile={props.isMobile}
                                        font={theme.infoGraphicsFont}
                                        dataTransform={dataTransform}
                                    />
                                )}
                            />
                        )}
                    </div>
                    {state.rareVariantsRemoved ? (
                        <p className="rare-items-warning">
                            (
                            {ut.translate('wordforms__rare_items_were_removed')}
                            )
                        </p>
                    ) : null}
                </S.WordFormView>
            </globalComponents.TileWrapper>
        );
    };

    return WordFormsView;
}
