/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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

export namespace KeyCodes {
    export const ENTER = 13;
    export const ESC = 27;
    export const TAB = 9;
    export const DOWN_ARROW = 40;
    export const UP_ARROW = 38;
    export const LEFT_ARROW = 37;
    export const RIGHT_ARROW = 39;
    export const BACKSPACE = 8;
    export const DEL = 46;
    export const HOME = 36;
    export const END = 35;

    export const isArrowKey = (code:number):boolean => {
        return code === UP_ARROW || code === DOWN_ARROW ||
                code === LEFT_ARROW || code === RIGHT_ARROW;
    }
}


/**
 * pseudo uuid (aka good enough for the use)
 */
export function puid():string {
    const ab = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const len = ab.length;
    const ans = [];

    let x = new Date().getTime();
    while (x > 0) {
        ans.push(ab[x % len]);
        x = Math.floor(x / len);
    }
    x = Math.random() * 1e14;
    while (x > 0) {
        ans.push(ab[x % len]);
        x = Math.floor(x / len);
    }
    return ans.join('').substr(0, 14);
}


export function repeat<T>(fn:()=>T, size:number):Array<T> {
    const ans = [];
    for (let i = 0; i < size; i += 1) {
        ans.push(fn());
    }
    return ans;
}


export function calcPercentRatios<T, U>(values:Array<T>, get:(v:T)=>number, trans:(v:T, ratio:number)=>U):Array<U> {
    const sum = values.reduce((acc, curr) => acc + get(curr), 0);
    const mod = values
        .map((v, i) => {
            const ratio = Math.round(get(v) / sum * 1000) / 10;
            return {
                v: (rx:number) => trans(v, rx),
                r: ratio
            };
        }).sort(
            (x1, x2) => (x2.r - Math.floor(x2.r)) - (x1.r - Math.floor(x1.r))
        );
    const diff = Math.round((100 - mod.reduce((acc, curr) => acc + curr.r, 0)) * 10) / 10;
    return mod.map((v, i) => i === 0 ? v.v(v.r + diff) : v.v(v.r));
}