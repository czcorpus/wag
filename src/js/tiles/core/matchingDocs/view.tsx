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
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';

import { Theme } from '../../../page/theme';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile';
import { GlobalComponents } from '../../../views/global';
import { Actions } from './actions';
import { MatchingDocsModel } from './model';
import { MatchingDocsModelState } from '../../../models/tiles/matchingDocs';
import { DataRow } from '../../../api/abstract/matchingDocs';

import * as S from './style';


export function init(
    dispatcher:IActionDispatcher,
    ut:ViewUtils<GlobalComponents>,
    theme:Theme,
    model:MatchingDocsModel
):TileComponent {

    const globComponents = ut.getComponents();


    // ------------------ <Paginator /> --------------------------------------------

    const Paginator:React.FC<{
        page:number;
        numPages:number;
        tileId:number;

    }> = (props) => {

        const handleNextPage = () => {
            dispatcher.dispatch<typeof Actions.NextPage>({
                name: Actions.NextPage.name,
                payload: {
                    tileId: props.tileId
                }
            });
        }

        const handlePreviousPage = () => {
            dispatcher.dispatch<typeof Actions.PreviousPage>({
                name: Actions.PreviousPage.name,
                payload: {
                    tileId: props.tileId
                }
            });
        }

        return (
            <S.Paginator>
                <a onClick={handlePreviousPage} className={`${props.page === 1 ? 'disabled' : null}`}>
                    <img className="arrow" src={ut.createStaticUrl(props.page === 1 ? 'triangle_left_gr.svg' : 'triangle_left.svg')}
                            alt={ut.translate('global__img_alt_triable_left')} />
                </a>
                <input className="page" type="text" readOnly={true} value={`${props.page} / ${props.numPages}`} />
                <a onClick={handleNextPage} className={`${props.page === props.numPages ? 'disabled' : null}`}>
                    <img className="arrow" src={ut.createStaticUrl(props.page === props.numPages ? 'triangle_right_gr.svg' : 'triangle_right.svg')}
                            alt={ut.translate('global__img_alt_triable_right')} />
                </a>
            </S.Paginator>
        );
    };

    // -------------------------- <TableView /> --------------------------------------

    const TableView:React.FC<{
        data:Array<DataRow>;
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
                                <td className="rowNum num">{i+1}.</td>
                                <td className="document">{row.name}</td>
                                <td className="num score">{ut.formatNumber(row.score)}</td>
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

        render() {
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.length > 0}
                        sourceIdent={this.props.corpname ? {corp: this.props.corpname} : null}
                        backlink={this.props.backlink}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <S.MatchingDocsTile>
                        {this.props.isTweakMode ?
                            <form className="cnc-form tile-tweak">
                                <Paginator
                                    page={this.props.currPage}
                                    numPages={this.props.numPages}
                                    tileId={this.props.tileId} />
                            </form>
                            : null
                        }
                        <div className="tables">
                            {this.props.data.length > 0 ?
                                <TableView
                                    data={this.props.data}
                                    from={(this.props.currPage - 1) * this.props.maxNumCategoriesPerPage}
                                    to={this.props.currPage * this.props.maxNumCategoriesPerPage} />:
                                <p className="note" style={{textAlign: 'center'}}>No result</p>
                            }
                        </div>
                    </S.MatchingDocsTile>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, MatchingDocsModelState>(MatchingDocsTile, model);
}