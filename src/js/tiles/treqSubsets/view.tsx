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
import * as Immutable from 'immutable';
import { ActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { CoreTileComponentProps, TileComponent } from '../../common/types';
import { GlobalComponents } from '../../views/global';
import { TreqSubsetModel, TreqSubsetsModelState, TranslationSubset } from './model';
import { TreqTranslation } from '../../common/api/treq';
import { Theme } from '../../common/theme';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:TreqSubsetModel):TileComponent {

    const globalComponents = ut.getComponents();


    // ------- <ChartWrapper /> ---------------------------------------------------

    const ChartWrapper:React.SFC<{
        data:Immutable.List<TreqTranslation>;
        width:string|number;
        height:string|number;
        isMobile:boolean;

    }> = (props) => {
        if (props.isMobile) {
            return (
                <BarChart data={props.data.toArray()}
                        width={typeof props.width === 'string' ? parseInt(props.width) : props.width}
                        height={typeof props.height === 'string' ? parseInt(props.height) : props.height}
                        layout="vertical"
                        isAnimationActive={false}>
                    {props.children}
                </BarChart>
            );

        } else {
            return (
                <ResponsiveContainer width={props.width} height={props.height}>
                    <BarChart data={props.data.toArray()} layout="vertical">
                        {props.children}
                    </BarChart>
                </ResponsiveContainer>
            );
        }
    }


    // -------------------------- <Chart /> --------------------------------------

    const Chart:React.SFC<{
        data:Immutable.List<TreqTranslation>;
        width:string|number;
        height:string|number;
        isMobile:boolean;

    }> = (props) => {
        const maxLabelWidth = props.data.max((v1, v2) => v1.right.length - v2.right.length).right.length;
        return (
            <div className="Chart">
                <ChartWrapper data={props.data} isMobile={props.isMobile} width={props.width} height={props.height}>
                    <CartesianGrid />
                    <Bar data={props.data.toArray()} dataKey="perc" fill={theme.barColor(0)} isAnimationActive={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="right" width={Math.max(60, maxLabelWidth * 8)} />
                    <Legend />
                    <Tooltip cursor={false} isAnimationActive={false} />
                </ChartWrapper>
            </div>
        );
    };

    // --------------------- <SubsetChart /> ----------------------------

    const SubsetChart:React.SFC<{
        data:TranslationSubset;
        isMobile:boolean;

    }> = (props) => {
        return (
            <div>
                <h3>{props.data.label}:</h3>
                <Chart data={props.data.translations} width={200} height={450} isMobile={props.isMobile} />
            </div>
        );
    }

    // --------------------- <TreqSubsetsView /> ----------------------------

    class TreqSubsetsView extends React.PureComponent<TreqSubsetsModelState & CoreTileComponentProps> {

        render() {
            return (
                <globalComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.subsets.flatMap(v => v.translations).size > 0}
                        sourceIdent={{corp: 'InterCorp'}}>
                    <div className="TreqSubsetsView">
                        <div className="charts">
                            {this.props.subsets.map(subset =>
                                subset.translations.size > 0 ?
                                    <div key={subset.ident} className="cell">
                                        <SubsetChart data={subset} isMobile={this.props.isMobile} />
                                    </div> :
                                    null)
                            }
                        </div>
                    </div>
                </globalComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<any, any>(TreqSubsetsView, model);
}
