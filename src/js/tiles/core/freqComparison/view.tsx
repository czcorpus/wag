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

import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { ActionName, Actions } from './actions';
import { FreqComparisonModel, FreqComparisonModelState, MultiWordDataRow } from './model';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:FreqComparisonModel):TileComponent {

    const globComponents = ut.getComponents();

    const processData = (data:Array<MultiWordDataRow>, words:Array<string>) => {
        return Immutable.List(data).groupBy(x => x.name).map((values, name) => {
            const totalIpm = values.reduce((acc, curr) => acc + curr.ipm, 0)
            let wordData = {}

            // calculate percentage from frequency
            values.forEach(item => {
                wordData[item.word] = (100*item.ipm/totalIpm).toFixed(2);
                wordData[`${item.word}_ipm`] = item.ipm;
                wordData[`${item.word}_abs`] = item.freq;
            });

            // add also words with no data
            words.forEach(word => {
                if (!Object.keys(wordData).includes(word)) {
                    wordData[word] = 0;
                    wordData[`${word}_ipm`] = 0;
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
        data:Array<MultiWordDataRow>;
        words:Array<string>;
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
        data:Array<MultiWordDataRow>;
        words:Array<string>;
        width:string|number;
        height:string|number;
        isMobile:boolean;
    }> = (props) => {
        const processedData = processData(props.data, props.words);
        const maxLabelWidth = processedData.max((v1, v2) => v1.name.length - v2.name.length).name.length;
        return (
            <div className="Chart">
                <ChartWrapper data={props.data} words={props.words} isMobile={props.isMobile} width={props.width} height={props.height}>
                    <CartesianGrid />
                    {props.words.map((word, index) =>
                        <Bar key={word} dataKey={word} isAnimationActive={false} name={word} stackId='a' fill={theme.barColor(index)} />
                    )};
                    <XAxis type="number" unit="%" ticks={[0, 25, 50, 75, 100]} domain={[0, 100]} interval={0} />
                    <YAxis type="category" dataKey="name" width={Math.max(60, maxLabelWidth * 8)} interval={0} />
                    <Legend />
                    <Tooltip cursor={false} isAnimationActive={false} formatter={(value, name, props) => `${value} % (${props.payload[`${name}_ipm`]} ipm)`} />
                </ChartWrapper>
            </div>
        );
    };

    // -------------- <DataTable /> ---------------------------------------------

    const DataTable:React.SFC<{
        data:Array<MultiWordDataRow>;
        words:Array<string>;
    }> = (props) => {
        const processedData = processData(props.data, props.words);
        return <table className="DataTable data cnc-table">
            <thead>
                <tr>
                    <th key="category" rowSpan={2}>{ut.translate('freq_comparison__table_heading_category')}</th>
                    <th colSpan={2} key="totalOccurrence">{ut.translate('freq_comparison__table_heading_total_occurrence')}</th>
                    {props.words.map(word => <th key={`${word}Occurrence`} colSpan={2}>{ut.translate('freq_comparison__table_heading_occurrence_of_{word}', {word: word})}</th>)}
                </tr>
                <tr>
                    <th key={`totalIpm`}>{ut.translate('freq_comparison__table_heading_freq_rel')}</th>
                    <th key={`totalAbs`}>{ut.translate('freq_comparison__table_heading_freq_abs')}</th>
                    {props.words.reduce((acc, word) => [...acc,
                        <th key={`${word}Ipm`}>{ut.translate('freq_comparison__table_heading_freq_rel')}</th>,
                        <th key={`${word}Abs`}>{ut.translate('freq_comparison__table_heading_freq_abs')}</th>
                    ], [])}
                </tr>
            </thead>
            <tbody>
                {processedData.entrySeq().map(([category, rows]) =>
                    <tr key={category}>
                        <td key={category}>{category}</td>
                        <td key={`${category}Ipm`} className="num">{props.words.reduce((ipmSum, word) => ipmSum + rows[`${word}_ipm`], 0).toFixed(2)}</td>
                        <td key={`${category}Abs`} className="num">{props.words.reduce((absSum, word) => absSum + rows[`${word}_abs`], 0)}</td>
                        {props.words.reduce((acc, word) => [...acc,
                            <td key={`${word}Ipm`} className="num">{rows[`${word}_ipm`]}<br/>({rows[`${word}`]}%)</td>,
                            <td key={`${word}Abs`} className="num">{rows[`${word}_abs`]}</td>
                        ], [])}
                    </tr>
                )}
            </tbody>
        </table>
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
            const chartsViewBoxWidth = this.props.isMobile ? '100%' : `${100 / Math.min(this.props.blocks.length, this.props.maxChartsPerLine)}%`;
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.blocks.find(v => v.isReady) !== undefined}
                        sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlink}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <div className="FreqComparisonTile">
                        {this.props.isAltViewMode ? 
                            this.props.blocks.filter(block => block.isReady).map(block => {
                                return <div key={`${block.label}Wrapper`} className="table">
                                    <h3 key={`${block.label}Heading`} style={{textAlign: 'center'}}>{block.label}</h3>
                                    <DataTable key={`${block.label}Table`} data={block.data} words={block.words}/>
                                </div>
                            }) :
                            <div className={`charts${this.props.isBusy ? ' incomplete' : ''}`} ref={this.chartsRef} onScroll={this.handleScroll} style={{flexWrap: this.props.isMobile ? 'nowrap' : 'wrap'}}>
                                {this.props.blocks.filter(block => block.isReady).map(block => {
                                    const chartWidth = this.props.isMobile ? (this.props.renderSize[0] * 0.9).toFixed() : "90%";
                                    return  (
                                        <div key={block.ident} style={{width: chartsViewBoxWidth, height: "100%"}}>
                                            <h3>{block.label}</h3>
                                            {block.data.length > 0 ?
                                                <Chart data={block.data} words={block.words} width={chartWidth} height={70 + Immutable.List(block.data).groupBy(x => x.name).size * 25}
                                                        isMobile={this.props.isMobile} /> :
                                                <p className="note" style={{textAlign: 'center'}}>No result</p>
                                            }
                                        </div>
                                    );
                                })}
                            </div>
                        }
                        {this.props.isMobile && this.props.blocks.length > 1 && !this.props.isAltViewMode ?
                            <globComponents.HorizontalBlockSwitch htmlClass="ChartSwitch"
                                    blockIndices={Immutable.List(this.props.blocks.map((_, i) => i))}
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