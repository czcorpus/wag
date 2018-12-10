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
import {ActionNames, Actions} from '../../models/actions';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<{}>, model:ConcordanceTileModel) {


    class ConcordanceTileView extends React.PureComponent<ConcordanceTileState> {

        render() {
            if (this.props.isBusy) {
                return <img src={ut.createStaticUrl('img/ajax-loader.gif')} />;

            } else {
                return (
                    <div className="ConcordanceTileView">
                        <table className="conc-lines">
                            <tbody>
                                {this.props.lines.map(line => {
                                    return (
                                        <tr key={`${line.toknum}`}>
                                            <td>{line.Left.map((s, i) => <span key={`${line.toknum}-L${i}`}>{s.str}</span>)}</td>
                                            <td>{line.Kwic.map((s, i) => <span key={`${line.toknum}-K${i}`} className="kwic">{s.str}</span>)}</td>
                                            <td>{line.Right.map((s, i) => <span key={`${line.toknum}-R${i}`}>{s.str}</span>)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            }
        }
    }

    return {
        ConcordanceTileView: Bound<ConcordanceTileState>(ConcordanceTileView, model)
    }
}