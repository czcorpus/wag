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
import {
    SCollsDataRow, SCollsExamples, SyntacticCollsModelState, mkScollExampleLineHash
} from '../../../models/tiles/syntacticColls';
import { Dict, List, pipe } from 'cnc-tskit';
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
        text: v.value,
        value: v.collWeight,
        tooltip: [{label: ut.translate('syntactic_colls__tooltip_score'), value: ut.formatNumber(v.collWeight, 5)}],
        interactionId: v.value,
    });

    // ------------------- <Examples /> ------------------------

    const attrsToStr = (v:{[key:string]:string}):string => pipe(
        v,
        Dict.toEntries(),
        List.map(([k, v]) => `${k}: ${v}`),
        x => x.join(', ')
    );

    const Examples:React.FC<{
        data:SCollsExamples;
        onClose:()=>void;
    }> = ({data, onClose}) => (
        <S.Examples>
            <div className="toolbar">
                <h3>
                    {ut.translate('syntactic_colls__conc_examples')}{':\u00a0'}
                    <span className="words">{data.word1} <span className="plus">+</span> {data.word2}</span>
                </h3>
                <div className="controls">
                    <a onClick={onClose} className="close">
                        <img src={ut.createStaticUrl('close-icon.svg')} alt={ut.translate('global__img_alt_close_icon')} />
                    </a>
                </div>
            </div>
            <div className="texts">
            {List.map(
                (line, i) => (
                    <p key={`${i}:${mkScollExampleLineHash(line)}`}>
                        {List.map(
                            (token, j) => (
                                <React.Fragment key={`t:${i}:${j}`}>
                                    {j > 0 ? <span> </span> : ''}
                                    {token.strong ?
                                        <strong title={attrsToStr(token.attrs)}>{token.word}</strong> :
                                        <span title={attrsToStr(token.attrs)}>{token.word}</span>
                                    }
                                </React.Fragment>
                            ),
                            line.text
                        )}
                    </p>
                ),
                data.lines
            )}
            </div>
        </S.Examples>
    );

    // -------------- <SyntacticCollsTile /> -------------------------------------

    const SyntacticCollsTile:React.FC<SyntacticCollsModelState & CoreTileComponentProps> = (props) => {

        const isEmpty = (qType:SCollsQueryTypeValue) => props.data[qType].rows.length === 0;

        const renderWordCloud = (qType:SCollsQueryTypeValue) => {
            return <S.SCollsWordCloud key={`wordcloud:${qType}`}>
                <h2>{ut.translate(`syntactic_colls__heading_${qType}`)}</h2>
                {props.data[qType] ?
                    isEmpty(qType) ?
                        <p>{ut.translate('syntactic_colls__no_data')}</p> :
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
                    isEmpty(qType) ?
                        <p>{ut.translate('syntactic_colls__no_data')}</p> :
                        <globalCompontents.ResponsiveWrapper minWidth={props.isMobile ? undefined : 250}
                                key={qType} widthFract={props.widthFract} render={(width:number, height:number) => (
                            <table className='data'>
                                <thead>
                                    <tr>
                                        <th key="word">{ut.translate('syntactic_colls__tab_hd_word')}</th>
                                        <th key="freq">{ut.translate('syntactic_colls__tab_hd_freq')}</th>
                                        <th key="ipm">{ut.translate('syntactic_colls__tab_hd_ipm')}</th>
                                        <th key="score">{ut.translate('syntactic_colls__tab_hd_score')}</th>
                                        <th key="cooc-score">{ut.translate('syntactic_colls__tab_hd_cooc_score')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {List.map(
                                        (row, i) => (
                                            <tr key={i}>
                                                <td key="word" className="word">
                                                    <a onClick={handleWordClick(row.value, qType)}>{row.value}</a>
                                                </td>
                                                <td key="freq" className="num">{ut.formatNumber(row.freq)}</td>
                                                <td key="ipm" className="num">{ut.formatNumber(row.ipm, 2)}</td>
                                                <td key="score" className="num">{ut.formatNumber(row.collWeight, 4)}</td>
                                                <td key="cooc-score" className="num">{ut.formatNumber(row.coOccScore, 4)}</td>
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
