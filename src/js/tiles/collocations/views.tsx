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
import {ActionDispatcher, Bound, ViewUtils} from 'kombo';
import {CollocModel} from './model';
import { GlobalComponents } from '../../views/global';
import { CollocModelState, DataRow } from './common';


export const drawChart = (container:HTMLElement, size:[number, number], data:Immutable.List<DataRow>, measures:Array<string>) => {
    container.innerHTML = '';
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

        const tooltip = d3.select(container)
            .append('div')
            .style('background-color', '#e2f4fb')
            .style('color', '#333333')
            .style('padding', '0.3em 0.7em')
            .style('border-radius', '4px')
            .style('opacity', 0)
            .style('position', 'absolute')
            .text('');

        const text = itemGroup
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

        rect.on('mouseover', (datum, i, values) => {
                tooltip
                    .style('left', `${Math.max(0, d3.select(values[i]).node().getBoundingClientRect().left)}px`)
                    .style('top', `${Math.max(0, d3.select(values[i]).node().getBoundingClientRect().top - 15)}px`)
                    .transition()
                    .duration(200)
                    .style('opacity', '0.8')
                    .style('pointer-events', 'none')
                    .text(valMapping.get(datum.text).Stats.map((v, i) => `${measures[i]}: ${v.s}`).join(', '))

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

    const totalFreq = dataImp.reduce((acc, curr) => parseFloat(curr.Stats[0].s) + acc, 0);
    const layout = cloud()
        .size(size)
        .words(dataImp.map(d => ({
            text: d.str,
            size: ((parseFloat(d.Stats[0].s) / totalFreq) * 100) ** 1.5
        })))
        .padding(5)
        .rotate(() => 0)
        .font("Impact")
        .fontSize(d => d.size)
        .on('end', draw);

    layout.start();
};


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:CollocModel):React.ComponentClass {

    const globalCompontents = ut.getComponents();


    class CollocTile extends React.PureComponent<CollocModelState> {

        private chartContainer:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartContainer = React.createRef();
        }

        componentDidMount() {
            if (this.chartContainer.current) {
                drawChart(this.chartContainer.current, this.props.renderFrameSize, this.props.data, this.props.heading.map(v => v.n));
            }
        }

        componentDidUpdate() {
            if (this.chartContainer.current) {
                drawChart(this.chartContainer.current, this.props.renderFrameSize, this.props.data, this.props.heading.map(v => v.n));
            }
        }

        render() {
            return (
                <globalCompontents.TileWrapper isBusy={this.props.isBusy} error={this.props.error} htmlClass="CollocTile">
                    <div ref={this.chartContainer} style={{minHeight: '10em'}} />
                    {this.props.isExpanded ?
                        <table className="cnc-table data">
                            <tbody>
                                <tr>
                                    {this.props.heading.map((h, i) => <th key={`${i}:${h.s}`}>{h.s}</th>)}
                                </tr>
                                {this.props.data.map((row, i) => (
                                    <tr key={`${i}:${row.str}`}>
                                        <td>{row.str}</td>
                                        {row.Stats.map((stat, i) => <td key={`stat-${i}`}>{stat.s}</td>)}
                                        <td>{row.Stats[1].s}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table> : null
                    }
                </globalCompontents.TileWrapper>
            );
        }
    }

    return Bound<CollocModelState>(CollocTile, model);

}
