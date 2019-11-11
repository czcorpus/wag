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
    const defaultDataPoint = {datetime: null, occurrenceNorm: 0};
    data.forEach((_, index) => {
        defaultDataPoint[`occurrenceValue${index}`] = 0;
        defaultDataPoint[`occurrenceInterval${index}`] = [0, 0];
    });

    // flatten data structure
    let datetimeData:Immutable.Map<string, Immutable.Map<string, any>> = Immutable.Map();
    data.forEach((lemmaData, index) => lemmaData.forEach(d => {
        let dataPoint: Immutable.Map<string, any> = datetimeData.get(d.datetime, Immutable.Map(defaultDataPoint));
        dataPoint = dataPoint.set(`datetime`, d.datetime)
        dataPoint = dataPoint.set(`occurrenceValue${index}`, d.ipm);
        dataPoint = dataPoint.set(`occurrenceInterval${index}`, d.ipmInterval);
        dataPoint = dataPoint.set('occurrenceNorm', dataPoint.get('occurrenceNorm') + d.ipm);
        datetimeData = datetimeData.set(d.datetime, dataPoint);
    }));

    const sortedData = datetimeData.sortBy((_, k) => parseInt(k)).valueSeq().toList();
    return sortedData
        // aggregate data by sliding window years
        .map((dataPoint, index) =>
            dataPoint.mergeDeepWith((prev, next, key) =>
                key === 'datetime' ? prev :
                    key.startsWith('occurrenceInterval') ? [prev[0] + next[0], prev[1] + next[1]] : prev + next,
                ...sortedData.slice(index, index + averagingYears).filter(v => parseInt(v.get('datetime')) < parseInt(dataPoint.get('datetime')) + averagingYears)[Symbol.iterator]()
            ).toMap())
        // normalize data to percentages
        .map(value =>
            value.map((v, key) => {
                if (key.startsWith('occurrenceValue')) {
                    return (100*v/value.get('occurrenceNorm')).toFixed(2)
                } else if (key.startsWith('occurrenceInterval')) {
                    return v.map(d => (100*d/value.get('occurrenceNorm')).toFixed(2))
                }
                return v;
            }).toMap())
        .toJS();
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
                <AreaChart data={data}
                        margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                    <CartesianGrid strokeDasharray="1 1"/>
                    <XAxis dataKey="datetime" interval="preserveStartEnd" minTickGap={0} type="category" />
                    <YAxis domain={[0, 100]} unit='%' />
                    <Tooltip isAnimationActive={false} formatter={(value, name, props) =>
                        name.startsWith('occurrenceInterval') ? [null, null] : [`${value} %`, name]
                    } />
                    {props.words.map((word, index) =>
                        <Area type="linear"
                            key={`${word}Values`}
                            dataKey={`occurrenceValue${index}`}
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
                            dataKey={`occurrenceInterval${index}`}
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
                        <p>{ut.translate('multiWordTimeDistrib__sliding_window_average')}: {this.props.averagingYears}{'\u00a0'}</p>
                        <input type="range" min="1" max="10" value={this.props.averagingYears} onChange={this.handleInputChange} />
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
                        backlink={props.backlink}>
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