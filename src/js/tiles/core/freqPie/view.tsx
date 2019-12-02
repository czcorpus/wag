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
import * as Immutable from 'immutable';
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { ActionName } from './actions';
import { FreqDataBlock } from '../../../common/models/freq';
import { DataRow } from '../../../common/api/kontext/freqs';
import { FreqBarModel, FreqBarModelState } from '../freqBar/model';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:FreqBarModel):TileComponent {

    const globalComponents = ut.getComponents();
    const catList = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const colorPalette = theme.categoryPalette(catList);

    const createColorMapping = (blocks:Immutable.List<FreqDataBlock<DataRow>>):{[v:string]:string} => {
        const ans = {};
        let i = 0;
        blocks.flatMap(block => block.data).forEach(item => {
            if (ans[item.name] === undefined) {
                ans[item.name] = colorPalette(`${i % catList.length}`);
                i += 1;
            }
        });
        return ans;
    }

    // ------- <ChartWrapper /> ---------------------------------------------------

    const ChartWrapper:React.SFC<{
        isMobile:boolean;
        width:string|number;
        height:string|number;

    }> = (props) => {
        if (props.isMobile) {
            return (
                <PieChart width={typeof props.width === 'string' ? parseInt(props.width) : props.width}
                        height={typeof props.height === 'string' ? parseInt(props.height) : props.height}>
                    {props.children}
                </PieChart>
            );

        } else {
            return (
                <ResponsiveContainer width={props.width} height={props.height}>
                    <PieChart>
                        {props.children}
                    </PieChart>
                </ResponsiveContainer>
            );
        }
    }

    // -------------- <TableView /> -------------------------------------

    const TableView:React.SFC<{
        data:Immutable.List<DataRow>;
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

    // ------- <Chart /> ---------------------------------------------------

    const Chart:React.SFC<{
        data:Immutable.List<DataRow>;
        width:string;
        height:number;
        radius:number;
        isMobile:boolean;
        palette:(item:DataRow, i:number)=>string;

    }> = (props) => {
        const renderCustomizedLabel = ({cx, cy, midAngle, innerRadius, outerRadius, percent, index}) => {
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x  = cx + radius * Math.cos(-midAngle * Math.PI / 180);
            const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

            return (
                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                    {`${(percent * 100).toFixed(1)}%`}
                </text>
            );
        };

        return (
            <ChartWrapper isMobile={props.isMobile} width={props.width} height={props.height}>
                <Pie
                        data={props.data.toArray()}
                        dataKey="ipm"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={props.radius}
                        fill="#8884d8"
                        isAnimationActive={false}
                        name={ut.translate('freqBar__rel_freq')}>
                    {props.data.map((entry, index) => <Cell key={`cell-${entry.name}`} fill={props.palette(entry, index)}/>)}
                </Pie>
                <Legend verticalAlign="bottom" height={36}/>
            </ChartWrapper>
        );
    };

    // ------- <FreqPieTileView /> ---------------------------------------------------

    const FreqPieTileView:React.SFC<FreqBarModelState & CoreTileComponentProps> = (props) => {

        const chartsRef:React.RefObject<HTMLDivElement> = React.useRef(null);


        const handleScroll = () => {
            dispatcher.dispatch({
                name: ActionName.SetActiveBlock,
                payload: {
                    idx: Math.round(chartsRef.current.scrollLeft / props.renderSize[0]),
                    tileId: props.tileId
                }
            });
        };

        const handleDotClick = (idx:number) => {
            if (chartsRef.current && props.isMobile) {
                chartsRef.current.scrollLeft = Math.round(props.renderSize[0] * 0.95 * idx);
            }
        };

        const chartsViewBoxWidth = props.isMobile ? '100%' : `${100 / props.blocks.size}%`;

        let paletteFn:(item:DataRow, i:number)=>string;
        if (props.subqSyncPalette) {
            const mapping = createColorMapping(props.blocks);
            paletteFn = (item:DataRow, i:number) => mapping[item.name];

        } else {
            paletteFn = (_, i:number) => colorPalette(`${i}`);
        }

        return (
            <globalComponents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                    hasData={props.blocks.find(v => v.isReady && v.data.size > 0) !== undefined}
                    sourceIdent={{corp: props.corpname}}
                    backlink={props.backlink}
                    supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                <div className="FreqPieTileView">                    
                    {props.isAltViewMode ?
                        props.blocks.flatMap((block, blockId) => [
                            <h3 key={'h' + blockId} style={{textAlign: 'center'}}>{block.label}</h3>,
                            <TableView key={'t' + blockId} data={block.data}/>
                        ]) :
                        <div>
                            <div className="charts" ref={chartsRef} onScroll={handleScroll}>
                                {props.blocks.map(block => {
                                    const chartWidth = props.isMobile ? (props.renderSize[0] * 0.95).toFixed() : "90%";
                                    return (
                                        <div key={block.ident} style={{width: chartsViewBoxWidth, height: "100%"}}>
                                            <h3>{block.label}</h3>
                                            <Chart data={block.data} width={chartWidth} height={300}
                                                    radius={Math.min(props.renderSize[0], 90)}
                                                    isMobile={props.isMobile}
                                                    palette={paletteFn} />
                                        </div>
                                    );
                                })}
                            </div>
                            {props.isMobile && props.blocks.size > 1 ?
                                <globalComponents.HorizontalBlockSwitch blockIndices={props.blocks.map((_, i) => i).toList()}
                                        currentIdx={props.activeBlock}
                                        onChange={handleDotClick} /> :
                                null
                            }
                        </div>
                    }
                </div>
            </globalComponents.TileWrapper>
        );
    }

    return BoundWithProps(FreqPieTileView, model);
}
