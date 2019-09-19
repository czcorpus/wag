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
import { GlobalComponents } from '../../views/global';
import { Theme } from '../../common/theme';
import { TileComponent, CoreTileComponentProps } from '../../common/tile';
import { DatamuseModel, DatamuseModelState } from './model';
import { init as wcloudViewInit } from '../../views/wordCloud/index';
import { DatamuseWord } from './api';
import { OperationMode, ActionName } from './actions';
import { SourceDetails } from '../../common/types';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:DatamuseModel):[TileComponent, React.SFC]  {

    const globalCompontents = ut.getComponents();

    const WordCloud = wcloudViewInit<DatamuseWord>(dispatcher, ut, theme);


    // ------------------ <SourceInfo /> --------------------------------------------

    const SourceInfo:React.SFC<{
        data:SourceDetails;

    }> = (props) => {
        return (
            <div>
                <h2>Datamuse.com</h2>
                <p><a href="https://www.datamuse.com/api/" target="_blank">The Datamuse API</a> is a word-finding query engine for developers.
                    You can use it in your apps to find words that
                    match a given set of constraints and that are likely in a given context. You can specify a wide variety of constraints
                    on meaning, spelling, sound, and vocabulary in your queries, in any combination.</p>
            </div>
        );
    };

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
                    <option value={OperationMode.MeansLike}>{ut.translate('datamuse__means_like_op')}</option>
                    <option value={OperationMode.SoundsLike}>{ut.translate('datamuse__sounds_like_op')}</option>
                </select>
            </form>
        );
    }

    // ------------------ <DatamuseView /> --------------------------------------------

    const DatamuseView:React.SFC<DatamuseModelState & CoreTileComponentProps> = (props) => {

        const dataTransform = (v:DatamuseWord) => ({
            text: v.word,
            value: v.score,
            tooltip: [{label: 'score', value: v.score, round: 1}],
            interactionId: null
        });

        return (
            <globalCompontents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                    hasData={props.data.size > 0}
                    sourceIdent={{corp: "datamuse.com"}}
                    supportsTileReload={props.supportsReloadOnError}>
                <div className="DatamuseView">
                    {props.isTweakMode ? <Controls tileId={props.tileId} operationMode={props.operationMode} /> : null }
                    <globalCompontents.ResponsiveWrapper render={(width:number, height:number) => (
                        <WordCloud width={width} height={height} data={props.data} isMobile={props.isMobile}
                                        style={props.isMobile ? {height: `${props.data.size * 30}px`} :
                                                {height: `${props.data.size * 40}px`, width: '100%'}}
                                                font="Roboto Condensed"
                                                dataTransform={dataTransform} />)}
                        />
                </div>
            </globalCompontents.TileWrapper>
        );
    }

    return [
        BoundWithProps<CoreTileComponentProps, DatamuseModelState>(DatamuseView, model),
        SourceInfo
    ];

}

