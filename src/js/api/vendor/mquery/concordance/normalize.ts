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

import { Line, LineElement } from './common.js';


/**
 * This module provides a way how to normalize typography of
 * concordance texts where between each two adjacent tokens there
 * is a whitespace.
 *
 * The functions below preserve additional structure and structural
 * attribute information.
 */

// TODO other possible characters should be added as we encounter
// them during testing/beta-release
function isLeftSpaceEater(s:string):boolean {
    return /^[,\."“\):;'\!\?]/.exec(s) !== null;
}

// TODO other possible characters should be added as we encounter
// them during testing/beta-release
function isRightSpaceEater(s:string):boolean {
    return /[\(„]$/.exec(s) !== null;
}

function lastTextElement(elmList:Array<LineElement>):LineElement {
    const tmp = elmList.filter(e => e.type !== 'strc' && e.type !== 'attr');
    return tmp.length > 0 ? tmp[tmp.length - 1] : {'type': '', str: ''};
}

function firstTextElement(elmList:Array<LineElement>):LineElement {
    const tmp = elmList.filter(e => e.type !== 'strc' && e.type !== 'attr');
    return tmp.length > 0 ? tmp[0] : {'type': '', str: ''};
}

function hasTextElements(elmList:Array<LineElement>):boolean {
    return elmList.filter(e => e.type !== 'strc' && e.type !== 'attr').length > 0;
}

function normalizeStringTypography(str:string):string {
    return str.trim().split(/\s+/).reduce(
        (acc:Array<string>, curr) => {
            if (acc.length === 0 || isLeftSpaceEater(curr) || isRightSpaceEater(acc[acc.length - 1])) {
                return acc.concat([curr]);

            } else if (curr !== '') {
                return acc.concat([' ', curr])

            } else {
                return acc;
            }

        },
        []
    ).join('');
}

function normalizeLineChunkTypography(line:Array<LineElement>, removeNonText:boolean):Array<LineElement> {

    const isText = (elm:LineElement) => elm.str !== '' && elm.type !== 'strc' && elm.type !== 'attr';

    const tmp = line
        .map(elm => ({
            type: elm.type,
            str: normalizeStringTypography(elm.str),
            mouseover: elm.mouseover
        }))
        .filter(
            removeNonText ? isText : s => s.str !== ''
        )
        .reduce(
            (acc:Array<LineElement>, curr) => {
                if (acc.length === 0 || isLeftSpaceEater(curr.str) ||
                        isRightSpaceEater(lastTextElement(acc).str)) {
                    return acc.concat([curr]);

                } else {
                    return acc.concat([{'type': '', str: ' '}, curr]);
                }
            },
            []
        );
    return tmp;
}

function normalizeLineTypography(line:Line):{left:Array<LineElement>; kwic:Array<LineElement>; right:Array<LineElement>} {
    const left = normalizeLineChunkTypography(line.left, true);
    const kwic = normalizeLineChunkTypography(line.kwic, true);
    const right = normalizeLineChunkTypography(line.right, true);
    const ans = {left: left, kwic: [], right: []};
    if (!(hasTextElements(kwic) && isLeftSpaceEater(firstTextElement(kwic).str)) && !(hasTextElements(left) &&
                isRightSpaceEater(lastTextElement(left).str))) {
        ans.kwic = [{type: '', str: ' '}].concat(kwic);

    } else {
        ans.kwic = kwic;
    }
    if (!(hasTextElements(right) && isLeftSpaceEater(firstTextElement(right).str)) && !(hasTextElements(kwic) &&
                isRightSpaceEater(lastTextElement(kwic).str))) {
        ans.right = [{type: '', str: ' '}].concat(right);

    } else {
        ans.right = right;
    }
    return ans;
}

/**
 * Normalize a typography of a single text line element while preserving
 * structural information and structural attributes. This is suitable
 * e.g. for kwic details/speeches etc.
 *
 * @param line
 */
export function normalizeConcDetailTypography(line:Array<LineElement>):Array<LineElement> {
    return normalizeLineChunkTypography(line, false);
}

/**
 * Normalize a typography for a whole concordance chunk, including possible
 * aligned corpora data. This function strips any structural information which
 * means only pure text, collocations and kwics are preserved.
 *
 * @param lines
 */
export function normalizeTypography(lines:Array<Line>):Array<Line> {
    return lines.map(
        line => {
            const tline = normalizeLineTypography(line);
            return {
                left: tline.left,
                kwic: tline.kwic,
                right: tline.right,
                align: line.align ?
                    line.align.map(aLine => {
                        const taLine = normalizeLineTypography(aLine);
                        return {
                            left: taLine.left,
                            kwic: taLine.kwic,
                            right: taLine.right,
                            toknum: aLine.toknum
                        };
                    }) :
                    [],
                toknum: line.toknum,
                metadata: line.metadata ? line.metadata.slice() :  line.metadata,
                interactionId: line.interactionId,
                isHighlighted: line.isHighlighted
            };
        }
    );
}
