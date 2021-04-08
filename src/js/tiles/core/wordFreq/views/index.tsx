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

import { CoreTileComponentProps, TileComponent } from '../../../../page/tile';
import { GlobalComponents } from '../../../../views/global';
import { SummaryModel, SummaryModelState } from '../model';
import { init as chartViewInit } from './chart';
import { init as singleWordViewsInit } from './single';
import { init as multiWordViewsInit } from './compare';
import { QueryMatch } from '../../../../query';

import * as S from '../style';


export function init(
    dispatcher:IActionDispatcher,
    ut:ViewUtils<GlobalComponents>,
    model:SummaryModel
):TileComponent {

    const globalComponents = ut.getComponents();
    const Chart = chartViewInit(dispatcher, ut);
    const SingleWordProfile = singleWordViewsInit(dispatcher, ut);
    const MultiWordProfile = multiWordViewsInit(dispatcher, ut);


    // -------------------- <AuxChart /> -----------------------------------------------

    const AuxChart:React.FC<{
        tileName:string;
        isMobile:boolean;
        widthFract:number;
        queryMatches:Array<QueryMatch>;

    }> = (props) => {

        const [isActive, setIsActive] = React.useState(false);

        React.useEffect(() => {
            setIsActive(true);
          });

        return (
            <div className="chart">
                {isActive && !props.isMobile && props.widthFract > 1 ?
                    <>
                        <h2>{ut.translate('wordfreq__freqband_chart_label')}</h2>
                        <Chart queryMatches={props.queryMatches} activeIdent={0} tileName={props.tileName} />
                    </> :
                    null
                }
            </div>
        );
    }

    // -------------------- <WordFreqTileView /> -----------------------------------------------

    const WordFreqTileView:React.FC<SummaryModelState & CoreTileComponentProps> = (props) => (
        <globalComponents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                hasData={props.queryMatches.length > 0} sourceIdent={{corp: props.corpname}}
                supportsTileReload={props.supportsReloadOnError}
                issueReportingUrl={props.issueReportingUrl}>
            <S.WordFreqTileView>
                {props.queryMatches.length === 1 ?
                    <SingleWordProfile searchedWord={props.queryMatches[0]}
                        similarFreqWords={props.similarFreqWords[0]}
                        expandLemmaPos={props.expandLemmaPos}
                        tileId={props.tileId} /> :
                    <MultiWordProfile matches={props.queryMatches} />
                }
                <AuxChart queryMatches={props.queryMatches} isMobile={props.isMobile} widthFract={props.widthFract}
                        tileName={props.tileName} />
            </S.WordFreqTileView>
        </globalComponents.TileWrapper>
    );

    return BoundWithProps(WordFreqTileView, model);
}
