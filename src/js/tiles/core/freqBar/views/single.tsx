/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { List, Strings } from 'cnc-tskit';

import { Theme } from '../../../../page/theme.js';
import { CoreTileComponentProps, TileComponent } from '../../../../page/tile.js';
import { GlobalComponents } from '../../../../views/common/index.js';
import { FreqBarModel, FreqBarModelState } from '../model.js';
import { DataRow } from '../../../../api/vendor/mquery/freqs.js';

import * as S from '../style.js';


export function init(
    dispatcher:IActionDispatcher,
    ut:ViewUtils<GlobalComponents>,
    theme:Theme,
    model:FreqBarModel,
):TileComponent {

    const globComponents = ut.getComponents();


    // -------------- <TableView /> -------------------------------------

    const TableView:React.FC<{
        data:Array<DataRow>;
    }> = (props) => {
        return (
            <table className="data">
                <thead>
                    <tr>
                        <th />
                        <th>{ut.translate('freqBar__table_heading_freq_abs')}</th>
                        <th>{ut.translate('freqBar__table_heading_freq_rel')}</th>
                    </tr>
                </thead>
                <tbody>
                    {props.data.map((row, i) => (
                        <tr key={`${i}:${row.name}`}>
                            <td className="word">{row.name}</td>
                            <td className="num">{ut.formatNumber(row.freq)}</td>
                            <td className="num">{ut.formatNumber(row.ipm)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    // -------------------------- <Chart /> --------------------------------------

    const Chart:React.FC<{
        tileId:number;
        barCategoryGap:number;
        data:Array<DataRow>;
        isMobile:boolean;

    }> = (props) => {

        const maxLabelLength = (List.maxItem(
            v => v.length,
            props.isMobile ?
                List.reduce(
                    (acc, curr) => acc.concat(Strings.shortenText(curr.name, model.CHART_LABEL_MAX_LEN).split(' ')),
                    [],
                    props.data
                ) :
                List.map(v => v.name, props.data)
        ) as string).length;

        return (
            // 100% height makes parent ResponsiveWrapper
            // to change size gradually after rendering
            <ResponsiveContainer id={`${props.tileId}-download-figure`} width="100%" height="95%" minHeight={300} >
                <BarChart data={props.data} layout="vertical" barCategoryGap={props.barCategoryGap}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="ipm" />
                    <YAxis type="category" dataKey="name" width={maxLabelLength * 6} />
                    <Legend formatter={(value) => <span style={{ color: 'black' }}>{value}</span>} />
                    <Tooltip cursor={false} isAnimationActive={false} content={<globComponents.AlignedRechartsTooltip
                        payloadMapper={payload => [
                            {name: ut.translate('freqBar__rel_freq'), value: payload.ipm},
                            {name: ut.translate('freqBar__abs_freq'), value: payload.freq}
                        ]}
                    />}/>
                    <Bar dataKey="ipm" fill={theme.categoryColor(0)} />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    // -------------------------- <FreqBarTile /> --------------------------------------

    const FreqBarTile:React.FC<FreqBarModelState & CoreTileComponentProps> = (props) => {

        const freqData = List.head(props.freqData);
        const numCats = freqData ? freqData.rows.length : 0;
        const barCategoryGap = Math.max(10, 40 - props.pixelsPerCategory);
        const minHeight = 70 + numCats * (props.pixelsPerCategory + barCategoryGap);

        return (
            <globComponents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                    hasData={freqData && !List.empty(freqData.rows)}
                    sourceIdent={{corp: props.corpname}}
                    backlink={props.backlinks}
                    supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                <globComponents.ResponsiveWrapper render={(width:number, height:number) => {
                    return <S.FreqBarTile style={{minHeight: `${minHeight}px`, height: '100%'}}>
                        {props.isAltViewMode ?
                            <S.Tables>
                                <h3  style={{textAlign: 'center'}}>{props.label}</h3>
                                <TableView data={freqData.rows}/>
                            </S.Tables> :
                            <>
                                {freqData.rows.length > 0 ?
                                    <Chart tileId={props.tileId} data={freqData.rows} barCategoryGap={barCategoryGap} isMobile={props.isMobile} /> :
                                    <p className="note" style={{textAlign: 'center'}}>{ut.translate('freqBar__no_result')}</p>
                                }
                            </>
                        }
                    </S.FreqBarTile>
                }}/>
            </globComponents.TileWrapper>
        );
    }

    return BoundWithProps<CoreTileComponentProps, FreqBarModelState>(FreqBarTile, model);
}