/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import { Observable } from 'rxjs';
import { LocalizedConfMsg } from '../types.js';
import { List, pipe } from 'cnc-tskit';
import * as fs from 'fs';
import path from 'path';

export interface ColorThemeIdent {
    themeId: string;
    themeLabel: LocalizedConfMsg;
    description?: LocalizedConfMsg;
}

/**
 * This specifies a 'theming' for
 * JavaScript generated stuff
 * (mainly chart colors).
 */
export interface ColorTheme extends ColorThemeIdent {
    isDefault?: boolean;
    defaultFontFamily?: string;
    condensedFontFamily?: string;
    defaultFontSize?: string;
    backgroundImage?: string;
    pageBackgroundColor?: string;
    tileBackgroundColor?: string;
    tileHeadingSeparColor?: string;
    textInputBackgroundColor?: string;
    colorLogoBlue?: string;
    colorLogoBlueShining?: string;
    colorWhitelikeBlue?: string;
    colorLightText?: string;
    colorDefaultText?: string;
    colorInvertText?: string;
    colorInvertedSecondaryText?: string;
    colorSecondaryText?: string;
    colorLogoPink?: string;
    colorSuperlightGrey?: string;
    svgIconsFilter?: string;
    svgLogoFilter?: string;
    oddDataLineBackgroundColor?: string;

    tileBorderStyle?: string;
    tileBorderRadius?: string;

    cssMobileScreen?: string;

    lineChartColor1: string;
    lineConfidenceAreaColor1: string;
    lineChartColor2: string;
    lineConfidenceAreaColor2: string;
    category: Array<string>;
    categoryOther: string;
    cmpCategory: Array<string>;
    scale: Array<string>;
    geoAreaSpotFillColor: string;
    geoAreaSpotTextColor?: string;

    chartTextColor?: string;
    chartGridColor?: string;
}

export interface ColorsConf {
    themes: Array<ColorTheme>;
    default: string;
}

export function loadThemesFromFiles(
    confDirPath: string
): Observable<Array<ColorTheme>> {
    return new Observable<Array<ColorTheme>>((observer) => {
        fs.readdir(confDirPath, (err, files) => {
            if (err) {
                observer.error(
                    new Error(`Failed to read directory ${confDirPath}: ${err}`)
                );
                return;
            }

            const confSrch = pipe(
                files,
                List.filter((file) => file.endsWith('.json')),
                List.map((fPath) => {
                    const filePath = path.join(confDirPath, fPath);
                    try {
                        const data = fs.readFileSync(filePath, 'utf8');
                        return JSON.parse(data) as ColorTheme;
                    } catch (e) {
                        console.error(`Failed to parse ${filePath}: ${e}`);
                        return undefined;
                    }
                })
            );
            if (confSrch) {
                observer.next(confSrch);
                observer.complete();
            } else {
                observer.error(new Error('no matching file found'));
            }
        });
    });
}
