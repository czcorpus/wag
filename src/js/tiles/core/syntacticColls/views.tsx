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
import { CollMeasure, SyntacticCollsModel } from './model.js';
import { init as wordCloudViewInit } from '../../../views/wordCloud/index.js';

import * as S from './style.js';
import { Dict, List, pipe } from 'cnc-tskit';
import { WordCloudItemCalc } from '../../../views/wordCloud/calc.js';
import { Actions } from './common.js';
import { SCollsData, SCollsDataRow, SCollsQueryType } from './api/common.js';
import { mkScollExampleLineHash, SCollsExamples } from './eApi/mquery.js';



const isEmpty = (data:SCollsData) => !data || data.rows.length === 0;


const extractMeasure = (row:SCollsDataRow, msr:CollMeasure):number => {
    switch (msr) {
        case 'LL':
            return row.ll;
        case 'LMI':
            return row.lmi;
        case 'LogDice':
            return row.logDice;
        case 'T-Score':
            return row.tscore;
        default:
            return undefined;
    }
};


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
        visibleMeasure:CollMeasure;
        availableMeasures:Array<CollMeasure>;

    }> = (props) => {

        const handleChange = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch(
                Actions.SetDisplayScore,
                {
                    value: evt.target.value,
                    tileId: props.tileId
                }
            )
        };

        return (
            <div>
                <form className="Controls cnc-form tile-tweak">
                    <fieldset>
                        <label>
                            {ut.translate('syntactic_colls__collocation_score_select')}:{'\u00a0'}
                            <select value={props.visibleMeasure} onChange={handleChange}>
                                {List.map(
                                    v => <option value={v}>{v}</option>,
                                    props.availableMeasures
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
        visibleMeasures:Array<CollMeasure>;

    }> = (props) => {

        const handleWordClick = (rowId:number) => () => {
            dispatcher.dispatch(
                Actions.ClickForExample,
                {
                    tileId: props.tileId,
                    rowId
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
                                <th rowSpan={2}>{ut.translate('syntactic_colls__tab_hd_word')}</th>
                                <th colSpan={props.visibleMeasures.length}>
                                    {ut.translate('syntactic_colls__tab_hd_score')}
                                </th>
                            </tr>
                            <tr>{
                                List.map(
                                    v => (
                                        <th key={`measure:${v}`}>{v}</th>
                                    ),
                                    props.visibleMeasures
                                )
                            }</tr>
                        </thead>
                        <tbody>
                            {List.map(
                                (row, i) => (
                                    <tr key={`row:${i}`}>
                                        <td className="word">
                                            {row.mutualDist < 0 ?
                                                <>
                                                    <a onClick={handleWordClick(i)}>{row.value}</a>
                                                    {row.deprel ?
                                                        <span className="fn">({row.deprel})</span> :
                                                        null
                                                    }
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
                                                    {row.deprel ?
                                                        <span className="fn">({row.deprel})</span> :
                                                        null
                                                    }
                                                    <a onClick={handleWordClick(i)}>{row.value}</a>
                                                </>
                                            }
                                        </td>
                                        {
                                            List.map(
                                                v => (
                                                    <td key={`measure:${v}`} className="num">
                                                        {ut.formatNumber(extractMeasure(row, v), 2)}
                                                    </td>
                                                ),
                                                props.visibleMeasures
                                            )
                                        }
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

        const handleCloseExamplesClick = () => {
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
                                visibleMeasure={state.visibleMeasures[0]}
                                availableMeasures={state.availableMeasures} />
                        </div> :
                        null
                }
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
                            return <Examples data={state.exampleWindowData} onClose={handleCloseExamplesClick} />;

                        } else {
                            return (
                                <div className="tables">
                                    <WSSTable
                                        tileId={props.tileId}
                                        data={state.data}
                                        label={state.label}
                                        queryType={state.displayType}
                                        isMobile={props.isMobile}
                                        visibleMeasures={state.visibleMeasures}
                                        widthFract={props.widthFract} />
                                </div>
                            );
                        }
                    })()}
                    <p className="hint">
                        {ut.translate('syntactic_colls__items_sorted_by_rrf')}
                    </p>
                </S.SyntacticColls>
            </globalCompontents.TileWrapper>
        );
    }

    return SyntacticCollsTile;

}
