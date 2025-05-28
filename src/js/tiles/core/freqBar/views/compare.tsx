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

import { Actions } from '../actions.js';
import { pipe, List, Maths, Strings } from 'cnc-tskit';

import * as S from '../style.js';
import { Formatter, NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent.js';
import { FreqBarModel, FreqBarModelState, FreqDataBlock } from '../model.js';
import { Theme } from '../../../../page/theme.js';
import { GlobalComponents } from '../../../../views/common/index.js';
import { CoreTileComponentProps, TileComponent } from '../../../../page/tile.js';


const CHART_LABEL_MAX_LEN = 15;


export function init(
    dispatcher:IActionDispatcher,
    ut:ViewUtils<GlobalComponents>,
    theme:Theme,
    model:FreqBarModel,
):TileComponent {

    const globComponents = ut.getComponents();

    interface FreqItemProps {
        name:string;
        data:{[word:string]:{
            main:number;
            ipm:number;
            freq:number;
        }};
    }

    const processData = (data:Array<FreqDataBlock>):Array<FreqItemProps> => {
        return pipe(
            data,
            List.flatMap(block => List.map(row => ({word: block.word, ...row}), block.rows)),
            List.filter(item => item.ipm > 0),
            List.groupBy(item => item.name),
            List.map(
                ([name, values]) => {
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

                    return wordData;
                }
            )
        )
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

    const Chart:React.FC<{
        tileId:number;
        data:Array<FreqDataBlock>;
        width:string|number;
        widthFract:number;
        height:string|number;
        isMobile:boolean;
    }> = (props) => {
        const processedData = processData(props.data);
        const minTileHeight = React.useContext(globComponents.TileMinHeightContext);
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
        const dataKeyFn = (word:string) => (item:FreqItemProps) => item.data[word]?.main; // TODO ?
        const tooltipFormatter:Formatter<ValueType, NameType> = (value, name, props) => {
            if (typeof value === 'number') {
                return [
                    `${value}%, ${props.payload.data[name].ipm} ipm, ${ut.translate('global__frequency')}, ${props.payload.data[name].freq}`,
                    name
                ]
            }
            return ['??', '??'];
        };
        const ref = React.useRef(null);
        return (
            <S.Chart ref={ref}>
                <ResponsiveContainer id={`${props.tileId}-download-figure`} width="100%" height="95%" minHeight={minTileHeight} >
                    <BarChart data={processedData} layout="vertical">
                        {List.map((item, index) =>
                            <Bar key={`word:${index}`} dataKey={dataKeyFn(item.word)} isAnimationActive={false} name={item.word}
                                stackId='a' fill={theme.cmpCategoryColor(index, props.data.length)} shape={<BarShape/>} />,
                            props.data,
                        )};
                        <XAxis type="number" unit="%" ticks={[0, 25, 50, 75, 100]} domain={[0, 100]} interval={0} />
                        <YAxis type="category" dataKey="name" width={yAxisWidth} interval={0}
                                tickFormatter={value => shouldShortenText ? Strings.shortenText(value, CHART_LABEL_MAX_LEN) : value}/>
                        <Legend formatter={(value) => <span style={{ color: 'black' }}>{value}</span>} />
                        <Tooltip cursor={false} isAnimationActive={false}
                            content={<globComponents.AlignedRechartsTooltip multiWord={true} colors={(index)=>theme.cmpCategoryColor(index, props.data.length)}/>}
                            formatter={tooltipFormatter} />
                    </BarChart>
                </ResponsiveContainer>
            </S.Chart>
        );
    };

    // -------------- <DataTable /> ---------------------------------------------

    const DataTable:React.FC<{
        data:Array<FreqDataBlock>;

    }> = (props) => {
        const processedData = processData(props.data);
        return <table className="DataTable data cnc-table">
            <thead>
                <tr>
                    <th key="category" rowSpan={2}>{ut.translate('freqBar__table_heading_category')}</th>
                    <th colSpan={2} key="totalOccurrence">{ut.translate('freqBar__table_heading_total_occurrence')}</th>
                    {List.map((item, idx) => <th key={`${item.word}Occurrence`} colSpan={2}>
                        {`[${idx+1}] ${item.word}`}
                    </th>, props.data)}
                </tr>
                <tr>
                    <th key={`totalIpm`}>{ut.translate('freqBar__table_heading_freq_rel')}</th>
                    <th key={`totalAbs`}>{ut.translate('freqBar__table_heading_freq_abs')}</th>
                    {List.reduce((acc, item) => [...acc,
                        <th key={`${item.word}Ipm`}>{ut.translate('freqBar__table_heading_freq_rel')}</th>,
                        <th key={`${item.word}Abs`}>{ut.translate('freqBar__table_heading_freq_abs')}</th>
                    ], [], props.data)}
                </tr>
            </thead>
            <tbody>
                {pipe(processedData, List.map((row, category) =>
                    <tr key={category}>
                        <td key={category}>{row.name}</td>
                        <td key={`${category}Ipm`} className="num">
                            {List.reduce((ipmSum, item) => ipmSum + row.data[item.word].ipm, 0, props.data).toFixed(2)}
                        </td>
                        <td key={`${category}Abs`} className="num">
                            {List.reduce((absSum, item) => absSum + row.data[item.word].freq, 0, props.data)}
                        </td>
                        {List.reduce((acc, item) => [...acc,
                            <td key={`${item.word}Ipm`} className="num">{row.data[item.word].ipm}<br/>({row.data[item.word].main}%)</td>,
                            <td key={`${item.word}Abs`} className="num">{row.data[item.word].freq}</td>
                        ], [], props.data)}
                    </tr>
                ))}
            </tbody>
        </table>
    };

    // -------------------------- <FreqBarTile /> --------------------------------------

    class FreqBarTile extends React.PureComponent<FreqBarModelState & CoreTileComponentProps> {

        private chartsRef:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartsRef = React.createRef();
            this.handleScroll = this.handleScroll.bind(this);
        }

        private handleScroll():void {
            dispatcher.dispatch<typeof Actions.SetActiveBlock>({
                name: Actions.SetActiveBlock.name,
                payload: {
                    idx: Math.round(this.chartsRef.current.scrollLeft / 100), // TODO !!!
                    tileId: this.props.tileId
                }
            });
        }

        render() {
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={List.some(item => item.isReady, this.props.freqData)}
                        sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlinks}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <S.FreqBarTile>
                        {this.props.isAltViewMode ?
                            <S.Tables>{
                                pipe(
                                    this.props.freqData,
                                    List.map(block => (
                                        <div key={`${block.word}Wrapper`} className="table">
                                            <h3 key={`${block.word}Heading`} style={{textAlign: 'center'}}>{block.word}</h3>
                                            <DataTable key={`${block.word}Table`} data={this.props.freqData} />
                                        </div>
                                    ))
                                )
                            }</S.Tables> :
                            <S.Charts $incomplete={this.props.isBusy} ref={this.chartsRef} onScroll={this.handleScroll}>
                                {this.props.freqData.length > 0 ?
                                    <Chart tileId={this.props.tileId} data={this.props.freqData}
                                            width={this.props.tileBoxSize[0]} height={this.props.tileBoxSize[1]}
                                            widthFract={this.props.widthFract}
                                            isMobile={this.props.isMobile} /> :
                                    <p className="note" style={{textAlign: 'center'}}>{ut.translate('freqBar__no_result')}</p>
                                }
                            </S.Charts>
                        }
                    </S.FreqBarTile>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, FreqBarModelState>(FreqBarTile, model);
}