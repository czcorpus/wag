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
import {ActionDispatcher, ViewUtils, BoundWithProps} from 'kombo';
import { GlobalComponents } from '../../views/global';
import { CoreTileComponentProps, TileComponent } from '../../common/types';
import { SimFreqsModel, SimFreqsModelState } from './model';
import { SimilarlyFreqWord } from './api';



export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:SimFreqsModel):TileComponent {

    const globalComponents = ut.getComponents();

    // -------------------- <NearestFreqWords /> -----------------------------------------------

    const NearestFreqWords:React.SFC<{
        data:Immutable.List<SimilarlyFreqWord>;

    }> = (props) => {
        return (
            <table className="NearestFreqWords cnc-table data">
                <tbody>
                    <tr>
                        <th></th>
                        <th style={{textAlign: 'right'}}>ipm</th>
                    </tr>
                {props.data.map(v => (
                        <tr key={`k:${v.word}`} className={`${v.highlighted ? 'highlighted' : null}`}>
                            <td>{v.word}</td>
                            <td className="num">{ut.formatNumber(v.ipm, 2)}</td>
                        </tr>
                    ))
                }
                </tbody>
            </table>
        );
    }


    // -------------------- <SimilarFreqsTileView /> -----------------------------------------------

    class SimilarFreqsTileView extends React.PureComponent<SimFreqsModelState & CoreTileComponentProps> {

        render() {
            return (
                <globalComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.size > 0} sourceIdent={{corp: this.props.corpname}}>
                    <div className={`SimilarFreqsTileView${this.props.isMobile ? ' mobile' : ''}`}>
                        <NearestFreqWords data={this.props.data} />
                    </div>
                </globalComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(SimilarFreqsTileView, model);
}