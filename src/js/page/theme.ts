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
import { ColorTheme } from '../conf/index.js';
import { Dict, Color, pipe, List } from 'cnc-tskit';


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


export interface ColorScaleFunctionGenerator {
    (min?:number):(v:number)=>string;
}


const defaultTheme:ColorTheme = {

    themeId: 'default',
    themeLabel: 'Default',
    lineChartColor1: "#DD8959",
    lineConfidenceAreaColor1: "#f2d9ca",
    lineChartColor2: "#1334FF",
    lineConfidenceAreaColor2: "#e0e3fb",
    category: [
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
    ],
    categoryOther: "#494949",
    cmpCategory: [
        '#7fc77e',
        '#4AB2A1',
        '#54A82C'
    ],
    scale: [
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
    ],
    geoAreaSpotFillColor: '#212F3C'
};

/**
 * Theme class provides all the data-styling defined in
 * a specific ColorsConf configuration.
 */
export class Theme {

    private readonly catColors:Array<string>;

    // this is auto-generated
    private readonly catColorsHighlighted:Array<string>;

    private readonly cmpCategoryColors:Array<string>;

    // this is auto-generated
    private readonly cmpCategoryColorsHighlighted:Array<string>;

    public readonly unfinishedChartColor:string;

    public readonly unfinishedChartColorLight:string;

    private readonly scaleColors:Array<string>;

    public readonly infoGraphicsFont:string;

    public readonly geoAreaSpotFillColor:string;

    public readonly geoAreaSpotTextColor:string;

    public readonly lineChartColor1:string;

    public readonly lineConfidenceAreaColor1:string;

    public readonly lineChartColor2:string;

    public readonly lineConfidenceAreaColor2:string;

    constructor(conf?:ColorTheme) {
        const confSrc = conf && Dict.size<any, string>(conf) > 0 ? conf : defaultTheme;
        this.catColors = confSrc.category || [];
        this.catColorsHighlighted = List.map(
            color => pipe(
                color,
                Color.importColor(1),
                Color.highlight(0.3),
                Color.color2str(),
            ),
            this.catColors
        );
        this.lineChartColor1 = confSrc.lineChartColor1 || this.catColors[0];
        this.lineConfidenceAreaColor1 = confSrc.lineConfidenceAreaColor1 || this.catColors[0];
        this.lineChartColor2 = confSrc.lineChartColor2 || this.catColors[1];
        this.lineConfidenceAreaColor2 = confSrc.lineConfidenceAreaColor2 || this.catColors[1];
        this.cmpCategoryColors = confSrc.cmpCategory || [];
        this.cmpCategoryColorsHighlighted = List.map(
            color => pipe(
                color,
                Color.importColor(1),
                Color.highlight(0.3),
                Color.color2str(),
            ),
            this.cmpCategoryColors
        );
        this.scaleColors = confSrc.scale || [];
        this.unfinishedChartColor = '#dddddd';
        this.unfinishedChartColorLight = '#eeeeee';
        this.infoGraphicsFont = 'Roboto Condensed';
        this.geoAreaSpotFillColor = confSrc.geoAreaSpotFillColor;
        this.geoAreaSpotTextColor = confSrc.geoAreaSpotTextColor ?
            conf.geoAreaSpotTextColor :
            pipe(
                this.geoAreaSpotFillColor,
                Color.importColor(1),
                Color.textColorFromBg(),
                Color.color2str()
            );
    }

    categoryPalette = (values:Array<string|number>):(ident:string|number)=>string => {
        const mapping:{[key:string]:string} = {};
        values.forEach((v, i) => {
            mapping[typeof v === 'string' ? v : v.toFixed()] = this.catColors[i % this.catColors.length];
        });
        return v => mapping[typeof v === 'string' ? v : v.toFixed()];
    }

    /**
     * Generate category color out of catColors.
     * This is intended to be used for 'single' and 'translat'
     * modes.
     */
    categoryColor(idx:number):string {
        return this.catColors[idx % this.catColors.length];
    }

    categoryColorHighlighted(idx:number):string {
        return this.catColorsHighlighted[idx % this.catColors.length];
    }

    /**
     * Produce a category color for word comparison mode where
     * each word data is expected to be of a specific color
     * (i.e. 1st word => idx = 0, 2nd word => idx 1,...)
     */
    cmpCategoryColor(idx:number, dynamicSize?:number):string {
        if (dynamicSize && this.cmpCategoryColors.length === 1) {
            return this.getDynamicColor(idx, dynamicSize, this.cmpCategoryColors[0]);
        }
        return this.cmpCategoryColors[idx % this.cmpCategoryColors.length];
    }

    cmpCategoryColorHighlighted(idx:number, dynamicSize?:number):string {
        if (dynamicSize && this.cmpCategoryColors.length === 1) {
            const ans = this.getDynamicColor(idx, dynamicSize, this.cmpCategoryColors[0]);
            return pipe(
                ans,
                Color.importColor(1),
                Color.highlight(0.3),
                Color.color2str()
            );
        }
        return this.cmpCategoryColorsHighlighted[idx % this.cmpCategoryColors.length];
    }

    /**
     * Map linearly any range min...max to defined 'scaleColors'.
     */
    scaleColor = (min:number, max:number):(v:number)=>string => {
        const a = max !== min ? (this.scaleColors.length - 1) / (max - min) : 0;
        const b = -1 * a * min;
        return (v:number) => this.scaleColors[Math.round(a * v + b)];
    };

    /**
     * Map values min, min+1, ..., min+N to color taken from
     * 'scaleColors'. Anything below or above is replaced by
     * a grey placeholder color.
     */
    scaleColorIndexed = (min:number=0):(v:number)=>string => {
        return (v:number) => {
            const idx = Math.max(v - min, 0);
            return this.scaleColors[idx] || '#dddddd';
        };
    };

    /**
     * Produce a function which generates variants with
     * different luminosity based on a color selected
     * from "cmp" mode categories (barIdx). E.g. barIdx = 3 selects
     * 4th color and individual values 'v' produce lighter
     * variants as 'v' increases.
     */
    scaleColorCmpDerived = (barIdx:number, dynamicSize?:number) => (v:number) => {
        return pipe(
            this.cmpCategoryColor(barIdx, dynamicSize),
            Color.importColor(1),
            Color.luminosity(1 + .04 * v),
            Color.color2str()
        );
    };

    /**
     * Returns dynamically calculated color for item derived from base color
     * colors are positioned equally on hue circle in HSL color space
     * where color of index 0 is identical to provided base color
     */
    private getDynamicColor(idx:number, size:number, baseColor:string) {
        const hslBaseColor = pipe(
            baseColor,
            Color.importColor(1),
            Color.rgb2Hsl()
        );

        const newHue = hslBaseColor[0] + idx/size;
        return pipe(
            [newHue > 1 ? newHue - 1 : newHue, hslBaseColor[1], hslBaseColor[2]],
            Color.hsl2Rgb(),
            Color.color2str()
        )
    }
}
