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
import { IActionDispatcher, ViewUtils, BoundWithProps } from 'kombo';
import { GlobalComponents } from '../../../views/global';
import { Theme } from '../../../page/theme';
import { TileComponent, CoreTileComponentProps } from '../../../page/tile';
import { WordSimModel } from './model';
import { init as wcloudViewInit } from '../../../views/wordCloud/index';
import { ActionName } from './actions';
import { WordSimWord } from '../../../api/abstract/wordSim';
import { OperationMode, WordSimModelState } from '../../../models/tiles/wordSim';
import { List, pipe } from 'cnc-tskit';


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
        data:Array<WordSimWord>;
        caption:string;

    }> = (props) => (
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
                {List.map(
                    (row, i) => (
                        <tr key={`${i}:${row.word}`}>
                            <td className="num">{i + 1}.</td>
                            <td className="word">{row.word}</td>
                            <td className="num">{ut.formatNumber(row.score)}</td>
                        </tr>
                    ),
                    props.data
                )}
            </tbody>
        </table>
    );

    // ------------------ <WordSimView /> --------------------------------------------

    const WordSimView:React.SFC<WordSimModelState & CoreTileComponentProps> = (props) => {

        const dataTransform = (v:WordSimWord) => ({
            text: v.word,
            value: v.score,
            tooltip: [{label: ut.translate('wordsim__attr_score'), value: v.score}],
            interactionId: v.interactionId
        });

        const colorGen = props.data.length > 1 ? theme.scaleColorCmpDerived : (_:number) => theme.scaleColorIndexed();

        return (
            <globalCompontents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                    hasData={pipe(props.data, List.some(d => d.length > 0))}
                    sourceIdent={{corp: props.corpus}}
                    supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                <div className="WordSimView">
                    {props.isTweakMode ? <Controls tileId={props.tileId} operationMode={props.operationMode} /> : null}
                    <div className="boxes" style={{flexWrap: props.isMobile ? 'wrap' : 'nowrap'}}>
                        {List.map((data, matchIdx) => {
                            const otherWords = List.flatMap((v, i) => matchIdx === i ? [] : List.map(u => u.word, v), props.data);

                            return props.isAltViewMode ?
                                <TableView key={`match:${matchIdx}`} data={data} caption={props.data.length > 1 ? props.queryMatches[matchIdx].word : null} /> :
                                data ?
                                    <globalCompontents.ResponsiveWrapper minWidth={props.isMobile ? undefined : 250}
                                            widthFract={props.widthFract} key={`${matchIdx}non-empty`} render={(width:number, height:number) => (
                                        <div className="sim-cloud">
                                            {props.data.length > 1 ?
                                                <h2>{`[${matchIdx + 1}] ${props.queryMatches[matchIdx].word}`}</h2> :
                                                null
                                            }
                                            <WordCloud width={width} height={height} data={data} isMobile={props.isMobile}
                                                            font={theme.infoGraphicsFont}
                                                            dataTransform={dataTransform}
                                                            selectedText={props.data.length > 1 ? props.selectedText : null}
                                                            colors={colorGen(matchIdx)}
                                                            underlineWords={otherWords}
                                            />
                                        </div>
                                    )}/> :
                                    <globalCompontents.ResponsiveWrapper key={`${matchIdx}empty`} render={() => data === null ?
                                        <p>{ut.translate('global__alt_loading')}...</p> : <p>No data</p>} />
                        }, props.data)}
                    </div>
                </div>
            </globalCompontents.TileWrapper>
        );
    }

    return BoundWithProps<CoreTileComponentProps, WordSimModelState>(WordSimView, model);

}

