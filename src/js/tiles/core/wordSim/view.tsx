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
import * as React from 'react';
import { List } from 'immutable';
import { IActionDispatcher, ViewUtils, BoundWithProps } from 'kombo';
import { GlobalComponents } from '../../../views/global';
import { Theme } from '../../../common/theme';
import { TileComponent, CoreTileComponentProps } from '../../../common/tile';
import { WordSimModel } from './model';
import { init as wcloudViewInit } from '../../../views/wordCloud/index';
import { ActionName } from './actions';
import { WordSimWord } from '../../../common/api/abstract/wordSim';
import { OperationMode, WordSimModelState } from '../../../common/models/wordSim';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:WordSimModel):TileComponent  {

    const globalCompontents = ut.getComponents();

    const WordCloud = wcloudViewInit<WordSimWord>(dispatcher, ut, theme);


    // ------------------ <Controls /> --------------------------------------------

    const Controls:React.SFC<{
        tileId:number;
        operationMode:OperationMode;

    }> = (props) => {

        const handleOperationModeChange = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch({
                name: ActionName.SetOperationMode,
                payload: {
                    tileId: props.tileId,
                    value: evt.target.value
                }
            });
        }

        return (
            <form className="Controls cnc-form tile-tweak">
                <select value={props.operationMode} onChange={handleOperationModeChange}>
                    <option value={OperationMode.MeansLike}>{ut.translate('wordsim__means_like_op')}</option>
                    <option value={OperationMode.SoundsLike}>{ut.translate('wordsim__sounds_like_op')}</option>
                </select>
            </form>
        );
    }

    // ------------------ <AltView /> --------------------------------------------

    const TableView:React.SFC<{
        data:List<WordSimWord>;
        caption:string;

    }> = (props) => {
        return (
            <table className="data">
            <caption>{props.caption}</caption>
                <thead>
                    <tr>
                        <th />
                        <th />
                        <th>{ut.translate('wordsim__attr_score')}</th>
                    </tr>
                </thead>
                <tbody>
                    {props.data.map((row, i) => (
                        <tr key={`${i}:${row.word}`}>
                            <td className="num">{i + 1}.</td>
                            <td className="word">{row.word}</td>
                            <td className="num">{ut.formatNumber(row.score)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    // ------------------ <WordSimView /> --------------------------------------------

    const WordSimView:React.SFC<WordSimModelState & CoreTileComponentProps> = (props) => {

        const dataTransform = (v:WordSimWord) => ({
            text: v.word,
            value: v.score,
            tooltip: [{label: ut.translate('wordsim__attr_score'), value: v.score, round: 1}],
            interactionId: v.interactionId
        });

        return (
            <globalCompontents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                    hasData={props.data.some(d => d)}
                    sourceIdent={{corp: null}}
                    supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                <div className="WordSimView">
                    {props.isTweakMode ? <Controls tileId={props.tileId} operationMode={props.operationMode} /> : null}
                    <div className="boxes">
                        {props.data.map((data, index) => props.isAltViewMode ? <TableView data={data} caption={props.data.length > 1 ? props.lemmas[index].word : null} /> :
                        data ?
                            <globalCompontents.ResponsiveWrapper render={(width:number, height:number) => (
                                <div className="sim-cloud">
                                    <h2>{props.data.length > 1 ? `[${index + 1}] ${props.lemmas[index].word}` : null}</h2>
                                    <WordCloud width={width} height={height} data={data.toArray()} isMobile={props.isMobile}
                                                    style={props.isMobile ? {height: `${data.size * 30}px`} :
                                                            {height: `${data.size * 40}px`, width: '100%'}}
                                                    font="Roboto Condensed"
                                                    dataTransform={dataTransform}
                                                    selectedText={props.data.length > 1 ? props.selectedText : null}
                                    />
                                </div>
                            )}/> :
                            <globalCompontents.ResponsiveWrapper key={`${index}empty`} render={() => data === null ? <p>Processing...</p> : <p>No data</p>} />
                        )}
                    </div>
                </div>
            </globalCompontents.TileWrapper>
        );
    }

    return BoundWithProps<CoreTileComponentProps, WordSimModelState>(WordSimView, model);

}

