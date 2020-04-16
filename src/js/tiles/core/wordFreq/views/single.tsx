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

import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../../models/actions';
import { GlobalComponents } from '../../../../views/global';
import { init as commonViewInit } from './common';
import { SimilarFreqWord } from '../../../../common/api/abstract/similarFreq';
import { QueryMatch } from '../../../../common/query';
import { List } from 'cnc-tskit';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>) {

    const commonViews = commonViewInit(dispatcher, ut);


    // -------------------- <SimilarFreqWords /> -----------------------------------------------

    const SimilarFreqWords:React.SFC<{
        data:Array<SimilarFreqWord>;

    }> = (props) => {

        const handleWordClick = (e:React.MouseEvent<HTMLAnchorElement>) => {
            const word = (e.target as Element).getAttribute('data-value');
            dispatcher.dispatch<GlobalActions.ChangeQueryInput>({
                name: GlobalActionName.ChangeQueryInput,
                payload: {
                    value: word,
                    queryIdx: 0
                }
            });
            dispatcher.dispatch<GlobalActions.SubmitQuery>({
                name: GlobalActionName.SubmitQuery
            });
        };

        return (
            <>
                <dt>{ut.translate('wordfreq__main_label')}:</dt>
                <dd className="word-list">
                {props.data.map((word, i) => (
                    <React.Fragment key={`w:${word.lemma}:${word.pos}`}>
                    {i > 0 ? ', ' : ''}
                    <a data-value={word.lemma} onClick={handleWordClick} title={ut.translate('global__click_to_query_word')}>{word.lemma}</a>
                    </React.Fragment>
                ))}
                </dd>
            </>
        );
    };

    // -------------------- <SrchWordInfo /> ---------------------------------------------------

    const SrchWordInfo:React.SFC<{
        data:QueryMatch;

    }> = (props) => (
        <>
            <dt>{ut.translate('wordfreq_searched_form')}:</dt>
            <dd>{props.data.word}</dd>
            {props.data.pos.length > 0 ?
                <>
                    <dt>
                        {props.data.lemma.split(' ').length > 1 ?
                            ut.translate('wordfreq__lemmatized_variant') :
                            'lemma'
                        }:
                    </dt>
                    <dd><strong>{props.data.lemma}</strong></dd>
                    <dt>{ut.translate('wordfreq__pos')}
                        {props.data.pos.length > 1 ? ' (' + ut.translate('wordfreq__multiple_variants') + ')' : ''}:
                    </dt>
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
                            props.data.pos
                        )}
                    </dd>
                    <dt>{ut.translate('wordfreq__freq_bands')}:</dt>
                    <dd><commonViews.Stars freqBand={props.data.flevel} /></dd>
                    <dt>{ut.translate('wordfreq__ipm')}:</dt>
                    <dd>{ut.formatNumber(props.data.ipm, 2)}</dd>
                </> :
                <>
                    <dt>{ut.translate('wordfreq__note')}:</dt>
                    <dd>{ut.translate('wordfreq__not_in_dict')}</dd>
                </>
            }
        </>
    );

    // -------------------- <SingleWordProfile /> ---------------------------------------------------

    const SingleWordProfile:React.SFC<{
        similarFreqWords:Array<SimilarFreqWord>;
        searchedWord:QueryMatch;

    }> = (props) => (
        <div className="SingleWordProfile">
            <dl className="info">
                {props.searchedWord ? <SrchWordInfo data={props.searchedWord} /> : null}
                {props.similarFreqWords.length > 0 ? <SimilarFreqWords data={props.similarFreqWords} /> : null}
            </dl>
        </div>
    );

    return SingleWordProfile;
}