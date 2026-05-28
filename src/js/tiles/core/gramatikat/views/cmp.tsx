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

import { IActionDispatcher, useModel, ViewUtils } from 'kombo';
import { Theme } from '../../../../page/theme.js';
import { GlobalComponents } from '../../../../views/common/index.js';
import { GramatikatModel } from '../model.js';
import {
    CoreTileComponentProps,
    TileComponent,
} from '../../../../page/tile.js';
import * as React from 'react';
import { List, Maths, Dict, pipe, tuple } from 'cnc-tskit';
import {
    Bar,
    BarChart,
    Legend,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ValueType } from 'recharts/types/component/DefaultTooltipContent.js';
import {
    GramatikatCase,
    GramatikatFreq,
    GramatikatNumber,
    Summary,
} from '../api.js';

interface MultiWordViewProps {
    posData: {
        summaries: Array<Summary>;
    };
    lemmaData: Array<{
        totalFreq: number;
        variants: Array<GramatikatFreq>;
    }>;
    words: Array<string>;
    missingPos: Array<boolean>;
}

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme
): React.FC<MultiWordViewProps> {
    // -------------------- <MultiWordView /> ------------------------------

    const MultiWordView: React.FC<MultiWordViewProps> = ({
        lemmaData,
        words,
        posData,
        missingPos,
    }) => {
        return <div>TODO - compare mode</div>;
    };

    return MultiWordView;
}
