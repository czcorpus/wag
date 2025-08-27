/*
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2025 Institute of the Czech National Corpus,
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
import { SyntacticCollsVsTTModel, TTData } from './model.js';

import * as S from './style.js';
import { List, pipe } from 'cnc-tskit';
import { SCollsDataRow } from '../syntacticColls/api/common.js';


function transpose(data:Array<TTData>):Array<Array<SCollsDataRow>> {
    const maxLen = List.foldl(
        (acc, curr) => List.size(curr.data.rows) > acc ? List.size(curr.data.rows) : acc,
        0,
        data
    );
    const table:Array<Array<SCollsDataRow>> = [];
    for (let i = 0; i < maxLen; i++) {
        if (table[i] === undefined) {
            table[i] = [];
        }
        for (let j = 0; j < List.size(data); j++) {
            table[i][j] = data[j].data.rows[i];
        }
    }
    return table;
}



export function init(
    dispatcher:IActionDispatcher,
    ut:ViewUtils<GlobalComponents>,
    theme:Theme,
    model:SyntacticCollsVsTTModel
):TileComponent {


    const globalCompontents = ut.getComponents();

    // --------------------- <TableRow /> --------------------

    const TableRow:React.FC<{
        num:number;
        row:Array<SCollsDataRow>;
    }> = (props) => {

        return (
            <S.TableRow>
                <th className="num">{props.num}</th>
                {List.map(
                    (v, i) => {
                        const textCSS = {
                            fontWeight: v && v.color ? 'bold' : 'normal',
                        };
                        const cellClass = List.size(props.row)-1 === i ? 'last-cell' : null;
                        const title = v ? `log-dice: ${v.logDice}, LMI: ${v.lmi}, T-Score: ${v.tscore}, LL: ${v.ll}` : null;
                        return v ?
                            <td key={`${i}:${v.value}`} className={cellClass} title={title}>
                                <strong style={textCSS}>{v.value}</strong>
                                {v.color ? <span style={{color: v.color, fontSize: '1.2em'}}>{'\u2605'}</span> : null}
                            </td> :
                            <td key={`${i}:missing`} className={cellClass}>-</td>
                    },
                    props.row
                )}
            </S.TableRow>
        )
    };

    // --------------------- <View /> ----------------------------

    const View:React.FC<CoreTileComponentProps> = (props) => {

        const state = useModel(model);

        const nonEmptyData = List.filter(v => !List.empty(v.data.rows), state.data);
        const transposedData = transpose(nonEmptyData);

        return (
            <globalCompontents.TileWrapper tileId={props.tileId} isBusy={state.isBusy} error={state.error}
                    hasData={true} sourceIdent={{corp: state.corpname}}
                    backlink={[]} supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                <S.View>
                    <S.SingleTTTable>
                        <thead>
                            <tr className="head-row">
                                <th></th>
                                {List.map(
                                    (v, i) => <th key={`label:${v.label}`} className={i === List.size(nonEmptyData)-1 ? 'last-cell' : null}>{v.label}</th>,
                                    nonEmptyData
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {pipe(
                                transposedData,
                                List.map((v, i) => <TableRow num={i+1} key={`row:${i}d`} row={v} />)
                            )}
                        </tbody>
                    </S.SingleTTTable>
                </S.View>
            </globalCompontents.TileWrapper>
        );
    }

    return View;
}
