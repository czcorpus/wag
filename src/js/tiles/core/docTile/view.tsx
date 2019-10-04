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

import { DataRow } from '../../../common/api/kontext/freqs';
import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { ActionName, Actions } from './actions';
import { DocModel, DocModelState } from './model';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:DocModel):TileComponent {

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
                        <th>{ut.translate('docTile__abs_freq')}</th>
                        <th>{ut.translate('docTile__rel_freq')}</th>
                    </tr>
                </thead>
                <tbody>
                    {props.data.map((row, i) => {
                        if (i >= props.from && i < props.to) {
                            return <tr key={`${i}:${row.name}`}>
                                <td>{i+1}</td>
                                <td className="word">{row.name}</td>
                                <td className="num">{ut.formatNumber(row.freq)}</td>
                                <td className="num">{ut.formatNumber(row.ipm)}</td>
                            </tr>
                        } else {
                            return null
                        }
                    })}
                </tbody>
            </table>
        );
    }

    // -------------------------- <DocTile /> --------------------------------------

    class DocTile extends React.PureComponent<DocModelState & CoreTileComponentProps> {

        private chartsRef:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartsRef = React.createRef();
            this.handleScroll = this.handleScroll.bind(this);
            this.handleDotClick = this.handleDotClick.bind(this);
        }

        private handleScroll():void {
            dispatcher.dispatch<Actions.SetActiveBlock>({
                name: ActionName.SetActiveBlock,
                payload: {
                    idx: Math.round(this.chartsRef.current.scrollLeft / this.props.renderSize[0]),
                    tileId: this.props.tileId
                }
            });
        }

        private handleDotClick(idx:number) {
            if (this.chartsRef.current && this.props.isMobile) {
                this.chartsRef.current.scrollLeft = Math.round(this.props.renderSize[0] * 0.92 * idx);
            }
        }

        private handleNextPage(blockId: string):void {
            dispatcher.dispatch<Actions.NextPage>({
                name: ActionName.NextPage,
                payload: {
                    tileId: this.props.tileId,
                    blockId: blockId
                }
            });
        }

        private handlePreviousPage(blockId: string):void {
            dispatcher.dispatch<Actions.PreviousPage>({
                name: ActionName.PreviousPage,
                payload: {
                    tileId: this.props.tileId,
                    blockId: blockId
                }
            });
        }

        render() {
            const chartsViewBoxWidth = this.props.isMobile ? '100%' : `${100 / this.props.blocks.size}%`;
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.blocks.find(v => v.isReady) !== undefined}
                        sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlink}
                        supportsTileReload={this.props.supportsReloadOnError}>
                    <div className="DocTile">
                        <div className={`tables${this.props.isBusy ? ' incomplete' : ''}`} ref={this.chartsRef} onScroll={this.handleScroll}>
                            {this.props.blocks.filter(block => block.isReady).map(block => {
                                return  (
                                    <div key={block.ident} style={{width: chartsViewBoxWidth, height: "100%"}}>
                                        <h3>{block.label}</h3>
                                        {block.data.size > 0 ?
                                            <TableView
                                                data={block.data}
                                                from={(this.props.blockPage.get(block.ident)-1)*this.props.maxNumCategoriesPerPage}
                                                to={this.props.blockPage.get(block.ident)*this.props.maxNumCategoriesPerPage} />:
                                            <p className="note" style={{textAlign: 'center'}}>No result</p>
                                        }
                                        <a style={{float: 'left'}} onClick={()=>this.handlePreviousPage(block.ident)}>previous</a>
                                        <a style={{float: 'right'}} onClick={()=>this.handleNextPage(block.ident)}>next</a>
                                    </div>
                                );
                            })}
                        </div>
                        {this.props.isMobile && this.props.blocks.size > 1 ?
                            <globComponents.HorizontalBlockSwitch
                                    blockIndices={this.props.blocks.map((_, i) => i).toList()}
                                    currentIdx={this.props.activeBlock}
                                    onChange={this.handleDotClick} /> :
                            null
                        }
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, DocModelState>(DocTile, model);
}