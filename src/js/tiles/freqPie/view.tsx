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
import { ActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { Theme } from '../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../common/types';
import { GlobalComponents } from '../../views/global';
import { ActionName } from './actions';
import { FreqPieDataRow, FreqPieModel, FreqPieModelState } from './model';
import { FreqDataBlock } from '../../common/models/freq';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:FreqPieModel):TileComponent {

    const globalComponents = ut.getComponents();
    const catList = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const colorPalette = theme.categoryPalette(catList);

    const createColorMapping = (blocks:Immutable.List<FreqDataBlock<FreqPieDataRow>>):{[v:string]:string} => {
        const ans = {};
        let i = 0;
        blocks.flatMap(block => block.data).forEach(item => {
            if (item.isTheRest) {
                ans[item.name] = theme.categoryOtherColor();

            } else {
                if (ans[item.name] === undefined) {
                    ans[item.name] = colorPalette(`${i % catList.length}`);
                    i += 1;
                }
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

    // ------- <Chart /> ---------------------------------------------------

    const Chart:React.SFC<{
        data:Immutable.List<FreqPieDataRow>;
        width:string;
        height:number;
        radius:number;
        isMobile:boolean;
        palette:(item:FreqPieDataRow, i:number)=>string;

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
                        fill="#8884d8"
                        isAnimationActive={false}>
                    {props.data.map((entry, index) => <Cell key={`cell-${entry.name}`} fill={props.palette(entry, index)}/>)}
                </Pie>
                <Legend verticalAlign="bottom" height={36}/>
            </ChartWrapper>
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
                this.chartsRef.current.scrollLeft = Math.round(this.props.renderSize[0] * 0.95 * idx);
            }
        }

        render() {
            const chartsViewBoxWidth = this.props.isMobile ? '100%' : `${100 / this.props.blocks.size}%`;

            let paletteFn:(item:FreqPieDataRow, i:number)=>string;
            if (this.props.useConsistentPalette) {
                const mapping = createColorMapping(this.props.blocks);
                paletteFn = (item:FreqPieDataRow, i:number) => mapping[item.name];

            } else {
                paletteFn = (_, i:number) => colorPalette(`${i}`);
            }

            return (
                <globalComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.blocks.find(v => v.data.size > 0) !== undefined}
                        sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlink}>
                    <div className="FreqPieTileView">
                        <div className="charts" ref={this.chartsRef} onScroll={this.handleScroll}>
                            {this.props.blocks.map(block => {
                                const chartWidth = this.props.isMobile ? (this.props.renderSize[0] * 0.95).toFixed() : "90%";
                                return (
                                    <div key={block.ident} style={{width: chartsViewBoxWidth, height: "100%"}}>
                                        <h3>{block.label}</h3>
                                        <Chart data={block.data} width={chartWidth} height={300}
                                                radius={Math.min(this.props.renderSize[0], 90)}
                                                isMobile={this.props.isMobile}
                                                palette={paletteFn} />
                                    </div>
                                );
                            })}
                        </div>
                        {this.props.isMobile && this.props.blocks.size > 1 ?
                            <globalComponents.HorizontalBlockSwitch blockIndices={this.props.blocks.map((_, i) => i).toList()}
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
