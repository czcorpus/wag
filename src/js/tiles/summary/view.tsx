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
import * as React from 'react';
import * as Immutable from 'immutable';
import {BoundWithProps} from 'kombo';
import {LineChart, XAxis, YAxis, CartesianGrid, Line, Label, ReferenceArea, Tooltip} from 'recharts';
import * as d3 from 'd3';
import * as d3Scale from 'd3-scale';
import {ActionDispatcher, ViewUtils} from 'kombo';
import { GlobalComponents } from '../../views/global';
import { CoreTileComponentProps, TileComponent } from '../../abstract/types';
import { SummaryModelState, SummaryModel } from './model';
import { SummaryDataRow } from './api';
import { map } from '@reactivex/rxjs/dist/package/operators';

/*
cx: 65
cy: 214.99979
dataKey: "ipm"
fill: "#fff"
height: 210
index: 0
key: "dot-0"
payload: {ipm: 0.01, flevel: 1, abs: null, lemma: null, pos: null}
r: 3
stroke: "#8884d8"
strokeWidth: 1
value: 0.01
width: 330
*/

interface FreqDistItem {
    ipm:number;
    flevel:number;
    abs:number;
    lemma:string;
    pos:string;
    color:string;
}

export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:SummaryModel):TileComponent {

    const globalComponents = ut.getComponents();

    const LineDot:React.SFC<{
        cx:number;
        cy:number;
        stroke:string;
        payload:FreqDistItem;
        value:number;
    }> = (props) => {

        return <svg>
            <circle cx={props.cx} cy={props.cy} r={props.payload.lemma ? 5 : 5} stroke={props.payload.color} strokeWidth="2"
                        fill={props.payload.color} />
        </svg>
    };

    const CustomTooltip:React.SFC<{
        active:boolean;
        type:string;
        payload:Array<{payload:FreqDistItem}>;
        label:string;

    }> = (props) => {
        if (!props.active) {
            return null;

        } else if (props.payload[0].payload.lemma) {
            return (
                <div className="FreqLevelCustomTooltip">
                    <strong>lemma:</strong>{'\u00a0'}
                    <span>{props.payload[0].payload.lemma}</span>
                    <br />
                    <strong>pos:</strong>{'\u00a0'}
                    <span>{props.payload[0].payload.pos}</span>
                    <br />
                    <strong>ipm:</strong>{'\u00a0'}
                    <span>{ut.formatNumber(props.payload[0].payload.ipm, 2)}</span>
                </div>
            );

        } else {
            return (
                <div className="FreqLevelCustomTooltip">
                    <strong>freq level:</strong>{'\u00a0'}
                    <span>{props.payload[0].payload.flevel}</span>
                    <br />
                    <strong>ipm:</strong>{'\u00a0'}
                    <span>{props.payload[0].payload.ipm}</span>
                </div>
            );
        }

    };

    const Chart:React.SFC<{
        data:Immutable.List<SummaryDataRow>;

    }> = (props) => {
        const levels = [{ipm: 0.01, v: 1}, {ipm: 0.1, v: 2}, {ipm: 1, v: 3}, {ipm: 10, v: 4}, {ipm: 100, v: 5}, {ipm: 1000, v: 6}, {ipm: 10000, v: 7}];
        const data = levels
            .map(v => ({ipm: v.ipm, flevel: v.v, abs: null, lemma: null, pos: null, color: '#8884d8'}))
            .concat(props.data.map(v => ({ipm: v.ipm, flevel: v.flevel, abs: v.abs, lemma: v.lemma, pos: v.pos, color: '#F0680B'}))
            .toArray())
            .sort((v1, v2) => v1.flevel - v2.flevel);


        return (
            <LineChart width={400} height={250} data={data}>
                <CartesianGrid stroke="#eee" strokeDasharray="5 5"/>
                <XAxis dataKey="flevel" type="number" domain={[1, 8]} interval={0}>

                </XAxis>
                <YAxis dataKey="ipm" type="number">
                    <Label value="instances per million" angle={-90} position="insideBottomLeft" />
                </YAxis>
                <Line  type="monotone" dataKey="ipm" stroke="#8884d8"
                    dot={({cx, cy, stroke, payload, value}) => <LineDot key={`ld:${cx}:${cy}`} cx={cx} cy={cy} stroke={stroke} payload={payload} value={value} />} />
                <Tooltip isAnimationActive={false} content={CustomTooltip} />
            </LineChart>
        );
    };

    class SummaryTileView extends React.PureComponent<SummaryModelState & CoreTileComponentProps> {

        render() {
            return (
                <globalComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={false} sourceIdent={this.props.corpname}>
                    <div className="SummaryTileView">
                        <div>
                            <Chart data={this.props.data} />
                            <table className="cnc-table data">
                                <tbody>
                                    <tr>
                                        <th></th>
                                        <td>{ut.translate('summary__pos')}</td>
                                        <td>{ut.translate('summary__num_similarly_freq_words')} [%]</td>
                                    </tr>
                                    {this.props.data.map(word => (
                                        <tr key={`w:${word.lemma}:${word.pos}`}>
                                            <th>
                                                {word.lemma}
                                            </th>
                                            <td>
                                                {word.pos}
                                            </td>
                                            <td className="num">
                                                {ut.formatNumber(word.percSimilarWords, 1)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <h3>{ut.translate('summary__words_with_nearest_freq')}</h3>
                            <ul>
                                {this.props.similarFreqWords.map(v => <li key={`k:${v}`}>{v}</li>)}
                            </ul>
                        </div>
                    </div>
                </globalComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(SummaryTileView, model);
}
