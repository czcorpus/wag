/*
 * Copyright (c) 2021 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2021 Martin Zimandl <martin.zimandl@gmail.com>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; version 2
 * dated June, 1991.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { Dict } from 'cnc-tskit';
import { css } from 'styled-components';

export const defaultFontFamily = '"Roboto", "Segoe UI", Arial, sans-serif';
export const condensedFontFamily = '"Roboto Condensed", "Segoe UI", sans-serif';

// colors

export const colorLogoPink = '#E2007A';
export const colorLogoBlue = '#009EE0';
export const colorLogoBlueOpaque = 'RGBA(0, 158, 224, 0.7)';
export const colorLogoBlueShining = '#00CAF6';
export const colorPortalBlueHeader = '#006a96';
export const colorDataHighlightRow = '#cdf0fe';
export const colorLogoGreen = '#53a82c';
export const colorWhitelikeBlue = '#eff9fe';
export const colorLogoOrange = '#EA670C';
export const colorLightGrey = '#dadada';
export const colorLightText = '#888888';
export const colorSuperlightGrey = '#efefef';
export const colorDefaultText = '#010101';
export const colorTileTweakBg = '#f4f4f4';

// sizes

export const closeButtonSize = '1.1em';

//

export const defaultBorderStyle = `solid 1px ${colorLightGrey}`;
export const defaultBorderRadius = '0.25em';

// media queries

const screenSizes = {
   medium: 1200,
   small: 480
}

export const media = Dict.map(
   size => (first, ...args) => css`
      @media screen and (max-width: ${size}px) {
         ${css(first, ...args)};
      }
   `, screenSizes
)
