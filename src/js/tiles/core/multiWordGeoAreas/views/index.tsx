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
import * as Immutable from 'immutable';
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { fromEvent } from 'rxjs';

import { DataRow } from '../../../../common/api/kontext/freqs';
import { Theme } from '../../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../../common/tile';
import { GlobalComponents, TooltipValues } from '../../../../views/global';
import { ActionName, Actions } from '../actions';
import { MultiWordGeoAreasModel, MultiWordGeoAreasModelState } from '../model';
import { LemmaVariant } from '../../../../common/query';


export interface TargetDataRow extends DataRow {
    target: number;
}

const groupData = (data:Immutable.List<Immutable.List<DataRow>>):[Immutable.Seq.Keyed<string, Immutable.Iterable<number, TargetDataRow>>, Immutable.Iterable<string, number>] => {
    const groupedData = data.flatMap((targetData, targetId) =>
        targetData.map(item => ({
            ...item,
            target: targetId
        } as TargetDataRow))
    ).groupBy(item => item['name']);
    const groupedIpmNorms = groupedData.map(data => data.reduce((acc, curr) => acc + curr.ipm, 0));
    return [groupedData, groupedIpmNorms]
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

    const createSVGPieChart = (parent:Element, areaIpmNorm:number, areaData:Immutable.Iterable<number, TargetDataRow>, radius:number):SVGElement => {
        const chart = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const pieSlices = createSVGElement(chart, 'g', {});
        const pieText = createSVGElement(chart, 'g', {});
        
        let ipmFracAgg = 0;
        areaData.forEach(row => {
            const ipmFrac = row.ipm/areaIpmNorm;
            const x0 = radius * Math.sin(2*Math.PI * ipmFracAgg);
            const y0 = -radius * Math.cos(2*Math.PI * ipmFracAgg);
            ipmFracAgg += ipmFrac/2;
            const xText = radius * Math.sin(2*Math.PI * ipmFracAgg);
            const yText = -radius * Math.cos(2*Math.PI * ipmFracAgg);
            ipmFracAgg += ipmFrac/2;
            const x1 = radius * Math.sin(2*Math.PI * ipmFracAgg);
            const y1 = -radius * Math.cos(2*Math.PI * ipmFracAgg);
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
                    'fill': theme.barColor(row.target),
                    'stroke': 'black',
                    'opacity': '0.8'
                }
            );

            const text = createSVGElement(
                pieText,
                'text',
                {
                    'transform': ipmFrac === 1 ? 'translate(0, 15)' : `translate(${0.5 * xText}, ${0.5 * yText + 15})`,
                    'text-anchor': 'middle',
                    'font-size': '4em',
                    'fill': 'black',
                    // hide labels with values smaller than 10%
                    'visibility': ipmFrac < 0.1 ? 'hidden' : 'visible'
                }
            );
            text.style.cssText = 'opacity: 1';
            text.textContent = `${ut.formatNumber(ipmFrac * 100, 1)}%`;
        })
        parent.appendChild(chart);
        return chart;
    }

    // -------------- <DataTable /> ---------------------------------------------

    const DataTable:React.SFC<{
        data:Immutable.List<Immutable.List<DataRow>>;
        lemmas:Immutable.List<LemmaVariant>;
    }> = (props) => {
        const [groupedAreaData, groupedAreaIpmNorms] = groupData(props.data);
        const groupedAreaAbsFreqs = groupedAreaData.map(data => data.reduce((acc, curr) => acc + curr.freq, 0));
        return (
            <table className="DataTable data cnc-table">
                <thead>
                    <tr>
                        <th colSpan={3}></th>
                        {props.data.map((targetData, target) => <th key={target} colSpan={2}>{props.lemmas.get(target).word}</th>)}
                    </tr>
                    <tr>
                        <th></th>
                        <th colSpan={2}>{ut.translate('multi_word_geolocations__table_heading_freq')}</th>
                        {props.data.map((targetData, target) => <th key={target} colSpan={2}>{ut.translate('multi_word_geolocations__table_heading_freq')}</th>)}
                    </tr>
                    <tr>
                        <th>{ut.translate('multi_word_geolocations__table_heading_area')}</th>
                        <th key={`totalipm`}>{ut.translate('multi_word_geolocations__table_heading_freq_rel')} [ipm]</th>
                        <th key={`totalabs`}>{ut.translate('multi_word_geolocations__table_heading_freq_abs')}</th>
                        {props.data.flatMap((targetData, target) => [
                            <th key={`${target}ipm`}>{ut.translate('multi_word_geolocations__table_heading_freq_rel')} [ipm]</th>,
                            <th key={`${target}abs`}>{ut.translate('multi_word_geolocations__table_heading_freq_abs')}</th>
                        ])}
                    </tr>
                </thead>
                <tbody>
                    {groupedAreaData.sortBy((rows, area) => area, (a, b) => a.localeCompare(b)).entrySeq().map(([area, rows]) => 
                        <tr key={area}>
                            <td key={area}>{area}</td>
                            <td key={`${area}totalipm`} className="num">{groupedAreaIpmNorms.get(area).toFixed(2)}</td>
                            <td key={`${area}totalabs`} className="num">{groupedAreaAbsFreqs.get(area)}</td>
                            {props.data.flatMap((targetData, target) => {
                                const row = rows.find(row => row.target === target);
                                return row ? [
                                    <td key={`${area}${target}ipm`} className="num">{row.ipm}<br/>({(100*row.ipm/groupedAreaIpmNorms.get(area)).toFixed(2)}%)</td>,
                                    <td key={`${area}${target}abs`} className="num">{row.freq}</td>
                                ] : [
                                    <td key={`${area}${target}ipm`}></td>,
                                    <td key={`${area}${target}abs`}></td>
                                ]
                            })}
                        </tr>
                    )}
                </tbody>
            </table>
        )
    };

    // -----------------

    const drawLabels = (tileId:number, areaCodeMapping:Immutable.Map<string, string>, data: Immutable.List<Immutable.List<DataRow>>) => {
        const [groupedAreaData, groupedAreaIpmNorms] = groupData(data);
        const maxIpmNorm = groupedAreaIpmNorms.valueSeq().max();
        const minIpmNorm = groupedAreaIpmNorms.valueSeq().min();
        
        // clear possible previous labels
        document.querySelectorAll('#svg-graph-p g.label-mount').forEach(elm => {
            while (elm.firstChild) {
                elm.removeChild(elm.firstChild);
            }
        });
        // insert data
        groupedAreaData.forEach((areaData, areaName) => {
            const ident = areaCodeMapping.get(areaName);
            if (ident) {
                const element = document.getElementById(`${ident}-g`);
                if (element) {
                    const areaIpmNorm = groupedAreaIpmNorms.get(areaName)
                    const pieChart = createSVGPieChart(
                        element,
                        areaIpmNorm,
                        areaData,
                        150
                    );
                    
                    fromEvent(pieChart, 'mousemove')
                        .subscribe((e:MouseEvent) => {
                            dispatcher.dispatch<Actions.ShowAreaTooltip>({
                                name: ActionName.ShowAreaTooltip,
                                payload: {
                                    areaName: areaName,
                                    areaIpmNorm: areaIpmNorm,
                                    areaData: areaData,
                                    tileId: tileId,
                                    tooltipX: e.pageX,
                                    tooltipY: e.pageY
                                }
                            });
                        });
                    
                    fromEvent(pieChart, 'mouseout')
                        .subscribe(() => {
                            dispatcher.dispatch<Actions.HideAreaTooltip>({
                                name: ActionName.HideAreaTooltip,
                                payload: {
                                    tileId: tileId
                                }
                            });
                        });
                    // scaling pie chart according to relative ipm norm
                    const scale = 0.75 + ((areaIpmNorm - minIpmNorm)/(maxIpmNorm - minIpmNorm))/2;
                    pieChart.setAttribute('transform', `scale(${scale} ${scale})`);
                }
            }
        });
    }

    // -------------- <Tooltip /> ---------------------------------------------

    const Tooltip:React.SFC<{
        x:number;
        y:number;
        visible:boolean;
        caption:string;
        values:TooltipValues;
    }> = (props) => {

        const ref = React.useRef<HTMLDivElement>(null);

        const calcXPos = () =>
            ref.current ? Math.max(0, props.x - ref.current.getBoundingClientRect().width - 20) : props.x;

        const calcYPos = () =>
            ref.current ? props.y +  10 : props.y;

        const style:React.CSSProperties = {
            display: props.visible ? 'block' : 'none',
            visibility: ref.current ? 'visible' : 'hidden',
            top: calcYPos(),
            left: calcXPos()
        };

        return (
            <div className="map-tooltip" ref={ref} style={style}>
                <p>{ut.translate('multi_word_geolocations__table_heading_area')}: {props.caption}</p>
                <table>
                    <tbody>
                        {Object.entries(props.values || {}).map(([label, value], index) => 
                            value === undefined ?
                            null :                                    
                            <tr key={label} style={{color: theme.barColor(index)}}>
                                <td>{label} : {value}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    // -------------- <GeoAreasTileView /> ---------------------------------------------

    class MultiWordGeoAreasTileView extends React.PureComponent<MultiWordGeoAreasModelState & CoreTileComponentProps> {

        componentDidMount() {
            if (this.props.data.some(v => v.size > 0)) {
                drawLabels(this.props.tileId, this.props.areaCodeMapping, this.props.data);
            }
        }

        componentDidUpdate(prevProps) {
            if (this.props.data.some(v => v.size > 0) && (prevProps.data !== this.props.data || prevProps.isAltViewMode !== this.props.isAltViewMode ||
                        prevProps.renderSize !== this.props.renderSize)) {
                drawLabels(this.props.tileId, this.props.areaCodeMapping, this.props.data);
            }
        }

        render() {
            const areaWidth = this.props.widthFract > 2 && !this.props.isMobile ? '90%' : '100%';        
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.some(v => v.size > 0)}
                        sourceIdent={{corp: this.props.corpname}}
                        supportsTileReload={this.props.supportsReloadOnError}>
                    <div className="MultiWordGeoAreasTileView">
                        {this.props.isAltViewMode ?
                            <div style={{overflowX: 'auto'}}>
                                <DataTable data={this.props.data} lemmas={this.props.currentLemmas}/>
                            </div> :
                            <div className="flex-item" style={{width: areaWidth, height: '80%'}}>
                                <div style={{cursor: 'default', width: '100%', height: '100%', overflowX: 'auto', textAlign: 'center'}} dangerouslySetInnerHTML={{__html: this.props.mapSVG}} />
                                <div className="legend">
                                    {this.props.currentLemmas.map((lemma, index) =>
                                        <span key={`legend${index}`} style={{margin: '0 0.5em'}}>
                                            <div className="legendColorBlock" style={{backgroundColor: theme.barColor(index)}} />
                                            {lemma.word}
                                        </span>
                                    )}
                                    <br/>
                                    {ut.translate('multi_word_geolocations__map_legend')}
                                </div>

                                {this.props.tooltipArea !== null ?
                                    <Tooltip
                                        x={this.props.tooltipArea.tooltipX}
                                        y={this.props.tooltipArea.tooltipY}
                                        visible={true}
                                        caption={this.props.tooltipArea.caption}
                                        values={this.props.tooltipArea.data} /> : null}
                            </div>
                        }
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, MultiWordGeoAreasModelState>(MultiWordGeoAreasTileView, model);
}