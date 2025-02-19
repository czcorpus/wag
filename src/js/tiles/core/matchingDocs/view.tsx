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

import { Theme } from '../../../page/theme.js';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';
import { Actions } from './actions.js';
import { MatchingDocsModel } from './model.js';
import { MatchingDocsModelState } from '../../../models/tiles/matchingDocs.js';
import { DataRow } from '../../../api/abstract/matchingDocs.js';

import * as S from './style.js';
import { List, Strings } from 'cnc-tskit';


export function init(
    dispatcher:IActionDispatcher,
    ut:ViewUtils<GlobalComponents>,
    theme:Theme,
    model:MatchingDocsModel
):TileComponent {

    const globComponents = ut.getComponents();

    // -------------------------- <TableView /> --------------------------------------

    const TableView:React.FC<{
        heading:Array<string>;
        data:Array<DataRow>;
        from:number;
        to:number;
        linkTemplate:string;
    }> = (props) => {

        return (
            <table className="data">
                <thead>
                    <tr>
                        <th />
                        {List.map(v => <th>{v}</th>, props.heading)}
                        {props.linkTemplate ? <th /> : null}
                        <th>{ut.translate('matchingDocs__score')}</th>
                    </tr>
                </thead>
                <tbody>
                    {props.data.map((row, i) => {
                        if (i >= props.from && i < props.to) {
                            return <tr key={`${i}:${row.displayValues}`}>
                                <td className="rowNum num">{i+1}.</td>
                                {List.map(
                                    v => <td className="document">{v}</td>,
                                    row.displayValues
                                )}
                                {props.linkTemplate ?
                                    <td className="link">
                                        <a href={Strings.substitute(props.linkTemplate, ...row.searchValues)} target="_blank">
                                            <img src={ut.createStaticUrl('external-link.svg')}/>
                                        </a>
                                    </td> :
                                    null
                                }
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
            this.handleNextPage = this.handleNextPage.bind(this);
            this.handlePreviousPage = this.handlePreviousPage.bind(this);
        }

        handleNextPage = () => {
            dispatcher.dispatch<typeof Actions.NextPage>({
                name: Actions.NextPage.name,
                payload: {
                    tileId: this.props.tileId
                }
            });
        }

        handlePreviousPage = () => {
            dispatcher.dispatch<typeof Actions.PreviousPage>({
                name: Actions.PreviousPage.name,
                payload: {
                    tileId: this.props.tileId
                }
            });
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
                                <globComponents.Paginator page={this.props.currPage} numPages={this.props.numPages} onNext={this.handleNextPage} onPrev={this.handlePreviousPage} />
                            </form>
                            : null
                        }
                        <div className="tables">
                            {this.props.data.length > 0 ?
                                <TableView
                                    heading={this.props.heading}
                                    data={this.props.data}
                                    from={(this.props.currPage - 1) * this.props.maxNumCategoriesPerPage}
                                    to={this.props.currPage * this.props.maxNumCategoriesPerPage}
                                    linkTemplate={this.props.linkTemplate} /> :
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