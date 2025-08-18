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
import { SyntacticCollsModel } from './model.js';
import { init as wordCloudViewInit } from '../../../views/wordCloud/index.js';

import * as S from './style.js';
import { Dict, List, pipe } from 'cnc-tskit';
import { WordCloudItemCalc } from '../../../views/wordCloud/calc.js';
import { Actions } from './common.js';
import { mkScollExampleLineHash, SCollsData, SCollsDataRow, SCollsExamples, SCollsQueryType } from './api/scollex.js';
import { DeprelValue } from './deprel.js';
import { QueryMatch } from '../../../query/index.js';



const isEmpty = (data:SCollsData) => !data || data.rows.length === 0;


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
                        <img className="filtered" src={ut.createStaticUrl('close-icon.svg')} alt={ut.translate('global__img_alt_close_icon')} />
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


    // ---------------------- <Controls /> --------------------------------

    const Controls:React.FC<{
        tileId:number;
        deprelValues:Array<DeprelValue>;
        value:string;
        queryMatch:QueryMatch;

    }> = (props) => {

        const handleChange = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch(
                Actions.SetSrchWordDeprelFilter,
                {
                    value: evt.target.value,
                    tileId: props.tileId
                }
            )
        };

        return (
            <div>
                <h3>Options</h3>
                <form className="Controls cnc-form tile-tweak">
                    <fieldset>
                        <label>
                            syntactic function of the word <strong>&quot;{props.queryMatch.word}&quot;</strong>:{'\u00a0'}
                            <select value={props.value} onChange={handleChange}>
                                <option value="">---</option>
                                {List.map(
                                    ([id, label,]) => <option value={id}>{id}</option>,
                                    props.deprelValues
                                )}
                            </select>
                        </label>
                    </fieldset>
                </form>
            </div>
        );
    };

    // ---------------------- <WSSTable /> ---------------------------

    const WSSTable:React.FC<{
        tileId:number;
        data:SCollsData;
        isMobile:boolean;
        widthFract:number;
        queryType:SCollsQueryType;
        label:string;

    }> = (props) => {

        const handleWordClick = (word:string) => () => {
            dispatcher.dispatch(
                Actions.ClickForExample,
                {
                    tileId: props.tileId,
                    word
                }
            )
        };

        return (
            <S.SCollsTable>
                <h2>{props.label}</h2>
                <globalCompontents.ResponsiveWrapper minWidth={props.isMobile ? undefined : 250}
                        widthFract={props.widthFract}
                        render={(width:number, height:number) => (
                    <table className="data">
                        <thead>
                            <tr>
                                <th>{ut.translate('syntactic_colls__tab_hd_word')}</th>
                                <th>{ut.translate('syntactic_colls__tab_hd_score')} (RRF)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {List.map(
                                (row, i) => (
                                    <tr key={`row:${i}`}>
                                        <td className="word">
                                            {row.mutualDist < 0 ?
                                                <>
                                                    <a onClick={handleWordClick(row.value)}>{row.value}</a>
                                                    <span className="fn">({row.deprel})</span>
                                                    {Math.round(row.mutualDist) <= -2 ?
                                                        <>
                                                            <span className="arrows">{'\u2192'}</span>
                                                            {'\u25EF'}
                                                        </> :
                                                        null
                                                    }
                                                    <span className="arrows">{'\u2192'}</span>
                                                    <span>{'\u2B24'}</span>

                                                </> :
                                                <>
                                                    {'\u2B24'}
                                                    <span className="arrows">{'\u2190'}</span>
                                                    {Math.round(row.mutualDist) >= 2 ?
                                                        <>
                                                            {'\u25EF'}
                                                            <span className="arrows">{'\u2190'}</span>
                                                        </> :
                                                        null
                                                    }
                                                        <span className="fn">({row.deprel})</span>
                                                    <a onClick={handleWordClick(row.value)}>{row.value}</a>
                                                </>
                                            }
                                        </td>
                                        <td className="num">{ut.formatNumber(row.collWeight, 4)}</td>
                                    </tr>
                                ),
                                props.data.rows
                            )}
                        </tbody>
                    </table>
                    )}
                    />
            </S.SCollsTable>
        );
    };

    // -------------- <SyntacticCollsTile /> -------------------------------------

    const SyntacticCollsTile:React.FC<CoreTileComponentProps> = (props) => {

        const state = useModel(model);

        const renderWordCloud = () => {
            return (
                <S.SCollsWordCloud>
                    <h2>{ut.translate(`syntactic_colls__heading_${state.displayType}`)}</h2> :
                    {state.data ?
                        isEmpty(state.data) ?
                            <p>{ut.translate('syntactic_colls__no_data')}</p> :
                            <globalCompontents.ResponsiveWrapper minWidth={props.isMobile ? undefined : 250}
                                    widthFract={props.widthFract} render={(width:number, height:number) => (
                                <WordCloud width={width} height={height} isMobile={props.isMobile}
                                    data={state.data.rows}
                                    font={theme.infoGraphicsFont}
                                    dataTransform={dataTransform}
                                />
                            )}/> :
                        null
                    }
                </S.SCollsWordCloud>
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

        const renderEmptyOrNA = () => {
            if (state.displayType === 'none') {
                return (
                    <p className="no-analysis-avail" title={ut.translate('global__not_applicable')}>
                        {ut.translate('syntactic_colls__not_applicable_for_pos')}
                    </p>
                );
            }
            if (!state.data) {
                <p>{ut.translate('syntactic_colls__no_data')}</p>
            }
            return null;
        }

        return (
            <globalCompontents.TileWrapper tileId={props.tileId} isBusy={state.isBusy} error={state.error}
                    hasData={true} sourceIdent={{corp: state.corpname}}
                    backlink={[]} supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                {
                    state.isTweakMode ?
                        <div className="tweak-box">
                            <Controls
                                tileId={props.tileId}
                                deprelValues={state.deprelValues}
                                value={state.srchWordDeprelFilter}
                                queryMatch={state.queryMatch} />
                        </div> :
                        <S.SyntacticColls>
                            {(() => {
                                if (isEmpty(state.data)) {
                                    renderEmptyOrNA();

                                } else if (state.isAltViewMode) {
                                    return (
                                        <div className="tables">
                                            {renderWordCloud()}
                                        </div>
                                    );

                                } else if (state.exampleWindowData) {
                                    return <Examples data={state.exampleWindowData} onClose={handleExamplesClick} />;

                                } else {
                                    return (
                                        <div className="tables">
                                            <WSSTable
                                                tileId={props.tileId}
                                                data={state.data}
                                                label={state.label}
                                                queryType={state.displayType}
                                                isMobile={props.isMobile}
                                                widthFract={props.widthFract} />
                                        </div>
                                    );
                                }
                            })()}
                        </S.SyntacticColls>
                }
            </globalCompontents.TileWrapper>
        );
    }

    return SyntacticCollsTile;

}
