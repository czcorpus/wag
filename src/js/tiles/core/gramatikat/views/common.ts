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

import { Color, Dict, List, Maths, pipe, tuple } from 'cnc-tskit';
import { Theme } from '../../../../page/theme.js';
import { UncommonValue } from '../model.js';

export interface HeatmapCellVal {
    v: number;
    id?: string;
    icon?: 'over' | 'under' | 'none';
}

export function allValuesInCell(
    hc: HeatmapCell,
    pred: (val: HeatmapCellVal) => boolean
): boolean {
    return List.find((v) => !pred(v), hc.values) === undefined;
}

export function someValueInCell(
    hc: HeatmapCell,
    pred: (val: HeatmapCellVal) => boolean
): boolean {
    return List.find((v) => pred(v), hc.values) !== undefined;
}

export function newCell(...vals: Array<HeatmapCellVal>): HeatmapCell {
    return {
        values: [...vals],
    };
}

export interface HeatmapCell {
    values: Array<HeatmapCellVal>;
}

export function saturationColorMapping(
    min: number,
    max: number,
    baseColor: string,
    minSaturation = 0.2
): (v: number) => string {
    const range = Math.abs(max - min);
    const colorRGB = Color.importColor(1, baseColor);
    return (v: number): string => {
        // t: linear coefficient, 0 at min, 1 at max (clamped)
        const t = Math.min(1, Math.max(0, range > 0 ? (v - min) / range : 0));
        if (t >= 1) {
            return baseColor;
        }
        // saturation: minSaturation at min → 1 (full color) at max
        const satur = Color.saturation(
            minSaturation + (1 - minSaturation) * t,
            colorRGB
        );
        // luminosity multiplier: 1+(1-minSaturation) (bright) at min → 1 (original) at max
        const ans = Color.luminosity(1 + (1 - minSaturation) * (1 - t), satur);
        return Color.color2str(ans);
    };
}

export function attachColorIndexes(
    theme: Theme,
    data: Array<{
        valSet: any;
        proportion: number;
        uncommonValue: UncommonValue;
    }>,
    cmpIdx: number
): (v: number) => string {
    const groupedData = pipe(
        data,
        List.groupBy((v) => `${Maths.roundToPos(v.proportion * 100, 2)}`)
    );

    const colorMapping = saturationColorMapping(
        0,
        List.size(groupedData),
        theme.cmpCategoryColor(cmpIdx)
    );

    const mapping = pipe(
        groupedData,
        List.sortedBy(([_, values]) => values[0].proportion),
        List.map(([key], idx) => tuple(key, colorMapping(idx))),
        Dict.fromEntries()
    );

    return (v: number) => mapping[`${Maths.roundToPos(v, 2)}`];
}

export function colIsSetAsHidden(
    visibility: { [tag: string]: boolean },
    tag: string
) {
    const isEmptySetting =
        pipe(
            visibility,
            Dict.map((v, k) => v !== undefined),
            Dict.size()
        ) === 0;
    return !isEmptySetting && !visibility[tag];
}
