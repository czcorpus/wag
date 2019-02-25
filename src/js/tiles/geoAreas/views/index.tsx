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

import {Observable} from 'rxjs';
import * as Immutable from 'immutable';
import * as React from 'react';
import {ActionDispatcher, ViewUtils, BoundWithProps} from 'kombo';
import { GlobalComponents } from '../../../views/global';
import { CoreTileComponentProps, TileComponent } from '../../../common/types';
import { GeoAreasModelState, GeoAreasModel } from '../model';
import { DataRow } from '../../../common/api/kontextFreqs';
import { Actions, ActionName } from '../actions';
import { Theme } from '../../../common/theme';

declare var require:(src:string)=>string;  // webpack
const areaMap = require('!!raw-loader!./mapCzech.inline.svg');

const createSVGElement = (parent:Element, name:string, attrs:{[name:string]:string}):SVGElement => {
    const elm = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs).forEach(k => {
        elm.setAttribute(k, attrs[k]);
    });
    parent.appendChild(elm);
    return elm;
}


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:GeoAreasModel):TileComponent {

    const globComponents = ut.getComponents();

    // -------------- <DataTable /> ---------------------------------------------

    const DataTable:React.SFC<{
        rows:Immutable.List<DataRow>;
        highlightedRow:number;

    }> = (props) => {

        return (
            <table className="DataTable data cnc-table">
                <tbody>
                    <tr>
                        <th>area</th>
                        <th>ipm</th>
                        <th>abs</th>
                    </tr>
                    {props.rows.map((row, i) => (
                        <tr key={row.name} className={props.highlightedRow === i ? 'highlighted' : null}>
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

    const drawLabels = (props:GeoAreasModelState, tileId:number) => {
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
        props.data.forEach(v => {
            const ident = props.areaCodeMapping.get(v.name);
            if (ident) {
                const elm = document.getElementById(`${ident}-g`);
                const ellipse = createSVGElement(
                    elm,
                    'ellipse',
                    {
                        'rx': mkSize(v.ipm).toFixed(1),
                        'ry': (mkSize(v.ipm) / 1.5).toFixed(1),
                        'cx': '0',
                        'cy': '0',
                        'stroke': theme.barColor(0, 0.2),
                        'stroke-width': '3',
                        'fill': theme.barColor(0),
                        'pointer-events': 'fill'
                    }
                );
                Observable.fromEvent(ellipse, 'mouseover')
                    .throttleTime(200)
                    .subscribe(() => {
                        dispatcher.dispatch<Actions.SetHighlightedTableRow>({
                            name: ActionName.SetHighlightedTableRow,
                            payload: {
                                areaName: v.name,
                                tileId: tileId
                            }
                        });
                    });
                Observable.fromEvent(ellipse, 'mouseout')
                    .throttleTime(200)
                    .subscribe(() => {
                        dispatcher.dispatch<Actions.ClearHighlightedTableRow>({
                            name: ActionName.ClearHighlightedTableRow,
                            payload: {
                                tileId: tileId
                            }
                        });
                    });

                const text = createSVGElement(
                    elm,
                    'text',
                    {
                        'transform': 'translate(0, 15)',
                        'text-anchor': 'middle',
                        'font-size': '4.5em',
                        'font-weight': 'bold',
                        'fill': '#ffffff',
                        'pointer-events': 'none'
                    }
                );
                text.style.cssText = 'opacity: 1';
                text.textContent = ut.formatNumber(v.ipm, v.ipm >= 100 ? 0 : 1);
            }
        });
    }

    // -------------- <GeoAreasTileView /> ---------------------------------------------

    class GeoAreasTileView extends React.PureComponent<GeoAreasModelState & CoreTileComponentProps> {

        componentDidMount() {
            if (this.props.data.size > 0) {
                drawLabels(this.props, this.props.tileId);
            }
        }

        componentDidUpdate() {
            if (this.props.data.size > 0) {
                drawLabels(this.props, this.props.tileId);
            }
        }

        render() {
            const areaWidth = this.props.widthFract > 2 && !this.props.isMobile ? '70%' : '100%';
            return (
                <globComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.size > 0}
                        sourceIdent={{corp: this.props.corpname}}>
                    <div className="GeoAreasTileView">
                        <div className="flex-item" style={{width: areaWidth, height: '80%'}}>
                            <div style={{width: '100%', height: '100%', overflowX: 'auto'}} dangerouslySetInnerHTML={{__html: areaMap}} />
                            <p className="legend">{ut.translate('geolocations__ipm_map_legend')}</p>
                        </div>
                        {this.props.widthFract > 2 && !this.props.isMobile ?
                            <DataTable rows={this.props.data} highlightedRow={this.props.highlightedTableRow} /> :
                            null
                        }
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, GeoAreasModelState>(GeoAreasTileView, model);
}