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
import { IActionDispatcher, useModel, ViewUtils } from 'kombo';
import * as React from 'react';

import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';
import { TranslationsModel } from './model.js';
import { init as wordCloudViewInit } from '../../../views/wordCloud/index.js';
import { Theme } from '../../../page/theme.js';

import * as S from './style.js';
import { WordTranslation } from './api.js';
import { List, pipe } from 'cnc-tskit';



export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:TranslationsModel):TileComponent {

    const globComponents = ut.getComponents();
    const WordCloud = wordCloudViewInit<WordTranslation>(dispatcher, ut, theme);

    // -----

    const TranslationsTable:React.FC<{
        translations:Array<WordTranslation>;

    }> = (props) => {

        const renderWords = () => {
            if (props.translations.length > 0) {
                return (
                    <table className="data">
                        <thead>
                            <tr>
                                <th />
                                <th>{ut.translate('treq__rel_freq')}</th>
                                <th>{ut.translate('treq__abs_freq')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {props.translations.map((translation, i) => (
                                <tr key={`${translation['righ']}:${i}`}>
                                    <td className="translation">
                                        {translation.firstTranslatLc}
                                    </td>
                                    <td className="num">
                                        {ut.formatNumber(translation.score, 1)}%
                                    </td>
                                    <td className="num">
                                        {ut.formatNumber(translation.freq, 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            } else {
                return (
                    <span className="words">
                        <span className="word not-found">&lt;{ut.translate('treq__translation_not_found')}&gt;</span>
                    </span>
                );
            }
        };

        return (
            <S.TranslationsTable>
                {renderWords()}
            </S.TranslationsTable>
        );
    };

    // --------------- <TranslationsTileView /> -----------------------------------

    const TranslationsTileView:React.FC<CoreTileComponentProps> = (props) => {

        const state = useModel(model);

        const dataTransform = (t:WordTranslation) => ({
            text: t.translations.length > 1 ? t.firstTranslatLc : t.translations[0].word,
            value: t.score,
            tooltip: [
                {
                    label: ut.translate('treq__abs_freq'),
                    value: t.freq
                },
                {
                    label: ut.translate('treq__rel_freq'),
                    value: t.score,
                    round: 1
                },
                {
                    label: ut.translate('treq__found_variants'),
                    value: pipe(
                        t.translations,
                        List.map(v => v.word),
                        x => x.join(', ')
                    )
                }
            ],
            interactionId: t.interactionId,
            color: t.color
        });

        return (
            <globComponents.TileWrapper tileId={props.tileId} isBusy={state.isBusy} error={state.error}
                        hasData={state.translations.length > 0}
                        sourceIdent={{corp: 'InterCorp'}}
                        backlink={state.backlink}
                        supportsTileReload={props.supportsReloadOnError}
                        issueReportingUrl={props.issueReportingUrl}>
                {state.isAltViewMode ?
                    <TranslationsTable translations={state.translations} /> :
                    <globComponents.ResponsiveWrapper widthFract={props.widthFract} render={(width:number, height:number) => (
                                <WordCloud width={width} height={height}
                                        isMobile={props.isMobile}
                                        data={state.translations} font={theme.infoGraphicsFont}
                                        dataTransform={dataTransform} />)} />
                }
            </globComponents.TileWrapper>
        );
    }

    return TranslationsTileView;
}
