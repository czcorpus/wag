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
import * as Immutable from 'immutable';
import * as React from 'react';
import {ActionDispatcher, ViewUtils, BoundWithProps} from 'kombo';
import { TTDistribModel, TTDistribModelState } from './model';
import {ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend} from 'recharts';
import { DataRow } from '../../shared/api/kontextFreqs';
import { GlobalComponents } from '../../views/global';
import { SystemColor } from '../../shared/colors';
import { CoreTileComponentProps, TileComponent } from '../../abstract/types';
import { ActionName, Actions } from './actions';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:TTDistribModel):TileComponent {

    const globComponents = ut.getComponents();


    // ------- <ChartWrapper /> ---------------------------------------------------

    const ChartWrapper:React.SFC<{
        data:Immutable.List<DataRow>;
        width:string|number;
        height:string|number;
        isMobile:boolean;

    }> = (props) => {
        if (props.isMobile) {
            return (
                <BarChart data={props.data.toArray()}
                        width={typeof props.width === 'string' ? parseInt(props.width) : props.width}
                        height={typeof props.height === 'string' ? parseInt(props.height) : props.height}
                        layout="vertical"
                        isAnimationActive={false}>
                    {props.children}
                </BarChart>
            );

        } else {
            return (
                <ResponsiveContainer width={props.width} height={props.height}>
                    <BarChart data={props.data.toArray()} layout="vertical">
                        {props.children}
                    </BarChart>
                </ResponsiveContainer>
            );
        }
    }


    // -------------------------- <Chart /> --------------------------------------

    const Chart:React.SFC<{
        data:Immutable.List<DataRow>;
        width:string|number;
        height:string|number;
        isMobile:boolean;

    }> = (props) => {

        return (
            <div className="Chart">
                <ChartWrapper data={props.data} isMobile={props.isMobile} width={props.width} height={props.height}>
                    <CartesianGrid />
                    <Bar data={props.data.toArray()} dataKey="ipm" fill={SystemColor.COLOR_LOGO_BLUE} isAnimationActive={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Legend />
                    <Tooltip cursor={false} isAnimationActive={false} />
                </ChartWrapper>
            </div>
        );
    };

    // -------------------------- <TTDistribTile /> --------------------------------------

    class TTDistribTile extends React.PureComponent<TTDistribModelState & CoreTileComponentProps> {

        private chartsRef:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartsRef = React.createRef();
            this.handleScroll = this.handleScroll.bind(this);
            this.handleDotClick = this.handleDotClick.bind(this);
        }

        private handleScroll():void {
            dispatcher.dispatch<Actions.SetActiveBlock>({
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

            return (
                <globComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.blocks.find(v => v.data.size > 0) !== undefined}
                        sourceIdent={{corp: this.props.corpname}}>
                    <div className="TTDistribTile">
                        <div className="charts" ref={this.chartsRef} onScroll={this.handleScroll}>
                            {this.props.blocks.map(block => {
                                const chartWidth = this.props.isMobile ? (this.props.renderSize[0] * 0.95).toFixed() : "90%";
                                return (
                                    <div key={block.ident} style={{width: chartsViewBoxWidth, height: "100%"}}>
                                        <Chart data={block.data} width={chartWidth} height={block.data.size * 50}
                                                isMobile={this.props.isMobile} />
                                    </div>
                                );
                            })}
                        </div>
                        {this.props.isMobile && this.props.blocks.size > 1 ?
                            <globComponents.HorizontalBlockSwitch htmlClass="ChartSwitch"
                                    blockIndices={this.props.blocks.map((_, i) => i).toList()}
                                    currentIdx={this.props.activeBlock}
                                    onChange={this.handleDotClick} /> :
                            null
                        }
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, TTDistribModelState>(TTDistribTile, model);
}