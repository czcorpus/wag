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
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Theme } from '../../../page/theme';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile';
import { GlobalComponents } from '../../../views/global';
import { ActionName, Actions } from './actions';
import { FreqComparisonModel, FreqComparisonModelState, MultiWordDataRow } from './model';
import { pipe, List, Dict, Maths, Strings } from 'cnc-tskit';


const CHART_LABEL_MAX_LEN = 15;


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:FreqComparisonModel):TileComponent {

    const globComponents = ut.getComponents();

    interface FreqItemProps {
        name:string;
        data:{[word:string]:{
            main:number;
            ipm:number;
            freq:number;
        }};
    }

    const processData = (data:Array<MultiWordDataRow>, words:Array<string>):Array<FreqItemProps> => {
        return pipe(
            data,
            List.groupBy(x => x.name),
            List.map(
                ([name ,values]) => {
                    const totalIpm = List.reduce((acc, curr) => acc + curr.ipm, 0, values);
                    const wordData:FreqItemProps = {name: name, data: {}};

                    // calculate percentage from frequency
                    List.forEach(item => {
                        wordData.data[item.word] = {
                            main: Maths.roundToPos(100 * item.ipm / totalIpm, 2),
                            ipm: item.ipm,
                            freq: item.freq
                        };
                    }, values);

                    // add also words with no data
                    List.forEach(word => {
                        if (!Dict.hasKey(word, wordData.data)) {
                            wordData.data[word] = {
                                main: 0,
                                ipm: 0,
                                freq: 0
                            };
                        }
                    }, words);

                    return wordData;
                }
            )
        );
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
                <BarChart data={processData(props.data, props.words)}
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
                    <BarChart data={processData(props.data, props.words)} layout="vertical">
                        {props.children}
                    </BarChart>
                </ResponsiveContainer>
            );
        }
    }


    // -------------------------- <BarShape /> --------------------------------------

    const BarShape = (props) => {
        const {
          fill, x, y, width, height,
        } = props;

        return <g>
            <rect x={x} y={y} width={width} height={height} stroke="none" fill={fill} />
            <line x1={x} y1={y} x2={x} y2={y+height} stroke="white" strokeWidth={2} />
            <line x1={x+width} y1={y} x2={x+width} y2={y+height} stroke="white" strokeWidth={2} />
        </g>
    };

    // -------------------------- <Chart /> --------------------------------------

    const Chart:React.SFC<{
        data:Array<MultiWordDataRow>;
        words:Array<string>;
        width:string|number;
        widthFract:number;
        height:string|number;
        isMobile:boolean;
    }> = (props) => {
        const processedData = processData(props.data, props.words);
        const shouldShortenText = props.isMobile || props.widthFract < 3;
        const maxLabelLength = pipe(
            processedData,
            List.foldl(
                (acc, curr) => acc.concat(shouldShortenText ?
                        Strings.shortenText(curr.name, CHART_LABEL_MAX_LEN).split(' ') :
                        curr.name),
                [] as Array<string>
            ),
            List.maxItem(v => v.length)
        ).length;
        const yAxisWidth = Math.max(60, maxLabelLength * (-4 * props.widthFract + 20));
        const dataKeyFn = (word:string) => (item:FreqItemProps) => item.data[word].main;
        return (
            <div className="Chart">
                <ChartWrapper data={props.data} words={props.words} isMobile={props.isMobile} width={props.width} height={props.height}>
                    {List.map(
                        (word, index) => <Bar key={`word:${index}`} dataKey={dataKeyFn(word)} isAnimationActive={false} name={word}
                                                stackId='a' fill={theme.cmpCategoryColor(index, props.words.length)} shape={<BarShape/>} />,
                        props.words
                    )};
                    <XAxis type="number" unit="%" ticks={[0, 25, 50, 75, 100]} domain={[0, 100]} interval={0} />
                    <YAxis type="category" dataKey="name" width={yAxisWidth} interval={0}
                            tickFormatter={value => shouldShortenText ? Strings.shortenText(value, CHART_LABEL_MAX_LEN) : value}/>
                    <Legend />
                    <Tooltip cursor={false} isAnimationActive={false}
                        content={<globComponents.AlignedRechartsTooltip multiWord={true} colors={idx => theme.cmpCategoryColor(idx, props.words.length)}/>}
                        formatter={(value, name, props) => ([[[value, '%'], [props.payload.data[name].ipm, 'ipm'], [`(abs. ${props.payload.data[name].freq})`, '']], name])} />
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
                    {List.map((word, idx) => <th key={`${word}Occurrence`} colSpan={2}>
                        {`[${idx+1}] ${word}`}
                    </th>, props.words)}
                </tr>
                <tr>
                    <th key={`totalIpm`}>{ut.translate('freq_comparison__table_heading_freq_rel')}</th>
                    <th key={`totalAbs`}>{ut.translate('freq_comparison__table_heading_freq_abs')}</th>
                    {List.reduce((acc, word) => [...acc,
                        <th key={`${word}Ipm`}>{ut.translate('freq_comparison__table_heading_freq_rel')}</th>,
                        <th key={`${word}Abs`}>{ut.translate('freq_comparison__table_heading_freq_abs')}</th>
                    ], [], props.words)}
                </tr>
            </thead>
            <tbody>
                {pipe(processedData, List.map((row, category) =>
                    <tr key={category}>
                        <td key={category}>{row.name}</td>
                        <td key={`${category}Ipm`} className="num">
                            {List.reduce((ipmSum, word) => ipmSum + row.data[word].ipm, 0, props.words).toFixed(2)}
                        </td>
                        <td key={`${category}Abs`} className="num">
                            {List.reduce((absSum, word) => absSum + row.data[word].freq, 0, props.words)}
                        </td>
                        {List.reduce((acc, word) => [...acc,
                            <td key={`${word}Ipm`} className="num">{row.data[word].ipm}<br/>({row.data[word].main}%)</td>,
                            <td key={`${word}Abs`} className="num">{row.data[word].freq}</td>
                        ], [], props.words)}
                    </tr>
                ))}
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
                        hasData={List.find(v => v.isReady && v.data.length > 0, this.props.blocks) !== undefined}
                        sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlink}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <div className="FreqComparisonTile">
                        {this.props.isAltViewMode ?
                            <div className="tables">{
                                pipe(
                                    this.props.blocks,
                                    List.filter(block => block.isReady),
                                    List.map(block => (
                                        <div key={`${block.label}Wrapper`} className="table">
                                            <h3 key={`${block.label}Heading`} style={{textAlign: 'center'}}>{block.label}</h3>
                                            <DataTable key={`${block.label}Table`} data={block.data} words={block.words}/>
                                        </div>
                                    ))
                                )
                            }</div>:
                            <div className={`charts${this.props.isBusy ? ' incomplete' : ''}`}
                                    ref={this.chartsRef} onScroll={this.handleScroll}
                                    style={{flexWrap: this.props.isMobile ? 'nowrap' : 'wrap'}}>
                                {pipe(
                                    this.props.blocks,
                                    List.filter(block => block.isReady),
                                    List.map(block => {
                                        const chartWidth = this.props.isMobile ? (this.props.renderSize[0] * 0.9).toFixed() : "90%";
                                        return  (
                                            <div key={block.ident} style={{width: chartsViewBoxWidth, height: "100%"}}>
                                                <h3>{block.label}</h3>
                                                {block.data.length > 0 ?
                                                    <Chart data={block.data} words={block.words} width={chartWidth}
                                                                widthFract={this.props.widthFract}
                                                                height={70 + List.groupBy(x => x.name, block.data).length * 25}
                                                            isMobile={this.props.isMobile} /> :
                                                    <p className="note" style={{textAlign: 'center'}}>
                                                        {ut.translate('freq_comparison__no_result')}
                                                    </p>
                                                }
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        }
                        {this.props.isMobile && this.props.blocks.length > 1 && !this.props.isAltViewMode ?
                            <globComponents.HorizontalBlockSwitch htmlClass="ChartSwitch"
                                    blockIndices={List.map((_, i) => i, this.props.blocks)}
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