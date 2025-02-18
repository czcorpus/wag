/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceArea } from 'recharts';

import { Theme } from '../../../page/theme.js';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';
import { LemmaData, Actions } from './common.js';
import { MultiWordTimeDistribModel, MultiWordTimeDistribModelState } from './model.js';
import { List, pipe } from 'cnc-tskit';

import * as S from './style.js';
import { Formatter, NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';


interface ChartDataPoint {
    year:number;
    ipmNorm:number;
    ipmValues:Array<number>; // per lemma
    ipmIntervals:Array<[number, number]>; // per lemma
    fracValues:Array<number>; // per lemma
    fracIntervals:Array<[number, number]>; // per lemma
}

function prepareChartData(data:Array<LemmaData>, averagingYears:number):Array<ChartDataPoint> {

    const mkDefaultDataPoint:()=>ChartDataPoint = () => ({
        year: 0,
        ipmNorm: 0,
        fracValues: List.map(() => 0, data),
        fracIntervals: List.map(() => [0, 0], data),
        ipmValues: List.map(() => 0, data),
        ipmIntervals: List.map(() => [0, 0], data)
    });

    const zipped = List.zipByMappedKey(
        d => d.datetime,
        mkDefaultDataPoint,
        (curr, incom, datasetIdx) => {
            curr.year = parseInt(incom.datetime);
            curr.ipmValues[datasetIdx] = incom.ipm;
            curr.ipmIntervals[datasetIdx] = incom.ipmInterval;
            curr.ipmNorm += incom.ipm;
            return curr;
        },
        data
    );

    return pipe(
        zipped,
        List.map(
            v => {
                const window = List.filter(
                    wItem => wItem.year >= v.year - averagingYears && wItem.year <= v.year + averagingYears,
                    zipped
                );
                v.ipmIntervals = List.map(
                    (_, lemmaIdx) => [
                        List.foldl(
                            (acc, curr) => acc + curr.ipmIntervals[lemmaIdx][0] / window.length,
                            0,
                            window
                        ),
                        List.foldl(
                            (acc, curr) => acc + curr.ipmIntervals[lemmaIdx][1] / window.length,
                            0,
                            window
                        )
                    ],
                    v.ipmIntervals
                );
                v.ipmValues = List.map(
                    (_, lemmaIdx) => List.foldl(
                        (acc, curr) => acc + curr.ipmValues[lemmaIdx] / window.length,
                        0,
                        window
                    ),
                    v.ipmValues
                );
                v.ipmNorm = List.foldl(
                    (acc, curr) => acc + curr.ipmNorm / window.length,
                    0,
                    window
                );
                v.fracIntervals = List.map(
                    ([v1, v2]) => [v1 / v.ipmNorm, v2 / v.ipmNorm],
                    v.ipmIntervals
                );
                v.fracValues = List.map(
                    vx => vx / v.ipmNorm,
                    v.ipmValues
                );
                return v;
            }
        ),
        List.sorted((a, b) => a.year - b.year)
    );

}


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:MultiWordTimeDistribModel):TileComponent {

    const globComponents = ut.getComponents();

    // -------------------------- <ChartLegend /> --------------------------------------

    const ChartLegend:React.FC<{
        rcData:{payload?:Array<{color?:string; payload?:{name?:string; strokeDasharray?:React.ReactText;}}>};
        metric:string;

    }> = (props) => {

        const mkBoxStyle = (color:string):{[k:string]:string} => ({
            backgroundColor: color
        });

        return (
            <S.ChartLegend>
                <span className="caption">{
                    ut.translate('multiWordTimeDistrib__estimated_trend_for')[0].toUpperCase() +
                    ut.translate('multiWordTimeDistrib__estimated_trend_for').slice(1)
                }</span>
                <div className="items">
                    {pipe(
                        props.rcData.payload,
                        List.filter(pitem => !!pitem.payload.name),
                        List.map((pitem, i) => (
                            <span className="item" key={`${pitem.payload.name}:${i}`}><span className="box" style={mkBoxStyle(pitem.color)} />{pitem.payload.name}</span>
                        ))
                    )}
                </div>
                <span>({props.metric})</span>
            </S.ChartLegend>
        );
    }

    // -------------- <Chart /> ------------------------------------------------------

    class Chart extends React.Component<{
        words:Array<string>;
        data:Array<LemmaData>;
        size:[number, number];
        isPartial:boolean;
        isSmallWidth:boolean;
        averagingYears:number;
        units:string;
        zoom:[number, number];
        refArea:[number, number];
        tileId:number;
    }> {
        constructor(props) {
            super(props);
            this.zoomMouseLeave = this.zoomMouseLeave.bind(this);
            this.zoomMouseDown = this.zoomMouseDown.bind(this);
            this.zoomMouseMove = this.zoomMouseMove.bind(this);
            this.zoomMouseUp = this.zoomMouseUp.bind(this);
            this.zoomReset = this.zoomReset.bind(this);
        }

        private zoomMouseLeave() {
            dispatcher.dispatch<typeof Actions.ZoomMouseLeave>({
                name: Actions.ZoomMouseLeave.name,
                payload: {
                    tileId: this.props.tileId
                }
            });
        }

        private zoomMouseDown(e) {
            if (e !== null) {
                dispatcher.dispatch<typeof Actions.ZoomMouseDown>({
                    name: Actions.ZoomMouseDown.name,
                    payload: {
                        tileId: this.props.tileId,
                        value: Number(e.activeLabel)
                    }
                });
            }
        }

        private zoomMouseMove(e) {
            if (this.props.refArea.some(v => v !== null)) {
                dispatcher.dispatch<typeof Actions.ZoomMouseMove>({
                    name: Actions.ZoomMouseMove.name,
                    payload: {
                        tileId: this.props.tileId,
                        value: Number(e.activeLabel)
                    }
                });
            }
        }

        private zoomMouseUp(e) {
            if (e === null) {
                this.zoomMouseLeave();
            } else {
                dispatcher.dispatch<typeof Actions.ZoomMouseUp>({
                    name: Actions.ZoomMouseUp.name,
                    payload: {
                        tileId: this.props.tileId,
                        value: Number(e.activeLabel)
                    }
                });
            }
        }

        private zoomReset() {
            dispatcher.dispatch<typeof Actions.ZoomReset>({
                name: Actions.ZoomReset.name,
                payload: {
                    tileId: this.props.tileId
                }
            });
        }

        render() {
            const data = prepareChartData(this.props.data, this.props.averagingYears)
                .filter(v =>
                    List.every(v => v !== null, this.props.zoom) ?
                    v.year >= this.props.zoom[0] && v.year <= this.props.zoom[1] :
                    true
                );
            let domainY:[number, number]|[number, string];
            let tickFormatterY:(fracValue:number, index:number)=>string;
            let tooltipFormatter:Formatter<ValueType, NameType> = (value, name, item) => ['??', '??'];
            let keyFn1:(lemmaIdx:number)=>(v:ChartDataPoint)=>number;
            let keyFn2:(lemmaIdx:number)=>(v:ChartDataPoint)=>[number, number];
            switch (this.props.units) {
                case '%':
                    keyFn1 = idx => v => v.fracValues[idx];
                    keyFn2 = idx => v => v.fracIntervals[idx];
                    const domainMax =  Math.min(
                        1,
                        Math.round(Math.max(...List.map(v => Math.max(...v.fracValues), data)) * 100) / 100 + 0.05
                    );
                    domainY = [0, domainMax];
                    tickFormatterY = fracValue => `${ut.formatNumber(fracValue * 100)} %`;
                    tooltipFormatter = (fracValue, name, formatterProps) => {
                        if (typeof fracValue === 'number') {
                            return [
                                `${ut.formatNumber(100 * fracValue)}% (${ut.formatNumber(formatterProps.payload.ipmNorm * fracValue)} ipm)`,
                                name
                            ];
                        } else if (Array.isArray(fracValue)) {
                            return null; // remove confidence interval data from tooltip
                        }
                        return ['??', '??'];
                    }
                break;
                case 'ipm':
                    keyFn1 = idx => v => v.ipmValues[idx];
                    keyFn2 = idx => v => v.ipmIntervals[idx];
                    domainY = [0, 'auto'];
                    tickFormatterY = ipmValue => `${ut.formatNumber(ipmValue)} ipm`;
                    tooltipFormatter = (ipmValue, name, formatterProps) => {
                        if (typeof ipmValue === 'number') {
                            return [
                                `${ut.formatNumber(100 * ipmValue/formatterProps.payload.ipmNorm)}% (${ut.formatNumber(ipmValue)} ipm)`,
                                name
                            ];
                        } else if (Array.isArray(ipmValue)) {
                            return null; // remove confidence interval data from tooltip
                        }
                        return ['??', '??'];
                    };
                break;
            }
            return (
                <ResponsiveContainer key='chartContainer' width={this.props.isSmallWidth ? '100%' : '90%'} height={this.props.size[1]}>
                    <AreaChart
                        data={data}
                        margin={{top: 50, right: 2, left: 0, bottom: 0}}
                        onMouseLeave = {this.zoomMouseLeave}
                        onMouseDown = {this.zoomMouseDown}
                        onMouseMove = {this.props.refArea[0] ? this.zoomMouseMove : null}
                        onMouseUp = {this.zoomMouseUp}
                    >
                        <CartesianGrid strokeDasharray="1 1"/>
                        <XAxis dataKey="year" minTickGap={0} type="category" allowDataOverflow={true} />
                        <YAxis allowDataOverflow={true} domain={domainY} tickFormatter={tickFormatterY} />
                        <Tooltip isAnimationActive={false}
                            formatter={tooltipFormatter}
                            content = {<globComponents.AlignedRechartsTooltip multiWord={true} colors={idx => theme.cmpCategoryColor(idx, this.props.words.length)}/>}
                        />
                        {List.map(
                            (word, index) =>
                                <Area type="linear"
                                    key={`${word}Values`}
                                    dataKey={keyFn1(index)}
                                    name={word}
                                    stroke={this.props.isPartial ? '#dddddd' : theme.cmpCategoryColor(index, this.props.words.length)}
                                    fill={'rgba(0,0,0,0)'}  // transparent fill - only line
                                    strokeWidth={2}
                                    isAnimationActive={false}
                                    connectNulls={true} />,
                            this.props.words
                        )}
                        {List.map(
                            (word, index) =>
                                <Area type="linear"
                                    key={`${word}Confidence`}
                                    dataKey={keyFn2(index)}
                                    name={null}
                                    stroke={null}
                                    fill={this.props.isPartial ? '#eeeeee' : theme.cmpCategoryColor(index, this.props.words.length)}
                                    strokeWidth={1}
                                    isAnimationActive={false}
                                    connectNulls={true} />,
                            this.props.words
                        )}
                        {
                            (this.props.refArea[0] && this.props.refArea[1]) ?
                            <ReferenceArea x1={this.props.refArea[0]} x2={this.props.refArea[1]}  strokeOpacity={0.3} /> :
                            null
                        }
                        <Legend content={(props) => <ChartLegend metric={ut.translate('multiWordTimeDistrib__occurence_human')} rcData={props} />} />
                        {List.every(v => v === null, this.props.zoom) ? null :
                            <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="30" y="20" viewBox="0 0 50 50" preserveAspectRatio="xMaxYMin meet">
                                <g fillOpacity="0" stroke="gray" strokeWidth="3">
                                    <circle cx="20" cy="20" r="14"/>
                                    <line x1="30" y1="30" x2="42" y2="42" strokeLinecap="round"/>
                                    <line x1="15" y1="15" x2="25" y2="25" strokeLinecap="round"/>
                                    <line x1="25" y1="15" x2="15" y2="25" strokeLinecap="round"/>
                                </g>
                                <rect onClick={this.zoomReset} x1="5" y1="5" width="40" height="40" fillOpacity="0"/>
                            </svg>
                        }
                    </AreaChart>
                </ResponsiveContainer>
            );
        }
    }

    // -------------------------- <TweakControls /> --------------------------------------

    class TweakControls extends React.Component<{
        tileId:number;
        averagingYears:number;
        units:string;
    }> {
        constructor(props) {
            super(props);
            this.handleInputChange = this.handleInputChange.bind(this);
            this.handleUnitsChange = this.handleUnitsChange.bind(this);
        }

        private handleInputChange(e:React.ChangeEvent<HTMLInputElement>) {
            dispatcher.dispatch<typeof Actions.ChangeTimeWindow>({
                name: Actions.ChangeTimeWindow.name,
                payload: {
                    tileId: this.props.tileId,
                    value: parseInt(e.target.value)
                }
            });
        }

        private handleUnitsChange(e) {
            dispatcher.dispatch<typeof Actions.ChangeUnits>({
                name: Actions.ChangeUnits.name,
                payload: {
                    tileId: this.props.tileId,
                    units: e.target.value
                }
            });
        }

        render() {
            return (
                <form style={{minHeight: "2em"}}>
                    <label htmlFor="unitsSelect">{ut.translate('multiWordTimeDistrib__units')}:{'\u00a0'}
                        <select id="unitsSelect" name="units" value={this.props.units} onChange={this.handleUnitsChange} >
                            <option value="%">%</option>
                            <option value="ipm">ipm</option>
                        </select>
                    </label>
                    <label htmlFor="intervalSelect">{ut.translate('multiWordTimeDistrib__sliding_window_average')}:{'\u00a0'}
                        <span className="range">&plusmn;{this.props.averagingYears}</span>
                        <input id="intervalSelect" type="range" min="0" max="10" value={this.props.averagingYears} onChange={this.handleInputChange} />
                    </label>
                </form>
            );
        }
    }

    // -------------- <MultiWordTimeDistribTile /> ------------------------------------------------------

    const MultiWordTimeDistribTile:React.FC<MultiWordTimeDistribModelState & CoreTileComponentProps> = (props) => (
        <globComponents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                    hasData={List.some(v => v.length > 0, props.data)}
                    sourceIdent={{corp: props.corpname, subcorp: props.subcDesc}}
                    supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}
                    backlink={props.backlinks}>
            <S.MultiWordTimeDistribTile>
                {props.isTweakMode ?
                    <div className="tweak-box">
                        <TweakControls averagingYears={props.averagingYears} tileId={props.tileId} units={props.units} />
                    </div> :
                    null
                }
                <Chart data={props.data}
                        size={[props.renderSize[0], 300]}
                        isPartial={props.isBusy}
                        words={props.wordLabels}
                        isSmallWidth={props.isMobile || props.widthFract < 2}
                        averagingYears={props.averagingYears}
                        units={props.units}
                        zoom={props.zoom}
                        refArea={props.refArea}
                        tileId={props.tileId} />
            </S.MultiWordTimeDistribTile>
        </globComponents.TileWrapper>
    );

    return BoundWithProps(MultiWordTimeDistribTile, model);
}