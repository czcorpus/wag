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

import { DataRow } from '../../../common/api/kontext/freqs';
import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { ActionName, Actions } from '../actions';
import { GeoAreasModel, GeoAreasModelState } from '../model';


const createSVGElement = (parent:Element, name:string, attrs:{[name:string]:string}):SVGElement => {
    const elm = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs).forEach(k => {
        elm.setAttribute(k, attrs[k]);
    });
    parent.appendChild(elm);
    return elm;
}


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:GeoAreasModel):TileComponent {

    const globComponents = ut.getComponents();

    // -------------- <DataTable /> ---------------------------------------------

    const DataTable:React.SFC<{
        rows:Immutable.List<DataRow>;

    }> = (props) => {

        return (
            <table className="DataTable data cnc-table">
                <thead>
                    <tr>
                        <th>{ut.translate('geolocations__table_heading_area')}</th>
                        <th>{ut.translate('geolocations__table_heading_ipm')}</th>
                        <th>{ut.translate('geolocations__table_heading_abs')}</th>
                    </tr>
                </thead>
                <tbody>
                    {props.rows.map((row, i) => (
                        <tr key={row.name}>
                            <td>{row.name}</td>
                            <td className="num">{row.ipm}</td>
                            <td className="num">{row.freq}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )
    };

    // -----------------

    const drawLabels = (props:GeoAreasModelState, tileId:number, textColor:string, fillColor:string) => {
        const [min, max] = props.data.reduce(
            (acc, curr) => [Math.min(acc[0], curr.ipm), Math.max(acc[1], curr.ipm)],
            [props.data.get(0).ipm, props.data.get(0).ipm]
        );
        const rMin = max > 1000 ? 110 : 90;
        const rMax = max > 1000 ? 190 : 170;
        const a = max !== min ? (rMax - rMin) / (max - min) : 0;
        const b = rMin - a * min;
        const mkSize = (v:number) => a * v + b;

        // clear possible previous labels
        document.querySelectorAll('#svg-graph-p g.label-mount').forEach(elm => {
            while (elm.firstChild) {
                elm.removeChild(elm.firstChild);
            }
        });
        // insert data
        props.data.forEach((v, i) => {
            const ident = props.areaCodeMapping.get(v.name);
            if (ident) {
                const elm = document.getElementById(`${ident}-g`);
                if (elm) {
                    createSVGElement(
                        elm,
                        'ellipse',
                        {
                            'rx': mkSize(v.ipm).toFixed(1),
                            'ry': (mkSize(v.ipm) / 1.5).toFixed(1),
                            'cx': '0',
                            'cy': '0',
                            'stroke': fillColor,
                            'stroke-width': '3',
                            'fill': fillColor,
                            'pointer-events': 'fill',
                            'opacity': '0.8'
                        }
                    );
                    const text = createSVGElement(
                        elm,
                        'text',
                        {
                            'transform': 'translate(0, 15)',
                            'text-anchor': 'middle',
                            'font-size': '4.5em',
                            'font-weight': 'bold',
                            'fill': textColor
                        }
                    );
                    text.style.cssText = 'opacity: 1';
                    text.textContent = ut.formatNumber(v.ipm, v.ipm >= 100 ? 0 : 1);
                    const ellipse = createSVGElement(
                        elm,
                        'ellipse',
                        {
                            'rx': mkSize(v.ipm).toFixed(1),
                            'ry': (mkSize(v.ipm) / 1.5).toFixed(1),
                            'cx': '0',
                            'cy': '0',
                            'fill': 'white',
                            'pointer-events': 'fill',
                            'opacity': '0'
                        }
                    );
                    fromEvent(ellipse, 'mousemove')
                        .subscribe((e:MouseEvent) => {
                            dispatcher.dispatch<Actions.ShowAreaTooltip>({
                                name: ActionName.ShowAreaTooltip,
                                payload: {
                                    areaIdx: i,
                                    tileId: tileId,
                                    tooltipX: Math.max(e.pageX + 20, 0),
                                    tooltipY: Math.max(e.pageY - 50, 0)
                                }
                            });
                        });
                    fromEvent(ellipse, 'mouseout')
                        .subscribe(() => {
                            dispatcher.dispatch<Actions.HideAreaTooltip>({
                                name: ActionName.HideAreaTooltip,
                                payload: {
                                    tileId: tileId
                                }
                            });
                        });


                }
            }
        });
    }

    // -------------- <GeoAreasTileView /> ---------------------------------------------

    class GeoAreasTileView extends React.PureComponent<GeoAreasModelState & CoreTileComponentProps> {

        componentDidMount() {
            if (this.props.data.size > 0) {
                drawLabels(this.props, this.props.tileId, this.props.areaDiscTextColor, this.props.areaDiscFillColor);
            }
        }

        componentDidUpdate(prevProps) {
            if (this.props.data.size > 0 && (prevProps.data !== this.props.data || prevProps.isAltViewMode !== this.props.isAltViewMode ||
                        prevProps.renderSize !== this.props.renderSize)) {
                drawLabels(this.props, this.props.tileId, this.props.areaDiscTextColor, this.props.areaDiscFillColor);
            }
        }

        render() {
            const areaWidth = this.props.widthFract > 2 && !this.props.isMobile ? '70%' : '100%';
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.size > 0}
                        sourceIdent={{corp: this.props.corpname}}
                        supportsTileReload={this.props.supportsReloadOnError}>
                    <div className="GeoAreasTileView">
                        {this.props.isAltViewMode ?
                            <DataTable rows={this.props.data} /> :
                            <div className="flex-item" style={{width: areaWidth, height: '80%'}}>
                                <div style={{width: '100%', height: '100%', overflowX: 'auto'}} dangerouslySetInnerHTML={{__html: this.props.mapSVG}} />
                                <p className="legend">{ut.translate('geolocations__ipm_map_legend')}</p>

                                {this.props.tooltipArea !== null ?
                                    <globComponents.ElementTooltip
                                        x={this.props.tooltipArea.tooltipX}
                                        y={this.props.tooltipArea.tooltipY}
                                        visible={true}
                                        values={this.props.tooltipArea.data} /> : null}
                            </div>
                        }
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, GeoAreasModelState>(GeoAreasTileView, model);
}