/*
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
import * as Immutable from 'immutable';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Brush } from 'recharts';

import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { LemmaData } from './common';
import { TimeDistribModel, TimeDistribModelState } from './model';


function mergeDataSets(data:Immutable.List<LemmaData>):Array<{}> {
    let datetimeData:Immutable.Map<string, Immutable.Map<string, any>> = Immutable.Map();
    data.forEach((lemmaData, index) => lemmaData.forEach(d => {
        let dataPoint: Immutable.Map<string, any> = datetimeData.get(d.datetime, Immutable.Map({datetime: d.datetime, occNorm: 0}));
        dataPoint = dataPoint.set(`occValue${index}`, d.ipm);
        dataPoint = dataPoint.set(`occInterval${index}`, d.ipmInterval);
        dataPoint = dataPoint.set('occNorm', dataPoint.get('occNorm') + d.ipm);
        datetimeData = datetimeData.set(d.datetime, dataPoint);
    }));
    return datetimeData.valueSeq().map(value => 
        value.map((v, key) => {
            if (key.startsWith('occValue')) {
                return (100*v/value.get('occNorm')).toFixed(2)
            } else if (key.startsWith('occInterval')) {
                return v.map(d => (100*d/value.get('occNorm')).toFixed(2))
            }
            return v;
        })
    ).toJS();
}


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:TimeDistribModel):TileComponent {

    const globComponents = ut.getComponents();

    // -------------------------- <Chart /> --------------------------------------

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

    }> = React.memo((props) => {        
        const data = mergeDataSets(props.data);        
        return (
            <ResponsiveContainer width={props.isSmallWidth ? '100%' : '90%'} height={props.size[1]}>
                <AreaChart data={data}
                        margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                    <CartesianGrid strokeDasharray="1 1"/>
                    <XAxis dataKey="datetime" interval="preserveStartEnd" minTickGap={0} type="category" />
                    <YAxis domain={[0, 100]} unit='%'/>
                    <Tooltip isAnimationActive={false} />
                    {props.words.map((word, index) =>
                        <Area type="linear"
                            key={`${word}Values`}
                            dataKey={`occValue${index}`}
                            name={ut.translate('multiWordTimeDistrib__estimated_value_for_{word}', {word: word})}
                            stroke={props.isPartial ? '#dddddd' : theme.barColor(index % theme.barColor.length)}
                            fill={'rgba(0,0,0,0)'}  // transparent fill - only line
                            strokeWidth={2}
                            isAnimationActive={false}
                            connectNulls={true} />
                    )}
                    {props.words.map((word, index) =>
                        <Area type="linear"
                            key={`${word}Confidence`}
                            dataKey={`occInterval${index}`}
                            name={ut.translate('multiWordTimeDistrib__estimated_interval_for_{word}', {word: word})}
                            stroke={props.isPartial ? '#dddddd' : theme.barColor(index % theme.barColor.length)}
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

    // -------------- <MultiWordTimeDistribTile /> ------------------------------------------------------

    const MultiWordTimeDistribTile:React.SFC<TimeDistribModelState & CoreTileComponentProps> = (props) => {

        return (
            <globComponents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                        hasData={props.data.size > 0}
                        sourceIdent={{corp: props.corpname, subcorp: props.subcDesc}}
                        supportsTileReload={props.supportsReloadOnError}
                        backlink={props.backlink}>
                <div className="MultiWordTimeDistribTile">
                    <Chart data={props.data}
                            size={[props.renderSize[0], 300]}
                            isPartial={props.isBusy}
                            words={props.wordLabels}
                            isSmallWidth={props.isMobile || props.widthFract < 2} />
                </div>
            </globComponents.TileWrapper>
        );
    };


    return BoundWithProps(MultiWordTimeDistribTile, model);

}