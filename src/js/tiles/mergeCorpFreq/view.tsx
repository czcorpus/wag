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
import { MergeCorpFreqModel, MergeCorpFreqModelState} from './model';
import {ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend} from 'recharts';
import { DataRow, BacklinkArgs } from '../../common/api/kontextFreqs';
import { GlobalComponents } from '../../views/global';
import { CoreTileComponentProps, TileComponent, BacklinkWithArgs } from '../../common/types';
import { Theme } from '../../common/theme';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:MergeCorpFreqModel):TileComponent {

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
                        <Bar dataKey="ipm" fill={theme.barColor(0)} isAnimationActive={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} />
                        <Legend />
                        <Tooltip cursor={false} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // -------------------------- <MergeCorpTTDistribTile /> --------------------------------------

    class MergeCorpTTDistribTile extends React.PureComponent<MergeCorpFreqModelState & CoreTileComponentProps> {

        render() {
            const backlinks = this.props.data
                .groupBy(v => v.sourceId)
                .map(v => v.get(0))
                .map<BacklinkWithArgs<BacklinkArgs>>(v => v.backlink)
                .toArray();

            return (
                <globComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.find(v => v.freq > 0) !== undefined}
                        sourceIdent={this.props.sources.groupBy(v => v.corpname).map(v => ({corp: v.first().corpname})).toArray()}
                        backlink={backlinks}>
                    <div className="MergeCorpTTDistribTile">
                        <Chart data={this.props.data} size={[this.props.renderSize[0], 70 + this.props.data.size * this.props.pixelsPerItem]} />
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, MergeCorpFreqModelState>(MergeCorpTTDistribTile, model);
}