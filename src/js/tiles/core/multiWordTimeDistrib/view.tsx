/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import * as Immutable from 'immutable';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { LemmaData, Actions, ActionName } from './common';
import { TimeDistribModel, TimeDistribModelState } from './model';


function mergeDataSets(data:Immutable.List<LemmaData>, averagingYears:number):Array<{}> {
    const defaultDataPoint = {year: null, ipmNorm: 0};
    data.forEach((_, index) => {
        defaultDataPoint[`ipmValue${index}`] = 0;
        defaultDataPoint[`ipmInterval${index}`] = [0, 0];
    });

    // flatten data structure
    let timeData:Immutable.Map<number, Immutable.Map<string, any>> = Immutable.Map();
    data.forEach((lemmaData, index) => lemmaData.forEach(d => {
        const year = parseInt(d.datetime);
        let dataPoint: Immutable.Map<string, any> = timeData.get(year, Immutable.Map({...defaultDataPoint, year: year}));
        dataPoint = dataPoint.set(`ipmValue${index}`, d.ipm);
        dataPoint = dataPoint.set(`ipmInterval${index}`, d.ipmInterval);
        dataPoint = dataPoint.set('ipmNorm', dataPoint.get('ipmNorm') + d.ipm);
        timeData = timeData.set(year, dataPoint);
    }));

    // fill the gaps
    Immutable.Range(timeData.keySeq().min(), timeData.keySeq().max() + 1).forEach(year => {
        if (!timeData.has(year)) {
            timeData = timeData.set(year, Immutable.Map({...defaultDataPoint, year: year}));
        }
    })

    return timeData
        // aggregate data - sliding average
        .map((dataPoint, year) =>
            Immutable.Map(defaultDataPoint).mergeDeepWith((prev, next, key) =>
                key === 'year' ?
                year :
                    key.startsWith('ipmInterval') ?
                    [prev[0] + next[0]/(2*averagingYears + 1), prev[1] + next[1]/(2*averagingYears + 1)] :
                    prev + next/(2*averagingYears + 1),
                ...timeData.filter((v, k) => k >= year - averagingYears && k <= year + averagingYears).values()[Symbol.iterator]()
            )
        )

        // normalize data to fractions using total norm
        .map(dataPoint =>
            dataPoint.mapEntries(([key, value]) => {
                const norm = dataPoint.get('ipmNorm');
                if (key.startsWith('ipmValue')) {
                    return [key.replace('ipmValue', 'fracValue'), norm > 0 ? value/norm : 0];
                } else if (key.startsWith('ipmInterval')) {
                    return [key.replace('ipmInterval', 'fracInterval'), norm > 0 ? value.map(v => v/norm) : [0, 0]];
                }
                return [key, value];
            })
        )
        .sortBy((_, k) => k).valueSeq().toJS();
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
        words:Immutable.List<string>;
        data:Immutable.List<LemmaData>;
        size:[number, number];
        isPartial:boolean;
        isSmallWidth:boolean;
        averagingYears:number;
    }> = React.memo((props) => {
        const data = mergeDataSets(props.data, props.averagingYears);
        return (
            <ResponsiveContainer width={props.isSmallWidth ? '100%' : '90%'} height={props.size[1]}>
                <AreaChart data={data} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                    <CartesianGrid strokeDasharray="1 1"/>
                    <XAxis dataKey="year" minTickGap={0} type="category" />
                    <YAxis allowDataOverflow={true} domain={[0, 1]} tickFormatter={fracValue => `${fracValue * 100}%`}/>
                    <Tooltip isAnimationActive={false} formatter={(fracValue, name, formatterProps) =>                        
                        name.startsWith('fracInterval') ?
                        [null, null] :
                        [`${(fracValue * 100).toFixed(2)} % (${(formatterProps.payload.ipmNorm * fracValue).toFixed(2)} ipm)`, name]
                    } />
                    {props.words.map((word, index) =>
                        <Area type="linear"
                            key={`${word}Values`}
                            dataKey={`fracValue${index}`}
                            name={ut.translate('multiWordTimeDistrib__estimated_trend_for_{word}', {word: word})}
                            stroke={props.isPartial ? '#dddddd' : theme.barColor(index % theme.barColor.length)}
                            fill={'rgba(0,0,0,0)'}  // transparent fill - only line
                            strokeWidth={2}
                            isAnimationActive={false}
                            connectNulls={true} />
                    )}
                    {props.words.map((word, index) =>
                        <Area type="linear"
                            key={`${word}Confidence`}
                            dataKey={`fracInterval${index}`}
                            name={null}
                            stroke={null}
                            fill={props.isPartial ? '#eeeeee' : theme.barColor(index % theme.barColor.length)}
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

    }> {
        constructor(props) {
            super(props);
            this.handleInputChange = this.handleInputChange.bind(this);
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

        render() {
            return (
                <form>
                    <label>
                        <p>{ut.translate('multiWordTimeDistrib__sliding_window_average')}: &plusmn;{this.props.averagingYears}{'\u00a0'}</p>
                        <input type="range" min="0" max="10" value={this.props.averagingYears} onChange={this.handleInputChange} />
                    </label>
                </form>
            );
        }
    }

    // -------------- <MultiWordTimeDistribTile /> ------------------------------------------------------

    const MultiWordTimeDistribTile:React.SFC<TimeDistribModelState & CoreTileComponentProps> = (props) => {
        return (
            <globComponents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                        hasData={props.data.size > 0}
                        sourceIdent={{corp: props.corpname, subcorp: props.subcDesc}}
                        supportsTileReload={props.supportsReloadOnError}
                        backlink={null}>
                <div className="MultiWordTimeDistribTile">
                    {props.isTweakMode ?
                        <div className="tweak-box">
                            <TweakControls averagingYears={props.averagingYears} tileId={props.tileId} />
                        </div> :
                        null
                    }
                    <Chart data={props.data}
                            size={[props.renderSize[0], 300]}
                            isPartial={props.isBusy}
                            words={props.wordLabels}
                            isSmallWidth={props.isMobile || props.widthFract < 2}
                            averagingYears={props.averagingYears} />
                </div>
            </globComponents.TileWrapper>
        );
    };


    return BoundWithProps(MultiWordTimeDistribTile, model);

}