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

import * as React from 'react';

export function createSVGElement(parent:Element, name:string, attrs:{[name:string]:string}):SVGElement {
    const elm = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs).forEach(k => {
        elm.setAttribute(k, attrs[k]);
    });
    parent.appendChild(elm);
    return elm;
}

export function createSVGEmptyCircle(parent:Element, radius:number):SVGElement {
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

// -------------- <Map /> ---------------------------------------------
// Having map as a separate separate class component prevents problematic re-rendering of the map
// when tooltip is shown/hidden and cleaning labels in the process

export class Map extends React.PureComponent<{mapSVG:string}> {
    
    render() {
        return (
            <div style={{cursor: 'default', width: '100%', height: '100%', overflowX: 'auto', textAlign: 'center'}}
                dangerouslySetInnerHTML={{__html: this.props.mapSVG}} />
        );
    }
}