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

import { CoreTileComponentProps, TileComponent } from '../../../../common/tile';
import { GlobalComponents } from '../../../../views/global';
import { SummaryModel, SummaryModelState } from '../model';
import { init as chartViewInit } from './chart';
import { init as singleWordViewsInit } from './single';
import { init as multiWordViewsInit } from './compare';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, model:SummaryModel):TileComponent {

    const globalComponents = ut.getComponents();
    const Chart = chartViewInit(dispatcher, ut);
    const SingleWordProfile = singleWordViewsInit(dispatcher, ut);
    const MultiWordProfile = multiWordViewsInit(dispatcher, ut);

    // -------------------- <WordFreqTileView /> -----------------------------------------------

    class WordFreqTileView extends React.PureComponent<SummaryModelState & CoreTileComponentProps> {

        render() {
            return (
                <globalComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.length > 0} sourceIdent={{corp: this.props.corpname}}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <div className="WordFreqTileView">
                        {!this.props.isMobile && this.props.widthFract > 1 ?
                            <div className="chart">
                            <Chart lemmaItems={this.props.data[0].filter(v => v.isSearched)} />
                            </div> :
                            null
                        }
                        {this.props.data.length === 1 ?
                            <SingleWordProfile data={this.props.data[0]} /> :
                            <MultiWordProfile data={this.props.data} />
                        }
                    </div>
                </globalComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(WordFreqTileView, model);
}
