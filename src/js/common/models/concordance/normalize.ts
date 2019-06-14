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

import { LineElement, Line } from '../../api/abstract/concordance';

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

function normalizeLineChunkTypography(line:Array<LineElement>):Array<LineElement> {
    return line
        .map(elm => ({
            'class': elm.class,
            str: normalizeStringTypography(elm.str),
            mouseover: elm.mouseover
        }))
        .filter(s => s.str !== '' && s.class !== 'strc' && s.class !== 'attr')
        .reduce(
            (acc:Array<LineElement>, curr) => {
                if (acc.length === 0 || isLeftSpaceEater(curr.str) || isRightSpaceEater(acc[acc.length - 1].str)) {
                    return acc.concat([curr]);

                } else {
                    return acc.concat([{'class': '', str: ' '}, curr]);
                }
            },
            []
        );
}


function normalizeLineTypography(line:Line):{left:Array<LineElement>; kwic:Array<LineElement>; right:Array<LineElement>} {
    const left = normalizeLineChunkTypography(line.left);
    const kwic = normalizeLineChunkTypography(line.kwic);
    const right = normalizeLineChunkTypography(line.right);
    const ans = {left: left, kwic: [], right: []};
    if (!(kwic.length > 0 && isLeftSpaceEater(kwic[0].str)) && !(left.length > 0 && isRightSpaceEater(left[left.length - 1].str))) {
        ans.kwic = [{'class': '', str: ' '}].concat(kwic);

    } else {
        ans.kwic = kwic;
    }
    if (!(right.length > 0 && isLeftSpaceEater(right[0].str)) && !(kwic.length > 0 && isRightSpaceEater(kwic[kwic.length - 1].str))) {
        ans.right = [{'class': '', str: ' '}].concat(right);

    } else {
        ans.right = right;
    }
    return ans;
}


export function normalizeTypography(lines:Array<Line>):Array<Line> {
    return lines.map(
        line => {
            const tline = normalizeLineTypography(line);
            return {
                left: tline.left,
                kwic: tline.kwic,
                right: tline.right,
                align: line.align.map(aLine => {
                    const taLine = normalizeLineTypography(aLine);
                    return {
                        left: taLine.left,
                        kwic: taLine.kwic,
                        right: taLine.right,
                        toknum: aLine.toknum
                    };
                }),
                toknum: line.toknum,
                metadata: line.metadata ? line.metadata.slice() :  line.metadata,
                interactionId: line.interactionId,
                isHighlighted: line.isHighlighted
            };
        }
    );
}