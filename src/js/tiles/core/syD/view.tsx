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

import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';
import { SydModel, SydModelState } from './model.js';

import * as S from './style.js';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, model:SydModel):TileComponent {

    const globComponents = ut.getComponents();

    class SydTileView extends React.PureComponent<SydModelState & CoreTileComponentProps> {

        render() {
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.result.find(v => v.items.length > 0) !== undefined}
                        sourceIdent={[this.props.corp1, this.props.corp2].map(v => ({corp: v}))}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <S.SydTileView>
                        <pre>############ in development ###################</pre>
                        <h3>freq calc. benchmark</h3>
                        <table>
                            <tbody>
                                <tr>
                                    <th>corpus</th>
                                    <td>req. id</td>
                                    <th>conc. size</th>
                                    <th>freq. criterium</th>
                                    <th>result size</th>
                                </tr>
                                {this.props.result.map((item, i) => {
                                    return (
                                        <tr key={`${item.reqId}:${item.corpname}:${item.fcrit}`}>
                                            <td>{item.corpname}</td>
                                            <td>{item.reqId}</td>
                                            <td className="num">{ut.formatNumber(item.concsize)}</td>
                                            <td>{item.fcrit}</td>
                                            <td className="num">{ut.formatNumber(item.total)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        <p>proc time: <strong>{this.props.procTime}</strong>s.</p>
                    </S.SydTileView>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(SydTileView, model);

}
