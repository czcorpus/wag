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
import { IActionDispatcher, ViewUtils, useModel } from 'kombo';
import * as React from 'react';

import { Theme } from '../../../page/theme.js';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';
import { SyntacticCollsModel, SyntacticCollsModelState } from './model.js';
import { init as wordCloudViewInit } from '../../../views/wordCloud/index.js';

import * as S from './style.js';
import { Dict, List, pipe } from 'cnc-tskit';
import { WordCloudItemCalc } from '../../../views/wordCloud/calc.js';
import { Actions } from './common.js';
import { mkScollExampleLineHash, SCollsData, SCollsDataRow, SCollsExamples, SCollsQueryType } from './api/scollex.js';



const isEmpty = (data:{[key in SCollsQueryType]?:SCollsData}, qType:SCollsQueryType) => data[qType].rows.length === 0;


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


    // ---------------------- <ScollexTable /> ---------------------------

    const ScollexTable:React.FC<{
        data:{[key in SCollsQueryType]?:SCollsData};
        qType:SCollsQueryType;
        isMobile:boolean;
        widthFract:number;
        tileId:number;

    }> = (props) => {

        const handleWordClick = (word:string, qType:SCollsQueryType) => () => {
            dispatcher.dispatch(
                Actions.ClickForExample,
                {
                    tileId: props.tileId,
                    word,
                    qType
                }
            )
        };

        return (
            <S.SCollsTable key={`table:${props.qType}`}>
                {Object.values(props.data).filter(v => !!v).length > 1 ?
                    <h2>{ut.translate(`syntactic_colls__heading_${props.qType}`)}</h2> :
                    null
                }
                {props.data[props.qType] ?
                    isEmpty(props.data, props.qType) ?
                        <p>{ut.translate('syntactic_colls__no_data')}</p> :
                        <globalCompontents.ResponsiveWrapper minWidth={props.isMobile ? undefined : 250}
                                key={props.qType} widthFract={props.widthFract} render={(width:number, height:number) => (
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
                                                    <a onClick={handleWordClick(row.value, props.qType)}>{row.value}</a>
                                                </td>
                                                <td key="freq" className="num">{ut.formatNumber(row.freq)}</td>
                                                <td key="ipm" className="num">{ut.formatNumber(row.ipm, 2)}</td>
                                                <td key="score" className="num">{ut.formatNumber(row.collWeight, 4)}</td>
                                                <td key="cooc-score" className="num">{ut.formatNumber(row.coOccScore, 4)}</td>
                                            </tr>
                                        ),
                                        props.data[props.qType].rows
                                    )}
                                </tbody>
                            </table>
                        )}/> :
                    null
                    }
            </S.SCollsTable>
        );
    };


    // ---------------------- <WSSTable /> ---------------------------

    const WSSTable:React.FC<{
        data:{[key in SCollsQueryType]?:SCollsData};
        qType:SCollsQueryType;
        isMobile:boolean;
        widthFract:number;
        tileId:number;

    }> = (props) => {

        const handleWordClick = (word:string, qType:SCollsQueryType) => () => {
            dispatcher.dispatch(
                Actions.ClickForExample,
                {
                    tileId: props.tileId,
                    word,
                    qType
                }
            )
        };

        return (
            <S.SCollsTable key={`table:${props.qType}`}>
                {Object.values(props.data).filter(v => !!v).length > 1 ?
                    <h2>{ut.translate(`syntactic_colls__heading_${props.qType}`)}</h2> :
                    null
                }
                {props.data[props.qType] ?
                    isEmpty(props.data, props.qType) ?
                        <p>{ut.translate('syntactic_colls__no_data')}</p> :
                        <globalCompontents.ResponsiveWrapper minWidth={props.isMobile ? undefined : 250}
                                widthFract={props.widthFract} render={(width:number, height:number) => (
                            <table className="data">
                                <thead>
                                    <tr>
                                        <th>{ut.translate('syntactic_colls__tab_hd_word')}</th>
                                        <th>{ut.translate('syntactic_colls__tab_hd_score')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {List.map(
                                        (row, i) => (
                                            <tr key={`row:${i}`}>
                                                <td className="word">
                                                    {row.mutualDist < 0 ?
                                                        <>
                                                            <a onClick={handleWordClick(row.value, props.qType)}>{row.value}</a>
                                                            <span className="fn">({row.valueSyntFn})</span>
                                                            {row.mutualDist < -1 ?
                                                                <>
                                                                    <span className="arrows">{'\u2192'}</span>
                                                                    {'\u25EF'}
                                                                </> :
                                                                null
                                                            }
                                                            <span className="arrows">{'\u2192'}</span>
                                                            <span>{'\u2B24'}</span>
                                                            <span className="fn">({row.searchMatchSyntFn})</span>

                                                        </> :
                                                        <>
                                                            {'\u2B24'}
                                                            <span className="fn">({row.searchMatchSyntFn})</span>
                                                            <span className="arrows">{'\u2192'}</span>
                                                            {row.mutualDist > 1 ?
                                                                <>
                                                                    <span className="arrows">{'\u2192'}</span>
                                                                    {'\u25EF'}
                                                                </> :
                                                                null
                                                            }
                                                            <a onClick={handleWordClick(row.value, props.qType)}>{row.value}</a>
                                                            <span className="fn">({row.valueSyntFn})</span>
                                                        </>
                                                    }
                                                </td>
                                                <td className="num">{ut.formatNumber(row.collWeight, 4)}</td>
                                            </tr>
                                        ),
                                        props.data[props.qType].rows
                                    )}
                                </tbody>
                            </table>
                        )}/> :
                    null
                    }
            </S.SCollsTable>
        );
    };

    // -------------- <SyntacticCollsTile /> -------------------------------------

    const SyntacticCollsTile:React.FC<CoreTileComponentProps> = (props) => {

        const state = useModel(model);

        const renderWordCloud = (qType:SCollsQueryType) => {
            return <S.SCollsWordCloud key={`wordcloud:${qType}`}>
                {Object.values(state.data).filter(v => !!v).length > 1 ?
                    <h2>{ut.translate(`syntactic_colls__heading_${qType}`)}</h2> :
                    null
                }
                {state.data[qType] ?
                    isEmpty(state.data, qType) ?
                        <p>{ut.translate('syntactic_colls__no_data')}</p> :
                        <globalCompontents.ResponsiveWrapper minWidth={props.isMobile ? undefined : 250}
                                key={qType} widthFract={props.widthFract} render={(width:number, height:number) => (
                            <WordCloud width={width} height={height} isMobile={props.isMobile}
                                data={state.data[qType].rows}
                                font={theme.infoGraphicsFont}
                                dataTransform={dataTransform}
                            />
                        )}/> :
                    null
                }
            </S.SCollsWordCloud>
        };

        const handleExamplesClick = () => {
            dispatcher.dispatch(
                Actions.HideExampleWindow,
                {
                    tileId: props.tileId
                }
            );
        };

        return (
            <globalCompontents.TileWrapper tileId={props.tileId} isBusy={state.isBusy} error={state.error}
                    hasData={true} sourceIdent={{corp: state.corpname}}
                    backlink={[]} supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                <S.SyntacticColls>
                    {(() => {
                        if (state.isAltViewMode) {
                            return (
                                <div className="tables">
                                    {List.map(qType => renderWordCloud(qType), state.displayTypes)}
                                </div>
                            );

                        } else if (state.exampleWindowData) {
                            return <Examples data={state.exampleWindowData} onClose={handleExamplesClick} />;

                        } else {
                            return (
                                <div className="tables">
                                    {List.map(
                                        (qType, i) => state.apiType === 'default' ?
                                            <ScollexTable key={`scollex:${qType}:${i}`}
                                                tileId={props.tileId} qType={qType} data={state.data}
                                                isMobile={props.isMobile} widthFract={props.widthFract} /> :
                                            <WSSTable  key={`wss:${qType}:${i}`} tileId={props.tileId} qType={qType} data={state.data}
                                                isMobile={props.isMobile} widthFract={props.widthFract} />,
                                        state.displayTypes
                                    )}
                                </div>
                            );
                        }
                    })()}
                </S.SyntacticColls>
            </globalCompontents.TileWrapper>
        );
    }

    return SyntacticCollsTile;

}
