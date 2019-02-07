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

import {ActionDispatcher, BoundWithProps, ViewUtils} from 'kombo';
import * as React from 'react';
import {ConcordanceTileModel, ConcordanceTileState} from './model';
import { GlobalComponents } from '../../views/global';
import { Line, LineElement, ViewMode } from '../../shared/api/concordance';
import { ActionName, Actions } from './actions';
import { TileComponent, CoreTileComponentProps } from '../../abstract/types';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:ConcordanceTileModel):TileComponent {

    const globalCompontents = ut.getComponents();

    // ------------------ <Paginator /> --------------------------------------------

    const Paginator:React.SFC<{
        page:number;
        tileId:number;

    }> = (props) => {

        const handlePrevPage = () => {
            dispatcher.dispatch<Actions.LoadPrevPage>({
                name: ActionName.LoadPrevPage,
                payload: {
                    tileId: props.tileId
                }
            });
        };

        const handleNextPage = () => {
            dispatcher.dispatch<Actions.LoadNextPage>({
                name: ActionName.LoadNextPage,
                payload: {
                    tileId: props.tileId
                }
            });
        };

        return (
            <span className="Paginator">
                <a onClick={handlePrevPage}><img className="arrow" src={ut.createStaticUrl('prev-page.svg')} /></a>
                <input className="page" type="text" readOnly={true} value={props.page} />
                <a onClick={handleNextPage}><img className="arrow" src={ut.createStaticUrl('next-page.svg')} /></a>
            </span>
        );
    };

    // ------------------ <ViewModeSwitch /> --------------------------------------------

    const ViewModeSwitch:React.SFC<{
        mode:ViewMode;
        tileId:number;
    }> = (props) => {

        const handleChange = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch<Actions.SetViewMode>({
                name: ActionName.SetViewMode,
                payload: {
                    mode: evt.target.value as ViewMode,
                    tileId: props.tileId
                }
            });
        };

        return (
            <select value={props.mode} onChange={handleChange}>
                <option value={ViewMode.KWIC}>{ut.translate('global__view_mode_kwic')}</option>
                <option value={ViewMode.SENT}>{ut.translate('global__view_mode_sent')}</option>
            </select>
        );
    };

    // ------------------ <Controls /> --------------------------------------------

    const Controls:React.SFC<{
        currPage:number;
        viewMode:ViewMode;
        tileId:number;

    }> = (props) => {
        return (
            <form className="Controls cnc-form">
                <fieldset>
                        <label>{ut.translate('concordance__page')}:{'\u00a0'}
                        <Paginator page={props.currPage} tileId={props.tileId} />
                        </label>
                        <label>{ut.translate('concordance__view_mode')}:{'\u00a0'}
                            <ViewModeSwitch mode={props.viewMode} tileId={props.tileId} />
                        </label>
                </fieldset>
            </form>
        )
    };

    // ------------------ <RowItem /> --------------------------------------------

    const RowItem:React.SFC<{
        data:LineElement;
        isKwic?:boolean;

    }> = (props) => {
        return (
            <span className={props.isKwic ? 'kwic' : null} title={props.data.mouseover ? props.data.mouseover.join(', ') : null}>
                {props.data.str}
            </span>
        );
    };

    // ------------------ <Row /> --------------------------------------------

    const Row:React.SFC<{
        data:Line;

    }> = (props) => {
        return (
            <tr className="Row">
                <td className="left">{props.data.Left.map((s, i) => <RowItem key={`${props.data.toknum}-L${i}`} data={s} />)}</td>
                <td className="kwic">{props.data.Kwic.map((s, i) => <RowItem key={`${props.data.toknum}-K${i}`} data={s} isKwic={true} />)}</td>
                <td className="right">{props.data.Right.map((s, i) => <RowItem key={`${props.data.toknum}-R${i}`} data={s} />)}</td>
            </tr>
        );
    }


    // ------------------ <ConcordanceTileView /> --------------------------------------------

    class ConcordanceTileView extends React.PureComponent<ConcordanceTileState & CoreTileComponentProps> {

        render() {
            return (
                <globalCompontents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.lines.size > 0}
                        sourceIdent={this.props.corpname}>
                    <div className="ConcordanceTileView">
                        {this.props.isTweakMode ?
                            <div><Controls currPage={this.props.currPage} viewMode={this.props.viewMode} tileId={this.props.tileId} /><hr /></div> :
                            null
                        }
                        <dl className="summary">
                            <dt>{ut.translate('concordance__num_matching_items')}:</dt>
                            <dd>{ut.formatNumber(this.props.concsize, 0)}</dd>
                            <dt>{ut.translate('concordance__ipm')}:</dt>
                            <dd>{ut.formatNumber(this.props.resultIPM, 2)}</dd>
                        </dl>
                        <hr />
                        <table className={`conc-lines${this.props.viewMode === ViewMode.SENT ? ' sent' : ''}`}>
                            <tbody>
                                {this.props.lines.map(line => <Row key={`${line.toknum}`} data={line} />)}
                            </tbody>
                        </table>
                    </div>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, ConcordanceTileState>(ConcordanceTileView, model);
}