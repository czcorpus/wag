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
import { SyntacticCollsVsTTModel } from './model.js';
import { init as wordCloudViewInit } from '../../../views/wordCloud/index.js';

import * as S from './style.js';
import { Dict, List, pipe } from 'cnc-tskit';
import { QueryMatch } from '../../../query/index.js';
import { SCollsData } from '../syntacticColls/api/scollex.js';



export function init(
    dispatcher:IActionDispatcher,
    ut:ViewUtils<GlobalComponents>,
    theme:Theme,
    model:SyntacticCollsVsTTModel
):TileComponent {


    const globalCompontents = ut.getComponents();

    // --------------------- <SingleTTTable /> --------------------

    const SingleTTTable:React.FC<{
        label:string;
        data:SCollsData;
    }> = (props) => {

        return (
            <S.SingleTTTable>
                <table>
                    <thead>
                        <tr><th colSpan={2}>{props.label}</th></tr>
                    </thead>
                    <tbody>
                        {List.map(
                            (v, i) => (
                                <tr key={`${v.value}:${i}`}>
                                    <th>{i+1})</th>
                                    <td>{v.value}</td>
                                </tr>
                            ),
                            props.data.rows
                        )}
                    </tbody>
                </table>
            </S.SingleTTTable>
        )
    };

    // --------------------- <View /> ----------------------------

    const View:React.FC<CoreTileComponentProps> = (props) => {

        const state = useModel(model);

        return (
            <globalCompontents.TileWrapper tileId={props.tileId} isBusy={state.isBusy} error={state.error}
                    hasData={true} sourceIdent={{corp: state.corpname}}
                    backlink={[]} supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                <S.SyntacticCollsTT>
                    <div className="boxes">
                        {pipe(
                            state.data,
                            List.filter(v => !List.empty(v.data.rows)),
                            List.map(
                                v => <SingleTTTable key={v.id} label={v.label} data={v.data} />,
                            )
                        )}
                    </div>
                </S.SyntacticCollsTT>
            </globalCompontents.TileWrapper>
        );
    }

    return View;
}
