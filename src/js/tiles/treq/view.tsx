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

import { CoreTileComponentProps, TileComponent } from '../../common/types';
import { GlobalComponents } from '../../views/global';
import { TreqTranslation } from './api';
import { TreqModel, TreqModelState } from './model';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:TreqModel):TileComponent {

    const globComponents = ut.getComponents();

    // -----

    const TreqTranslations:React.SFC<{
        translations:Immutable.List<TreqTranslation>;

    }> = (props) => {

        const renderWords = () => {
            if (props.translations.size > 0) {
                return (
                    <table className="words">
                        <tbody>
                            <tr>
                                <th />
                                <th>{ut.translate('treq__abs_rel')}</th>
                                <th>{ut.translate('treq__abs_freq')}</th>
                            </tr>
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
            <div className="TreqTranslations">
                {renderWords()}
            </div>
        );
    };

    // --------------- <TreqTileView /> -----------------------------------

    class TreqTileView extends React.PureComponent<TreqModelState & CoreTileComponentProps> {

        render() {
            return (
                <globComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                            hasData={this.props.translations.size > 0}
                            sourceIdent={{corp: 'InterCorp'}}
                            backlink={this.props.treqBackLink}>
                    <TreqTranslations translations={this.props.translations} />
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(TreqTileView, model);
}
