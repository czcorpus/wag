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

export interface WordCloudItemCalc {
    text: string;
    value: number;
    tooltip: TooltipData;
    interactionId: string;
    size?: number;
    color?: string;
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
    fontSize?: number;
    data?: WordCloudItemCalc;
}

export const MAX_WC_FONT_SIZE = 78;

export const MAX_WC_FONT_SIZE_MOBILE = 73; // TODO test this one

const MIN_WC_FONT_SIZE = 26;

const MIN_WC_FONT_SIZE_MOBILE = 23;

const PLACE_NUM_SPIRAL_ITER = 8000;

const SPIRAL_STEP = 3.1415927 / 45;

const SPIRAL_PARAM_A = 2;

const SPIRAL_PARAM_B = 0.75;

export type TooltipData = Array<{
    label: string;
    value: string | number;
    unit?: string;
    round?: number;
}>;

function adjustFontSize(isMobile: boolean, v: number): number {
    return isMobile
        ? Math.round(Math.min(MAX_WC_FONT_SIZE_MOBILE, v))
        : Math.round(Math.min(MAX_WC_FONT_SIZE, v));
}

function calcOverlap(rA: Rect, rB: Rect) {
    // Use dynamic margins based on font sizes for better visual spacing
    const avgFontSize = (rA.fontSize + rB.fontSize) / 2;
    const dynamicMarginX = avgFontSize * 0.25;
    const dynamicMarginY = avgFontSize * 0.2;

    return (
        Math.max(
            0,
            Math.min(
                rA.x + rA.w + dynamicMarginX,
                rB.x + rB.w + dynamicMarginX
            ) - Math.max(rA.x - dynamicMarginX, rB.x - dynamicMarginX)
        ) *
        Math.max(
            0,
            Math.min(
                rA.y + rA.h + dynamicMarginY,
                rB.y + rB.h + dynamicMarginY
            ) - Math.max(rA.y - dynamicMarginY, rB.y - dynamicMarginY)
        )
    );
}

/**
 *
 */
class FontMeasure {
    private readonly canv: HTMLCanvasElement;

    constructor() {
        this.canv = document.createElement('canvas');
        //canv.style.display = 'none';
        document.body.appendChild(this.canv);
    }

    getTextWidth(text: string, fontName: string, fontSize: number) {
        const ctx = this.canv.getContext('2d');
        ctx.font = `${fontSize}px ${fontName}`;
        return ctx.measureText(text).width;
    }

    close(): void {
        document.body.removeChild(this.canv);
    }
}

function boundingBox(rects: Array<Rect>): Rect {
    let xMin = rects[0].x;
    let yMin = rects[0].y;
    let xMax = rects[0].x + rects[0].w;
    let yMax = rects[0].y + rects[0].h;
    let yMaxTmp = 0;
    // We must increase height to prevent cutting of descender letters (g, j, y,...)
    // so we keep a size of the text at the bottom and then use a portion of the size
    // to increase the height of the cloud box.
    let bottomTextFontSize = rects[0].fontSize;

    rects.forEach((rect) => {
        xMin = Math.min(xMin, rect.x);
        yMin = Math.min(yMin, rect.y);
        xMax = Math.max(xMax, rect.x + rect.w);
        yMaxTmp = Math.max(yMax, rect.y + rect.h);
        if (yMaxTmp > yMax) {
            bottomTextFontSize = rect.fontSize;
        }
        yMax = yMaxTmp;
    });
    return {
        x: xMin,
        y: yMin,
        w: xMax - xMin,
        h: yMax - yMin + bottomTextFontSize / 6,
    };
}

function mkSpiralPoint(
    centerX: number,
    centerY: number,
    idx: number,
    aspectRatio: number
): [number, number] {
    const phi = idx * SPIRAL_STEP;
    const xc =
        (SPIRAL_PARAM_A + SPIRAL_PARAM_B * phi * aspectRatio) * Math.cos(phi);
    const yc =
        (SPIRAL_PARAM_A + (SPIRAL_PARAM_B * phi * 1) / aspectRatio) *
        Math.sin(phi);
    return [xc + centerX, yc + centerY];
}

