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

import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { HtmlModel, HtmlModelState } from './model';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:HtmlModel):TileComponent {

    const globalCompontents = ut.getComponents();

    // -------------- <HtmlTile /> -------------------------------------

    class HtmlTile extends React.PureComponent<HtmlModelState & CoreTileComponentProps> {

        constructor(props) {
            super(props);
        }

        render() {

            return (
                <div style={{maxHeight: model.maxTileHeight}}>
                    <globalCompontents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error} htmlClass="HtmlTile"
                            hasData={Boolean(this.props.data)} sourceIdent={null}
                            supportsTileReload={this.props.supportsReloadOnError} >
                        {this.props.styles ? <style>{this.props.styles}</style> : null}
                        <div className="htmlFrame" dangerouslySetInnerHTML={{__html: this.props.data}} />
                    </globalCompontents.TileWrapper>
                </div>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, HtmlModelState>(HtmlTile, model);

}
