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
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { CoreTileComponentProps, TileComponent } from '../../common/types';
import { GlobalComponents } from '../../views/global';
import { TreqSubsetModel, TreqSubsetsModelState, TranslationSubset, flipRowColMapper } from './model';
import { TreqTranslation } from '../../common/api/treq';
import { Theme } from '../../common/theme';


type TooltipValues = {[key:string]:number|string}|null;


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:TreqSubsetModel):TileComponent {

    const globalComponents = ut.getComponents();


    // ------- <ChartWrapper /> ---------------------------------------------------

    const ChartWrapper:React.SFC<{
        data:Immutable.List<TreqTranslation>;
        width:string|number;
        height:string|number;
        isMobile:boolean;

    }> = (props) => {
        if (props.isMobile) {
            return (
                <BarChart data={props.data.toArray()}
                        width={typeof props.width === 'string' ? parseInt(props.width) : props.width}
                        height={typeof props.height === 'string' ? parseInt(props.height) : props.height}
                        layout="vertical"
                        isAnimationActive={false}>
                    {props.children}
                </BarChart>
            );

        } else {
            return (
                <ResponsiveContainer width={props.width} height={props.height}>
                    <BarChart data={props.data.toArray()} layout="vertical">
                        {props.children}
                    </BarChart>
                </ResponsiveContainer>
            );
        }
    }


    // -------------------------- <Chart /> --------------------------------------
    // TODO probably won't be used

    const Chart:React.SFC<{
        data:Immutable.List<TreqTranslation>;
        width:string|number;
        height:string|number;
        isMobile:boolean;

    }> = (props) => {
        const maxLabelWidth = props.data.max((v1, v2) => v1.right.length - v2.right.length).right.length;
        return (
            <div className="Chart">
                <ChartWrapper data={props.data} isMobile={props.isMobile} width={props.width} height={props.height}>
                    <CartesianGrid />
                    <Bar data={props.data.toArray()} dataKey="perc" fill={theme.barColor(0)} isAnimationActive={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="right" width={Math.max(60, maxLabelWidth * 8)} />
                    <Legend />
                    <Tooltip cursor={false} isAnimationActive={false} />
                </ChartWrapper>
            </div>
        );
    };

    // ---------------------- <SimpleBar /> ------------------------------------------------------

    const SimpleBar:React.SFC<{
        perc:number;
        abs:number;
        maxValue:number;
        width:number;
        color:string;
        onMouseOver:(e:React.MouseEvent, values:TooltipValues)=>void;
        onMouseMove:(e:React.MouseEvent)=>void;
        onMouseOut:(e:React.MouseEvent)=>void;

    }> = (props) => {
        const ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const tooltipVals = {
            [ut.translate('treqsubsets__abs')]: ut.formatNumber(props.abs, 0),
            [ut.translate('treqsubsets__perc')]: `${ut.formatNumber(props.perc, 1)}%`
        };

        return (
            <svg className="SimpleBar" style={{height: `${Math.round(props.width / 3.333)}px`, width: `${props.width}px`}}
                    viewBox="0 0 100 30" preserveAspectRatio="xMinYMin slice">
                <g>
                {ticks.map(t => {
                    const y1 = t % 5 === 0 ? 2 : 6;
                    const y2 = t % 5 === 0 ? 28 : 24;
                    const width = 0.4;
                    const stroke = t === 0 ? 'transparent' : (t % 5 === 0 ? '#CCCCCC' : '#DDDDDD');
                    return (
                        <line key={`tick:${t}`} x1={t * 10} y1={y1}
                                x2={t * 10} y2={y2}
                                style={{stroke: stroke, fill: 'none', 'strokeWidth': width}} />
                    );
                })}
                <rect className="bar"
                        fill={props.color}
                        x={0}
                        y={8}
                        width={props.perc}
                        height={14} />
                <rect x={0} y={0} width={100} height={30}
                        fill="transparent"
                        onMouseOver={(e) => props.onMouseOver(e, tooltipVals)}
                        onMouseMove={props.onMouseMove}
                        onMouseOut={props.onMouseOut} />
                </g>
            </svg>

        )
    }

    // -------------------- <TableTooltip /> ----------------------------------------------

    const TableTooltip:React.SFC<{
        x:number;
        y:number;
        visible:boolean;
        values:TooltipValues;

    }> = (props) => {
        const style = {
            display: props.visible ? 'block' : 'none',
            top: props.y,
            left: props.x
        };

        return (
            <table className="tooltip" style={style}>
                <tbody>
                    {Object.keys(props.values || {}).map(label => {
                        const v = props.values[label];
                        return (
                            <tr key={label}>
                            <th>{label}:</th>
                            {typeof v === 'number' ?
                                <td className="num">{ut.formatNumber(v, 1)}</td> :
                                <td>{v}</td>
                            }
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    }

    // ---------------------- <ChartLikeTable /> ------------------------------------------

    const ChartLikeTable:React.SFC<{
        subsets:Immutable.List<TranslationSubset>;
        maxNumLines:number;
        chartWidthPx:number;
        highlightedRowIdx:number;
        onMouseOver:(e:React.MouseEvent, values:{[key:string]:string|number})=>void;
        onMouseMove:(e:React.MouseEvent)=>void;
        onMouseOut:(e:React.MouseEvent)=>void;

    }> = React.memo((props) => {

        return (
            <table className="ChartLikeTable">
                <thead>
                    <tr>
                        <th />
                        {props.subsets.map((v, i) => <th key={v.label} className="package">{v.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {flipRowColMapper(props.subsets, props.maxNumLines, row => (
                        <tr key={`${row.heading}:${row.idx}`} className={props.highlightedRowIdx === row.idx ? 'highlighted' : null}>
                            <th className="word">{row.heading}</th>
                            {row.cells.map((v, j) => (
                                <td key={`cell:${row.idx}:${j}`} style={{paddingRight: '5px'}}>
                                    <SimpleBar
                                        width={props.chartWidthPx}
                                        perc={v.perc}
                                        abs={v.abs}
                                        maxValue={100}
                                        color={row.color}
                                        onMouseOver={props.onMouseOver}
                                        onMouseMove={props.onMouseMove}
                                        onMouseOut={props.onMouseOut}  />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    });

    // ---------------------- <AltViewTable /> ------------------------------------------

    const AltViewTable:React.SFC<{
        subsets:Immutable.List<TranslationSubset>;
        maxNumLines:number;

    }> = (props) => {

        return (
            <table className="AltViewTable data">
                <thead>
                    <tr>
                        <th />
                        {props.subsets.map((v, i) =>
                            <th key={v.label} colSpan={2} className="package">{v.label}</th>)}
                    </tr>
                    <tr className="absrel">
                        <th />
                        {props.subsets.map((v, i) =>
                            <React.Fragment key={`A:${v.label}`}><th>abs</th><th>rel</th></React.Fragment>)}
                    </tr>
                </thead>
                <tbody>
                    {flipRowColMapper(props.subsets, props.maxNumLines, row => (
                        <tr key={`${row.heading}:${row.idx}`}>
                            <th className="word">{row.heading}</th>
                            {row.cells.map((v, j) => (
                                <React.Fragment key={`cell:${row.idx}:${j}`}>
                                    <td>{v.perc}</td>
                                    <td>{v.abs}</td>
                                </React.Fragment>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );

    };

    // ---------------------- <ResultChart /> ------------------------------------------

    class ResultChart extends React.Component<{
        subsets:Immutable.List<TranslationSubset>;
        maxNumLines:number;
        highlightedRowIdx:number;
        chartWidthPx:number;
    },
    {
        tooltipVisible:boolean;
        tooltipX:number;
        tooltipY:number;
        tooltipValues:TooltipValues;
    }> {

        constructor(props) {
            super(props);
            this.state = {
                tooltipVisible: false,
                tooltipX: 0,
                tooltipY: 0,
                tooltipValues: null
            };
            this.handleMouseMove = this.handleMouseMove.bind(this);
            this.handleMouseOut = this.handleMouseOut.bind(this);
            this.handleMouseOver = this.handleMouseOver.bind(this);
        }

        handleMouseOver(e:React.MouseEvent, values:TooltipValues) {
            this.setState({
                tooltipVisible: true,
                tooltipX: this.state.tooltipX,
                tooltipY: this.state.tooltipY,
                tooltipValues: values
            });
        }

        handleMouseOut() {
            this.setState({
                tooltipVisible: false,
                tooltipX: 0,
                tooltipY: 0,
                tooltipValues: null
            });
        }

        handleMouseMove(e:React.MouseEvent) {
            this.setState({
                tooltipVisible: true,
                tooltipX: Math.max(e.pageX + 20, 0),
                tooltipY: Math.max(e.pageY - 50, 0),
                tooltipValues: this.state.tooltipValues
            });
        }

        render() {
            return (
                <div className="ChartLikeTable">
                    <TableTooltip x={this.state.tooltipX} y={this.state.tooltipY} visible={this.state.tooltipVisible}
                            values={this.state.tooltipValues} />
                    <ChartLikeTable
                        subsets={this.props.subsets}
                        maxNumLines={this.props.maxNumLines}
                        chartWidthPx={this.props.chartWidthPx}
                        onMouseMove={this.handleMouseMove} onMouseOut={this.handleMouseOut}
                        onMouseOver={this.handleMouseOver}
                        highlightedRowIdx={this.props.highlightedRowIdx} />
                </div>
            );
        }
    }

    // --------------------- <SubsetChart /> ----------------------------

    const SubsetChart:React.SFC<{
        data:TranslationSubset;
        isMobile:boolean;

    }> = (props) => {
        return (
            <div>
                <h3>{props.data.label}:</h3>
                <Chart data={props.data.translations} width={200} height={450} isMobile={props.isMobile} />
            </div>
        );
    }

    // --------------------- <TreqSubsetsView /> ----------------------------

    class TreqSubsetsView extends React.PureComponent<TreqSubsetsModelState & CoreTileComponentProps> {

        render() {
            return (
                <globalComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.subsets.flatMap(v => v.translations).size > 0}
                        sourceIdent={{corp: 'InterCorp'}}>
                    <div className="TreqSubsetsView">
                        <div className="data">
                            {this.props.isAltViewMode ?
                                <AltViewTable subsets={this.props.subsets} maxNumLines={this.props.maxNumLines} /> :
                                <ResultChart subsets={this.props.subsets} maxNumLines={this.props.maxNumLines} chartWidthPx={130}
                                        highlightedRowIdx={this.props.highlightedRowIdx} />
                            }
                        </div>
                    </div>
                </globalComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<any, any>(TreqSubsetsView, model);
}