function placeRect(
    rects: Array<Rect>,
    idx: number,
    initialX: number,
    initialY: number,
    aspectRatio: number
): void {
    let overlap = 0;
    // Keep aspect ratio closer to original to maintain spiral flow
    const corrAspRatio =
        aspectRatio > 1 ? aspectRatio ** 0.6 : aspectRatio ** 0.5;
    for (let i = 0; i < PLACE_NUM_SPIRAL_ITER; i += 1) {
        const spiralPoint = mkSpiralPoint(initialX, initialY, i, corrAspRatio);
        rects[idx].x = spiralPoint[0];
        rects[idx].y = spiralPoint[1];
        overlap = 0;
        for (let j = 0; j < idx; j += 1) {
            overlap = calcOverlap(rects[idx], rects[j]);
            if (overlap > 0) {
                break;
            }
        }
        if (overlap === 0) {
            break;
        }
    }
}

/**
 * Create rectangle objects (with their position, size and data) placed in a "word cloud" way.
 */
function createRectangles(
    data: Array<WordCloudItemCalc>,
    frameWidth: number,
    frameHeight: number,
    isMobile: boolean,
    font: string
): Array<Rect> {
    const ans = [];
    const measure = new FontMeasure();
    const minVal = Math.min(...data.map((v) => v.value));
    const scaledTotal = data
        .map((v) => v.value - minVal)
        .reduce((curr, acc) => acc + curr, 0);

    data.forEach((wcitem) => {
        const wcFontSizeRatio =
            scaledTotal > 0 ? (wcitem.value - minVal) / scaledTotal : 1;
        // Use more aggressive exponential scaling to amplify differences
        const amplifiedRatio = Math.pow(wcFontSizeRatio, 0.85);
        const fontSize = adjustFontSize(
            isMobile,
            isMobile
                ? Math.max(
                      (amplifiedRatio * 100) ** 2.0 / 10,
                      MIN_WC_FONT_SIZE_MOBILE
                  )
                : Math.max((amplifiedRatio * 100) ** 2.0 / 10, MIN_WC_FONT_SIZE)
        );
        const width = measure.getTextWidth(wcitem.text, font, fontSize);
        const height = fontSize * 1.1;
        // Add small random offset to break symmetry
        const randomOffsetX = (Math.random() - 0.5) * fontSize * 0.3;
        const randomOffsetY = (Math.random() - 0.5) * fontSize * 0.3;
        const x1 = frameWidth / 2 - width / 2 + randomOffsetX;
        const y1 = frameHeight / 2 - height / 2 + randomOffsetY;

        ans.push({
            x: x1,
            y: y1,
            w: width,
            h: height,
            fontSize: fontSize,
            data: wcitem,
        });
    });

    measure.close();
    return ans;
}

export const createWordCloud = (
    data: Array<WordCloudItemCalc>,
    frameWidth: number,
    frameHeight: number,
    isMobile: boolean,
    font: string
): { rectangles: Array<Rect>; transform: string } => {
    const rectangles = createRectangles(
        data,
        frameWidth,
        frameHeight,
        isMobile,
        font
    ).sort((r1, r2) => {
        // Sort by combination of size (70%) and value (30%) for better visual hierarchy
        const area1 = r1.w * r1.h;
        const area2 = r2.w * r2.h;
        const val1 = r1.data.value;
        const val2 = r2.data.value;
        return area2 * 0.7 + val2 * 0.3 - (area1 * 0.7 + val1 * 0.3);
    });
    for (let i = 0; i < rectangles.length; i += 1) {
        placeRect(
            rectangles,
            i,
            frameWidth / 2 - rectangles[i].w / 2,
            frameHeight / 2 - rectangles[i].h / 2,
            frameWidth / frameHeight
        );
    }
    const bbox =
        data.length > 0
            ? boundingBox(rectangles)
            : { x: 0, y: 0, w: frameWidth, h: frameHeight };
    // More generous scaling to prevent cramping
    const scale = Math.min(
        (frameWidth * 0.98) / bbox.w,
        (frameHeight * 0.95) / bbox.h
    );
    return {
        rectangles: rectangles,
        transform: `translate(${-bbox.x * scale} ${-bbox.y * scale}) scale(${scale}, ${scale})`,
    };
};
