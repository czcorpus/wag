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

import { Color, Dict, List, pipe, tuple } from 'cnc-tskit';
import { HeatmapCell } from './heatmap.js';

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
    data: Array<Array<HeatmapCell>>
): (v: number) => string {
    const groupedData = pipe(
        data,
        List.flatMap((v) => v),
        List.groupBy((v) => `${v.v}`)
    );

    const dataOrderMapping = pipe(
        groupedData,
        List.sortedBy(([, v]) => v[0].v),
        List.map(([, v], i) => tuple(i, v)),
        List.flatMap(([orderIdx, values]) =>
            List.map((v) => tuple(v.id, orderIdx), values)
        ),
        Dict.fromEntries()
    );

    List.forEach((row) => {
        List.forEach((col) => {
            if (col.v === 0) {
                col.sortedIdx = 0;
            } else {
                col.sortedIdx = dataOrderMapping[col.id];
            }
        }, row);
    }, data);
    return saturationColorMapping(0, List.size(groupedData), '#009ee0');
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
