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
import * as Immutable from 'immutable';
import { ActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { CartesianGrid, Dot, Label, Line, LineChart, XAxis, YAxis } from 'recharts';

import { CoreTileComponentProps, TileComponent } from '../../common/types';
import { GlobalComponents } from '../../views/global';
import { ActionName, Actions } from './actions';
import { SummaryDataRow } from './api';
import { SummaryModel, SummaryModelState } from './model';

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

interface ChartFreqDistItem {
    ident:number;
    ipm:number;
    flevel:number;
    abs:number;
    lemma:string;
    pos:string;
    color:string;
}

export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:SummaryModel):TileComponent {

    const globalComponents = ut.getComponents();

    // -------------------- <LineDot /> -----------------------------------------------

    const LineDot:React.SFC<{
        cx:number;
        cy:number;
        stroke:string;
        payload:ChartFreqDistItem;
        value:number;
        active:boolean;
    }> = (props) => {


        const handleMouseEnter = () => {
            dispatcher.dispatch<Actions.HighlightLemma>({
                name: ActionName.HighlightLemma,
                payload: {
                    ident: props.payload.ident
                }
            });
        };

        const handleMouseLeave = () => {
            dispatcher.dispatch<Actions.UnhighlightLemma>({
                name: ActionName.UnhighlightLemma
            });
        };

        const getDotSize = () => {
            if (props.payload.lemma) {
                if (props.active) {
                    return 6;
                }
                return 4;
            }
            return 1;
        }

        return (
            <svg>
                <Dot cx={props.cx} cy={props.cy} r={getDotSize()} stroke={props.payload.color}
                        fill={props.payload.color} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} >

                </Dot>
            </svg>
        );
    };


    // -------------------- <CustomTooltip /> -----------------------------------------------

    const CustomTooltip:React.SFC<{
        active:boolean;
        type:string;
        payload:Array<{payload:ChartFreqDistItem}>;
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

    // -------------------- <Stars /> -----------------------------------------------

    const Stars:React.SFC<{
        freqBand:number;

    }> = (props) => {
        return <span className="Stars">{[1, 2, 3, 4, 5, 6, 7].map(v =>
                <img key={`${v}`} src={ut.createStaticUrl(`star${v <= props.freqBand ? '' : '_grey'}.svg`)} />)}</span>
    };

    // -------------------- <Chart /> -----------------------------------------------

    const Chart:React.SFC<{
        lemmaItems:Array<SummaryDataRow>;
        activeIdent:number;

    }> = (props) => {
        const levels = [{ipm: 0.01, v: 1}, {ipm: 0.1, v: 2}, {ipm: 1, v: 3}, {ipm: 10, v: 4}, {ipm: 100, v: 5}, {ipm: 1000, v: 6}, {ipm: 10000, v: 7}];
        const lemmas:Array<ChartFreqDistItem> = props.lemmaItems.map(v2 => ({
            ident: v2.ident,
            ipm: v2.ipm,
            flevel: v2.flevel,
            abs: v2.abs,
            lemma: v2.lemma,
            pos: v2.pos,
            color: '#E2007A'
        }));
        const data = levels
            .map(v => ({ipm: v.ipm, flevel: v.v, abs: null, lemma: null, pos: null, color: '#8884d8'}))
            .concat(lemmas)
            .sort((v1, v2) => v1.flevel - v2.flevel);

        return (
            <LineChart width={340} height={200} data={data}>
                <CartesianGrid stroke="#eee" strokeDasharray="5 5"/>
                <XAxis dataKey="flevel" type="number" domain={[1, 7]} ticks={[1, 2, 3, 4, 5, 6, 7]}>

                </XAxis>
                <YAxis dataKey="ipm" type="number">
                    <Label value="instances per million" angle={-90} position="insideBottomLeft" />
                </YAxis>
                <Line  type="monotone" dataKey="ipm" stroke="#8884d8"
                    isAnimationActive={false}
                    dot={({cx, cy, stroke, payload, value}) =>
                            <LineDot key={`ld:${cx}:${cy}`} cx={cx} cy={cy} stroke={stroke} payload={payload} value={value}
                                        active={payload.ident === props.activeIdent} />} />

            </LineChart>
        );
    };

    // -------------------- <LemmaList /> -----------------------------------------------

    const LemmaList:React.SFC<{
        data:Immutable.List<SummaryDataRow>;
        currIdent:number;

    }> = (props) => {

        const handleMouseEnter = (ident:number) => () => {
            dispatcher.dispatch<Actions.HighlightLemma>({
                name: ActionName.HighlightLemma,
                payload: {
                    ident: ident
                }
            });
        };

        const handleMouseLeave = () => {
            dispatcher.dispatch<Actions.UnhighlightLemma>({
                name: ActionName.UnhighlightLemma
            });
        };

        return (
            <table className="cnc-table data LemmaList">
                <tbody>
                    <tr>
                        <th></th>
                        <th>{ut.translate('summary__pos')}</th>
                        <th>{ut.translate('summary__ipm')}</th>
                        <th>{ut.translate('summary__freq_bands')}</th>
                    </tr>
                    {props.data.map(word => (
                        <tr key={`w:${word.lemma}:${word.pos}`}
                                className={props.currIdent === word.ident ? 'current' : null}
                                onMouseEnter={handleMouseEnter(word.ident)}
                                onMouseLeave={handleMouseLeave}>
                            <th>
                                {word.lemma}
                            </th>
                            <td>
                                {word.pos}
                            </td>
                            <td className="num">
                                {ut.formatNumber(word.ipm, 2)}
                            </td>
                            <td>
                                <Stars freqBand={Math.round(word.flevel)} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };


    // -------------------- <WordFreqTileView /> -----------------------------------------------

    class WordFreqTileView extends React.PureComponent<SummaryModelState & CoreTileComponentProps> {
        render() {
            return (
                <globalComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.size > 0} sourceIdent={{corp: this.props.corpname}}>
                    <div className={`WordFreqTileView${this.props.isMobile ? ' mobile' : ''}`}>
                        <div className="cell">
                            <LemmaList data={this.props.data} currIdent={this.props.currLemmaIdent} />
                        </div>
                        <div className="cell">
                                {this.props.data.size > 0 ?
                                <>
                                    {this.props.isMobile ?
                                        null :
                                        <Chart lemmaItems={this.props.data.toArray()} activeIdent={this.props.currLemmaIdent} />
                                    }
                                </> :
                                null
                                }
                        </div>
                    </div>
                </globalComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(WordFreqTileView, model);
}
