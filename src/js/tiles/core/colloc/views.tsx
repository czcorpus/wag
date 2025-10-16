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
import { IActionDispatcher, useModel, ViewUtils } from 'kombo';
import * as React from 'react';

import { Theme } from '../../../page/theme.js';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';
import { Actions, DataHeading, DataRow, SrchContextType } from './common.js';
import { CollocModel } from './model.js';
import { init as wcloudViewInit } from '../../../views/wordCloud/index.js';
import { List } from 'cnc-tskit';

import * as S from './style.js';

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme,
    model: CollocModel
): TileComponent {
    const globalCompontents = ut.getComponents();
    const WordCloud = wcloudViewInit<DataRow>(dispatcher, ut, theme);

    // -------------- <Controls /> -------------------------------------

    const Controls: React.FC<{
        tileId: number;
        value: SrchContextType;
    }> = (props) => {
        const handleChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch<typeof Actions.SetSrchContextType>({
                name: Actions.SetSrchContextType.name,
                payload: {
                    tileId: props.tileId,
                    ctxType: evt.target.value as SrchContextType,
                },
            });
        };

        return (
            <form className="Controls wag-form tile-tweak">
                <label>
                    {ut.translate('collocations__search_in_context_label')}
                    :{' '}
                </label>
                <select value={props.value} onChange={handleChange}>
                    <option value={SrchContextType.LEFT}>
                        {ut.translate('collocations__context_left')}
                    </option>
                    <option value={SrchContextType.RIGHT}>
                        {ut.translate('collocations__context_right')}
                    </option>
                    <option value={SrchContextType.BOTH}>
                        {ut.translate('collocations__context_both')}
                    </option>
                </select>
            </form>
        );
    };

    // -------------- <TableView /> -------------------------------------

    const TableView: React.FC<{
        data: Array<DataRow>;
        heading: DataHeading;
        caption: string;
    }> = (props) => {
        return (
            <table className="data">
                <caption>{props.caption}</caption>
                <thead>
                    <tr>
                        <th />
                        {props.heading.map((h, i) => (
                            <th key={`${i}:${h.ident}`}>{h.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {props.data.map((row, i) => (
                        <tr key={`${i}:${row.str}`}>
                            <td className="word">{row.str}</td>
                            <td className="num">{ut.formatNumber(row.freq)}</td>
                            {row.stats.map((stat, i) => (
                                <td key={`stat-${i}`} className="num">
                                    {ut.formatNumber(stat, 2)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    // -------------- <CollocTile /> -------------------------------------

    const CollocTile: React.FC<CoreTileComponentProps> = (props) => {
        const state = useModel(model);

        const sortItemIdx = state.heading.findIndex(
            (v) => v.ident === state.sortByMetric
        );
        const dataTransform = (v: DataRow) => {
            return {
                text: v.str,
                value: sortItemIdx > 0 ? v.stats[sortItemIdx - 1] : v.freq, // abs attr is not in the stats array (=> -1)
                tooltip: v.stats.map((v, i) => ({
                    label: state.heading[i + 1].label,
                    value: v,
                    round: 3,
                })),
                interactionId: v.interactionId,
            };
        };

        const colorGen =
            state.data.length > 1
                ? (idx) => theme.scaleColorCmpDerived(idx, state.data.length)
                : (_: number) => theme.scaleColorIndexed();

        const caption = (idx: number) => {
            if (state.comparisonCorpname) {
                if (idx === 0) {
                    return state.queryMatches[0].word;
                } else {
                    return `${state.queryMatches[0].word} (${state.comparisonCorpname})`;
                }
            } else {
                return state.queryMatches[idx].word;
            }
        };

        return (
            <globalCompontents.TileWrapper
                tileId={props.tileId}
                isBusy={state.isBusy}
                error={state.error}
                hasData={state.data.some(
                    (data) => data !== null && data.length > 0
                )}
                sourceIdent={{ corp: state.corpname }}
                backlink={state.backlinks}
                supportsTileReload={props.supportsReloadOnError}
                issueReportingUrl={props.issueReportingUrl}
            >
                {state.isTweakMode ? (
                    <div className="tweak-box">
                        <Controls
                            tileId={props.tileId}
                            value={state.srchRangeType}
                        />
                    </div>
                ) : null}
                <S.Boxes $isMobile={props.isMobile}>
                    {List.map((data, index) => {
                        const otherWords = List.flatMap(
                            (v, i) =>
                                index === i ? [] : List.map((u) => u.str, v),
                            state.data
                        );
                        return state.isAltViewMode ? (
                            <TableView
                                key={index}
                                heading={state.heading}
                                data={data}
                                caption={caption(index)}
                            />
                        ) : data ? (
                            <globalCompontents.ResponsiveWrapper
                                minWidth={props.isMobile ? undefined : 250}
                                key={index}
                                widthFract={props.widthFract}
                                render={(width: number, height: number) => (
                                    <S.CollocCloud>
                                        {state.data.length > 1 ? (
                                            <h2>{caption(index)}</h2>
                                        ) : null}
                                        <WordCloud
                                            width={width}
                                            height={height}
                                            data={data}
                                            isMobile={props.isMobile}
                                            font={theme.infoGraphicsFont}
                                            dataTransform={dataTransform}
                                            selectedText={
                                                state.data.length > 1
                                                    ? state.selectedText
                                                    : null
                                            }
                                            colors={colorGen(index)}
                                            underlineWords={otherWords}
                                        />
                                    </S.CollocCloud>
                                )}
                            />
                        ) : (
                            <globalCompontents.ResponsiveWrapper
                                key={`${index}empty`}
                                render={() =>
                                    data === null ? (
                                        <p>
                                            {ut.translate(
                                                'collocations__processing'
                                            ) + '\u2026'}
                                        </p>
                                    ) : (
                                        <p>
                                            {ut.translate(
                                                'collocations__no_data'
                                            )}
                                        </p>
                                    )
                                }
                            />
                        );
                    }, state.data)}
                </S.Boxes>
            </globalCompontents.TileWrapper>
        );
    };

    return CollocTile;
}
