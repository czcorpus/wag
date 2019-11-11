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

    const createSVGPieChart = (parent:Element, ipmNorm:number, data:Array<DataRow>, radius:number):SVGElement => {
        const chart = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const pieSlices = createSVGElement(chart, 'g', {});
        const pieText = createSVGElement(chart, 'g', {});
        
        let ipmFracAgg = 0;
        data.forEach((row, index) => {
            const ipmFrac = row.ipm/ipmNorm;
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
                    'fill': theme.barColor(index),
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
                    'visibility': ipmFrac < 0.05 ? 'hidden' : 'visible'
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

        const groupedData = props.data.flatMap((variantData, index) => variantData.map(item => ({...item, variant: index}))).groupBy(item => item['name']);
        return (
            <table className="DataTable data cnc-table">
                <thead>
                    <tr>
                        <th></th>
                        {props.data.map((item, index) => <th key={index} colSpan={2}>{props.lemmas.get(index).word}</th>)}
                    </tr>
                    <tr>
                        <th>{ut.translate('multi_word_geolocations__table_heading_area')}</th>
                        {props.data.flatMap((item, index) => [
                            <th key={`${index}ipm`}>{ut.translate('multi_word_geolocations__table_heading_ipm')}</th>,
                            <th key={`${index}freq`}>{ut.translate('multi_word_geolocations__table_heading_abs')}</th>
                        ])}
                    </tr>
                </thead>
                <tbody>
                    {groupedData.sortBy((v, k) => k).entrySeq().map(([name, rows]) => 
                        <tr key={name}>
                            <td key={name}>{name}</td>
                            {props.data.flatMap((item, index) => {
                                const row = rows.find(i => i.variant === index)
                                return row ? [
                                    <td key={`${name}${index}ipm`} className="num">{row.ipm}</td>,
                                    <td key={`${name}${index}freq`} className="num">{row.freq}</td>
                                ] : [
                                    <td key={`${name}${index}ipm`} className="num"></td>,
                                    <td key={`${name}${index}freq`} className="num"></td>
                                ]
                            })}
                        </tr>
                    )}
                </tbody>
            </table>
        )
    };

    // -----------------

    const drawLabels = (props:MultiWordGeoAreasModelState, tileId:number) => {
        const groupedData = props.data.flatMap((variantData, variantName) => variantData.map(item => ({...item, variant: variantName}))).groupBy(item => item['name']);
        const groupedIpmNorms = groupedData.map(data => data.reduce((acc, curr) => acc + curr.ipm, 0));
        const maxIpmNorm = groupedIpmNorms.valueSeq().max();
        const minIpmNorm = groupedIpmNorms.valueSeq().min();
        
        // clear possible previous labels
        document.querySelectorAll('#svg-graph-p g.label-mount').forEach(elm => {
            while (elm.firstChild) {
                elm.removeChild(elm.firstChild);
            }
        });
        // insert data
        groupedData.forEach((data, name) => {
            const ident = props.areaCodeMapping.get(name);
            if (ident) {
                const elm = document.getElementById(`${ident}-g`);
                if (elm) {
                    const ipmNorm = groupedIpmNorms.get(name)
                    const pieChart = createSVGPieChart(
                        elm,
                        ipmNorm,
                        data.toArray(),
                        150
                    );
                    
                    fromEvent(pieChart, 'mousemove')
                        .subscribe((e:MouseEvent) => {
                            dispatcher.dispatch<Actions.ShowAreaTooltip>({
                                name: ActionName.ShowAreaTooltip,
                                payload: {
                                    areaName: name,
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
                    
                    const scale = 0.75 + ((ipmNorm - minIpmNorm)/(maxIpmNorm - minIpmNorm))/2;
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
        values:{[variant:string]:TooltipValues};
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
                {Object.entries(props.values).map(([variant, values], index) =>
                    <table key={variant} style={{color: theme.barColor(index)}}>
                        <caption>{variant}</caption>
                        <tbody>
                            {Object.keys(values || {}).map(label => {
                                const v = values ? values[label] : '';
                                return (
                                    <tr key={label}>
                                    {typeof v === 'number' ?
                                        <td>{label} : {ut.formatNumber(v, 1)}</td> :
                                        <td>{label} : {v}</td>
                                    }
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        );
    }

    // -------------- <GeoAreasTileView /> ---------------------------------------------

    class MultiWordGeoAreasTileView extends React.PureComponent<MultiWordGeoAreasModelState & CoreTileComponentProps> {

        componentDidMount() {
            if (this.props.data.some(v => v.size > 0)) {
                drawLabels(this.props, this.props.tileId);
            }
        }

        componentDidUpdate(prevProps) {
            if (this.props.data.some(v => v.size > 0) && (prevProps.data !== this.props.data || prevProps.isAltViewMode !== this.props.isAltViewMode ||
                        prevProps.renderSize !== this.props.renderSize)) {
                drawLabels(this.props, this.props.tileId);
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