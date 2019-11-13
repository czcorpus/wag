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
import { FreqDBRow } from '../api';
import { init as chartViewInit } from './chart';
import { init as commonViewInit } from './common';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>) {

    const globalComponents = ut.getComponents();
    const Chart = chartViewInit(dispatcher, ut);
    const commonViews = commonViewInit(dispatcher, ut);


    // -------------------- <SimilarFreqWords /> -----------------------------------------------

    const SimilarFreqWords:React.SFC<{
        data:Array<FreqDBRow>;

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
        data:FreqDBRow;

    }> = (props) => (
        <>
            <dt>{ut.translate('wordfreq_searched_form')}:</dt>
            <dd>{props.data.word}</dd>
            {props.data.pos.length > 0 ?
                <>
                    <dt>lemma:</dt>
                    <dd><strong>{props.data.lemma}</strong></dd>
                    <dt>{ut.translate('wordfreq__pos')}:</dt>
                    <dd>{props.data.pos.map(v => v.label).join(', ')}</dd>
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
        data:Array<FreqDBRow>;

    }> = (props) => {

        const srchWord = props.data.find(v => v.isSearched);
        const similarFreqWords = props.data.filter(v => !v.isSearched);

        return (
            <div className="SingleWordProfile">
                {srchWord ? <SrchWordInfo data={srchWord} /> : null}
                {similarFreqWords.length > 0 ? <SimilarFreqWords data={similarFreqWords} /> : null}
            </div>
        );
    }

    return SingleWordProfile;
}