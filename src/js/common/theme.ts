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
import { ColorsConf } from '../conf';


export enum SystemColor {
    COLOR_LOGO_ORANGE = '#F0680B',
    COLOR_LOGO_GREEN = '#57AB27',
    COLOR_LOGO_PINK = '#E2007A',
    COLOR_LOGO_PINK_LIGHT = '#FFC8AD',
    COLOR_LOGO_BLUE = '#009EE0',
    COLOR_LOGO_BLUE_OPAQUE = 'RGBA(0, 158, 224, 0.7)',
    COLOR_LOGO_BLUE_SHINE = '#00CAF6',
    COLOR_WHITELIKE_BLUE = '#e2f4fb',
    COLOR_LIGHT_GREY = '#DADADA'
}


const brightnessAdjustHex = (hex:string, ratio:number):string => {
    const code = hex.length === 7 ? hex.substr(1) : hex.substr(1).replace(/(.)/g, '$1$1');
    const r = parseInt(code.substr(0, 2), 16);
    const g = parseInt(code.substr(2, 2), 16);
    const b = parseInt(code.substr(4, 2), 16);
    const mkColor = c => Math.round((1 << 8) + c + (256 - c) * ratio).toString(16).substr(1);
    return `#${mkColor(r)}${mkColor(g)}${mkColor(b)}`;
}

export class Theme {

    private readonly catColors:Array<string>;

    private readonly barColors:Array<string>;

    private readonly scaleColors:Array<string>;

    private readonly catOtherColor:string;

    constructor(conf:ColorsConf) {
        this.catColors = conf.category ? conf.category : [
            '#DD8959',
            '#1334FF',
            '#3A9179',
            '#FF3833',
            '#2DE239',
            '#07B4FF',
            '#E52E92',
            '#FFB700',
            '#CE536B',
            '#72BF4D'
        ];
        this.barColors = conf.bar ? conf.bar : [
            '#7fc77e',
            '#4AB2A1',
            '#54A82C'
        ];
        this.scaleColors = conf.scale ? conf.scale : [
            '#2a0017',
            '#3e0022',
            '#53002d',
            '#670038',
            '#7c0043',
            '#90004e',
            '#a50059',
            '#b90064',
            '#ce006f',
            '#e2007a'
        ];
        this.catOtherColor = conf.categoryOther ? conf.categoryOther : '#494949';
    }

    categoryPalette(values:Array<string|number>) {
        const mapping = {};
        values.forEach((v, i) => {
            mapping[typeof v === 'string' ? v : v.toFixed()] = this.catColors[i % this.catColors.length];
        });
        return (v:string|number) => mapping[typeof v === 'string' ? v : v.toFixed()];
    }

    categoryOtherColor():string {
        return this.catOtherColor;
    }


    barColor(idx:number, brightness?:number):string {
        return brightness ?
            brightnessAdjustHex(this.barColors[idx % this.barColors.length], brightness) :
            this.barColors[idx % this.barColors.length];
    }

    scaleColor(min:number, max:number) {

        const a = max !== min ? (this.scaleColors.length - 1) / (max - min) : 0;
        const b = -1 * a * min;
        return (v:number) => this.scaleColors[Math.round(a * v + b)];
    }

}