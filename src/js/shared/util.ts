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



export const puid = ():string => {
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
};