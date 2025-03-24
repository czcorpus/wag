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

import { Theme } from '../../../page/theme.js';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';
import { Actions } from './common.js';
import { CollocModel } from './model.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { init as wcloudViewInit } from '../../../views/wordCloud/index.js';
import { DataRow, SrchContextType, DataHeading } from '../../../api/abstract/collocations.js';
import { CollocModelState } from '../../../models/tiles/collocations.js';
import { List } from 'cnc-tskit';

import * as S from './style.js';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:CollocModel):TileComponent {

    const globalCompontents = ut.getComponents();
    const WordCloud = wcloudViewInit<DataRow>(dispatcher, ut, theme);

    // -------------- <Controls /> -------------------------------------

    const Controls:React.FC<{
        tileId:number;
        value:SrchContextType;

    }> = (props) => {

        const handleChange = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch<typeof GlobalActions.SubqChanged>({
                name: GlobalActions.SubqChanged.name,
                payload: {
                    tileId: props.tileId
                }
            });
            console.log('Actions.SetSrchContextType.name: ', Actions.SetSrchContextType.name)
            dispatcher.dispatch<typeof Actions.SetSrchContextType>({
                name: Actions.SetSrchContextType.name,
                payload: {
                    tileId: props.tileId,
                    ctxType: evt.target.value as SrchContextType
                }
            });
        }

        return (
            <form className="Controls cnc-form tile-tweak">
                <label>{ut.translate('collocations__search_in_context_label')}: </label>
                <select value={props.value} onChange={handleChange}>
                    <option value={SrchContextType.LEFT}>
                        {ut.translate('collocations__context_left')}
                    </option>
                    <option value={SrchContextType.RIGHT}>
                        {ut.translate('collocations__context_right')}
                    </option>
                    <option value={SrchContextType.BOTH}>
                        {ut.translate('collocations__context_both')}
                    </option>
                </select>
            </form>
        );
    };

    // -------------- <TableView /> -------------------------------------

    const TableView:React.FC<{
        data:Array<DataRow>;
        heading:DataHeading;
        caption:string;
    }> = (props) => {
        return (
            <table className="data">
                <caption>{props.caption}</caption>
                <thead>
                    <tr>
                        <th />
                        {props.heading.map((h, i) => <th key={`${i}:${h.ident}`}>{h.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {props.data.map((row, i) => (
                        <tr key={`${i}:${row.str}`}>
                            <td className="word">{row.str}</td>
                            <td className="num">{ut.formatNumber(row.freq)}</td>
                            {row.stats.map((stat, i) => <td key={`stat-${i}`} className="num">{ut.formatNumber(stat, 2)}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }


    // -------------- <CollocTile /> -------------------------------------

    const CollocTile:React.FC<CollocModelState & CoreTileComponentProps> = (props) => {

        const sortItemIdx = props.heading.findIndex(v => v.ident === props.sortByMetric);
        const dataTransform = (v:DataRow) => ({
            text: v.str,
            value: sortItemIdx > 0 ? v.stats[sortItemIdx - 1] : v.freq, // abs attr is not in the stats array (=> -1)
            tooltip: v.stats.map((v, i) => ({label: props.heading[i+1].label,  value: v, round: 3})),
            interactionId: v.interactionId
        });

        const colorGen = props.data.length > 1 ? idx => theme.scaleColorCmpDerived(idx, props.data.length) : (_:number) => theme.scaleColorIndexed();

        return (
            <globalCompontents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                    hasData={props.data.some(data => data !== null && data.length > 0)} sourceIdent={{corp: props.corpname}}
                    backlink={props.backlinks} supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                {props.isTweakMode ?
                        <div className="tweak-box"><Controls tileId={props.tileId} value={props.srchRangeType} /></div> :
                    null
                }
                <S.Boxes $isMobile={props.isMobile}>
                    {List.map((data, index) => {
                        const otherWords = List.flatMap((v, i) => index === i ? [] : List.map(u => u.str, v), props.data);

                        return props.isAltViewMode ?
                            <TableView key={index} heading={props.heading} data={data} caption={props.data.length > 1 ? props.queryMatches[index].word : null} /> :
                            data ?
                                <globalCompontents.ResponsiveWrapper minWidth={props.isMobile ? undefined : 250}
                                        key={index} widthFract={props.widthFract} render={(width:number, height:number) => (
                                    <S.CollocCloud>
                                        {props.data.length > 1 ?
                                            <h2>{props.queryMatches[index].word}</h2> :
                                            null
                                        }
                                        <WordCloud width={width} height={height} data={data} isMobile={props.isMobile}
                                                font={theme.infoGraphicsFont}
                                                dataTransform={dataTransform}
                                                selectedText={props.data.length > 1 ? props.selectedText : null}
                                                colors={colorGen(index)}
                                                underlineWords={otherWords} />
                                    </S.CollocCloud>
                                )} /> :
                                <globalCompontents.ResponsiveWrapper key={`${index}empty`}
                                    render={() => data === null ?
                                        <p>{ut.translate('collocations__processing') + '\u2026'}</p> :
                                        <p>{ut.translate('collocations__no_data')}</p>} />
                        },
                        props.data
                    )}
                </S.Boxes>
            </globalCompontents.TileWrapper>
        );
    }

    return BoundWithProps<CoreTileComponentProps, CollocModelState>(CollocTile, model);

}
