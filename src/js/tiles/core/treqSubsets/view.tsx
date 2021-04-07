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
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';

import { CoreTileComponentProps, TileComponent } from '../../../page/tile';
import { GlobalComponents, TooltipValues } from '../../../views/global';
import { TreqSubsetModel, flipRowColMapper } from './model';
import { Theme } from '../../../page/theme';
import { TranslationSubset, TranslationsSubsetsModelState } from '../../../models/tiles/translations';
import { List } from 'cnc-tskit';

import * as S from './style';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:TreqSubsetModel):TileComponent {

    const globalComponents = ut.getComponents();

    // ---------------------- <SimpleBar /> ------------------------------------------------------

    const SimpleBar:React.FC<{
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
            [ut.translate('treqsubsets__abs')]: [{value: props.abs}],
            [ut.translate('treqsubsets__perc')]: [{value: props.perc, unit: '%'}]
        };

        return (
            <S.SimpleBar style={{height: `${Math.round(props.width / 3.333)}px`, width: `${props.width}px`}}
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
            </S.SimpleBar>

        )
    }

    // ---------------------- <ChartLikeTable /> ------------------------------------------

    const ChartLikeTable:React.FC<{
        subsets:Array<TranslationSubset>;
        maxNumLines:number;
        chartWidthPx:number;
        highlightedRowIdx:number;
        onMouseOver:(e:React.MouseEvent, values:TooltipValues)=>void;
        onMouseMove:(e:React.MouseEvent)=>void;
        onMouseOut:(e:React.MouseEvent)=>void;

    }> = React.memo((props) => {

        return (
            <S.ChartLikeTable>
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
            </S.ChartLikeTable>
        );
    });

    // ---------------------- <AltViewTable /> ------------------------------------------

    const AltViewTable:React.FC<{
        subsets:Array<TranslationSubset>;
        maxNumLines:number;

    }> = (props) => {

        return (
            <S.AltViewTable className="data">
                <thead>
                    <tr className="top-grouped">
                        <th />
                        {props.subsets.map((v, i) =>
                            <th key={v.label} colSpan={2} className="package separ">{v.label}</th>)}
                    </tr>
                    <tr className="absrel bottom-grouped">
                        <th />
                        {props.subsets.map((v, i) =>
                            <React.Fragment key={`A:${v.label}`}><th>abs.</th><th className="separ">rel.</th></React.Fragment>)}
                    </tr>
                    <tr className="separ"><td colSpan={props.subsets.length * 2} /></tr>
                </thead>
                <tbody>
                    {flipRowColMapper(props.subsets, props.maxNumLines, row => (
                        <tr key={`${row.heading}:${row.idx}`}>
                            <th className="word">{row.heading}</th>
                            {row.cells.map((v, j) => (
                                <React.Fragment key={`cell:${row.idx}:${j}`}>
                                    <td>{ut.formatNumber(v.abs, 1)}</td>
                                    <td>{ut.formatNumber(v.perc, 1)}</td>
                                </React.Fragment>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </S.AltViewTable>
        );

    };

    // ---------------------- <ResultChart /> ------------------------------------------

    class ResultChart extends React.Component<{
        subsets:Array<TranslationSubset>;
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
                tooltipX: e.pageX,
                tooltipY: e.pageY,
                tooltipValues: this.state.tooltipValues
            });
        }

        render() {
            return (
                <div>
                    <globalComponents.ElementTooltip x={this.state.tooltipX} y={this.state.tooltipY} visible={this.state.tooltipVisible}
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

    // --------------------- <TreqSubsetsView /> ----------------------------

    class TreqSubsetsView extends React.PureComponent<TranslationsSubsetsModelState & CoreTileComponentProps> {

        render() {
            return (
                <globalComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={List.flatMap(v => v.translations, this.props.subsets).length > 0}
                        sourceIdent={{corp: 'InterCorp'}}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <S.TreqSubsetsView>
                        <div className="data">
                            {this.props.isAltViewMode ?
                                <AltViewTable subsets={this.props.subsets} maxNumLines={this.props.maxNumLines} /> :
                                <ResultChart subsets={this.props.subsets} maxNumLines={this.props.maxNumLines} chartWidthPx={130}
                                        highlightedRowIdx={this.props.highlightedRowIdx} />
                            }
                        </div>
                    </S.TreqSubsetsView>
                </globalComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<any, any>(TreqSubsetsView, model);
}
