/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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

import { Theme } from '../../../page/theme';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile';
import { GlobalComponents } from '../../../views/common';
import { SyntacticCollsModel } from './model';
import { SyntacticCollsModelState } from '../../../models/tiles/syntacticColls';

import * as S from './style';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:SyntacticCollsModel):TileComponent {

    const globalCompontents = ut.getComponents();

    // -------------- <CollocTile /> -------------------------------------

    class SyntacticCollsTile extends React.PureComponent<SyntacticCollsModelState & CoreTileComponentProps> {

        constructor(props) {
            super(props);
        }

        render() {
            return (
                <globalCompontents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={true} sourceIdent={{corp: this.props.corpname}}
                        backlink={[]} supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <S.SyntacticColls>TODO</S.SyntacticColls>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, SyntacticCollsModelState>(SyntacticCollsTile, model);

}
