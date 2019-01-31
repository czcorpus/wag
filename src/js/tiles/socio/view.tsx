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
import * as Immutable from 'immutable';
import * as d3 from 'd3';
import * as d3Scale from 'd3-scale';
import {PieChart, Pie, Cell, Legend} from 'recharts';
import {BoundWithProps} from 'kombo';
import {ActionDispatcher, ViewUtils} from 'kombo';
import { GlobalComponents } from '../../views/global';
import { SocioModel, SocioModelState, SocioDataRow } from './model';
import { CoreTileComponentProps, TileComponent } from '../../abstract/types';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:SocioModel):TileComponent {

    const globalComponents = ut.getComponents();
    const c20 = d3Scale.scaleOrdinal(d3.schemeCategory10).domain(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

    const Chart:React.SFC<{
        data:Immutable.List<SocioDataRow>;
        size:[number, number];
    }> = (props) => {



        const renderCustomizedLabel = ({cx, cy, midAngle, innerRadius, outerRadius, percent, index}) => {
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x  = cx + radius * Math.cos(-midAngle * Math.PI / 180);
            const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

            return (
                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                    {`${(percent).toFixed(1)}%`}
                </text>
            );
        };

        return (
            <PieChart width={props.size[0]} height={props.size[1]}>
                <Pie
                        data={props.data.toArray()}
                        dataKey="percent"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={Math.min(...props.size) / 2.5}
                        fill="#8884d8">
        	        {props.data.map((entry, index) => <Cell key={`cell-${entry.name}`} fill={c20(`${index}`)}/>)}
                </Pie>
                <Legend verticalAlign="top" height={36}/>
            </PieChart>
        );


    };

    class SocioTileView extends React.PureComponent<SocioModelState & CoreTileComponentProps> {

        render() {
            return (
                <globalComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.size > 0}
                        sourceIdent={this.props.corpname}>
                    <div>
                        <Chart data={this.props.data} size={[this.props.renderSize[0], 300]} />
                    </div>
                </globalComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(SocioTileView, model);
}
