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

import { IActionDispatcher, ViewUtils } from 'kombo';
import * as React from 'react';
import { CartesianGrid, Dot, Label, Line, LineChart, XAxis, YAxis } from 'recharts';
import { GlobalComponents } from '../../../../views/global';
import { QueryPoS } from '../../../../common/query';
import { SimilarFreqWord } from '../../../../common/api/abstract/similarFreq';


interface ChartFreqDistItem {
    ipm:number;
    flevel:number;
    lemma:string;
    pos:Array<{value:QueryPoS; label:string}>;
    color:string;
}

export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>):React.SFC<{
    queryMatches:Array<SimilarFreqWord>;
}> {

    // -------------------- <LineDot /> -----------------------------------------------

    const LineDot:React.SFC<{
        cx:number;
        cy:number;
        stroke:string;
        payload:ChartFreqDistItem;
        value:number;
        active:boolean;
    }> = (props) => {

        const getDotSize = () => {
            if (props.payload.lemma) {
                if (props.active) {
                    return 6;
                }
                return 4;
            }
            return 2;
        }

        return (
            <svg>
                <Dot cx={props.cx} cy={props.cy} r={getDotSize()} stroke={props.payload.color}
                        fill={props.payload.color} />
            </svg>
        );
    };


    // -------------------- <Chart /> -----------------------------------------------
    const Chart:React.SFC<{
        queryMatches:Array<SimilarFreqWord>;
        activeIdent:number;
    }> = (props) => {
        const levels = [
            {ipm: 0.01, v: 1}, {ipm: 0.1, v: 2}, {ipm: 1, v: 3}, {ipm: 10, v: 4},
            {ipm: 100, v: 5}, {ipm: 1000, v: 6}, {ipm: 10000, v: 7}
        ];
        const queryMatches:Array<ChartFreqDistItem> = props.queryMatches.map(v2 => ({
            ipm: v2.ipm,
            flevel: v2.flevel,
            lemma: v2.lemma,
            pos: v2.pos,
            color: '#E2007A'
        }));
        const data = levels
            .map(v => ({ipm: v.ipm, flevel: v.v, lemma: null, pos: null, color: '#8884d8'}))
            .concat(queryMatches)
            .sort((v1, v2) => v1.flevel - v2.flevel);
        return (
            <LineChart width={340} height={250} data={data}>
                <CartesianGrid stroke="#eee" strokeDasharray="5 5"/>
                <XAxis dataKey="flevel" type="number" domain={[1, 7]} ticks={[1, 2, 3, 4, 5, 6, 7]}>
                    <Label value={ut.translate('wordfreq__freq_bands')} offset={0} position="insideBottom" />
                </XAxis>
                <YAxis dataKey="ipm" type="number">
                    <Label value={ut.translate('wordfreq__ipm')} angle={-90} position="insideBottomLeft" />
                </YAxis>
                <Line  type="monotone" dataKey="ipm" stroke="#8884d8"
                    isAnimationActive={false}
                    dot={({cx, cy, stroke, payload, value}) =>
                            <LineDot key={`ld:${cx}:${cy}`} cx={cx} cy={cy} stroke={stroke} payload={payload} value={value}
                                        active={payload.ident === props.activeIdent} />} />
            </LineChart>
        );
    };

    return Chart;
}