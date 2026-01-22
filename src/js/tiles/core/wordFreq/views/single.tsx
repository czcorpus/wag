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

import { Actions as GlobalActions } from '../../../../models/actions.js';
import { GlobalComponents } from '../../../../views/common/index.js';
import { init as commonViewInit } from './common.js';
import { SimilarFreqWord } from '../../../../api/abstract/similarFreq.js';
import { QueryMatch } from '../../../../query/index.js';
import { List, pipe } from 'cnc-tskit';
import { Actions } from '../actions.js';
import { MainPosAttrValues } from '../../../../conf/index.js';

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>
) {
    const commonViews = commonViewInit(dispatcher, ut);

    // -------------------- <SimilarFreqWords /> -----------------------------------------------

    const SimilarFreqWords: React.FC<{
        data: Array<SimilarFreqWord>;
        expandLemmaPos: string;
        tileId: number;
        mainPosAttr: MainPosAttrValues;
    }> = (props) => {
        const handleWordClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            const word = (e.target as Element).getAttribute('data-value');
            dispatcher.dispatch<typeof GlobalActions.ChangeQueryInput>({
                name: GlobalActions.ChangeQueryInput.name,
                payload: {
                    value: word,
                    queryIdx: 0,
                },
            });
            dispatcher.dispatch<typeof GlobalActions.SubmitQuery>({
                name: GlobalActions.SubmitQuery.name,
            });
        };

        const selectLemma = (e: React.MouseEvent<HTMLAnchorElement>) => {
            const word = (e.target as Element).getAttribute('data-value');
            dispatcher.dispatch<typeof Actions.ExpandLemmaPos>({
                name: Actions.ExpandLemmaPos.name,
                payload: {
                    tileId: props.tileId,
                    lemma: word,
                },
            });
        };

        const deselectLemma = (e: React.MouseEvent<HTMLAnchorElement>) => {
            dispatcher.dispatch<typeof Actions.ExpandLemmaPos>({
                name: Actions.ExpandLemmaPos.name,
                payload: {
                    tileId: props.tileId,
                    lemma: null,
                },
            });
        };

        return (
            <>
                <dt>{ut.translate('wordfreq__main_label')}:</dt>
                <dd className="word-list">
                    {pipe(
                        props.data,
                        List.groupBy((v) => v.lemma),
                        List.map(([lemma, words], i) => (
                            <React.Fragment key={`w:${lemma}`}>
                                {i > 0 ? ', ' : ''}
                                <a
                                    data-value={lemma}
                                    onClick={handleWordClick}
                                    onMouseEnter={
                                        words.length > 1 ? selectLemma : null
                                    }
                                    onMouseLeave={
                                        words.length > 1 ? deselectLemma : null
                                    }
                                    title={ut.translate(
                                        'global__click_to_query_word'
                                    )}
                                >
                                    {lemma}
                                    {words.length > 1 ? (
                                        <span key={`w:${lemma}:pos`}>
                                            <span className="squareb"> [</span>
                                            {pipe(
                                                words,
                                                List.map(
                                                    (word) =>
                                                        word[props.mainPosAttr]
                                                ),
                                                List.map((wordPos) =>
                                                    List.map(
                                                        (pos) =>
                                                            lemma ===
                                                            props.expandLemmaPos
                                                                ? pos.label
                                                                : pos.value,
                                                        wordPos
                                                    ).join(' ')
                                                )
                                            ).join(', ')}
                                            <span className="squareb">]</span>
                                        </span>
                                    ) : null}
                                </a>
                            </React.Fragment>
                        ))
                    )}
                </dd>
            </>
        );
    };

    // -------------------- <SrchWordInfo /> ---------------------------------------------------

    const SrchWordInfo: React.FC<{
        data: QueryMatch;
        mainPosAttr: MainPosAttrValues;
    }> = (props) => (
        <>
            <dt>{ut.translate('wordfreq_searched_form')}:</dt>
            <dd>{props.data.word}</dd>
            {props.data.lemma ? (
                <>
                    <dt>
                        {props.data.lemma.split(' ').length > 1
                            ? ut.translate('wordfreq__lemmatized_variant')
                            : 'lemma'}
                        :
                    </dt>
                    <dd>
                        <strong>
                            {List.map(
                                (lm, i) =>
                                    i > 0 ? (
                                        <span key={`${i}:${lm}`}>
                                            <br />
                                            {lm}
                                        </span>
                                    ) : (
                                        <span key={`${i}:${lm}`}>{lm}</span>
                                    ),
                                props.data.lemma.split('|')
                            )}
                        </strong>
                        {props.data.sublemma &&
                        props.data.sublemma != props.data.lemma ? (
                            <>
                                <br />({ut.translate('global__srch_variant')}{' '}
                                <strong>{props.data.sublemma}</strong>)
                            </>
                        ) : null}
                    </dd>
                    <dt>{ut.translate('wordfreq__pos')}:</dt>
                    <dd>
                        {props.data[props.mainPosAttr].length > 0
                            ? List.map(
                                  (pos, i) => (
                                      <React.Fragment key={`${i}:${pos.value}`}>
                                          {i > 0 ? '\u00a0' : ''}
                                          {pos.label}
                                      </React.Fragment>
                                  ),
                                  props.data[props.mainPosAttr]
                              )
                            : ut.translate('wordfreq__pos_not_specified')}
                    </dd>
                    {props.data.abs > 0 ? (
                        <>
                            <dt>{ut.translate('wordfreq__freq_bands')}:</dt>
                            <dd>
                                <commonViews.Stars
                                    freqBand={props.data.flevel}
                                />
                            </dd>
                            <dt>{ut.translate('wordfreq__ipm')}:</dt>
                            <dd>{ut.formatNumber(props.data.ipm, 2)}</dd>
                        </>
                    ) : (
                        <>
                            <dt>{ut.translate('wordfreq__note')}:</dt>
                            <dd>
                                {ut.translate(
                                    'wordfreq__word_known_but_nothing_more'
                                )}
                            </dd>
                        </>
                    )}
                </>
            ) : (
                <>
                    <dt>{ut.translate('wordfreq__note')}:</dt>
                    <dd>{ut.translate('wordfreq__not_in_dict')}</dd>
                </>
            )}
        </>
    );

    // -------------------- <SingleWordProfile /> ---------------------------------------------------

    const SingleWordProfile: React.FC<{
        similarFreqWords: Array<SimilarFreqWord>;
        searchedWord: QueryMatch;
        expandLemmaPos: string;
        tileId: number;
        mainPosAttr: MainPosAttrValues;
    }> = (props) => (
        <div>
            <dl className="info">
                {props.searchedWord ? (
                    <SrchWordInfo
                        data={props.searchedWord}
                        mainPosAttr={props.mainPosAttr}
                    />
                ) : null}
                {props.similarFreqWords.length > 0 &&
                props.searchedWord.abs > 0 ? (
                    <SimilarFreqWords
                        data={props.similarFreqWords}
                        expandLemmaPos={props.expandLemmaPos}
                        tileId={props.tileId}
                        mainPosAttr={props.mainPosAttr}
                    />
                ) : null}
            </dl>
        </div>
    );

    return SingleWordProfile;
}
