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
import { IActionDispatcher, ViewUtils, useModel } from 'kombo';
import * as React from 'react';
import { fromEvent } from 'rxjs';

import { Theme } from '../../../../page/theme.js';
import {
    CoreTileComponentProps,
    TileComponent,
} from '../../../../page/tile.js';
import { GlobalComponents } from '../../../../views/common/index.js';
import { Actions } from '../actions.js';
import { GeoAreasModel, GeoAreasModelState } from '../model.js';
import { Dict, List } from 'cnc-tskit';
import { DataRow } from '../../../../api/vendor/mquery/freqs.js';
import { createSVGElement, createSVGEmptyCircle, Map } from './common.js';

import * as S from '../style.js';

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme,
    model: GeoAreasModel
): TileComponent {
    const globComponents = ut.getComponents();

    // -------------- <DataTable /> ---------------------------------------------

    const DataTable: React.FC<{
        rows: Array<DataRow>;
    }> = (props) => {
        return (
            <table className="DataTable data cnc-table">
                <thead>
                    <tr>
                        <th>
                            {ut.translate('geolocations__table_heading_area')}
                        </th>
                        <th>
                            {ut.translate(
                                'geolocations__single_table_heading_ipm'
                            )}
                        </th>
                        <th>
                            {ut.translate(
                                'geolocations__single_table_heading_abs'
                            )}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {props.rows.map((row, i) => (
                        <tr key={row.name}>
                            <td>{row.name}</td>
                            <td className="num">{row.ipm}</td>
                            <td className="num">{row.freq}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    // -----------------

    const drawLabels = (
        props: GeoAreasModelState,
        tileId: number,
        fillColor: string
    ) => {
        const data = props.data[0][0];
        const [min, max] = props.data[0].reduce(
            (acc, curr) => [
                Math.min(acc[0], curr.ipm),
                Math.max(acc[1], curr.ipm),
            ],
            [
                data === undefined ? 0 : data.ipm,
                data === undefined ? 0 : data.ipm,
            ]
        );
        const rMin = max > 1000 ? 110 : 90;
        const rMax = max > 1000 ? 190 : 170;
        const a = max !== min ? (rMax - rMin) / (max - min) : 0;
        const b = rMin - a * min;
        const mkSize = (v: number) => a * v + b;

        // clear possible previous labels
        document
            .querySelectorAll(
                `section#tile-${tileId} .svg-graph-p g.label-mount`
            )
            .forEach((elm) => {
                while (elm.firstChild) {
                    elm.removeChild(elm.firstChild);
                }
            });

        // insert data
        Dict.forEach((areaIdent, areaName) => {
            const elm = document.querySelector(
                `section#tile-${tileId} .svg-graph-p .${areaIdent}-g`
            );
            if (elm) {
                let label;
                const areaIndex = List.findIndex(
                    (v, i) => v.name === areaName,
                    props.data[0]
                );
                const areaData =
                    areaIndex === -1 ? undefined : props.data[0][areaIndex];

                if (
                    areaData === undefined ||
                    areaData.freq < props.frequencyDisplayLimit
                ) {
                    label = createSVGEmptyCircle(elm, 80);
                } else {
                    const circle = createSVGElement(elm, 'circle', {
                        r: mkSize(areaData.ipm).toFixed(1),
                        cx: '0',
                        cy: '0',
                        stroke: fillColor,
                        'stroke-width': '3',
                        fill: fillColor,
                        'pointer-events': 'fill',
                    });
                    circle.setAttribute(
                        'style',
                        'filter: drop-shadow(0px 0px 5px rgba(0, 0, 0, 0.7));'
                    );

                    const text = createSVGElement(elm, 'text', {
                        transform: 'translate(0, 15)',
                        'text-anchor': 'middle',
                        'font-size': '4.5em',
                        'font-weight': 'bold',
                        fill: theme.geoAreaSpotTextColor,
                    });
                    text.style.cssText = 'opacity: 1';
                    text.textContent = ut.formatNumber(
                        areaData.ipm,
                        areaData.ipm >= 100 ? 0 : 1
                    );
                    label = createSVGElement(elm, 'circle', {
                        r: mkSize(areaData.ipm).toFixed(1),
                        cx: '0',
                        cy: '0',
                        fill: 'white',
                        'pointer-events': 'fill',
                        opacity: '0',
                    });
                }

                fromEvent(label, 'mousemove').subscribe((e: MouseEvent) => {
                    dispatcher.dispatch<typeof Actions.ShowAreaTooltip>({
                        name: Actions.ShowAreaTooltip.name,
                        payload: {
                            areaName: areaName,
                            areaIpmNorm:
                                areaData === undefined ? 0 : areaData.norm,
                            areaData:
                                areaData === undefined
                                    ? null
                                    : [{ ...areaData, target: 0 }],
                            tileId: tileId,
                            tooltipX: e.pageX,
                            tooltipY: e.pageY,
                        },
                    });
                });

                fromEvent(label, 'mouseout').subscribe(() => {
                    dispatcher.dispatch<typeof Actions.HideAreaTooltip>({
                        name: Actions.HideAreaTooltip.name,
                        payload: {
                            tileId: tileId,
                        },
                    });
                });
            }
        }, props.areaCodeMapping);
    };

    // -------------- <GeoAreasTileView /> ---------------------------------------------

    const GeoAreasTileView: React.FC<CoreTileComponentProps> = (props) => {
        const state = useModel(model);

        React.useEffect(() => {
            if (state.data[0].length > 0) {
                drawLabels(state, props.tileId, theme.geoAreaSpotFillColor);
            }
        }, []);

        React.useEffect(() => {
            drawLabels(state, props.tileId, theme.geoAreaSpotFillColor);
        });

        const areaWidth =
            props.widthFract > 2 && !props.isMobile ? '70%' : '100%';
        return (
            <globComponents.TileWrapper
                tileId={props.tileId}
                isBusy={state.isBusy}
                error={state.error}
                hasData={state.data[0].length > 0}
                sourceIdent={{ corp: state.corpname }}
                supportsTileReload={props.supportsReloadOnError}
                issueReportingUrl={props.issueReportingUrl}
                backlink={state.backlinks[0]}
            >
                <S.GeoAreasTileView>
                    {state.isAltViewMode ? (
                        <DataTable rows={state.data[0]} />
                    ) : (
                        <div
                            className="flex-item"
                            style={{ width: areaWidth, height: '80%' }}
                        >
                            <Map mapSVG={state.mapSVG} />
                            <S.Legend>
                                {ut.translate(
                                    'geolocations__single_ipm_map_legend'
                                )}
                            </S.Legend>

                            {state.tooltipArea !== null ? (
                                <globComponents.ElementTooltip
                                    x={state.tooltipArea.tooltipX}
                                    y={state.tooltipArea.tooltipY}
                                    visible={true}
                                    caption={state.tooltipArea.caption}
                                    values={state.tooltipArea.data}
                                />
                            ) : null}
                        </div>
                    )}
                </S.GeoAreasTileView>
            </globComponents.TileWrapper>
        );
    };

    return GeoAreasTileView;
}
