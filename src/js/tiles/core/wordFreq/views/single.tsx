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
import {
    calcFreqBand,
    LemmatizationLevel,
    QueryMatch,
} from '../../../../query/index.js';
import { List, pipe } from 'cnc-tskit';
import { Actions } from '../actions.js';
import { MainPosAttrValues } from '../../../../conf/index.js';
import * as S from '../style.js';

const asStrongIfTrue = (elm: React.ReactNode, cond: boolean) =>
    cond ? <strong>{elm}</strong> : <span>{elm}</span>;

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

    // ------------------- <HighlightedIfTrue /> --------------------------

    const HighlightedIfTrue: React.FC<{
        children: React.ReactNode;
        cond: boolean;
    }> = ({ children, cond }) => {
        return cond ? (
            <div className="freq-highlight">{children}</div>
        ) : (
            <div className="general-info">{children}</div>
        );
    };

    // -------------------- <FreqInfo /> ---------------------------------------

    const FreqInfo: React.FC<{
        lemmatizationLevel: LemmatizationLevel;
        data: QueryMatch;
    }> = ({ lemmatizationLevel, data }) => {
        const ipmFreq =
            lemmatizationLevel === 'form'
                ? (
                      List.find((x) => x.word === data.word, data.forms) || {
                          ipm: 0,
                      }
                  ).ipm
                : data.ipm;

        const freqBand =
            lemmatizationLevel === 'form'
                ? calcFreqBand(
                      (
                          List.find(
                              (x) => x.word === data.word,
                              data.forms
                          ) || { ipm: 0 }
                      ).ipm
                  )
                : data.flevel;

        return data.abs > 0 ? (
            <>
                <dt>{ut.translate('wordfreq__freq_bands')}:</dt>
                <dd>
                    <commonViews.Stars freqBand={freqBand} />
                </dd>
                <dt>{ut.translate('wordfreq__ipm')}:</dt>
                <dd className="ipm">{ut.formatNumber(ipmFreq, 2)}</dd>
            </>
        ) : (
            <>
                <dt>{ut.translate('wordfreq__note')}:</dt>
                <dd>{ut.translate('wordfreq__word_known_but_nothing_more')}</dd>
            </>
        );
    };

    // -------------------- <WordFormInfoBlock /> ------------------------------

    const WordFormInfoBlock: React.FC<{
        data: QueryMatch;
        lemmatizationLevel: LemmatizationLevel;
    }> = (props) => {
        return (
            <>
                <HighlightedIfTrue cond={props.lemmatizationLevel === 'form'}>
                    <dt>{ut.translate('wordfreq_searched_form')}:</dt>
                    <dd>
                        {asStrongIfTrue(
                            props.data.word,
                            props.lemmatizationLevel === 'form'
                        )}
                    </dd>
                    {props.lemmatizationLevel === 'form' ? (
                        <FreqInfo
                            data={props.data}
                            lemmatizationLevel={props.lemmatizationLevel}
                        />
                    ) : null}
                </HighlightedIfTrue>
            </>
        );
    };

    // -------------------- <WordVariantInfoBlock /> ------------------------------

    const WordVariantInfoBlock: React.FC<{
        data: QueryMatch;
        lemmatizationLevel: LemmatizationLevel;
    }> = (props) => {
        const isHighlighted =
            props.lemmatizationLevel === 'sublemma' &&
            !List.empty(props.data.otherSublemmas);

        const submitAsLemma = () => {
            dispatcher.dispatch(GlobalActions.SwitchToLemmaAndSubmitQuery);
        };

        return props.data.sublemma &&
            !List.empty(props.data.otherSublemmas) &&
            props.lemmatizationLevel !== 'lemma' ? (
            <HighlightedIfTrue cond={isHighlighted}>
                <dt>{ut.translate('global__srch_variant')}:</dt>
                <dd>
                    {asStrongIfTrue(
                        props.data.sublemma,
                        props.lemmatizationLevel === 'sublemma'
                    )}
                    {!List.empty(props.data.otherSublemmas) ? (
                        <>
                            {'\u00a0'}(
                            <span className="alternatives">
                                {ut.translate('global__srch_other_variants')}:
                            </span>
                            {'\u00a0' + props.data.otherSublemmas.join(', ')})
                            <p className="as-lemma">
                                {ut.translate('wordfreq__show_as_lemma')}
                                <S.SrchButton
                                    type="button"
                                    onClick={submitAsLemma}
                                >
                                    <img
                                        src={ut.createStaticUrl('mglass.svg')}
                                    />
                                </S.SrchButton>
                            </p>
                        </>
                    ) : null}
                </dd>
                {isHighlighted ? (
                    <FreqInfo
                        data={props.data}
                        lemmatizationLevel={props.lemmatizationLevel}
                    />
                ) : null}
            </HighlightedIfTrue>
        ) : null;
    };

    // -------------------- <WordLemmaInfoBlock /> ------------------------------

    const WordLemmaInfoBlock: React.FC<{
        data: QueryMatch;
        mainPosAttr: MainPosAttrValues;
        lemmatizationLevel: LemmatizationLevel;
    }> = (props) => {
        const isHighlighted =
            props.lemmatizationLevel === 'lemma' ||
            (props.lemmatizationLevel === 'sublemma' &&
                List.empty(props.data.otherSublemmas));

        return props.data.lemma ? (
            <>
                <HighlightedIfTrue cond={isHighlighted}>
                    <dt>
                        {props.data.lemma.split(' ').length > 1
                            ? ut.translate('wordfreq__lemmatized_variant')
                            : 'lemma'}
                        :
                    </dt>
                    <dd>
                        {asStrongIfTrue(
                            List.map(
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
                            ),
                            isHighlighted
                        )}
                        {List.empty(props.data.otherSublemmas) ? null : (
                            <span></span>
                        )}
                    </dd>

                    {isHighlighted ? (
                        <FreqInfo
                            data={props.data}
                            lemmatizationLevel={props.lemmatizationLevel}
                        />
                    ) : null}
                </HighlightedIfTrue>
                <div className="general-info">
                    <dt>{ut.translate('wordfreq__pos')}:</dt>
                    <dd className="pos-info">
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
                </div>
            </>
        ) : (
            <div className="general-info">
                <dt>{ut.translate('wordfreq__note')}:</dt>
                <dd>{ut.translate('wordfreq__not_in_dict')}</dd>
            </div>
        );
    };

    // -------------------- <SrchWordInfo /> ---------------------------------------------------

    const SrchWordInfo: React.FC<{
        data: QueryMatch;
        mainPosAttr: MainPosAttrValues;
        lemmatizationLevel: LemmatizationLevel;
    }> = (props) => (
        <>
            <WordFormInfoBlock
                data={props.data}
                lemmatizationLevel={props.lemmatizationLevel}
            />
            <WordVariantInfoBlock
                data={props.data}
                lemmatizationLevel={props.lemmatizationLevel}
            />
            <WordLemmaInfoBlock
                data={props.data}
                mainPosAttr={props.mainPosAttr}
                lemmatizationLevel={props.lemmatizationLevel}
            />
        </>
    );

    // -------------------- <SingleWordProfile /> ---------------------------------------------------

    const SingleWordProfile: React.FC<{
        similarFreqWords: Array<SimilarFreqWord>;
        searchedWord: QueryMatch;
        expandLemmaPos: string;
        tileId: number;
        mainPosAttr: MainPosAttrValues;
        lemmatizationLevel: LemmatizationLevel;
    }> = (props) => (
        <div>
            <dl className="info">
                {props.searchedWord ? (
                    <SrchWordInfo
                        data={props.searchedWord}
                        mainPosAttr={props.mainPosAttr}
                        lemmatizationLevel={props.lemmatizationLevel}
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
