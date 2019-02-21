import { ColorsConf } from "./conf";

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

export class Theme {

    private readonly catColors:Array<string>;

    private readonly barColors:Array<string>;

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

        this.barColors = conf.bar ? conf.bar : ['#7fc77e', '#4AB2A1', '#54A82C'];
    }

    categoryPalette(values:Array<string|number>) {
        const mapping = {};
        values.forEach((v, i) => {
            mapping[typeof v === 'string' ? v : v.toFixed()] = this.catColors[i % this.catColors.length];
        });
        return (v:string|number) => mapping[typeof v === 'string' ? v : v.toFixed()];
    }


    barColor(idx:number):string {
        return this.barColors[idx % this.barColors.length];
    }

}