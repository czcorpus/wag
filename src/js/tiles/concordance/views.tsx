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
import { Line } from './service';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:ConcordanceTileModel):React.ComponentClass {

    const globalCompontents = ut.getComponents();


    const Row:React.SFC<{
        data:Line;

    }> = (props) => {
        return (
            <tr className="Row">
                <td className="left">{props.data.Left.map((s, i) => <span key={`${props.data.toknum}-L${i}`}>{s.str}</span>)}</td>
                <td className="kwic">{props.data.Kwic.map((s, i) => <span key={`${props.data.toknum}-K${i}`} className="kwic">{s.str}</span>)}</td>
                <td className="right">{props.data.Right.map((s, i) => <span key={`${props.data.toknum}-R${i}`}>{s.str}</span>)}</td>
            </tr>
        );
    }


    class ConcordanceTileView extends React.PureComponent<ConcordanceTileState> {

        render() {
            if (this.props.isBusy) {
                return <globalCompontents.AjaxLoader />;

            } else if (this.props.lines.size === 0) {
                return <div className="service-tile"><globalCompontents.EmptySet fontSize="5em" /></div>;

            } else {
                return (
                    <div className="service-tile ConcordanceTileView">
                        <table className="summary">
                            <tbody>
                                <tr>
                                    <th>
                                        {ut.translate('concordance__num_matching_items')}:
                                    </th>
                                    <td>
                                        {ut.formatNumber(this.props.concsize, 0)}
                                    </td>
                                </tr>
                                <tr>
                                    <th>
                                        {ut.translate('concordance__ipm')}:
                                    </th>
                                    <td>
                                        {ut.formatNumber(this.props.resultIPM, 2)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <table className="conc-lines">
                            <tbody>
                                {this.props.lines.map(line => <Row key={`${line.toknum}`} data={line} />)}
                            </tbody>
                        </table>
                        {this.props.isExpanded ? <div>expanded</div> : null}
                    </div>
                )
            }
        }
    }

    return Bound<ConcordanceTileState>(ConcordanceTileView, model);
}