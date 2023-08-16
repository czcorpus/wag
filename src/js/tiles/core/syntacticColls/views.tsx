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
import { init as wordCloudViewInit } from '../../../views/wordCloud';

import * as S from './style';
import { SCollsDataRow, SCollsExamples, SyntacticCollsModelState } from '../../../models/tiles/syntacticColls';
import { List } from 'cnc-tskit';
import { SCollsQueryTypeValue } from '../../../api/vendor/mquery/syntacticColls';
import { WordCloudItemCalc } from '../../../views/wordCloud/calc';
import { Actions } from './common';


export function init(
    dispatcher:IActionDispatcher,
    ut:ViewUtils<GlobalComponents>,
    theme:Theme,
    model:SyntacticCollsModel
):TileComponent {

    const globalCompontents = ut.getComponents();
    const WordCloud = wordCloudViewInit<SCollsDataRow>(dispatcher, ut, theme);

    const dataTransform = (v:SCollsDataRow):WordCloudItemCalc => ({
        text: v.word,
        value: v.collWeight,
        tooltip: [{label: ut.translate('syntactic_colls__tooltip_score'), value: ut.formatNumber(v.collWeight, 5)}],
        interactionId: v.word,
    });

    // ------------------- <Examples /> ------------------------

    const Examples:React.FC<{
        data:SCollsExamples;
        onClose:()=>void;
    }> = (props) => (
        <S.Examples>
            <div className="toolbar">
                <a onClick={props.onClose} className="close">
                    <img src={ut.createStaticUrl('close-icon.svg')} alt={ut.translate('global__img_alt_close_icon')} />
                </a>
            </div>
            {List.map(
                (line, i) => (
                    <p key={`${i}:${line.text.substring(0, 5)}`}>{line.text}</p>
                ),
                props.data.lines
            )}
        </S.Examples>
    );

    // -------------- <SyntacticCollsTile /> -------------------------------------

    const SyntacticCollsTile:React.FC<SyntacticCollsModelState & CoreTileComponentProps> = (props) => {

        const renderWordCloud = (qType:SCollsQueryTypeValue) => {
            return <S.SCollsWordCloud key={`wordcloud:${qType}`}>
                <h2>{ut.translate(`syntactic_colls__heading_${qType}`)}</h2>
                {props.data[qType] ?
                    <globalCompontents.ResponsiveWrapper minWidth={props.isMobile ? undefined : 250}
                            key={qType} widthFract={props.widthFract} render={(width:number, height:number) => (
                        <WordCloud width={width} height={height} isMobile={props.isMobile}
                            data={props.data[qType].rows}
                            font={theme.infoGraphicsFont}
                            dataTransform={dataTransform}
                        />
                    )}/> :
                    null
                }
            </S.SCollsWordCloud>
        };

        const handleWordClick = (word:string, qType:SCollsQueryTypeValue) => () => {
            dispatcher.dispatch(
                Actions.ClickForExample,
                {
                    tileId: props.tileId,
                    word,
                    qType
                }
            )
        };

        const handleExamplesClick = () => {
            dispatcher.dispatch(
                Actions.HideExampleWindow,
                {
                    tileId: props.tileId
                }
            );
        };

        const renderTable = (qType:SCollsQueryTypeValue) => {
            return <S.SCollsTable key={`table:${qType}`}>
                <h2>{ut.translate(`syntactic_colls__heading_${qType}`)}</h2>
                {props.data[qType] ?
                    <globalCompontents.ResponsiveWrapper minWidth={props.isMobile ? undefined : 250}
                            key={qType} widthFract={props.widthFract} render={(width:number, height:number) => (
                        <table className='data'>
                            <thead>
                                <tr>
                                    <th key="word">word</th>
                                    <th key="freq">freq</th>
                                    <th key="ipm">ipm</th>
                                    <th key="score">score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {List.map(
                                    (row, i) => (
                                        <tr key={i}>
                                            <td key="word" className="word">
                                                <a onClick={handleWordClick(row.word, qType)}>{row.word}</a>
                                            </td>
                                            <td key="freq" className="num">{ut.formatNumber(row.freq)}</td>
                                            <td key="ipm" className="num">{ut.formatNumber(row.ipm)}</td>
                                            <td key="score" className="num">{ut.formatNumber(row.collWeight, 5)}</td>
                                        </tr>
                                    ),
                                    props.data[qType].rows
                                )}
                            </tbody>
                        </table>
                    )}/> :
                    null
                }
            </S.SCollsTable>
        };

        return (
            <globalCompontents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                    hasData={true} sourceIdent={{corp: props.corpname}}
                    backlink={[]} supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                <S.SyntacticColls>
                    <div className="tables">
                        {props.isAltViewMode ?
                            List.map(qType => renderWordCloud(qType), props.displayTypes) :
                            List.map(qType => renderTable(qType), props.displayTypes)
                        }
                    </div>
                    {props.exampleWindowData ?
                        <Examples data={props.exampleWindowData} onClose={handleExamplesClick} /> :
                        null
                    }
                </S.SyntacticColls>
            </globalCompontents.TileWrapper>
        );
    }

    return BoundWithProps<CoreTileComponentProps, SyntacticCollsModelState>(SyntacticCollsTile, model);

}
