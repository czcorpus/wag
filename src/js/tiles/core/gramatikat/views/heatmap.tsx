/*
 * Copyright 2026 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2026 Department of Linguistics,
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

import { Color, List, Maths } from 'cnc-tskit';
import * as S from './style.js';
import * as React from 'react';

export interface HeatmapCell {
    v: number;
    icon?: 'up' | 'down';
}

export const Heatmap: React.FC<{
    data: Array<Array<HeatmapCell>>;
    xLabels: Array<string | React.ReactElement>;
    yLabels: Array<string | React.ReactElement>;
    colorMapping: (v: number) => string;
}> = ({ data, xLabels, yLabels, colorMapping }) => {
    const iconIdToElm = (v: HeatmapCell['icon']): React.ReactElement => {
        if (v === 'up') {
            return <span className="up">{'\u25B2'}</span>;
        } else if (v === 'down') {
            return <span className="down">{'\u25BC'}</span>;
        }
        return null;
    };

    // Filter out zero columns and rows
    const filterZeroColumnsAndRows = (
        data: Array<Array<HeatmapCell>>,
        xLabels: Array<string | React.ReactElement>,
        yLabels: Array<string | React.ReactElement>
    ): [
        Array<Array<HeatmapCell>>,
        Array<string | React.ReactElement>,
        Array<string | React.ReactElement>,
    ] => {
        if (data.length === 0) {
            return [data, xLabels, yLabels];
        }

        const numCols = data[0].length;
        const numRows = data.length;

        // Find non-zero columns
        const nonZeroCols: Array<number> = [];
        for (let col = 0; col < numCols; col++) {
            let hasNonZero = false;
            for (let row = 0; row < numRows; row++) {
                if (data[row][col].v !== 0) {
                    hasNonZero = true;
                    break;
                }
            }
            if (hasNonZero) {
                nonZeroCols.push(col);
            }
        }

        // Find non-zero rows
        const nonZeroRows: Array<number> = [];
        for (let row = 0; row < numRows; row++) {
            let hasNonZero = false;
            for (let col = 0; col < numCols; col++) {
                if (data[row][col].v !== 0) {
                    hasNonZero = true;
                    break;
                }
            }
            if (hasNonZero) {
                nonZeroRows.push(row);
            }
        }

        // Filter data, xLabels, and yLabels
        const filteredData = nonZeroRows.map((rowIdx) =>
            nonZeroCols.map((colIdx) => data[rowIdx][colIdx])
        );
        const filteredXLabels = nonZeroCols.map((colIdx) => xLabels[colIdx]);
        const filteredYLabels = nonZeroRows.map((rowIdx) => yLabels[rowIdx]);

        return [filteredData, filteredXLabels, filteredYLabels];
    };

    const [filteredData, filteredXLabels, filteredYLabels] =
        filterZeroColumnsAndRows(data, xLabels, yLabels);

    return (
        <S.Heatmap>
            <table>
                <thead>
                    <tr>
                        <th />
                        {List.map(
                            (lab, i) => (
                                <th key={`${lab}:${i}`}>
                                    <div>{lab}</div>
                                </th>
                            ),
                            filteredXLabels
                        )}
                    </tr>
                </thead>
                <tbody>
                    {List.map(
                        (row, rowIdx) => (
                            <tr key={`${rowIdx}:${row[0].v}`}>
                                <th className="row">
                                    {filteredYLabels[rowIdx]}
                                </th>
                                {List.map(
                                    (col, i) => (
                                        <td
                                            key={`${col.v}:${i}`}
                                            style={{
                                                backgroundColor: colorMapping(
                                                    col.v
                                                ),
                                                color: Color.color2str(
                                                    Color.textColorFromBg(
                                                        Color.importColor(
                                                            0,
                                                            colorMapping(col.v)
                                                        )
                                                    )
                                                ),
                                            }}
                                        >
                                            {iconIdToElm(col.icon)}
                                            {Maths.roundToPos(col.v, 3)}
                                        </td>
                                    ),
                                    row
                                )}
                            </tr>
                        ),
                        filteredData
                    )}
                </tbody>
            </table>
        </S.Heatmap>
    );
};
