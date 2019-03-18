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
import 'd3-transition';

import * as cloud from 'd3-cloud';
import { event as d3event, select as d3select } from 'd3-selection';
import * as Immutable from 'immutable';
import { ActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { of as rxOf } from 'rxjs';
import { timeout } from 'rxjs/operators';

import { Theme } from '../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../common/types';
import { GlobalComponents } from '../../views/global';
import { ActionName, Actions, DataRow, SrchContextType } from './common';
import { CollocModel, CollocModelState } from './model';



export const drawChart = (theme:Theme, isMobile:boolean, container:HTMLElement, size:[number, number], data:Immutable.List<DataRow>, measures:Array<string>) => {
    container.innerHTML = '';

    if (size[0] === 0 || size[1] === 0) {
        // otherwise the browser may crash
        return;
    }
    const dataImp:Array<{text:string; size:number}> = data.map(d => {
        return {
            text: d.str,
            size: isMobile ? d.wcFontSizeMobile : d.wcFontSize
        };
    }).toArray();
    const colorPalette = theme.scaleColor(0, 9);
    const valMapping = Immutable.Map<string, DataRow>(data.map(v => [v.str, v]));

    const layout = cloud()
        .size(size)
        .words(dataImp)
        .padding(5)
        .rotate(() => 0)
        .font("Impact")
        .fontSize(d => d.size)
        .on('end', (words:Array<{size:number, rotate:number, text:string, x:number, y:number}>) => {
            const itemGroup = d3select(container).append('svg')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr('viewbox', `0 0 ${layout.size()[0]} ${layout.size()[1]}`)
                .append('g')
                .attr('transform', `translate(${layout.size()[0] / 2},${layout.size()[1] / 2})`)
                .selectAll('g')
                .data(words)
                .enter()
                .append('g')
                .attr('transform', d => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`);

            let tooltip;
            if (!window.document.querySelector('body > .wcloud-tooltip')) {
                tooltip = d3select('body')
                    .append('div')
                    .classed('wcloud-tooltip', true)
                    .style('opacity', 0)
                    .text('');

            } else {
                tooltip = d3select('body .wcloud-tooltip');
            }

            itemGroup
                .append('text')
                .style('font-size', d => `${d.size}px`)
                .style('font-family', 'Roboto Condensed')
                .style('font-weight', '700')
                .style('fill', (d, i) => colorPalette(i))
                .style('pointer-events', 'none')
                .attr('text-anchor', 'middle')
                .text(d => d.text);

            const rect = itemGroup.append('rect')
                .attr('x',function (d) { return (this.parentNode as SVGAElement).getBBox().x})
                .attr('y',function (d) { return (this.parentNode as SVGAElement).getBBox().y})
                .attr('width', function (d) { return (this.parentNode as SVGAElement).getBBox().width})
                .attr('height', function (d) { return (this.parentNode as SVGAElement).getBBox().height})
                .attr('opacity', 0)
                .style('pointer-events', 'fill');

            rect
                .on('mousemove', (datum, i, values) => {
                    tooltip
                        .style('left', `${d3event.pageX}px`)
                        .style('top', `${d3event.pageY - 30}px`)
                        .text(valMapping.get(datum.text).stats.map((v, i) => `${measures[i+1]}: ${v}`).join(', '))

                })
                .on('mouseover', (datum, i, values) => {
                    tooltip
                        .transition()
                        .duration(200)
                        .style('color', colorPalette(i))
                        .style('opacity', '0.9')
                        .style('pointer-events', 'none');

                })
                .on('mouseout', (datum, i, values) => {
                    rxOf(null).pipe(timeout(1000)).subscribe(
                        () => {
                            tooltip
                                .transition()
                                .duration(100)
                                .style('opacity', '0');
                        }
                    );
                });
        }
    );

    layout.start();
};


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:CollocModel):TileComponent {

    const globalCompontents = ut.getComponents();


    // -------------- <Controls /> -------------------------------------

    const Controls:React.SFC<{
        tileId:number;
        value:SrchContextType;

    }> = (props) => {

        const handleChange = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch<Actions.SetSrchContextType>({
                name: ActionName.SetSrchContextType,
                payload: {
                    tileId: props.tileId,
                    ctxType: evt.target.value as SrchContextType
                }
            })
        }

        return (
            <form className="Controls cnc-form">
                <label>{ut.translate('collocations__search_in_context_label')}: </label>
                <select value={props.value} onChange={handleChange}>
                    <option value={SrchContextType.LEFT}>
                        {ut.translate('collocations__context_left')}
                    </option>
                    <option value={SrchContextType.RIGHT}>
                        {ut.translate('collocations__context_right')}
                    </option>
                    <option value={SrchContextType.BOTH}>
                        {ut.translate('collocations__context_both')}
                    </option>
                </select>
            </form>
        );
    };


    // -------------- <CollocTile /> -------------------------------------

    class CollocTile extends React.PureComponent<CollocModelState & CoreTileComponentProps> {

        private chartContainer:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartContainer = React.createRef();
        }


        private calcChartAreaWidth():[number, number] {
            return [
                this.props.renderSize[0] / (this.props.widthFract > 1 && !this.props.isMobile ? 2 : 1.1),
                Math.max(240, this.props.data.size * 30)
            ];
        }

        componentDidMount() {
            if (this.chartContainer.current) {
                drawChart(
                    theme,
                    this.props.isMobile,
                    this.chartContainer.current,
                    this.calcChartAreaWidth(),
                    this.props.data,
                    this.props.heading.map(v => v.label)
                );
            }
        }

        componentDidUpdate(prevProps) {
            if (this.chartContainer.current &&
                    (this.props.data !== prevProps.data ||
                    this.props.isMobile !== prevProps.isMobile)) {
                drawChart(
                    theme,
                    this.props.isMobile,
                    this.chartContainer.current,
                    this.calcChartAreaWidth(),
                    this.props.data,
                    this.props.heading.map(v => v.label)
                );
            }
        }

        render() {
            return (
                <globalCompontents.TileWrapper isBusy={this.props.isBusy} error={this.props.error} htmlClass="CollocTile"
                        hasData={this.props.data.size > 0} sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlink}>
                    {this.props.isTweakMode ?
                        <>
                            <Controls tileId={this.props.tileId} value={this.props.ctxType} />
                            <hr />
                        </> :
                        null
                    }
                    <div className="boxes">
                        <div className="chart" ref={this.chartContainer}
                                style={{height: this.props.isMobile ? `${this.props.data.size * 30}px` : "initial"}} />
                        {this.props.widthFract > 1 && !this.props.isMobile ?
                            <table className="cnc-table data">
                                <tbody>
                                    <tr>
                                        <th />
                                        {this.props.heading.map((h, i) => <th key={`${i}:${h.ident}`}>{h.label}</th>)}
                                    </tr>
                                    {this.props.data.map((row, i) => (
                                        <tr key={`${i}:${row.str}`}>
                                            <td className="word">{row.str}</td>
                                            <td className="num">{ut.formatNumber(row.freq)}</td>
                                            {row.stats.map((stat, i) => <td key={`stat-${i}`} className="num">{ut.formatNumber(stat, 2)}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table> : null
                        }
                    </div>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, CollocModelState>(CollocTile, model);

}
