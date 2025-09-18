/*
 * Copyright 2025 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2025 Institute of the Czech National Corpus,
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

export type PosQueryGeneratorType = [string, 'ppTagset'|'pennTreebank'|'directPos'];

export function validatePosQueryGenerator(posQueryGenerator:any):string|null {
    const expected = "expected schema [string, 'ppTagset'|'pennTreebank'|'directPos']";
    if (!Array.isArray(posQueryGenerator) && posQueryGenerator.length !== 2) {
        return `should be array of length 2, ${expected}`;
    }
    if (typeof posQueryGenerator[0] !== 'string' && typeof posQueryGenerator[1] !== 'string') {
        return `values has to of type string, ${expected}`;
    }
    if (!["ppTagset", "pennTreebank", "directPos"].includes(posQueryGenerator[1])) {
        return `invalid value, ${expected}`;
    }
    return null;
}
