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
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { DataRow } from '../../../common/api/kontext/freqComparison';
import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { ActionName, Actions } from './actions';
import { FreqComparisonModel, FreqComparisonModelState } from './model';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:FreqComparisonModel):TileComponent {

    const globComponents = ut.getComponents();

    const processData = (data:Immutable.List<DataRow>, words:Immutable.List<string>) => {
        return data.groupBy(x => x.name).map((values, name) => {
            const totalIpm = values.reduce((acc, curr) => acc + curr.ipm, 0)
            let wordData = {}

            // calculate percentage from frequency
            values.forEach(item => {
                wordData[item.word] = (100*item.ipm/totalIpm).toFixed(2);
                wordData[`${item.word}_abs`] = item.ipm;
            });

            // add also words with no data
            words.forEach(word => {
                if (!Object.keys(wordData).includes(word)) {
                    wordData[word] = 0;
                    wordData[`${word}_abs`] = 0;
                }
            });

            return {
                name: name,
                ...wordData
            }
        });
    }

    // ------- <ChartWrapper /> ---------------------------------------------------

    const ChartWrapper:React.SFC<{
        data:Immutable.List<DataRow>;
        words:Immutable.List<string>;
        width:string|number;
        height:string|number;
        isMobile:boolean;

    }> = (props) => {
        if (props.isMobile) {
            return (
                <BarChart data={processData(props.data, props.words).toArray()}
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
                    <BarChart data={processData(props.data, props.words).toArray()} layout="vertical">
                        {props.children}
                    </BarChart>
                </ResponsiveContainer>
            );
        }
    }


    // -------------------------- <Chart /> --------------------------------------

    const Chart:React.SFC<{
        data:Immutable.List<DataRow>;
        words:Immutable.List<string>;
        width:string|number;
        height:string|number;
        isMobile:boolean;
        colors:Array<string>;
    }> = (props) => {
        const processedData = processData(props.data, props.words);
        const maxLabelWidth = processedData.max((v1, v2) => v1.name.length - v2.name.length).name.length;
        return (
            <div className="Chart">
                <ChartWrapper data={props.data} words={props.words} isMobile={props.isMobile} width={props.width} height={props.height}>
                    <CartesianGrid />
                    {props.words.map((word, index) =>
                        <Bar key={word} dataKey={word} isAnimationActive={false} name={word} stackId='a' fill={props.colors[index % props.colors.length]} />
                    )};
                    <XAxis type="number" unit="%" ticks={[0, 25, 50, 75, 100]} domain={[0, 100]} interval={0} />
                    <YAxis type="category" dataKey="name" width={Math.max(60, maxLabelWidth * 8)} interval={0} />
                    <Legend />
                    <Tooltip cursor={false} isAnimationActive={false} formatter={(value, name, props) => `${value} % (${props.payload[`${name}_abs`]} ipm)`} />
                </ChartWrapper>
            </div>
        );
    };

    // -------------------------- <FreqBarTile /> --------------------------------------

    class FreqBarTile extends React.PureComponent<FreqComparisonModelState & CoreTileComponentProps> {

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
                this.chartsRef.current.scrollLeft = Math.round(this.props.renderSize[0] * 0.92 * idx);
            }
        }

        render() {
            const chartsViewBoxWidth = this.props.isMobile ? '100%' : `${100 / Math.min(this.props.blocks.size, this.props.maxChartsPerLine)}%`;
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.blocks.find(v => v.isReady) !== undefined}
                        sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlink}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <div className="FreqComparisonTile">
                        <div className={`charts${this.props.isBusy ? ' incomplete' : ''}`} ref={this.chartsRef} onScroll={this.handleScroll} style={{flexWrap: this.props.isMobile ? 'nowrap' : 'wrap'}}>
                            {this.props.blocks.filter(block => block.isReady).map(block => {
                                const chartWidth = this.props.isMobile ? (this.props.renderSize[0] * 0.9).toFixed() : "90%";
                                return  (
                                    <div key={block.ident} style={{width: chartsViewBoxWidth, height: "100%"}}>
                                        <h3>{block.label}</h3>
                                        {block.data.size > 0 ?
                                            <Chart data={block.data} words={block.words} width={chartWidth} height={70 + block.data.groupBy(x => x.name).size * 25}
                                                    isMobile={this.props.isMobile} colors={this.props.colors} /> :
                                            <p className="note" style={{textAlign: 'center'}}>No result</p>
                                        }
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

    return BoundWithProps<CoreTileComponentProps, FreqComparisonModelState>(FreqBarTile, model);
}