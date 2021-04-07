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
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';

import { CoreTileComponentProps, TileComponent } from '../../../page/tile';
import { GlobalComponents } from '../../../views/global';
import { TranslationsModel, GeneralTranslationsModelState } from './model';
import { init as wordCloudViewInit } from '../../../views/wordCloud';
import { Theme } from '../../../page/theme';
import { WordTranslation } from '../../../api/abstract/translations';


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
            <div className="TranslationsTable">
                {renderWords()}
            </div>
        );
    };

    // --------------- <TreqTileView /> -----------------------------------

    class TreqTileView extends React.PureComponent<GeneralTranslationsModelState & CoreTileComponentProps> {

        render() {
            const dataTransform = (t:WordTranslation) => ({
                text: t.translations.length > 1 ? t.firstTranslatLc : t.translations[0],
                value: t.score,
                tooltip: [
                    {label: ut.translate('treq__abs_freq'), value: t.freq},
                    {label: ut.translate('treq__rel_freq'), value: t.score, round: 1},
                    {label: ut.translate('treq__found_variants'), value: t.translations.join(', ')}
                ],
                interactionId: t.interactionId,
                color: t.color
            });

            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                            hasData={this.props.translations.length > 0}
                            sourceIdent={{corp: 'InterCorp'}}
                            backlink={this.props.backLink}
                            supportsTileReload={this.props.supportsReloadOnError}
                            issueReportingUrl={this.props.issueReportingUrl}>
                    {this.props.isAltViewMode ?
                        <TranslationsTable translations={this.props.translations} /> :
                        <globComponents.ResponsiveWrapper widthFract={this.props.widthFract} render={(width:number, height:number) => (
                                    <WordCloud width={width} height={height}
                                            isMobile={this.props.isMobile}
                                            data={this.props.translations} font={theme.infoGraphicsFont}
                                            dataTransform={dataTransform} />)} />
                    }
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(TreqTileView, model);
}
