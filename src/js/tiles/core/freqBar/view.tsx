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

import { Theme } from '../../../page/theme';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile';
import { GlobalComponents } from '../../../views/global';
import { Actions } from './actions';
import { FreqBarModel, FreqBarModelState } from './model';
import { List, Strings } from 'cnc-tskit';
import { DataRow } from '../../../api/abstract/freqs';

import * as S from './style';


const CHART_LABEL_MAX_LEN = 20;

export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:FreqBarModel):TileComponent {

    const globComponents = ut.getComponents();


    // ------- <ChartWrapper /> ---------------------------------------------------

    const ChartWrapper:React.FC<{
        data:Array<DataRow>;
        width:string|number;
        height:string|number;
        isMobile:boolean;

    }> = (props) => {
        if (props.isMobile) {
            return (
                <BarChart data={props.data}
                        width={typeof props.width === 'string' ? parseInt(props.width) : props.width}
                        height={typeof props.height === 'string' ? parseInt(props.height) : props.height}
                        layout="vertical" >
                    {props.children}
                </BarChart>
            );

        } else {
            return (
                <ResponsiveContainer width={props.width} height={props.height}>
                    <BarChart data={props.data} layout="vertical">
                        {props.children}
                    </BarChart>
                </ResponsiveContainer>
            );
        }
    }

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
        data:Array<DataRow>;
        width:string|number;
        height:string|number;
        isMobile:boolean;

    }> = (props) => {
        const maxLabelLength = (List.maxItem(
            v => v.length,
            props.isMobile ? props.data.reduce((acc, curr) => acc.concat(Strings.shortenText(curr.name, CHART_LABEL_MAX_LEN).split(' ')), []) : props.data.map(v => v.name)
        ) as string).length;
        return (
            <div className="Chart">
                <ChartWrapper data={props.data} isMobile={props.isMobile} width={props.width} height={props.height}>
                    <CartesianGrid />
                    <Bar data={props.data} dataKey="ipm" fill={theme.categoryColor(0)} isAnimationActive={false}
                            name={ut.translate('freqBar__rel_freq')} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={Math.max(60, maxLabelLength * 7)}
                            tickFormatter={value => props.isMobile ? Strings.shortenText(value, CHART_LABEL_MAX_LEN) : value}/>
                    <Legend />
                    <Tooltip cursor={false} isAnimationActive={false} content={<globComponents.AlignedRechartsTooltip
                        payloadMapper={payload => [
                            {name: ut.translate('freqBar__rel_freq'), value: payload.ipm},
                            {name: ut.translate('freqBar__abs_freq'), value: payload.freq}
                        ]}
                    />}/>
                </ChartWrapper>
            </div>
        );
    };

    // -------------------------- <FreqBarTile /> --------------------------------------

    class FreqBarTile extends React.PureComponent<FreqBarModelState & CoreTileComponentProps> {

        private chartsRef:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartsRef = React.createRef();
            this.handleScroll = this.handleScroll.bind(this);
            this.handleDotClick = this.handleDotClick.bind(this);
        }

        private handleScroll():void {
            dispatcher.dispatch<typeof Actions.SetActiveBlock>({
                name: Actions.SetActiveBlock.name,
                payload: {
                    idx: Math.round(this.chartsRef.current.scrollLeft / this.props.renderSize[0]),
                    tileId: this.props.tileId
                }
            });
        }

        private handleDotClick(idx:number) {
            if (this.chartsRef.current && this.props.isMobile) {
                this.chartsRef.current.scrollLeft = Math.round(this.props.renderSize[0] * 0.92 * idx);
            }
        }

        render() {
            const chartsViewBoxWidth = this.props.isMobile ? '100%' : `${100 / this.props.blocks.length}%`;
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={List.some(v => v.isReady && v.data.length > 0, this.props.blocks)}
                        sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlink}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <S.FreqBarTile>
                        {this.props.isAltViewMode ?
                            List.map(
                                (block, blockId) => (
                                    <React.Fragment key={'h' + blockId}>
                                        <h3  style={{textAlign: 'center'}}>{block.label}</h3>
                                        <TableView data={block.data}/>
                                    </React.Fragment>
                                ),
                                this.props.blocks
                            ) :
                            <div>
                                <S.Charts incomplete={this.props.isBusy} ref={this.chartsRef} onScroll={this.handleScroll}>
                                    {this.props.blocks.filter(block => block.isReady).map(block => {
                                        const chartWidth = this.props.isMobile ? (this.props.renderSize[0] * 0.9).toFixed() : "90%";
                                        return  (
                                            <div key={block.ident} style={{width: chartsViewBoxWidth, height: "100%"}}>
                                                <h3>{block.label}</h3>
                                                {block.data.length > 0 ?
                                                    <Chart data={block.data} width={chartWidth} height={70 + block.data.length * 40}
                                                            isMobile={this.props.isMobile} /> :
                                                    <p className="note" style={{textAlign: 'center'}}>No result</p>
                                                }
                                            </div>
                                        );
                                        })}
                                </S.Charts>
                                {this.props.isMobile && this.props.blocks.length > 1 ?
                                    <globComponents.HorizontalBlockSwitch htmlClass="ChartSwitch"
                                            blockIndices={this.props.blocks.map((_, i) => i)}
                                            currentIdx={this.props.activeBlock}
                                            onChange={this.handleDotClick} /> :
                                    null
                                }
                            </div>
                        }
                    </S.FreqBarTile>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, FreqBarModelState>(FreqBarTile, model);
}