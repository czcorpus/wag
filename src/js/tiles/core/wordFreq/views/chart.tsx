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
import { CartesianGrid, Dot, Tooltip, Label, Line, LineChart, XAxis, YAxis } from 'recharts';
import { GlobalComponents } from '../../../../views/global';
import { SimilarFreqWord } from '../../../../api/abstract/similarFreq';
import { PosItem } from '../../../../postag';
import { List, pipe, Maths } from 'cnc-tskit';


interface ChartFreqDistItem {
    ipm:number;
    flevel:number;
    lemma:string;
    pos:Array<PosItem>;
    color:string;
}

export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>):React.SFC<{
    tileName:string;
    queryMatches:Array<SimilarFreqWord>;
    activeIdent:number;
}> {

    const globalCompontents = ut.getComponents();

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
        tileName:string;
        queryMatches:Array<SimilarFreqWord>;
        activeIdent:number;
    }> = (props) => {

        const [isClient, setIsClient] = React.useState(false);
        React.useEffect(() => {
            setIsClient(ut.canUseDOM());
        })

        const fBands = [0, 1, 10, 100, 1000, 10000, 100000];
        const queryMatches:Array<ChartFreqDistItem> = pipe(
            props.queryMatches,
            List.map(
                v2 => ({
                    ipm: Maths.roundToPos(v2.ipm, 2),
                    flevel: Maths.roundToPos(Math.log10(v2.ipm) + 2, 2),
                    lemma: v2.lemma,
                    pos: v2.pos,
                    color: '#E2007A'
                })
            ),
            List.sortBy(v => v.ipm)
        );
        const dataAll = pipe(
            fBands,
            List.map(
                (ipm, i) => ({
                    ipm: ipm,
                    flevel: i + 1,
                    lemma: '',
                    pos: [],
                    color: ''
                }),

            ),
            List.concat(queryMatches),
            List.sortBy(v => v.ipm)
        );

        const dataLimitIdx = List.findIndex(v => v.ipm > queryMatches[queryMatches.length - 1].ipm, dataAll) + 1;
        const bandTickLimitIdx = List.findIndex(v => v > queryMatches[queryMatches.length - 1].ipm, fBands) + 1;
        const data = List.slice(0, dataLimitIdx, dataAll);
        const xTicks = List.repeat(x => x + 1, bandTickLimitIdx);
        const yLimit = List.findIndex(v =>  v > queryMatches[queryMatches.length - 1].ipm, fBands) + 1;
        const tickFmt = (value:number, index:number) => value <= 5 ? value.toFixed(0) : '';

        return (
            <globalCompontents.ResponsiveWrapper minWidth={250} render={(width:number, height:number) => (
                isClient ?
                    <LineChart id={`word-freq-chart-${props.tileName}`} data={data} width={width} height={height}>
                        <CartesianGrid stroke="#eee" strokeDasharray="5 5"/>
                        <XAxis dataKey="flevel" type="number" domain={[1, xTicks[xTicks.length - 1]]} ticks={xTicks}
                                tickFormatter={tickFmt}>
                            <Label value={ut.translate('wordfreq__freq_bands')} offset={0} position="insideBottom" />
                        </XAxis>
                        <YAxis dataKey="ipm" type="number" ticks={List.slice(0, yLimit, fBands)}>
                            <Label value={ut.translate('wordfreq__ipm')} offset={5} angle={-90} position="insideBottomLeft" />
                        </YAxis>
                        <Tooltip isAnimationActive={false} />
                        <Line type="monotone" dataKey="ipm" stroke="#8884d8"
                            isAnimationActive={false}
                            dot={({cx, cy, stroke, payload, value}) =>
                                    <LineDot key={`ld:${cx}:${cy}`} cx={cx} cy={cy} stroke={stroke} payload={payload} value={value}
                                                active={payload.ident === props.activeIdent} />} />
                    </LineChart> :
                    null
            )} />
        );
    };

    return Chart;
}