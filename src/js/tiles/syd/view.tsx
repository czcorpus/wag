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
import {BoundWithProps} from 'kombo';
import {ActionDispatcher, ViewUtils} from 'kombo';
import { GlobalComponents } from '../../views/global';
import { SydModel, SydModelState } from './model';
import { CoreTileComponentProps, TileComponent } from '../../abstract/types';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:SydModel):TileComponent {

    const globComponents = ut.getComponents();

    class SydTileView extends React.PureComponent<SydModelState & CoreTileComponentProps> {

        render() {
            return (
                <globComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={false} sourceIdent={{corp: '??'}}>
                    <div className="SydTileView">
                        <pre>############ in development ###################</pre>
                        <h3>freq calc. benchmark</h3>
                        <table>
                            <tbody>
                                {this.props.result.map((item, i) => {
                                    return (
                                        <tr key={`${item.corpname}:${item.fcrit}`}>
                                            <td>{item.corpname}</td>
                                            <td>{item.fcrit}</td>
                                            <td className="num">{item.total}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        <p>proc time: <strong>{this.props.procTime}</strong>s.</p>
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(SydTileView, model);

}
