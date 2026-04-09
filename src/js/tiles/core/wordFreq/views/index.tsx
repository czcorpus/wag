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

import {
    CoreTileComponentProps,
    TileComponent,
} from '../../../../page/tile.js';
import { GlobalComponents } from '../../../../views/common/index.js';
import { SummaryModel } from '../model.js';
import { init as chartViewInit } from './chart.js';
import { init as singleWordViewsInit } from './single.js';
import { init as multiWordViewsInit } from './compare.js';
import { QueryMatch } from '../../../../query/index.js';

import * as S from '../style.js';
import { Theme } from '../../../../page/theme.js';

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    model: SummaryModel,
    theme: Theme
): TileComponent {
    const globalComponents = ut.getComponents();
    const Chart = chartViewInit(dispatcher, ut, theme);
    const SingleWordProfile = singleWordViewsInit(dispatcher, ut);
    const MultiWordProfile = multiWordViewsInit(dispatcher, ut);

    // -------------------- <AuxChart /> -----------------------------------------------

    const AuxChart: React.FC<{
        tileName: string;
        isMobile: boolean;
        widthFract: number;
        queryMatches: Array<QueryMatch>;
    }> = (props) => {
        const [isActive, setIsActive] = React.useState(false);

        React.useEffect(() => {
            setIsActive(true);
        });

        return (
            <div className="chart">
                {isActive ? (
                    <>
                        <h2>
                            {ut.translate('wordfreq__freqband_chart_label')}
                        </h2>
                        <Chart
                            queryMatches={props.queryMatches}
                            activeIdent={0}
                            tileName={props.tileName}
                        />
                    </>
                ) : null}
            </div>
        );
    };

    // -------------------- <WordFreqTileView /> -----------------------------------------------

    const WordFreqTileView: React.FC<CoreTileComponentProps> = (props) => {
        const state = useModel(model);

        return (
            <globalComponents.TileWrapper
                tileId={props.tileId}
                isBusy={state.isBusy}
                error={state.error}
                hasData={state.queryMatches.length > 0}
                sourceIdent={{ corp: state.corpname }}
                supportsTileReload={props.supportsReloadOnError}
                issueReportingUrl={props.issueReportingUrl}
            >
                <S.WordFreqTileView>
                    {state.queryMatches.length === 1 ? (
                        <SingleWordProfile
                            searchedWord={state.queryMatches[0]}
                            similarFreqWords={state.similarFreqWords[0]}
                            expandLemmaPos={state.expandLemmaPos}
                            tileId={props.tileId}
                            mainPosAttr={state.mainPosAttr}
                            lemmatizationLevel={state.lemmatizationLevel}
                        />
                    ) : (
                        <MultiWordProfile
                            matches={state.queryMatches}
                            mainPosAttr={state.mainPosAttr}
                        />
                    )}
                    {!props.isMobile && props.widthFract > 1 ? (
                        <AuxChart
                            queryMatches={state.queryMatches}
                            isMobile={props.isMobile}
                            widthFract={props.widthFract}
                            tileName={props.tileName}
                        />
                    ) : null}
                </S.WordFreqTileView>
            </globalComponents.TileWrapper>
        );
    };

    return WordFreqTileView;
}
