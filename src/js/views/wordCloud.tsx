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
import { of as rxOf } from 'rxjs';
import { timeout } from 'rxjs/operators';
import 'd3-transition';
import * as cloud from 'd3-cloud';
import { event as d3event, select as d3select, Selection } from 'd3-selection';
import * as React from 'react';
import { ActionDispatcher, ViewUtils } from 'kombo';
import { Theme } from '../common/theme';
import { GlobalComponents } from '../views/global';
import { Actions as GlobalActions, ActionName as GlobalActionName } from '../models/actions';


export interface WordCloudItem {
    text:string;
    value:number;
    tooltip:string;
    interactionId:string;
    initSize:number;
    initSizeMobile:number;
    size?:number;
}


export interface D3WCItem extends WordCloudItem {
    text:string;
    font:string;
    style:string;
    weight:number;
    rotate:number;
    size:number;
    padding:number;
    x:number;
    y:number;
}

export interface WordCloudProps {
    style:{[prop:string]:string};
    isMobile:boolean;
    data:Array<WordCloudItem>;
}


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme):React.ComponentClass<WordCloudProps, {}> {


    function applyTooltip(target:Selection<SVGRectElement, D3WCItem, any, any>, colorPalette:(v:number)=>string) {
        let tooltip:Selection<HTMLElement, {}, any, any>;
        if (!window.document.querySelector('body > .wcloud-tooltip')) {
            tooltip = d3select('body')
                .append('div')
                .classed('wcloud-tooltip', true)
                .style('opacity', 0)
                .text('');

        } else {
            tooltip = d3select('body .wcloud-tooltip');
        }
        target
            .on('mousemove', (datum, i, values) => {
                tooltip
                    .style('left', `${d3event.pageX}px`)
                    .style('top', `${d3event.pageY - 30}px`)
                    .text(datum.tooltip)

            })
            .on('mouseover', (datum, i, values) => {
                tooltip
                    .transition()
                    .duration(200)
                    .style('color', colorPalette(i))
                    .style('opacity', '0.9')
                    .style('pointer-events', 'none');
                dispatcher.dispatch<GlobalActions.SubqItemHighlighted>({
                    name: GlobalActionName.SubqItemHighlighted,
                    payload: {
                        interactionId: datum.interactionId
                    }
                });

            })
            .on('mouseout', (datum, i, values) => {
                rxOf(null).pipe(timeout(1000)).subscribe(
                    () => {
                        tooltip
                            .transition()
                            .duration(100)
                            .style('opacity', '0');
                        dispatcher.dispatch<GlobalActions.SubqItemDehighlighted>({
                            name: GlobalActionName.SubqItemDehighlighted,
                            payload: {
                                interactionId: datum.interactionId
                            }
                        });
                    }
                );
            });
    }


    function wordCloud(theme:Theme, isMobile:boolean, container:HTMLElement, data:Array<WordCloudItem>) {
        container.innerHTML = '';
        const font = 'Roboto Condensed';
        const size = [container.getBoundingClientRect().width, container.getBoundingClientRect().height];
        if (size[0] === 0 || size[1] === 0) {
            // otherwise the browser may crash (a d3-cloud issue)
            return;
        }

        const layout = cloud()
            .size(size)
            .words(data.map(d => ({
                size: isMobile ? d.initSizeMobile : d.initSize * Math.min(size[0] / 500, 1),
                text: d.text,
                value: d.value,
                tooltip: d.tooltip,
                interactionId: d.interactionId,
                initSize: d.initSize,
                initSizeMobile: d.initSizeMobile
            })))
            .padding(5)
            .spiral((size) => {
                const e = size[0] / size[1];
                return (t) => [e * t * 4 * Math.cos(t), 1 / e * 8 * t * Math.sin(t)]
              })
            .rotate(() => 0)
            .font(font)
            .fontSize(d => d.size)
            .on('end', (words:Array<D3WCItem>) => {
                const itemGroup = d3select(container).append('svg')
                    .attr('width', '100%')
                    .attr('height', '100%')
                    .attr('preserveAspectRatio', 'xMinYMin meet')
                    .attr('viewbox', `0 0 ${layout.size()[0]} ${layout.size()[1]}`)
                    .append('g')
                    .attr('transform', `translate(${layout.size()[0] / 2},${layout.size()[1] / 2})`)
                    .selectAll('g')
                    .data(words)
                    .enter()
                    .append('g')
                    .attr('transform', d => `translate(${d.x}, ${d.y}) rotate(0)`);

                const colorPalette = theme.scaleColor(0, 9);

                itemGroup
                    .append('text')
                    .style('font-size', d => `${d.size}px`)
                    .style('font-family', font)
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

                applyTooltip(rect, colorPalette);
            }
        );

        layout.start();
    };


    class WordCloud extends React.PureComponent<WordCloudProps> {

        private readonly chartContainer:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartContainer = React.createRef();
        }

        componentDidMount() {
            if (this.chartContainer.current) {
                wordCloud(theme, this.props.isMobile, this.chartContainer.current, this.props.data);
            }
        }

        componentDidUpdate() {
            if (this.chartContainer.current) {
                wordCloud(theme, this.props.isMobile, this.chartContainer.current, this.props.data);
            }
        }

        render() {
            return <div ref={this.chartContainer} style={this.props.style} />;
        }
    }

    return WordCloud;

}