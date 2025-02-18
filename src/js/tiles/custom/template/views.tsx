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

import { Theme } from '../../../page/theme.js';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';

import { __Template__Model } from './model.js';
import { __Template__ModelState } from './common.js';
import { List } from 'cnc-tskit';

import * as S from './style.js';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:__Template__Model):TileComponent {

    const globalCompontents = ut.getComponents();

    // -------------- <__Template__Tile /> -------------------------------------

    class __Template__Tile extends React.PureComponent<__Template__ModelState & CoreTileComponentProps> {

        constructor(props) {
            super(props);
        }

        render() {
            return (
                <globalCompontents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy}
                        error={this.props.error} hasData={Boolean(this.props.data)}
                        sourceIdent={null} supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl} >
                    {
                        this.props.isTileTweakMode ?
                        <div><p>{ut.translate('template__tweak_panel')}</p><hr/></div> :
                        null
                    }
                    <S.__Template__Tile>{
                        this.props.isAltViewMode ?
                        <div>
                            <p>{ut.translate('template__alt_view')}</p>
                            <ul>{List.map(word => <li>{word}</li>, this.props.data)}</ul>
                        </div> :
                        <div>
                            <p>{ut.translate('template__main_view')}</p>
                            <p>{this.props.data.join(', ')}</p>
                        </div>
                    }</S.__Template__Tile>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, __Template__ModelState>(__Template__Tile, model);

}
