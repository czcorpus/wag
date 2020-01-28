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
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { LemmaData, Actions, ActionName } from './common';
import { TimeDistribModel, TimeDistribModelState } from './model';
import * as C from '../../../common/collections';


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
        fracValues: data.map(() => 0),
        fracIntervals: data.map(() => [0, 0]),
        ipmValues: data.map(() => 0),
        ipmIntervals: data.map(() => [0, 0])
    });

    const zipped = C.zipByMappedKey(
        data,
        d => d.datetime,
        mkDefaultDataPoint,
        (curr, incom, datasetIdx) => {
            curr.year = parseInt(incom.datetime);
            curr.ipmValues[datasetIdx] = incom.ipm;
            curr.ipmIntervals[datasetIdx] = incom.ipmInterval;
            curr.ipmNorm += incom.ipm;
            return curr;
        }
    );

    return zipped.map(
        v => {
            const window = zipped.filter(
                wItem => wItem.year >= v.year - averagingYears && wItem.year <= v.year + averagingYears);
            v.ipmIntervals = v.ipmIntervals.map((_, lemmaIdx) => [
                window.reduce((acc, curr) => acc + curr.ipmIntervals[lemmaIdx][0] / window.length, 0),
                window.reduce((acc, curr) => acc + curr.ipmIntervals[lemmaIdx][1] / window.length, 0)
            ]);
            v.ipmValues = v.ipmValues.map((_, lemmaIdx) => window.reduce((acc, curr) => acc + curr.ipmValues[lemmaIdx] / window.length, 0));
            v.ipmNorm = window.reduce((acc, curr) => acc + curr.ipmNorm / window.length, 0);
            v.fracIntervals = v.ipmIntervals.map(([v1, v2]) => [v1 / v.ipmNorm, v2 / v.ipmNorm]);
            v.fracValues = v.ipmValues.map(vx => vx / v.ipmNorm);
            return v;
        }
    )

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
                {props.rcData.payload
                    .filter(pitem => pitem.payload.name)
                    .map((pitem, i) => (
                        <span className="item" key={`${pitem.payload.name}:${i}`}><span className="box" style={mkBoxStyle(pitem.color)} />{pitem.payload.name}</span>
                    ))
                }
                <br />({props.metric})
            </p>
        );
    }

    // -------------- <Chart /> ------------------------------------------------------

    const Chart:React.SFC<{
        words:Array<string>;
        data:Array<LemmaData>;
        size:[number, number];
        isPartial:boolean;
        isSmallWidth:boolean;
        averagingYears:number;
        units:string;
    }> = React.memo((props) => {

        const data = prepareChartData(props.data, props.averagingYears);
        let domainY:[number, number]|[number, string];
        let tickFormatterY, tooltipFormatter;
        let keyFn1:(lemmaIdx:number)=>(v:ChartDataPoint)=>number;
        let keyFn2:(lemmaIdx:number)=>(v:ChartDataPoint)=>[number, number];
        switch (props.units) {
            case '%':
                keyFn1 = idx => v => v.fracValues[idx];
                keyFn2 = idx => v => v.fracIntervals[idx];
                domainY = [0, 1];
                tickFormatterY = fracValue => `${fracValue * 100}%`;
                tooltipFormatter = (fracValue, name, formatterProps) => [`${(fracValue * 100).toFixed(2)} % (${(fracValue * formatterProps.payload.ipmNorm).toFixed(2)} ipm)`, name]
            break;
            case 'ipm':
                keyFn1 = idx => v => v.ipmValues[idx];
                keyFn2 = idx => v => v.ipmIntervals[idx];
                domainY = [0, 'auto'];
                tickFormatterY = ipmValue => `${ipmValue} ipm`;
                tooltipFormatter = (ipmValue, name, formatterProps) => [
                    `${ipmValue.toFixed(2)} ipm (${(ipmValue * 100 / formatterProps.payload.ipmNorm).toFixed(2)} %)`,
                    name
                ];
            break;
        }

        return (
            <ResponsiveContainer width={props.isSmallWidth ? '100%' : '90%'} height={props.size[1]}>
                <AreaChart data={data} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                    <CartesianGrid strokeDasharray="1 1"/>
                    <XAxis dataKey="year" minTickGap={0} type="category" />
                    <YAxis allowDataOverflow={true} domain={domainY} tickFormatter={tickFormatterY}/>
                    <Tooltip isAnimationActive={false} formatter={(value, name, formatterProps) => {
                        if (Array.isArray(value)) {
                            return [null, null];
                        }
                        return tooltipFormatter(value, name, formatterProps);
                    }
                    } />
                    {props.words.map((word, index) =>
                        <Area type="linear"
                            key={`${word}Values`}
                            dataKey={keyFn1(index)}
                            name={ut.translate('multiWordTimeDistrib__estimated_trend_for_{word}', {word: word})}
                            stroke={props.isPartial ? '#dddddd' : theme.barColor(index)}
                            fill={'rgba(0,0,0,0)'}  // transparent fill - only line
                            strokeWidth={2}
                            isAnimationActive={false}
                            connectNulls={true} />
                    )}
                    {props.words.map((word, index) =>
                        <Area type="linear"
                            key={`${word}Confidence`}
                            dataKey={keyFn2(index)}
                            name={null}
                            stroke={null}
                            fill={props.isPartial ? '#eeeeee' : theme.barColor(index)}
                            strokeWidth={1}
                            isAnimationActive={false}
                            connectNulls={true} />
                    )}
                    <Legend content={(props) => <ChartLegend metric={ut.translate('multiWordTimeDistrib__occurence_human')} rcData={props} />} />
                </AreaChart>
            </ResponsiveContainer>
        );
    });

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
                    hasData={props.data.length > 0}
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
                        units={props.units} />
            </div>
        </globComponents.TileWrapper>
    );

    return BoundWithProps(MultiWordTimeDistribTile, model);

}