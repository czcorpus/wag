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
import * as Immutable from 'immutable';
import * as d3 from 'd3';
import * as d3Scale from 'd3-scale';
import {ResponsiveContainer, PieChart, Pie, Cell, Legend} from 'recharts';
import {BoundWithProps} from 'kombo';
import {ActionDispatcher, ViewUtils} from 'kombo';
import { GlobalComponents } from '../../views/global';
import { FreqPieModel, FreqPieModelState, FreqPieDataRow } from './model';
import { CoreTileComponentProps, TileComponent } from '../../abstract/types';
import { ActionName } from './actions';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:FreqPieModel):TileComponent {

    const globalComponents = ut.getComponents();
    const c20 = d3Scale.scaleOrdinal(d3.schemeCategory10).domain(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

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

    // ------- <Chart /> ---------------------------------------------------

    const Chart:React.SFC<{
        data:Immutable.List<FreqPieDataRow>;
        width:string;
        height:number;
        radius:number;
        isMobile:boolean;
    }> = (props) => {

        const renderCustomizedLabel = ({cx, cy, midAngle, innerRadius, outerRadius, percent, index}) => {
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x  = cx + radius * Math.cos(-midAngle * Math.PI / 180);
            const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

            return (
                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                    {`${(percent).toFixed(1)}%`}
                </text>
            );
        };

        return (
            <ChartWrapper isMobile={props.isMobile} width={props.width} height={props.height}>
                <Pie
                        data={props.data.toArray()}
                        dataKey="percent"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={props.radius}
                        fill="#8884d8">
                    {props.data.map((entry, index) => <Cell key={`cell-${entry.name}`} fill={c20(`${index}`)}/>)}
                </Pie>
                <Legend verticalAlign="top" height={36}/>
            </ChartWrapper>
        );
    };

    // ------- <ChartSwitch /> ---------------------------------------------------

    const ChartSwitch:React.SFC<{
        blockIndices:Immutable.List<number>;
        currentIdx:number;
        onChange:(idx:number)=>void;

    }> = (props) => {
        return (
            <div className="ChartSwitch">
                {props.blockIndices.map(ident =>
                        <a key={ident} className={`${props.currentIdx === ident ? 'current' : ''}`}
                                onClick={()=>props.onChange(ident)}>{'\u25A0'}</a>)}
            </div>
        );
    };

    // ------- <FreqPieTileView /> ---------------------------------------------------

    class FreqPieTileView extends React.PureComponent<FreqPieModelState & CoreTileComponentProps> {

        private chartsRef:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartsRef = React.createRef();
            this.handleScroll = this.handleScroll.bind(this);
            this.handleDotClick = this.handleDotClick.bind(this);
        }

        private handleScroll():void {
            dispatcher.dispatch({
                name: ActionName.SetActiveBlock,
                payload: {
                    idx: Math.round(this.chartsRef.current.scrollLeft / this.props.renderSize[0]),
                    tileId: this.props.tileId
                }
            });
        }

        private handleDotClick(idx:number) {
            if (this.chartsRef.current && this.props.isMobile) {
                this.chartsRef.current.scrollLeft = this.props.renderSize[0] * idx;
            }
        }

        render() {
            const chartsViewBoxWidth = this.props.isMobile ? '100%' : `${100 / this.props.blocks.size}%`;
            return (
                <globalComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.blocks.find(v => v.data.size > 0) !== undefined}
                        sourceIdent={{corp: this.props.corpname}}>
                    <div className="FreqPieTileView">
                        <div className="charts" ref={this.chartsRef} onScroll={this.handleScroll}>
                            {this.props.blocks.map(block => {
                                const chartWidth = this.props.isMobile ? (this.props.renderSize[0] * 0.9).toFixed() : "90%";
                                return (
                                    <div key={block.ident} style={{width: chartsViewBoxWidth, height: "100%"}}>
                                        <Chart data={block.data} width={chartWidth} height={300}
                                                radius={Math.min(this.props.renderSize[0], 90)}
                                                isMobile={this.props.isMobile} />
                                    </div>
                                );
                            })}
                        </div>
                        {this.props.isMobile && this.props.blocks.size > 1 ?
                            <ChartSwitch blockIndices={this.props.blocks.map((_, i) => i).toList()}
                                    currentIdx={this.props.activeBlock}
                                    onChange={this.handleDotClick} /> :
                            null
                        }
                    </div>
                </globalComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(FreqPieTileView, model);
}
