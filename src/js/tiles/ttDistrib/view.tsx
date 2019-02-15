/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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
import * as Immutable from 'immutable';
import * as React from 'react';
import {ActionDispatcher, ViewUtils, BoundWithProps} from 'kombo';
import { TTDistribModel, TTDistribModelState } from './model';
import {ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend} from 'recharts';
import { DataRow } from '../../shared/api/kontextFreqs';
import { GlobalComponents } from '../../views/global';
import { SystemColor } from '../../shared/colors';
import { CoreTileComponentProps, TileComponent } from '../../abstract/types';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:TTDistribModel):TileComponent {

    const globComponents = ut.getComponents();


    // -------------------------- <Chart /> --------------------------------------

    const Chart:React.SFC<{
        data:Immutable.List<DataRow>;
        size:[number, number];
    }> = (props) => {

        return (
            <div className="Chart">
                <ResponsiveContainer width="90%" height={props.size[1] + 50}>
                    <BarChart data={props.data.toArray()} layout="vertical">
                        <CartesianGrid />
                        <Bar dataKey="ipm" fill={SystemColor.COLOR_LOGO_BLUE} isAnimationActive={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} />
                        <Legend />
                        <Tooltip cursor={false} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // -------------------------- <TTDistribTile /> --------------------------------------

    class TTDistribTile extends React.PureComponent<TTDistribModelState & CoreTileComponentProps> {

        render() {
            return (
                <globComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.size > 0}
                        sourceIdent={{corp: this.props.corpname}}>
                    <div className="TTDistribTile">
                        <Chart data={this.props.data} size={[this.props.renderSize[0], this.props.data.size * 50]} />
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, TTDistribModelState>(TTDistribTile, model);
}