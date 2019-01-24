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

import {ActionDispatcher, Bound, ViewUtils} from 'kombo';
import * as React from 'react';
import {ConcordanceTileModel, ConcordanceTileState} from './model';
import { GlobalComponents } from '../../views/global';
import { Line, LineElement } from './api';
import { ActionName } from './actions';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:ConcordanceTileModel):React.ComponentClass {

    const globalCompontents = ut.getComponents();

    // ------------------ <Paginator /> --------------------------------------------

    const Paginator:React.SFC<{
        page:number;

    }> = (props) => {

        const handlePrevPage = () => {
            dispatcher.dispatch({
                name: ActionName.LoadPrevPage
            });
        };

        const handleNextPage = () => {
            dispatcher.dispatch({
                name: ActionName.LoadNextPage
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

    // ------------------ <Controls /> --------------------------------------------

    const Controls:React.SFC<{
        currPage:number;

    }> = (props) => {
        return (
            <form className="Controls cnc-form">
                <fieldset>
                    <div>
                        <label>{ut.translate('concordance__page')}:</label>
                        <Paginator page={props.currPage} />
                    </div>
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

    class ConcordanceTileView extends React.PureComponent<ConcordanceTileState> {

        render() {
            return (
                <globalCompontents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.lines.size > 0}>
                    <div className="service-tile ConcordanceTileView">
                        {this.props.isExpanded ? <div><Controls currPage={this.props.currPage} /><hr /></div> : null}
                        <dl className="summary">
                            <dt>{ut.translate('concordance__num_matching_items')}:</dt>
                            <dd>{ut.formatNumber(this.props.concsize, 0)}</dd>
                            <dt>{ut.translate('concordance__ipm')}:</dt>
                            <dd>{ut.formatNumber(this.props.resultIPM, 2)}</dd>
                        </dl>
                        <hr />
                        <table className="conc-lines">
                            <tbody>
                                {this.props.lines.map(line => <Row key={`${line.toknum}`} data={line} />)}
                            </tbody>
                        </table>
                    </div>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return Bound<ConcordanceTileState>(ConcordanceTileView, model);
}