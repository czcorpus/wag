/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import { fromEvent } from 'rxjs';

import { Theme } from '../../../../page/theme';
import { CoreTileComponentProps, TileComponent } from '../../../../page/tile';
import { GlobalComponents, TooltipValues } from '../../../../views/global';
import { Actions } from '../actions';
import { MultiWordGeoAreasModel, MultiWordGeoAreasModelState } from '../model';
import { QueryMatch } from '../../../../query/index';
import { Dict, List, pipe, tuple } from 'cnc-tskit';
import { DataRow } from '../../../../api/abstract/freqs';


export interface TargetDataRow extends DataRow {
    target: number;
}

const groupData = (data:Array<Array<DataRow>>):[{[area:string]:Array<TargetDataRow>}, {[area:string]:number}, {[area:string]:number}] => {
    const groupedData = pipe(
        data,
        List.flatMap(
            (targetData, queryId) =>
                List.map(
                    item => ({
                        ...item,
                        target: queryId
                    }),
                    targetData
                )
        ),
        List.groupBy(item => item['name'])
    );
    const groupedIpmNorms = pipe(
        groupedData,
        List.map(
            ([area, data]) => tuple(area, data.reduce((acc, curr) => acc + curr.ipm, 0))
        ),
        Dict.fromEntries()
    );
    const groupedAreaAbsFreqs = pipe(
        groupedData,
        List.map(([area, data]) => tuple(area, data.reduce((acc, curr) => acc + curr.freq, 0))),
        Dict.fromEntries()
    );
    return [Dict.fromEntries(groupedData), groupedIpmNorms, groupedAreaAbsFreqs]
}

