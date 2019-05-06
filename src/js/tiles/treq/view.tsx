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
import * as Immutable from 'immutable';
import { ActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';

import { CoreTileComponentProps, TileComponent } from '../../common/tile';
import { GlobalComponents } from '../../views/global';
import { TreqTranslation } from '../../common/api/treq';
import { TreqModel, TreqModelState } from './model';
import { init as wordCloudViewInit } from '../../views/wordCloud';
import { Theme } from '../../common/theme';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:TreqModel):TileComponent {

    const globComponents = ut.getComponents();
    const WordCloud = wordCloudViewInit<TreqTranslation>(dispatcher, ut, theme);

    // -----

    const TranslationsTable:React.SFC<{
        translations:Immutable.List<TreqTranslation>;

    }> = (props) => {

        const renderWords = () => {
            if (props.translations.size > 0) {
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
                                        {translation.right}
                                    </td>
                                    <td className="num">
                                        {ut.formatNumber(translation.perc, 1)}%
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

    class TreqTileView extends React.PureComponent<TreqModelState & CoreTileComponentProps> {

        render() {
            const dataTransform = (t:TreqTranslation) => ({
                text: t.right,
                value: t.perc,
                tooltip: [
                    {label: ut.translate('treq__abs_freq'), value: t.freq},
                    {label: ut.translate('treq__rel_freq'), value: t.perc, round: 1}
                ],
                interactionId: t.interactionId,
                color: t.color
            });

            const style = this.props.isMobile ? {height: `${this.props.translations.size * 30}px`} :
                                                {height: `${this.props.translations.size * 40}px`, width: '100%'};

            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                            hasData={this.props.translations.size > 0}
                            sourceIdent={{corp: 'InterCorp'}}
                            backlink={this.props.treqBackLink}
                            supportsTileReload={this.props.supportsReloadOnError}>
                    {this.props.isAltViewMode ?
                        <TranslationsTable translations={this.props.translations} /> :
                        <globComponents.ResponsiveWrapper render={(width:number, height:number) => (
                                    <WordCloud width={width} height={height}
                                            style={style} isMobile={this.props.isMobile}
                                            data={this.props.translations} font="Roboto Condensed"
                                            dataTransform={dataTransform} />)} />
                    }
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(TreqTileView, model);
}
