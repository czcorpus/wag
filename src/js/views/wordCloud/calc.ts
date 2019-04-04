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
    text:string;
    value:number;
    tooltip:TooltipData;
    interactionId:string;
    size?:number;
    color?:string;
}


export interface Rect {
    x:number;
    y:number;
    w:number;
    h:number;
    fontSize?:number;
    data?:WordCloudItemCalc;
}


const MIN_WC_FONT_SIZE = 26;

const MIN_WC_FONT_SIZE_MOBILE = 23;

const PLACE_NUM_SPIRAL_ITER = 8000;

export const MAX_WC_FONT_SIZE = 80;

export const MAX_WC_FONT_SIZE_MOBILE = 75; // TODO test this one


export type TooltipData = Array<{label:string; value:string|number; round?:number}>;


function adjustFontSize(isMobile:boolean, v:number):number {
    return isMobile ?
        Math.round(Math.min(MAX_WC_FONT_SIZE_MOBILE, v)) :
        Math.round(Math.min(MAX_WC_FONT_SIZE, v));
}


function calcOverlap(rA:Rect, rB:Rect, margin:number) {
    return Math.max(0, Math.min(rA.x + rA.w + margin, rB.x + rB.w + margin) - Math.max(rA.x, rB.x)) *
            Math.max(0, Math.min(rA.y + rA.h + margin, rB.y + rB.h + margin) - Math.max(rA.y, rB.y));
}


/**
 *
 */
class FontMeasure {

    private readonly canv:HTMLCanvasElement;

    constructor() {
        this.canv = document.createElement('canvas');
        //canv.style.display = 'none';
        document.body.appendChild(this.canv);
    }

    getTextWidth(text:string, fontName:string, fontSize:number) {
        const ctx = this.canv.getContext('2d');
        ctx.font = `${fontSize}px ${fontName}`;
        return ctx.measureText(text).width;
    }
}


function boundingBox(rects:Array<Rect>):Rect {
    let xMin = rects[0].x;
    let yMin = rects[0].y;
    let xMax = rects[0].x + rects[0].w;
    let yMax = rects[0].y + rects[0].h;

    rects.forEach(rect => {
        xMin = Math.min(xMin, rect.x);
        yMin = Math.min(yMin, rect.y);
        xMax = Math.max(xMax, rect.x + rect.w);
        yMax = Math.max(yMax, rect.y + rect.h);
    });
    return {x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin};
}


function mkSpiralPoint(x:number, y:number, idx:number, aspectRatio:number) {
    const a = 2;
    const b = 0.8;
    const phi = idx * 3.1416 / 24;
    const xc = (a + b * phi * aspectRatio) * Math.cos(phi);
    const yc = (a + b * phi * 1 / aspectRatio) * Math.sin(phi);
    return [xc + x, yc + y];
}


function placeRect(rects:Array<Rect>, idx:number, initialX:number, initialY:number, aspectRatio:number) {
    let overlap = 0;
    const corrAspRatio = aspectRatio ** 0.4;
    for (let i = 0; i < PLACE_NUM_SPIRAL_ITER; i += 1) {
        const spiralPoint = mkSpiralPoint(initialX, initialY, 3.1416 / 15 * i, corrAspRatio);
        rects[idx].x = spiralPoint[0];
        rects[idx].y = spiralPoint[1];
        overlap = 0;
        for (let j = 0; j < idx; j += 1) {
            overlap = calcOverlap(rects[idx], rects[j], 10);
            if (overlap > 0) {
                break;
            }
        }
        if (overlap === 0) {
            break;
        }
    }
}


export const createRectangles = (data:Array<WordCloudItemCalc>, frameWidth:number, frameHeight:number, isMobile:boolean, font:string):Array<Rect> => {
    const ans = [];
    const measure = new FontMeasure();

    const minVal = Math.min(...data.map(v => v.value));
    const scaledTotal = data.map(v => v.value - minVal).reduce((curr, acc) => acc + curr, 0);


    for (let i = 0; i < data.length; i += 1) {
        const wcFontSizeRatio = scaledTotal > 0 ? (data[i].value - minVal) / scaledTotal : 1;
        const fontSize = adjustFontSize(
            isMobile,
            isMobile ?
                Math.max((wcFontSizeRatio * 100) ** 1.9 / 10, MIN_WC_FONT_SIZE_MOBILE) :
                Math.max((wcFontSizeRatio * 100) ** 1.9 / 10, MIN_WC_FONT_SIZE)
        );
        const width = measure.getTextWidth(data[i].text, font, fontSize);
        const height = fontSize * 1.1;
        const x1 = frameWidth / 2 - width / 2; // TODO randomize?
        const y1 = frameHeight / 2 - height / 2;

        ans.push({
            x: x1,
            y: y1,
            w: width,
            h: height,
            fontSize: fontSize,
            data: data[i]
        });
    }
    return ans;
}


export const findPlacement = (rectangles:Array<Rect>, frameWidth:number, frameHeight:number):{rectangles: Array<Rect>, transform:string} => {
    for (let i = 0; i < rectangles.length; i += 1) {
        placeRect(
            rectangles,
            i,
            frameWidth / 2 - rectangles[i].w / 2,
            frameHeight  / 2 - rectangles[i].h / 2,
            frameWidth / frameHeight
        );
    }
    const bbox = boundingBox(rectangles);
    const scale = Math.min(frameWidth * 0.95 / bbox.w, frameHeight / bbox.h);
    return {rectangles: rectangles, transform: `translate(${-bbox.x * scale} ${-bbox.y * scale}) scale(${scale}, ${scale})`};
}
