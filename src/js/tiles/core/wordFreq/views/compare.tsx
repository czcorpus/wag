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
import { IActionDispatcher, ViewUtils } from 'kombo';
import * as React from 'react';

import { GlobalComponents } from '../../../../views/global';
import { init as commonViewInit } from './common'
import { QueryMatch } from '../../../../common/query';
import { List } from 'cnc-tskit';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>) {

    const commonViews = commonViewInit(dispatcher, ut); // TODO duplicit stuff (see single.tsx)

    // -------------------- <MultiWordProfile /> ---------------------------------------------------

    const MultiWordProfile:React.SFC<{
        matches:Array<QueryMatch>;

    }> = (props) => {

        return (
            <div className="MultiWordProfile">
                <table>
                    <thead>
                        <tr>
                            <th />
                            <th colSpan={2}>
                                {ut.translate('wordfreq__ipm_condensed')}
                            </th>
                            <th>{ut.translate('wordfreq__freq_bands_condensed')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {List.map(
                            (w, i) => (
                                <React.Fragment key={`${w.word}:${w.lemma}:${w.pos}`}>
                                    <tr>
                                        <th className="query-num">{i + 1}.</th>
                                        <td className="word">
                                            <dl className="info">
                                                <dt>{ut.translate('wordfreq_searched_form')}:</dt>
                                                <dd>{w.word}</dd>
                                                {w.pos.length > 0 ?
                                                    <>
                                                        <dt>
                                                            {w.lemma.split(' ').length > 1 ?
                                                                ut.translate('wordfreq__lemmatized_variant') :
                                                                'lemma'
                                                            }:
                                                        </dt>
                                                        <dd>
                                                            <strong>{w.lemma}</strong>
                                                        </dd>
                                                        <dt>{ut.translate('wordfreq__pos')}:{w.pos.length > 1 ? ' (' + ut.translate('wordfreq__multiple_variants') + ')' : ''}:</dt>
                                                        <dd>
                                                        {List.map(
                                                            (v, i) => {
                                                                return (
                                                                    <React.Fragment key={`${i}:${v.value}`}>
                                                                        {List.map(
                                                                            (label, i) => (
                                                                                <React.Fragment key={label}>
                                                                                    {i > 0 ? '\u00a0' : ''}
                                                                                    <span className="squareb">[</span>
                                                                                        {label}
                                                                                    <span className="squareb">]</span>
                                                                                </React.Fragment>
                                                                            ),
                                                                            v.label
                                                                        )}
                                                                    </React.Fragment>
                                                                )
                                                            },
                                                            w.pos
                                                        )}
                                                        </dd>
                                                    </> :
                                                    <>
                                                        <dt>{ut.translate('wordfreq__note')}:</dt>
                                                        <dd>{ut.translate('wordfreq__not_in_dict')}</dd>
                                                    </>
                                                }
                                            </dl>
                                        </td>
                                            <td className="num ipm">{w.ipm > 0 ? ut.formatNumber(w.ipm, 2) : <span style={{whiteSpace: "nowrap"}}>--</span>}</td>
                                        <td className="band">{w.ipm > 0 ? <commonViews.Stars freqBand={w.flevel} /> : <div>--</div>}</td>
                                    </tr>
                                </React.Fragment>
                            ),
                            props.matches
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    return MultiWordProfile;

}