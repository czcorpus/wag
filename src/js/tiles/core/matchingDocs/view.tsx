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
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';

import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { ActionName, Actions } from './actions';
import { MatchingDocsModel } from './model';
import { MatchingDocsModelState } from '../../../common/models/matchingDocs';
import { DataRow } from '../../../common/api/abstract/matchingDocs';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:MatchingDocsModel):TileComponent {

    const globComponents = ut.getComponents();


    // -------------------------- <TableView /> --------------------------------------

    const TableView:React.SFC<{
        data:Immutable.List<DataRow>;
        from:number;
        to:number;
    }> = (props) => {
        return (
            <table className="data">
                <thead>
                    <tr>
                        <th />
                        <th />
                        <th>{ut.translate('matchingDocs__score')}</th>
                    </tr>
                </thead>
                <tbody>
                    {props.data.map((row, i) => {
                        if (i >= props.from && i < props.to) {
                            return <tr key={`${i}:${row.name}`}>
                                <td>{i+1}</td>
                                <td className="word">{row.name}</td>
                                <td className="num">{ut.formatNumber(row.score)}</td>
                            </tr>
                        } else {
                            return null
                        }
                    })}
                </tbody>
            </table>
        );
    }

    // -------------------------- <MatchingDocsTile /> --------------------------------------

    class MatchingDocsTile extends React.PureComponent<MatchingDocsModelState & CoreTileComponentProps> {

        constructor(props) {
            super(props);
        }

        private handleNextPage():void {
            dispatcher.dispatch<Actions.NextPage>({
                name: ActionName.NextPage,
                payload: {
                    tileId: this.props.tileId
                }
            });
        }

        private handlePreviousPage():void {
            dispatcher.dispatch<Actions.PreviousPage>({
                name: ActionName.PreviousPage,
                payload: {
                    tileId: this.props.tileId
                }
            });
        }

        render() {
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.size > 0}
                        sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlink}
                        supportsTileReload={this.props.supportsReloadOnError}>
                    <div className="MatchingDocsTile">
                        <div className="tables">
                                <div>
                                    {this.props.data.size > 0 ?
                                        <TableView
                                            data={this.props.data}
                                            from={(this.props.currPage - 1) * this.props.maxNumCategoriesPerPage}
                                            to={this.props.currPage * this.props.maxNumCategoriesPerPage} />:
                                        <p className="note" style={{textAlign: 'center'}}>No result</p>
                                    }
                                    <a style={{float: 'left'}} onClick={()=>this.handlePreviousPage()}>previous</a>
                                    <a style={{float: 'right'}} onClick={()=>this.handleNextPage()}>next</a>
                                </div>
                        </div>
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, MatchingDocsModelState>(MatchingDocsTile, model);
}