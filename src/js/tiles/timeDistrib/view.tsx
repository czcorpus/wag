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
import {CartesianGrid, XAxis, YAxis, Tooltip, AreaChart, Area, Legend} from 'recharts';
import {ActionDispatcher, ViewUtils, BoundWithProps} from 'kombo';
import { GlobalComponents } from '../../views/global';
import { TimeDistribModel, TimeDistribModelState } from './model';
import {SystemColor} from '../../shared/colors';
import { DataItemWithWCI } from './common';
import { CoreTileComponentProps, TileComponent } from '../../abstract/types';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:TimeDistribModel):TileComponent {

    const globComponents = ut.getComponents();

    // -------------------------- <Chart /> --------------------------------------

    const ChartLegend:React.SFC<{
        distProperty:string;
        metric:string;

    }> = (props) => {
        return (
            <p style={{textAlign: 'center'}}>{ut.translate('timeDistrib__chart_legend_{property}{metric}', {property: props.distProperty,
                metric: props.metric})}</p>
        );
    }

    // -------------- <Chart /> ------------------------------------------------------

    const Chart:React.SFC<{
        data:Array<DataItemWithWCI>;
        size:[number, number];
        distProperty:string;

    }> = (props) => {

        return (
            <AreaChart width={props.size[0] - 30} height={props.size[1]} data={props.data}
                    margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="datetime"/>
                <YAxis />
                <Tooltip isAnimationActive={false} />
                <Area type="linear"
                        dataKey="interval"
                        name={ut.translate('timeDistrib__estimated_interval')}
                        stroke={SystemColor.COLOR_LOGO_GREEN}
                        fill={SystemColor.COLOR_LOGO_GREEN}
                        strokeWidth={1} />
                <Legend content={<ChartLegend metric={ut.translate('timeDistrib__ipm_human')} distProperty={props.distProperty} />} />
            </AreaChart>
        );
    }

    // -------------- <TimeDistribTile /> ------------------------------------------------------

    class TimeDistribTile extends React.PureComponent<TimeDistribModelState & CoreTileComponentProps> {

        render() {
            return <globComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                            hasData={this.props.data.size > 0}
                            sourceIdent={this.props.corpname}
                            subcorpDesc={this.props.subcDesc}>
                    <div className="TimeDistribTile">
                        <Chart data={this.props.data.toArray()}
                                distProperty={this.props.attrValue}
                                size={[this.props.renderSize[0], 300]} />
                    </div>
                    </globComponents.TileWrapper>
        }
    }


    return BoundWithProps(TimeDistribTile, model);

}