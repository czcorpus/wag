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

import * as d3 from 'd3';
import * as d3Scale from 'd3-scale';
import * as cloud from 'd3-cloud';
import * as React from 'react';
import * as Immutable from 'immutable';
import * as Rx from '@reactivex/rxjs';
import {ActionDispatcher, ViewUtils, BoundWithProps} from 'kombo';
import {CollocModel, CollocModelState} from './model';
import { GlobalComponents } from '../../views/global';
import { DataRow } from './common';
import { TileComponent, CoreTileComponentProps } from '../../abstract/types';


export const drawChart = (container:HTMLElement, size:[number, number], data:Immutable.List<DataRow>, measures:Array<string>) => {
    container.innerHTML = '';
    if (size[0] === 0 || size[1] === 0) {
        // otherwise the browser may crash
        return;
    }
    const dataImp:Array<DataRow> = data.toArray();
    const c20 = d3Scale.scaleOrdinal(d3.schemeCategory10).domain(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    const valMapping = Immutable.Map<string, DataRow>(data.map(v => [v.str, v]));

    const draw = (words:Array<{size:number, rotate:number, text:string, x:number, y:number}>) => {
        const itemGroup = d3.select(container).append('svg')
            .attr('width', layout.size()[0])
            .attr('height', layout.size()[1])
            .append('g')
            .attr('transform', `translate(${layout.size()[0] / 2},${layout.size()[1] / 2})`)
            .selectAll('g')
            .data(words)
            .enter()
            .append('g')
            .attr('transform', d => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`);

        let tooltip;
        if (!window.document.querySelector('body > .wcloud-tooltip')) {
            tooltip = d3.select('body')
                .append('div')
                .classed('wcloud-tooltip', true)
                .style('opacity', 0)
                .text('');

        } else {
            tooltip = d3.select('body .wcloud-tooltip');
        }

        itemGroup
            .append('text')
            .style('font-size', d => `${d.size}px`)
            .style('font-family', 'Impact')
            .style('fill', (d, i) => c20(`${i}`))
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

        rect.on('mousemove', (datum, i, values) => {
                tooltip
                    .style('left', `${d3.event.pageX}px`)
                    .style('top', `${d3.event.pageY - 30}px`)
                    .text(valMapping.get(datum.text).stats.map((v, i) => `${measures[i+1]}: ${v}`).join(', '))

            })
            .on('mouseover', (datum, i, values) => {
                tooltip
                    .transition()
                    .duration(200)
                    .style('color', c20(`${i}`))
                    .style('opacity', '0.9')
                    .style('pointer-events', 'none');

            })
            .on('mouseout', (datum, i, values) => {
                Rx.Observable.of(null).timeout(1000).subscribe(
                    () => {
                        tooltip
                            .transition()
                            .duration(100)
                            .style('opacity', '0');
                    }
                );
            });
    }

    const layout = cloud()
        .size(size)
        .words(dataImp.map(d => {
            return {
                text: d.str,
                size: d.wcFontSize
            };
        }))
        .padding(5)
        .rotate(() => 0)
        .font("Impact")
        .fontSize(d => d.size)
        .on('end', draw);

    layout.start();
};


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:CollocModel):TileComponent {

    const globalCompontents = ut.getComponents();


    class CollocTile extends React.PureComponent<CollocModelState & CoreTileComponentProps> {

        private chartContainer:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartContainer = React.createRef();
        }

        componentDidMount() {
            if (this.chartContainer.current) {
                drawChart(
                    this.chartContainer.current,
                    [this.props.renderSize[0], this.props.data.size * 30],
                    this.props.data,
                    this.props.heading.map(v => v.label)
                );
            }
        }

        componentDidUpdate() {
            if (this.chartContainer.current) {
                drawChart(
                    this.chartContainer.current,
                    [this.props.renderSize[0] / (this.props.widthFract > 1 ? 2 : 1), this.props.data.size * 30],
                    this.props.data,
                    this.props.heading.map(v => v.label)
                );
            }
        }

        render() {
            return (
                <globalCompontents.TileWrapper isBusy={this.props.isBusy} error={this.props.error} htmlClass="CollocTile"
                        hasData={this.props.data.size > 0}
                        sourceIdent={this.props.corpname}>
                    <div className="boxes">
                        <div ref={this.chartContainer} style={{minHeight: '10em', position: 'relative'}} />
                        {this.props.widthFract > 1 ?
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
