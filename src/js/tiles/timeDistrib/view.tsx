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
import * as React from 'react';
import {ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, AreaChart, Area, Legend} from 'recharts';
import {ActionDispatcher, ViewUtils, BoundWithProps} from 'kombo';
import { GlobalComponents } from '../../views/global';
import { TimeDistribModel, TimeDistribModelState } from './model';
import { DataItemWithWCI } from './common';
import { CoreTileComponentProps, TileComponent } from '../../common/types';
import { Theme } from '../../common/theme';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:TimeDistribModel):TileComponent {

    const globComponents = ut.getComponents();

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
        data:Array<DataItemWithWCI>;
        size:[number, number];
        timeAxisLegend:string;
        isPartial:boolean;

    }> = (props) => {
        return (
            <ResponsiveContainer width="90%" height={props.size[1]}>
                <AreaChart data={props.data}
                        margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                    <CartesianGrid strokeDasharray="1 1"/>
                    <XAxis dataKey="datetime" interval="preserveStartEnd" minTickGap={0} type="category" />
                    <YAxis />
                    <Tooltip isAnimationActive={false} />
                    <Area type="linear"
                            dataKey="ipmInterval"
                            name={ut.translate('timeDistrib__estimated_interval')}
                            stroke={props.isPartial ? '#dddddd' : theme.barColor(0)}
                            fill={props.isPartial ? '#eeeeee' : theme.barColor(0)}
                            strokeWidth={1}
                            isAnimationActive={false} />
                    <Legend content={<ChartLegend metric={ut.translate('timeDistrib__ipm_human')} timeAxisLegend={props.timeAxisLegend} />} />
                </AreaChart>
            </ResponsiveContainer>
        );
    }

    // -------------- <TimeDistribTile /> ------------------------------------------------------

    class TimeDistribTile extends React.PureComponent<TimeDistribModelState & CoreTileComponentProps> {

        render() {
            return <globComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                            hasData={this.props.data.size > 0}
                            sourceIdent={{corp: this.props.corpname, subcorp: this.props.subcDesc}}>
                    <div className="TimeDistribTile">
                        <Chart data={this.props.data.toArray()}
                                timeAxisLegend={this.props.timeAxisLegend}
                                size={[this.props.renderSize[0], 300]}
                                isPartial={this.props.isBusy} />
                    </div>
                    </globComponents.TileWrapper>
        }
    }


    return BoundWithProps(TimeDistribTile, model);

}