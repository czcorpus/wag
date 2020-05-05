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

import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { LemmaData, Actions, ActionName } from './common';
import { TimeDistribModel, TimeDistribModelState } from './model';
import { List, pipe, tuple } from 'cnc-tskit';


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
        List.sort((a, b) => a.year - b.year)
    );

}


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:TimeDistribModel):TileComponent {

    const globComponents = ut.getComponents();

    // -------------------------- <ChartLegend /> --------------------------------------

    const ChartLegend:React.SFC<{
        rcData:{payload:Array<{color:string; payload:{stroke:string; fill:string; name:string}}>};
        metric:string;

    }> = (props) => {

        const mkBoxStyle = (color:string):{[k:string]:string} => ({
            backgroundColor: color
        });

        return (
            <p className="ChartLegend" style={{textAlign: 'center'}}>
                {pipe(
                    props.rcData.payload,
                    List.filter(pitem => !!pitem.payload.name),
                    List.map((pitem, i) => (
                        <span className="item" key={`${pitem.payload.name}:${i}`}><span className="box" style={mkBoxStyle(pitem.color)} />{pitem.payload.name}</span>
                    ))
                )}
                <br />
                ({props.metric})
            </p>
        );
    }

    // -------------------------- <ChartTooltip /> --------------------------------------

    const ChartTooltip:React.SFC<{
        active:boolean;
        payload:Array<{[key:string]:any}>;
        label:string;
        formatter:(value:string,name:string,data:{[key:string]:any}) => [number, number, string];
    }> = (props) => {

        if (props.active && props.payload) {
            const decimalSeparator = ut.formatNumber(0.1).slice(1, -1);
            return <div className="chart-tooltip">
                <table>
                    <tbody>
                        <tr><th colSpan={7}>{props.label} - {ut.translate('multiWordTimeDistrib__estimated_trend_for')}</th></tr>
                        {List.map(
                            data => {
                                const [percValue, ipmValue, name] = props.formatter(data.value, data.name, data);
                                if (!name) {
                                    return null;
                                }
                                const [percWh, percDec] = ut.formatNumber(percValue, 1).split(decimalSeparator);
                                const [ipmWh, ipmDec] = ut.formatNumber(ipmValue, 1).split(decimalSeparator);
                                return <tr key={name}>
                                    <td className='label' style={{backgroundColor: data.color}}>{name}</td>
                                    <td className='numWhole'>{percWh}</td>
                                    <td className='numDec'>{percDec ? decimalSeparator + percDec : null}</td>
                                    <td className='unit'>%</td>
                                    <td className='numWhole'>{ipmWh}</td>
                                    <td className='numDec'>{ipmDec ? decimalSeparator + ipmDec : null}</td>
                                    <td className='unit'>ipm</td>
                                </tr>
                            },
                            props.payload
                        )}
                    </tbody>
                </table>
            </div>;
        }

        return null;
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
            dispatcher.dispatch<Actions.ZoomMouseLeave>({
                name: ActionName.ZoomMouseLeave,
                payload: {
                    tileId: this.props.tileId
                }
            });
        }

        private zoomMouseDown(e) {
            if (e !== null) {
                dispatcher.dispatch<Actions.ZoomMouseDown>({
                    name: ActionName.ZoomMouseDown,
                    payload: {
                        tileId: this.props.tileId,
                        value: Number(e.activeLabel)
                    }
                });
            }
        }

        private zoomMouseMove(e) {
            if (this.props.refArea.some(v => v !== null)) {
                dispatcher.dispatch<Actions.ZoomMouseMove>({
                    name: ActionName.ZoomMouseMove,
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
                dispatcher.dispatch<Actions.ZoomMouseUp>({
                    name: ActionName.ZoomMouseUp,
                    payload: {
                        tileId: this.props.tileId,
                        value: Number(e.activeLabel)
                    }
                });
            }
        }

        private zoomReset() {
            dispatcher.dispatch<Actions.ZoomReset>({
                name: ActionName.ZoomReset,
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
            let tickFormatterY:(fracValue:number, name:string, formatterProps:any)=>string;
            let tooltipFormatter:(fracValue:number, name:string, formatterProps:any)=>[number, number, string];
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
                    tickFormatterY = fracValue => `${fracValue * 100}%`;
                    tooltipFormatter = (fracValue, name, formatterProps) => tuple(
                        100 * fracValue,
                        formatterProps.payload.ipmNorm * fracValue,
                        name
                    );
                break;
                case 'ipm':
                    keyFn1 = idx => v => v.ipmValues[idx];
                    keyFn2 = idx => v => v.ipmIntervals[idx];
                    domainY = [0, 'auto'];
                    tickFormatterY = ipmValue => `${ipmValue} ipm`;
                    tooltipFormatter = (ipmValue, name, formatterProps) => [
                        100 * ipmValue/formatterProps.payload.ipmNorm,
                        ipmValue,
                        name
                    ];
                break;
            }

            return (
                <ResponsiveContainer key='chartContainer' width={this.props.isSmallWidth ? '100%' : '90%'} height={this.props.size[1]}>
                    <AreaChart
                        data={data}
                        margin={{top: 10, right: 30, left: 0, bottom: 0}}
                        onMouseLeave = {this.zoomMouseLeave}
                        onMouseDown = {this.zoomMouseDown}
                        onMouseMove = {this.props.refArea[0] ? this.zoomMouseMove : null}
                        onMouseUp = {this.zoomMouseUp}
                    >
                        <CartesianGrid strokeDasharray="1 1"/>
                        <XAxis dataKey="year" minTickGap={0} type="category" allowDataOverflow={true} />
                        <YAxis allowDataOverflow={true} domain={domainY} tickFormatter={tickFormatterY} />
                        <Tooltip isAnimationActive={false}
                            formatter={(value, name, formatterProps) => {
                                if (Array.isArray(value)) {
                                    return [null, null, null];
                                }
                                return tooltipFormatter(value, name, formatterProps);
                            }}
                            content = {ChartTooltip}
                        />
                        {List.map(
                            (word, index) =>
                                <Area type="linear"
                                    key={`${word}Values`}
                                    dataKey={keyFn1(index)}
                                    name={word}
                                    stroke={this.props.isPartial ? '#dddddd' : theme.cmpCategoryColor(index)}
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
                                    fill={this.props.isPartial ? '#eeeeee' : theme.cmpCategoryColor(index)}
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="30" y="20" viewBox="0 0 50 50" preserveAspectRatio="xMaxYMin meet">
                            <g fill="black" fillOpacity="0" stroke={List.every(v => v === null, this.props.zoom) ? "lightgray" : "gray"} strokeWidth="3">
                                <circle cx="20" cy="20" r="14"/>
                                <line x1="30" y1="30" x2="42" y2="42" strokeLinecap="round"/>
                                <line x1="15" y1="15" x2="25" y2="25" strokeLinecap="round"/>
                                <line x1="25" y1="15" x2="15" y2="25" strokeLinecap="round"/>
                            </g>
                            <rect onClick={this.zoomReset} x1="5" y1="5" width="40" height="40" fillOpacity="0"/>
                        </svg>
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
            dispatcher.dispatch<Actions.ChangeTimeWindow>({
                name: ActionName.ChangeTimeWindow,
                payload: {
                    tileId: this.props.tileId,
                    value: parseInt(e.target.value)
                }
            });
        }

        private handleUnitsChange(e) {
            dispatcher.dispatch<Actions.ChangeUnits>({
                name: ActionName.ChangeUnits,
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

    const MultiWordTimeDistribTile:React.SFC<TimeDistribModelState & CoreTileComponentProps> = (props) => (
        <globComponents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                    hasData={List.some(v => v.length > 0, props.data)}
                    sourceIdent={{corp: props.corpname, subcorp: props.subcDesc}}
                    supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}
                    backlink={null}>
            <div className="MultiWordTimeDistribTile">
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
            </div>
        </globComponents.TileWrapper>
    );

    return BoundWithProps(MultiWordTimeDistribTile, model);
}