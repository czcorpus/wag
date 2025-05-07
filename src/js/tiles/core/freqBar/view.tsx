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
import { List, Strings, tuple } from 'cnc-tskit';

import { Theme } from '../../../page/theme.js';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';
import { Actions } from './actions.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { FreqBarModel, FreqBarModelState } from './model.js';
import { DataRow } from '../../../api/vendor/mquery/freqs.js';

import * as S from './style.js';


const CHART_LABEL_MAX_LEN = 20;

export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:FreqBarModel):TileComponent {

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
                        <th>{ut.translate('mergeCorpFreq_abs_freq')}</th>
                        <th>{ut.translate('mergeCorpFreq_rel_freq')}</th>
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
        data:Array<DataRow>;
        width:string|number;
        height:string|number;
        isMobile:boolean;

    }> = (props) => {


        const maxLabelLength = (List.maxItem(
            v => v.length,
            props.isMobile ? props.data.reduce((acc, curr) => acc.concat(Strings.shortenText(curr.name, CHART_LABEL_MAX_LEN).split(' ')), []) : props.data.map(v => v.name)
        ) as string).length;

        const ref = React.useRef(null);

        React.useEffect(() => {
            if (ref.current) {
                console.log('ref size: ', ref.current.offsetWidth, ref.current.offsetHeight)
            }
        })

        return (
            <S.Chart ref={ref}>
                <ResponsiveContainer id={`${props.tileId}-download-figure`} width="100%" height="95%" minHeight={200} >
                    <BarChart data={props.data} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="ipm" />
                        <YAxis type="category" dataKey="name" />
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
            </S.Chart>
        );
    };

    // -------------------------- <FreqBarTile /> --------------------------------------

    const FreqBarTile:React.FC<FreqBarModelState & CoreTileComponentProps> = (props) => {

        const chartsRef:React.RefObject<HTMLDivElement> = React.useRef(null);

        const handleScroll = () => {
            dispatcher.dispatch<typeof Actions.SetActiveBlock>({
                name: Actions.SetActiveBlock.name,
                payload: {
                    idx: Math.round(chartsRef.current.scrollLeft / props.renderSize[0]),
                    tileId: props.tileId
                }
            });
        };

        return (
            <globComponents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                    hasData={props.freqData && !List.empty(props.freqData.rows)}
                    sourceIdent={{corp: props.corpname}}
                    backlink={props.backlink}
                    supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                <S.FreqBarTile>
                    {props.isAltViewMode ?
                        <>
                            <h3  style={{textAlign: 'center'}}>{props.label}</h3>
                            <TableView data={props.freqData.rows}/>
                        </> :
                        <S.Charts $incomplete={props.isBusy} ref={chartsRef} onScroll={handleScroll}>
                            {props.freqData.rows.length > 0 ?
                                <Chart tileId={props.tileId} data={props.freqData.rows}
                                        width={props.tileBoxSize[0]} height={props.tileBoxSize[1]}
                                        isMobile={props.isMobile} /> :
                                <p className="note" style={{textAlign: 'center'}}>No result</p>
                            }
                        </S.Charts>
                    }
                </S.FreqBarTile>
            </globComponents.TileWrapper>
        );
    }

    return BoundWithProps<CoreTileComponentProps, FreqBarModelState>(FreqBarTile, model);
}