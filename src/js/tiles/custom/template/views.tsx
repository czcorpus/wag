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
import { IActionDispatcher, ViewUtils, useModel } from 'kombo';
import * as React from 'react';

import { Theme } from '../../../page/theme.js';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';

import { __Template__Model } from './model.js';
import { __Template__ModelState } from './common.js';
import { List } from 'cnc-tskit';

import * as S from './style.js';

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme,
    model: __Template__Model
): TileComponent {
    const globalCompontents = ut.getComponents();

    // -------------- <__Template__Tile /> -------------------------------------

    const __Template__Tile: React.FC<CoreTileComponentProps> = (props) => {
        const state = useModel(model);

        return (
            <globalCompontents.TileWrapper
                tileId={props.tileId}
                isBusy={state.isBusy}
                error={state.error}
                hasData={Boolean(state.data)}
                sourceIdent={null}
                supportsTileReload={props.supportsReloadOnError}
                issueReportingUrl={props.issueReportingUrl}
            >
                {state.isTileTweakMode ? (
                    <div>
                        <p>{ut.translate('template__tweak_panel')}</p>
                        <hr />
                    </div>
                ) : null}
                <S.__Template__Tile>
                    {state.isAltViewMode ? (
                        <div>
                            <p>{ut.translate('template__alt_view')}</p>
                            <ul>
                                {List.map(
                                    (word) => (
                                        <li>{word}</li>
                                    ),
                                    state.data
                                )}
                            </ul>
                        </div>
                    ) : (
                        <div>
                            <p>{ut.translate('template__main_view')}</p>
                            <p>{state.data.join(', ')}</p>
                        </div>
                    )}
                </S.__Template__Tile>
            </globalCompontents.TileWrapper>
        );
    };

    return __Template__Tile;
}