const createSVGElement = (parent:Element, name:string, attrs:{[name:string]:string}):SVGElement => {
    const elm = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs).forEach(k => {
        elm.setAttribute(k, attrs[k]);
    });
    parent.appendChild(elm);
    return elm;
}


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:MultiWordGeoAreasModel):TileComponent {

    const globComponents = ut.getComponents();

    const createSVGEmptyCircle = (parent:Element, radius:number):SVGElement => {
        const chart = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const circle = createSVGElement(chart, 'g', {});

        const position = radius*Math.sqrt(2)/4

        createSVGElement(
            circle,
            'line',
            {
                'x1': (-position).toString(),
                'y1': (-position).toString(),
                'x2': position.toString(),
                'y2': position.toString(),
                'stroke-width': '2',
                'stroke': 'black'
            }
        );

        createSVGElement(
            circle,
            'line',
            {
                'x1': position.toString(),
                'y1': (-position).toString(),
                'x2': (-position).toString(),
                'y2': position.toString(),
                'stroke-width': '2',
                'stroke': 'black'
            }
        );

        createSVGElement(
            circle,
            'circle',
            {
                'cx': '0',
                'cy': '0',
                'r': radius.toString(),
                'stroke': 'black',
                'stroke-width': '2',
                'fill-opacity': '0'
            }
        );

        parent.appendChild(chart);
        return chart;
    }

    const createSVGPieChart = (parent:Element, areaIpmNorm:number, areaData:Array<TargetDataRow>, radius:number, currentQueryMatches:Array<QueryMatch>):SVGElement => {
        const chart = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const pieSlices = createSVGElement(chart, 'g', {});

        let ipmFracAgg = 0;
        List.forEach(
            row => {
                const ipmFrac = row.ipm / areaIpmNorm;
                const x0 = radius * Math.sin(2 * Math.PI * ipmFracAgg);
                const y0 = -radius * Math.cos(2 * Math.PI * ipmFracAgg);
                ipmFracAgg += ipmFrac;
                const x1 = radius * Math.sin(2 * Math.PI * ipmFracAgg);
                const y1 = -radius * Math.cos(2 * Math.PI * ipmFracAgg);
                const longArc = (ipmFrac) > 0.5 ? 1 : 0;

                createSVGElement(
                    pieSlices,
                    'path',
                    {
                        'd': ipmFrac === 1 ?
                            // circle needs to be created using 2 arcs, there are problems with drawing 360 arc
                            `
                                M 0 -${radius}
                                A ${radius} ${radius} 0 0 1 0 ${radius}
                                A ${radius} ${radius} 0 0 1 0 -${radius}
                            ` : `
                                M 0 0
                                L ${x0} ${y0}
                                A ${radius} ${radius} 0 ${longArc} 1 ${x1} ${y1}
                                L 0 0
                            `,
                        'fill': theme.cmpCategoryColor(row.target, currentQueryMatches.length),
                        'stroke': 'white',
                        'stroke-width': '6',
                        'opacity': '1'
                    }
                );

                // overlay to improve mouse over behaviour
                createSVGElement(
                    chart,
                    'circle',
                    {
                        'cx': '0',
                        'cy': '0',
                        'r': radius.toString(),
                        'fill-opacity': '0',
                        'stroke-opacity': '0'
                    }
                );
            },
            areaData
        );
        parent.appendChild(chart);
        return chart;
    }

    const createSVGLegend = (parent:Element, currentQueryMatches:Array<QueryMatch>):SVGElement => {
        const legend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        let width = 0;

        currentQueryMatches.forEach((match, index) => {
            const legendItem = createSVGElement(legend, 'g', {
                'transform': `translate(${width}, 0)`,
            });

            createSVGElement(
                legendItem,
                'rect',
                {
                    'x': '0',
                    'y': '0',
                    'width': '100',
                    'height': '100',
                    'rx': '10',
                    'stroke-opacity': '0',
                    'fill': theme.cmpCategoryColor(index, currentQueryMatches.length)
                }
            );

            const text = createSVGElement(
                legendItem,
                'text',
                {
                    'dominant-baseline': 'middle',
                    'transform': 'translate(140, 60)',
                    'font-size': '4.5em',
                    'font-weight': 'bold',
                }
            );
            text.style.cssText = 'opacity: 1';
            text.textContent = match.word;

            width += 160 + match.word.length * 40;
        });

        // center legend
        legend.setAttribute('transform', `translate(${-width/2}, 0)`);
        parent.appendChild(legend);
        return legend;
    }

    // -------------- <DataTable /> ---------------------------------------------

    const DataTable:React.SFC<{
        data:Array<Array<DataRow>>;
        queryMatches:Array<QueryMatch>;
    }> = (props) => {
        const [groupedAreaData, groupedAreaIpmNorms, groupedAreaAbsFreqs] = groupData(props.data);
        return (
            <table className="DataTable data cnc-table">
                <thead>
                    <tr>
                        <th rowSpan={2}>{ut.translate('multi_word_geolocations__table_heading_area')}</th>
                        <th colSpan={2}>{ut.translate('multi_word_geolocations__table_heading_total_occurrence')}</th>
                        {props.data.map((targetData, target) => <th key={target} colSpan={2}>
                            {ut.translate('multi_word_geolocations__table_heading_occurrence_of_{word}',
                                {word: props.queryMatches[target].word})}</th>)}
                    </tr>
                    <tr>
                        <th key={`totalIpm`}>{ut.translate('multi_word_geolocations__table_heading_freq_rel')}</th>
                        <th key={`totalAbs`}>{ut.translate('multi_word_geolocations__table_heading_freq_abs')}</th>
                        {(props.data[0] || []).map(dataBlock => {
                            <>
                                <th key={`${dataBlock.name}Ipm`}>{ut.translate('multi_word_geolocations__table_heading_freq_rel')}</th>
                                <th key={`${dataBlock.name}Abs`}>{ut.translate('multi_word_geolocations__table_heading_freq_abs')}</th>
                            </>
                        })}
                    </tr>
                </thead>
                <tbody>
                    {pipe(
                        groupedAreaData,
                        Dict.toEntries(),
                        List.sorted(
                            ([area1,], [area2,]) => area1.localeCompare(area2)
                        ),
                        List.map(([area, rows]) =>
                            <tr key={area}>
                                <td key={area}>{area}</td>
                                <td key={`${area}Ipm`} className="num">{ut.formatNumber(groupedAreaIpmNorms[area], 2)}</td>
                                <td key={`${area}Abs`} className="num">{ut.formatNumber(groupedAreaAbsFreqs[area], 2)}</td>
                                {List.map(
                                    (_, target) => {
                                        const row = rows.find(row => row.target === target);
                                        return row ?
                                            <React.Fragment key={`${area}${target}Freqs`}>
                                                <td  className="num">
                                                    {ut.formatNumber(row.ipm, 2)}
                                                    <br />
                                                    ({ut.formatNumber(100 * row.ipm / groupedAreaIpmNorms[area], 2)}%)
                                                </td>
                                                <td key={`${area}${target}Abs`} className="num">{ut.formatNumber(row.freq, 2)}</td>
                                            </React.Fragment> :
                                            <React.Fragment key={`${area}${target}Freqs`}>
                                                <td></td>
                                                <td></td>
                                            </React.Fragment>
                                    },
                                    props.data
                                )}
                            </tr>
                        )
                    )}
                </tbody>
            </table>
        )
    };

    // -----------------

    const drawLabels = (tileId:number, areaCodeMapping:{[key:string]:string}, currentQueryMatches:Array<QueryMatch>, data:Array<Array<DataRow>>, frequencyDisplayLimit: number) => {
        const [groupedAreaData, groupedAreaIpmNorms, groupedAreaAbsFreqs] = groupData(data);
        const maxIpmNorm = Math.max(...Dict.toEntries(groupedAreaIpmNorms).map(([, v]) => v));
        const minIpmNorm = Math.min(...Dict.toEntries(groupedAreaIpmNorms).map(([, v]) => v));

        // clear possible previous labels
        document.querySelectorAll('#svg-graph-p g.label-mount').forEach(elm => {
            while (elm.firstChild) {
                elm.removeChild(elm.firstChild);
            }
        });

        // insert data
        Dict.forEach(
            (areaIdent, areaName) => {
                const element = document.getElementById(`${areaIdent}-g`);
                if (element) {
                    let pieChart, areaIpmNorm, scale;
                    const areaData = groupedAreaData[areaName]
                    const notEnoughData = !areaData || groupedAreaAbsFreqs[areaName] < frequencyDisplayLimit;

                    if (notEnoughData) {
                        areaIpmNorm = 0;
                        scale = 0.9;

                        pieChart = createSVGEmptyCircle(
                            element,
                            150
                        );
                    } else {
                        areaIpmNorm = groupedAreaIpmNorms[areaName];
                        scale = 0.9 + ((areaIpmNorm - minIpmNorm)/(maxIpmNorm - minIpmNorm))/5;

                        pieChart = createSVGPieChart(
                            element,
                            areaIpmNorm,
                            areaData,
                            150,
                            currentQueryMatches
                        );
                    }
                    // scaling pie chart according to relative ipm norm
                    pieChart.setAttribute('transform', `scale(${scale} ${scale})`);
                    pieChart.setAttribute('style', 'filter: drop-shadow(0px 0px 5px rgba(0, 0, 0, 0.7));');

                    fromEvent(pieChart, 'mousemove')
                        .subscribe((e:MouseEvent) => {
                            dispatcher.dispatch<typeof Actions.ShowAreaTooltip>({
                                name: Actions.ShowAreaTooltip.name,
                                payload: {
                                    areaName: areaName,
                                    areaIpmNorm: areaIpmNorm,
                                    areaData: notEnoughData ? null : areaData,
                                    tileId: tileId,
                                    tooltipX: e.pageX,
                                    tooltipY: e.pageY
                                }
                            });
                        });

                    fromEvent(pieChart, 'mouseout')
                        .subscribe(() => {
                            dispatcher.dispatch<typeof Actions.HideAreaTooltip>({
                                name: Actions.HideAreaTooltip.name,
                                payload: {
                                    tileId: tileId
                                }
                            });
                        });
                }
            },
            areaCodeMapping
        );

        // insert legend
        const legendHolder = document.querySelector('#legend-g');
        createSVGLegend(legendHolder, currentQueryMatches);
    }

    // -------------- <GeoAreasTileView /> ---------------------------------------------

    class MultiWordGeoAreasTileView extends React.PureComponent<MultiWordGeoAreasModelState & CoreTileComponentProps> {

        componentDidMount() {
            if (this.props.data.some(v => v.length > 0) && !this.props.isAltViewMode) {
                drawLabels(this.props.tileId, this.props.areaCodeMapping, this.props.currQueryMatches, this.props.data, this.props.frequencyDisplayLimit);
            }
        }

        componentDidUpdate(prevProps) {
            if (this.props.data.some(v => v.length > 0) && (prevProps.data !== this.props.data || prevProps.isAltViewMode !== this.props.isAltViewMode ||
                        prevProps.renderSize !== this.props.renderSize)) {
                if (!this.props.isAltViewMode) {
                    drawLabels(this.props.tileId, this.props.areaCodeMapping, this.props.currQueryMatches, this.props.data, this.props.frequencyDisplayLimit);
                }
            }
        }

        render() {
            const areaWidth = this.props.widthFract > 2 && !this.props.isMobile ? '90%' : '100%';
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.some(v => v.length > 0)}
                        sourceIdent={{corp: this.props.corpname}}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <div className="MultiWordGeoAreasTileView">
                        {this.props.isAltViewMode ?
                            <div style={{overflowX: 'auto'}}>
                                <DataTable data={this.props.data} queryMatches={this.props.currQueryMatches}/>
                            </div> :
                            <div className="flex-item" style={{width: areaWidth, height: '80%'}}>
                                <div style={{cursor: 'default', width: '100%', height: '100%', overflowX: 'auto', textAlign: 'center'}} dangerouslySetInnerHTML={{__html: this.props.mapSVG}} />
                                {this.props.tooltipArea !== null ?
                                    <globComponents.ElementTooltip
                                        x={this.props.tooltipArea.tooltipX}
                                        y={this.props.tooltipArea.tooltipY}
                                        visible={true}
                                        caption={this.props.tooltipArea.caption}
                                        values={this.props.tooltipArea.data}
                                        multiWord={this.props.tooltipArea.multiWordMode}
                                        colors={idx => theme.cmpCategoryColor(idx, this.props.currQueryMatches.length)}
                                    /> : null}
                            </div>
                        }
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, MultiWordGeoAreasModelState>(MultiWordGeoAreasTileView, model);
}