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

import { GlobalComponents } from '../../../../views/common/index.js';
import { init as commonViewInit } from './common.js';
import {
    calcFreqBand,
    LemmatizationLevel,
    QueryMatch,
} from '../../../../query/index.js';
import { List } from 'cnc-tskit';

import * as S from '../style.js';
import { MainPosAttrValues } from '../../../../conf/index.js';

const asStrongIfTrue = (elm: React.ReactNode, cond: boolean) =>
    cond ? <strong>{elm}</strong> : <span>{elm}</span>;

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>
) {
    const commonViews = commonViewInit(dispatcher, ut); // TODO duplicit stuff (see single.tsx)

    // -------------------- <MultiWordProfile /> ---------------------------------------------------

    const MultiWordProfile: React.FC<{
        matches: Array<QueryMatch>;
        lemmatizationLevel: LemmatizationLevel;
        mainPosAttr: MainPosAttrValues;
    }> = (props) => {
        return (
            <S.MultiWordProfile>
                <div className="grid-container">
                    {List.map((w, i) => {
                        const ipmFreq =
                            props.lemmatizationLevel === 'form'
                                ? (
                                      List.find(
                                          (x) => x.word === w.word,
                                          w.forms
                                      ) || { ipm: 0 }
                                  ).ipm
                                : w.ipm;

                        const freqBand =
                            props.lemmatizationLevel === 'form'
                                ? calcFreqBand(
                                      (
                                          List.find(
                                              (x) => x.word === w.word,
                                              w.forms
                                          ) || { ipm: 0 }
                                      ).ipm
                                  )
                                : w.flevel;

                        return (
                            <React.Fragment
                                key={`${w.word}:${w.lemma}:${w.pos.map((v) => v.value).join('_')}`}
                            >
                                <div className="query-num">{i + 1}.</div>
                                <div
                                    className={`property ${props.lemmatizationLevel === 'form' ? 'highlighted-info' : 'general-info'}`}
                                >
                                    {ut.translate('wordfreq_searched_form')}:
                                </div>
                                <div
                                    className={`value ${props.lemmatizationLevel === 'form' ? 'highlighted-info' : 'general-info'}`}
                                >
                                    {asStrongIfTrue(
                                        w.word,
                                        props.lemmatizationLevel === 'form'
                                    )}
                                </div>
                                <div
                                    className={`color-tile ${props.lemmatizationLevel === 'form' ? 'highlighted-info' : 'general-info'}`}
                                ></div>
                                {props.lemmatizationLevel === 'form' ? (
                                    <>
                                        <div className="property freq-info highlighted-info">
                                            {ut.translate(
                                                'wordfreq__ipm_condensed'
                                            )}
                                            :
                                        </div>
                                        <div className="value freq-info highlighted-info">
                                            {ipmFreq > 0 ? (
                                                ut.formatNumber(ipmFreq, 2)
                                            ) : (
                                                <span
                                                    style={{
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    --
                                                </span>
                                            )}
                                        </div>
                                        <div className="color-tile highlighted-info rowspan-2"></div>
                                        <div className="property freq-info highlighted-info">
                                            {ut.translate(
                                                'wordfreq__freq_bands_condensed'
                                            )}
                                            :
                                        </div>
                                        <div className="value freq-info highlighted-info">
                                            {ipmFreq > 0 ? (
                                                <commonViews.Stars
                                                    freqBand={freqBand}
                                                />
                                            ) : (
                                                <div>--</div>
                                            )}
                                        </div>
                                        <div className="property freq-info general-info">
                                            {ut.translate('wordfreq__pos')}
                                        </div>
                                        <div className="value freq-info general-info pos-info">
                                            {w[props.mainPosAttr].length > 0
                                                ? List.map(
                                                      (pos, i) => (
                                                          <React.Fragment
                                                              key={`${i}:${pos.value}`}
                                                          >
                                                              {i > 0
                                                                  ? '\u00a0'
                                                                  : ''}
                                                              {pos.label}
                                                          </React.Fragment>
                                                      ),
                                                      w[props.mainPosAttr]
                                                  )
                                                : ut.translate(
                                                      'wordfreq__pos_not_specified'
                                                  )}
                                        </div>
                                        <div className="color-tile general-info"></div>
                                    </>
                                ) : null}
                                <div
                                    className={`property ${props.lemmatizationLevel !== 'form' ? 'highlighted-info' : 'general-info'}`}
                                >
                                    {w.lemma.split(' ').length > 1
                                        ? ut.translate(
                                              'wordfreq__lemmatized_variant'
                                          )
                                        : 'lemma'}
                                    :
                                </div>
                                <div
                                    className={`value ${props.lemmatizationLevel !== 'form' ? 'highlighted-info' : 'general-info'}`}
                                >
                                    {asStrongIfTrue(
                                        w.lemma,
                                        props.lemmatizationLevel !== 'form'
                                    )}
                                </div>
                                <div
                                    className={`color-tile ${props.lemmatizationLevel !== 'form' ? 'highlighted-info' : 'general-info'}`}
                                ></div>
                                {props.lemmatizationLevel !== 'form' ? (
                                    <>
                                        <div className="property freq-info highlighted-info">
                                            {ut.translate(
                                                'wordfreq__ipm_condensed'
                                            )}
                                            :
                                        </div>
                                        <div className="value freq-info highlighted-info">
                                            {ipmFreq > 0 ? (
                                                ut.formatNumber(ipmFreq, 2)
                                            ) : (
                                                <span
                                                    style={{
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    --
                                                </span>
                                            )}
                                        </div>
                                        <div className="color-tile highlighted-info rowspan-2"></div>
                                        <div className="property freq-info highlighted-info">
                                            {ut.translate(
                                                'wordfreq__freq_bands_condensed'
                                            )}
                                            :
                                        </div>
                                        <div className="value freq-info highlighted-info">
                                            {ipmFreq > 0 ? (
                                                <commonViews.Stars
                                                    freqBand={freqBand}
                                                />
                                            ) : (
                                                <div>--</div>
                                            )}
                                        </div>
                                        <div className="property freq-info general-info">
                                            {ut.translate('wordfreq__pos')}:
                                        </div>
                                        <div className="value freq-info general-info pos-info">
                                            {w[props.mainPosAttr].length > 0
                                                ? List.map(
                                                      (pos, i) => (
                                                          <React.Fragment
                                                              key={`${i}:${pos.value}`}
                                                          >
                                                              {i > 0
                                                                  ? '\u00a0'
                                                                  : ''}
                                                              {pos.label}
                                                          </React.Fragment>
                                                      ),
                                                      w[props.mainPosAttr]
                                                  )
                                                : ut.translate(
                                                      'wordfreq__pos_not_specified'
                                                  )}
                                        </div>
                                        <div className="color-tile general-info"></div>
                                        <div className="separ"></div>
                                    </>
                                ) : null}
                            </React.Fragment>
                        );
                    }, props.matches)}
                </div>
            </S.MultiWordProfile>
        );
    };

    return MultiWordProfile;
}
