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
import { ActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import * as Immutable from 'immutable';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Theme } from '../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../common/types';
import { GlobalComponents } from '../../views/global';
import { DataItemWithWCI, ActionName, Actions } from './common';
import { TimeDistribModel, TimeDistribModelState } from './model';

interface MultiChartItem {
    datetime:string;
    ipmInterval1:[number, number];
    ipmInterval2:[number, number];
}

function mergeDataSets(data1:Immutable.List<DataItemWithWCI>, data2:Immutable.List<DataItemWithWCI>):Array<MultiChartItem> {
    return data1.map(v => ({
        datetime: v.datetime,
        ipmInterval:[v.ipmInterval[0], v.ipmInterval[1]],
        src: 0
    })).concat(
        data2.map(v => ({
            datetime: v.datetime,
            ipmInterval:[v.ipmInterval[0], v.ipmInterval[1]],
            src: 1
        }))
    ).groupBy(v => v.datetime)
    .map(v => ({
        datetime: v.get(0).datetime,
        ipmInterval1: v.find(x => x.src === 0, null, {ipmInterval: [null, null], src: 0, datetime: null}).ipmInterval as [number, number],
        ipmInterval2: v.find(x => x.src === 1, null, {ipmInterval: [null, null], src: 1, datetime: null}).ipmInterval as [number, number]
    }))
    .sort((v1, v2) => parseInt(v1.datetime) - parseInt(v2.datetime))
    .toArray();

}


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:TimeDistribModel):TileComponent {

    const globComponents = ut.getComponents();


    // -------------------------- <TweakControls /> --------------------------------------

    const TweakControls:React.SFC<{
        tileId:number;
        wordCmp:string;

    }> = (props) => {

        const handleInputChange = (e:React.ChangeEvent<HTMLInputElement>) => {
            dispatcher.dispatch<Actions.ChangeCmpWord>({
                name: ActionName.ChangeCmpWord,
                payload: {
                    tileId: props.tileId,
                    value: e.target.value
                }
            });
        };

        const handleSubmit = () => {
            dispatcher.dispatch<Actions.SubmitCmpWord>({
                name: ActionName.SubmitCmpWord,
                payload: {
                    tileId: props.tileId
                }
            });
        };

        return (
            <form>
                <label>
                    {ut.translate('timeDistrib__cmp_with_other_word')}:{'\u00a0'}
                    <input type="text" value={props.wordCmp} onChange={handleInputChange} />
                </label>
                {'\u00a0'}
                <button type="button" className="cnc-button cnc-button-primary" onClick={handleSubmit}>
                    {ut.translate('timeDistrib__cmp_submit')}
                </button>
            </form>
        )
    };

    // -------------------------- <Chart /> --------------------------------------

    const ChartLegend:React.SFC<{
        timeAxisLegend:string;
        metric:string;

    }> = (props) => {
        return (
            <p style={{textAlign: 'center'}}>{ut.translate('timeDistrib__chart_legend_{property}{metric}', {property: props.timeAxisLegend,
                metric: props.metric})}</p>
        );
    }

    // -------------- <Chart /> ------------------------------------------------------

    const Chart:React.SFC<{
        data1:Immutable.List<DataItemWithWCI>;
        data2:Immutable.List<DataItemWithWCI>;
        size:[number, number];
        timeAxisLegend:string;
        isPartial:boolean;

    }> = React.memo((props) => {
        const data = mergeDataSets(props.data1, props.data2);
        return (
            <ResponsiveContainer width="90%" height={props.size[1]}>
                <AreaChart data={data}
                        margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                    <CartesianGrid strokeDasharray="1 1"/>
                    <XAxis dataKey="datetime" interval="preserveStartEnd" minTickGap={0} type="category" />
                    <YAxis />
                    <Tooltip isAnimationActive={false} />
                    <Area type="linear"
                            dataKey="ipmInterval1"
                            name={ut.translate('timeDistrib__estimated_interval')}
                            stroke={props.isPartial ? '#dddddd' : theme.barColor(0)}
                            fill={props.isPartial ? '#eeeeee' : theme.barColor(0)}
                            strokeWidth={1}
                            isAnimationActive={false}
                            connectNulls={true} />
                    <Area type="linear"
                        dataKey="ipmInterval2"
                        name={ut.translate('timeDistrib__estimated_interval')}
                        stroke={props.isPartial ? '#dddddd' : theme.barColor(1)}
                        fill={props.isPartial ? '#eeeeee' : theme.barColor(1)}
                        strokeWidth={1}
                        isAnimationActive={false}
                        connectNulls={true} />
                    <Legend content={<ChartLegend metric={ut.translate('timeDistrib__ipm_human')} timeAxisLegend={props.timeAxisLegend} />} />
                </AreaChart>
            </ResponsiveContainer>
        );
    });

    // -------------- <TimeDistribTile /> ------------------------------------------------------

    class TimeDistribTile extends React.PureComponent<TimeDistribModelState & CoreTileComponentProps> {
        render() {
            return <globComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                            hasData={this.props.data.size > 0}
                            sourceIdent={{corp: this.props.corpname, subcorp: this.props.subcDesc}}>
                    <div className="TimeDistribTile">
                        {this.props.isTweakMode ?
                            <div className="tweak-box"><TweakControls wordCmp={this.props.wordCmp} tileId={this.props.tileId} /></div> :
                            null
                        }
                        <Chart data1={this.props.data} data2={this.props.dataCmp}
                                timeAxisLegend={this.props.timeAxisLegend}
                                size={[this.props.renderSize[0], 300]}
                                isPartial={this.props.isBusy} />
                    </div>
                    </globComponents.TileWrapper>
        }
    }


    return BoundWithProps(TimeDistribTile, model);

}