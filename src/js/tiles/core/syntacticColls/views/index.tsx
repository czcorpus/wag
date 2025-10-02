/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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

import { IActionDispatcher, ViewUtils, useModel } from 'kombo';
import * as React from 'react';

import { Theme } from '../../../../page/theme.js';
import {
    CoreTileComponentProps,
    TileComponent,
} from '../../../../page/tile.js';
import { GlobalComponents } from '../../../../views/common/index.js';
import { CollMeasure, SyntacticCollsModel } from '../model.js';
import { init as wordCloudViewInit } from '../../../../views/wordCloud/index.js';

import * as S from '../style.js';
import { List } from 'cnc-tskit';
import { WordCloudItemCalc } from '../../../../views/wordCloud/calc.js';
import { Actions } from '../common.js';
import { SCollsData, SCollsDataRow, SCollsQueryType } from '../api/common.js';
import { Examples } from './examples.js';

const isEmpty = (data: SCollsData) => !data || data.rows.length === 0;

const extractMeasure = (row: SCollsDataRow, msr: CollMeasure): number => {
    switch (msr) {
        case 'LL':
            return row.ll;
        case 'LMI':
            return row.lmi;
        case 'LogDice':
            return row.logDice;
        case 'T-Score':
            return row.tscore;
        default:
            return undefined;
    }
};

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme,
    model: SyntacticCollsModel
): TileComponent {
    const globalComponents = ut.getComponents();
    const WordCloud = wordCloudViewInit<SCollsDataRow>(dispatcher, ut, theme);

    const dataTransform = (v: SCollsDataRow): WordCloudItemCalc => ({
        text: v.value,
        value: v.collWeight,
        tooltip: [
            {
                label: ut.translate('syntactic_colls__tooltip_score'),
                value: ut.formatNumber(v.collWeight, 5),
            },
        ],
        interactionId: v.value,
    });

    // ---------------------- <Controls /> --------------------------------

    const Controls: React.FC<{
        tileId: number;
        visibleMeasures: Array<CollMeasure>;
        availableMeasures: Array<CollMeasure>;
    }> = (props) => {
        const handleChange =
            (col: number) => (evt: React.ChangeEvent<HTMLInputElement>) => {
                dispatcher.dispatch(Actions.SetDisplayScore, {
                    value: evt.target.value,
                    tileId: props.tileId,
                    position: col,
                });
            };

        return (
            <S.Controls>
                <h2>
                    {ut.translate('syntactic_colls__collocation_score_select')}
                </h2>
                <form className="Controls cnc-form tile-tweak">
                    <fieldset>
                        <label>
                            <table>
                                <thead>
                                    <tr>
                                        <th>1.</th>
                                        <th>2.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {List.map(
                                        (v) => (
                                            <tr key={`row:${v}`}>
                                                <td>
                                                    <label>
                                                        <input
                                                            type="radio"
                                                            value={v}
                                                            name="col1sel"
                                                            checked={
                                                                props
                                                                    .visibleMeasures[0] ===
                                                                v
                                                            }
                                                            onChange={handleChange(
                                                                0
                                                            )}
                                                        />
                                                        {v}
                                                    </label>
                                                </td>
                                                <td>
                                                    <label>
                                                        <input
                                                            type="radio"
                                                            value={v}
                                                            name="col2sel"
                                                            checked={
                                                                props
                                                                    .visibleMeasures[1] ===
                                                                v
                                                            }
                                                            onChange={handleChange(
                                                                1
                                                            )}
                                                        />
                                                        {v}
                                                    </label>
                                                </td>
                                            </tr>
                                        ),
                                        props.availableMeasures
                                    )}
                                </tbody>
                            </table>
                        </label>
                    </fieldset>
                </form>
            </S.Controls>
        );
    };

    // ---------------------- <WSSTable /> ---------------------------

    const WSSTable: React.FC<{
        tileId: number;
        data: SCollsData;
        isMobile: boolean;
        widthFract: number;
        queryType: SCollsQueryType;
        word: string;
        visibleMeasures: Array<CollMeasure>;
    }> = (props) => {
        const handleWordClick = (rowId: number) => () => {
            dispatcher.dispatch(Actions.ClickForExample, {
                tileId: props.tileId,
                rowId,
            });
        };

        return (
            <S.SCollsTable>
                <globalComponents.ResponsiveWrapper
                    minWidth={props.isMobile ? undefined : 250}
                    widthFract={props.widthFract}
                    render={(width: number, height: number) => (
                        <table className="data">
                            <thead>
                                <tr>
                                    <th rowSpan={2}>
                                        {ut.translate(
                                            'syntactic_colls__tab_hd_word'
                                        )}
                                    </th>
                                    <th colSpan={props.visibleMeasures.length}>
                                        {ut.translate(
                                            'syntactic_colls__tab_hd_score'
                                        )}
                                    </th>
                                </tr>
                                <tr>
                                    {List.map(
                                        (v) => (
                                            <th key={`measure:${v}`}>{v}</th>
                                        ),
                                        props.visibleMeasures
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {List.map(
                                    (row, i) => (
                                        <tr key={`row:${i}`}>
                                            <td className="word">
                                                {row.mutualDist < 0 ? (
                                                    <>
                                                        <a
                                                            onClick={handleWordClick(
                                                                i
                                                            )}
                                                        >
                                                            {row.value}
                                                        </a>
                                                        {row.deprel ? (
                                                            <span className="fn">
                                                                ({row.deprel})
                                                            </span>
                                                        ) : null}
                                                        {Math.round(
                                                            row.mutualDist
                                                        ) <= -2 ? (
                                                            <>
                                                                <span className="arrows">
                                                                    {'\u2192'}
                                                                </span>
                                                                <span className="syntax-node">
                                                                    {'\u25EF'}
                                                                </span>
                                                            </>
                                                        ) : null}
                                                        <span className="arrows">
                                                            {'\u2192'}
                                                        </span>
                                                        <span
                                                            className="syntax-node"
                                                            title={props.word}
                                                        >
                                                            {'\u2B24'}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span
                                                            className="syntax-node"
                                                            title={props.word}
                                                        >
                                                            {'\u2B24'}
                                                        </span>
                                                        <span className="arrows">
                                                            {'\u2190'}
                                                        </span>
                                                        {Math.round(
                                                            row.mutualDist
                                                        ) >= 2 ? (
                                                            <>
                                                                {'\u25EF'}
                                                                <span className="arrows">
                                                                    {'\u2190'}
                                                                </span>
                                                            </>
                                                        ) : null}
                                                        {row.deprel ? (
                                                            <span className="fn">
                                                                ({row.deprel})
                                                            </span>
                                                        ) : null}
                                                        <a
                                                            onClick={handleWordClick(
                                                                i
                                                            )}
                                                        >
                                                            {row.value}
                                                        </a>
                                                    </>
                                                )}
                                            </td>
                                            {List.map(
                                                (v) => (
                                                    <td
                                                        key={`measure:${v}`}
                                                        className="num"
                                                    >
                                                        {ut.formatNumber(
                                                            extractMeasure(
                                                                row,
                                                                v
                                                            ),
                                                            2
                                                        )}
                                                    </td>
                                                ),
                                                props.visibleMeasures
                                            )}
                                        </tr>
                                    ),
                                    props.data.rows
                                )}
                            </tbody>
                        </table>
                    )}
                />
            </S.SCollsTable>
        );
    };

    // -------------- <SyntacticCollsTile /> -------------------------------------

    const SyntacticCollsTile: React.FC<CoreTileComponentProps> = (props) => {
        const state = useModel(model);

        const renderWordCloud = () => {
            return (
                <S.SCollsWordCloud>
                    <globalComponents.ResponsiveWrapper
                        minWidth={props.isMobile ? undefined : 250}
                        widthFract={props.widthFract}
                        render={(width: number, height: number) => (
                            <WordCloud
                                width={width}
                                height={height}
                                isMobile={props.isMobile}
                                data={state.data.rows}
                                font={theme.infoGraphicsFont}
                                dataTransform={dataTransform}
                            />
                        )}
                    />
                </S.SCollsWordCloud>
            );
        };

        const handleCloseExamplesClick = () => {
            dispatcher.dispatch(Actions.HideExampleWindow, {
                tileId: props.tileId,
            });
        };

        const renderEmptyOrNA = () => {
            if (state.displayType === 'none') {
                return (
                    <p
                        className="no-analysis-avail"
                        title={ut.translate('global__not_applicable')}
                    >
                        {ut.translate(
                            'syntactic_colls__not_applicable_for_pos'
                        )}
                    </p>
                );
            }
            if (!state.data) {
                <p>{ut.translate('syntactic_colls__no_data')}</p>;
            }
            return null;
        };

        return (
            <globalComponents.TileWrapper
                tileId={props.tileId}
                isBusy={state.isBusy}
                error={state.error}
                hasData={true}
                sourceIdent={{ corp: state.corpname }}
                backlink={[]}
                supportsTileReload={props.supportsReloadOnError}
                issueReportingUrl={props.issueReportingUrl}
            >
                {state.isTweakMode ? (
                    <div className="tweak-box">
                        <Controls
                            tileId={props.tileId}
                            visibleMeasures={state.visibleMeasures}
                            availableMeasures={state.availableMeasures}
                        />
                    </div>
                ) : (
                    <S.SyntacticColls>
                        {state.exampleWindowData ? (
                            <globalComponents.ModalBox
                                onCloseClick={handleCloseExamplesClick}
                                scrollableContents={true}
                                title={`${props.tileLabel} - ${ut.translate('syntactic_colls__conc_examples')} `}
                                tileClass="text"
                            >
                                <Examples data={state.exampleWindowData} />
                            </globalComponents.ModalBox>
                        ) : null}
                        {(() => {
                            if (isEmpty(state.data)) {
                                renderEmptyOrNA();
                            } else if (state.isAltViewMode) {
                                return (
                                    <div className="tables">
                                        {renderWordCloud()}
                                    </div>
                                );
                            } else {
                                return (
                                    <>
                                        <div className="tables">
                                            <WSSTable
                                                tileId={props.tileId}
                                                word={state.queryMatch.word}
                                                data={state.data}
                                                queryType={state.displayType}
                                                isMobile={props.isMobile}
                                                visibleMeasures={
                                                    state.visibleMeasures
                                                }
                                                widthFract={props.widthFract}
                                            />
                                        </div>
                                        <p className="hint">
                                            {ut.translate(
                                                'syntactic_colls__items_sorted_by_rrf'
                                            )}
                                        </p>
                                    </>
                                );
                            }
                        })()}
                    </S.SyntacticColls>
                )}
            </globalComponents.TileWrapper>
        );
    };

    return SyntacticCollsTile;
}
