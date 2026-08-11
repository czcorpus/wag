/*
 * Copyright 2026 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2026 Department of Linguistics,
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

import { EMPTY, map, Observable } from 'rxjs';
import { IDataStreaming } from '../../../page/streaming.js';
import { ResourceApi, SourceDetails } from '../../../types.js';
import { Backlink } from '../../../page/tile.js';
import { HTTP, List, pipe, tuple } from 'cnc-tskit';
import urlJoin from 'url-join';

export interface GramatikatAPIArgs {
    lemma: string;

    /**
     * Part of Speech. In case it is undefined, the API
     * skips firing request to GramatiKat and responses
     * giving the information that it requires PoS to be
     * able to provide information.
     */
    pos: GramatikatPoS | undefined;
    catComb: Array<[GramatikatCatSet, number]>;
    frameCatComb?: Array<[GramatikatCatSet, number]>;
    corpus: string;
}

type Subset<T extends readonly unknown[]> = T extends readonly [
    infer Head,
    ...infer Tail,
]
    ? readonly [Head, ...Subset<Tail>] | Subset<Tail>
    : T;

export type GramatikatNumber = 'D' | 'P' | 'S';

export type GramatikatCase = '1' | '2' | '3' | '4' | '5' | '6' | '7';

export type GramatikatGender = 'F' | 'I' | 'M' | 'N';

export type GramatikatDegree = '1' | '2' | '3';

export type GramatikatPolarity = 'P' | 'N';

export type GramatikatTense = 'F' | 'P' | 'R' | 'B' | 'Q';

export type GramatikatAspect = 'I' | 'P' | 'B';

export type GramatikatMood = 'I' | 'D' | 'O' | 'F' | 'T' | 'C';

// "gender" "number" "case" "degree" "polarity" "mood" "tense" "person" "voice" "aspect"

export type Tag = Subset<
    [
        GramatikatGender,
        GramatikatNumber,
        GramatikatCase,
        GramatikatDegree,
        GramatikatPolarity,
        GramatikatTense,
        GramatikatAspect,
    ]
>;

export type GramatikatCatSet =
    | 'gender'
    | 'number'
    | 'case'
    | 'degree'
    | 'polarity'
    | 'mood'
    | 'tense'
    | 'person'
    | 'voice'
    | 'aspect';

export type GramatikatPoS = 'nouns' | 'adjectives' | 'verbs';

export const tagCodeToHuman = (
    pos: GramatikatPoS,
    tc: string,
    itemTypes: 'fixed' | 'mutable' | 'all' = 'mutable'
): string => {
    const ans: Array<string> = [];
    switch (pos) {
        case 'nouns':
            if (itemTypes === 'fixed' || itemTypes === 'all') {
                switch (tc[0]) {
                    case 'F':
                        ans.push('ženský rod');
                        break;
                    case 'I':
                        ans.push('mužský neživotný rod');
                        break;
                    case 'M':
                        ans.push('mužský životný rod');
                        break;
                    case 'N':
                        ans.push('střední rod');
                        break;
                }
            }
            if (itemTypes === 'mutable' || itemTypes === 'all') {
                switch (tc[1]) {
                    case 'D':
                        ans.push('dvojné číslo');
                        break;
                    case 'P':
                        ans.push('množné číslo');
                        break;
                    case 'S':
                        ans.push('jednotné číslo');
                        break;
                }
                ans.push(`${tc[2]}. pád`);
            }
            break;
        case 'verbs':
            if (itemTypes === 'mutable' || itemTypes === 'all') {
                switch (tc[0]) {
                    case 'P':
                        ans.push('přítomný čas');
                        break;
                    case 'R':
                        ans.push('minulý čas');
                        break;
                    case 'F':
                        ans.push('budoucí čas');
                        break;
                    case 'B':
                        ans.push('B (undefined)');
                        break;
                    case 'Q':
                        ans.push('Q (undefined)');
                        break;
                }
                switch (tc[1]) {
                    case 'D':
                        ans.push('dvojné číslo');
                        break;
                    case 'P':
                        ans.push('množné číslo');
                        break;
                    case 'S':
                        ans.push('jednotné číslo');
                        break;
                }
            }
            if (itemTypes === 'fixed' || itemTypes === 'all') {
                switch (tc[2]) {
                    case 'I':
                        ans.push('nedokonavý vid');
                        break;
                    case 'P':
                        ans.push('dokonavý vid');
                        break;
                    case 'B':
                        ans.push('obouvidé');
                }
            }
            if (itemTypes === 'mutable' || itemTypes === 'all') {
                switch (tc[3]) {
                    case 'N':
                        ans.push('negace');
                        break;
                    case 'A':
                        ans.push('afirmativ');
                        break;
                }
            }
            break;
        case 'adjectives':
            if (itemTypes === 'mutable' || itemTypes === 'all') {
                switch (tc[0]) {
                    case 'F':
                        ans.push('ženský rod');
                        break;
                    case 'I':
                        ans.push('mužský neživotný rod');
                        break;
                    case 'M':
                        ans.push('mužský životný rod');
                        break;
                    case 'N':
                        ans.push('střední rod');
                        break;
                }
                ans.push(`${tc[1]}. pád`);
                ans.push(`${tc[2]}. stupeň`);
            }
            break;
        default:
            ans.push(tc);
    }
    return ans.join(', ');
};

export const posCatToValSet = (cat: GramatikatCatSet): Array<string> => {
    switch (cat) {
        case 'gender':
            return ['F', 'I', 'M', 'N'];
        case 'case':
            return ['1', '2', '3', '4', '5', '6', '7'];
        case 'degree':
            return ['1', '2', '3'];
        case 'number':
            return ['D', 'P', 'S'];
        case 'tense':
            return ['F', 'P', 'R'];
        case 'polarity':
            return ['A', 'N'];
        case 'aspect':
            return ['I', 'P', 'B'];
        default:
            return [];
    }
};

interface LemmaArgs {
    lemma: string;

    pos: GramatikatPoS;

    /**
     * Set of grammatical categories.
     */
    catComb: Array<GramatikatCatSet>;

    /**
     * If given, proportions of instances of values of catSet are computed
     * separately within instances of each value of frameCatSet
     */
    frameCatComb?: Array<GramatikatCatSet>;

    corpus: string;
}

export interface ValComb {
    cat: GramatikatCatSet;
    val: Tag;
}

export interface GramatikatFreq {
    valComb: Array<ValComb>;
    prop: number;
    uncommonValue: 'over' | 'under' | 'none';
    readableTag?: string;
}

export interface FormInfos {}

export interface FrameInfos {
    frameValComb: Array<ValComb>;
    size: number;
    valCombInfos: Array<GramatikatFreq>;
}

export interface LemmaResponse {
    frameInfos: Array<FrameInfos>;
}

export interface Summary {
    lowerWhisker: number;
    max: number;
    min: number;
    mean: number;
    quartile1: number;
    quartile2: number;
    quartile3: number;
    upperWhisker: number;
    valComb: Tag;
}

export interface PosInfoResponse {
    frameGroupInfos: Array<{
        frameValComb: any;
        valCombInfos: Array<Summary>;
    }>;
}

export type ErrorLemmaInfo = {
    detail: Array<{
        loc: [string, string];
        msg: string;
        type: string;
        input: unknown;
    }>;
};

export type LemmaInfo = LemmaResponse | ErrorLemmaInfo;

export function isErrorLemmaInfo(lmi: LemmaInfo): lmi is ErrorLemmaInfo {
    return lmi['detail'] !== undefined && Array.isArray(lmi['detail']);
}

export function extractFrameCats(
    pos: GramatikatPoS,
    items: Array<GramatikatCatSet>
): [Array<[GramatikatCatSet, number]>, Array<[GramatikatCatSet, number]>] {
    switch (pos) {
        case 'nouns':
            return pipe(
                items,
                List.map((v, i) => tuple(v, i)),
                List.foldl(
                    (acc, [curr, i]) => {
                        if (curr === 'gender') {
                            return tuple(acc[0], [...acc[1], tuple(curr, i)]);
                        }
                        return tuple([...acc[0], tuple(curr, i)], acc[1]);
                    },
                    tuple([], []) as [
                        Array<[GramatikatCatSet, number]>,
                        Array<[GramatikatCatSet, number]>,
                    ]
                )
            );
        case 'adjectives':
            return tuple(
                List.map((v, i) => tuple(v, i), items),
                []
            );
        case 'verbs':
            return tuple(
                List.map((v, i) => tuple(v, i), items),
                []
            );
    }
}

export interface LemmaProfileResponse {
    isAmbiguousPos: boolean;
    lemmaInfo: LemmaInfo;
    posInfo: PosInfoResponse;
    pos: GramatikatPoS;

    /**
     * catMapping allows for restoring tile's native category order
     * compared with Gramatikat API which requires splitting into
     * lexical and inflectional categories. This value is not provided
     * by Gramatikat API, it is created by the client.
     */
    catMapping: Array<[GramatikatCatSet, number]>;

    /**
     * See catMapping
     */
    frameCatMapping: Array<[GramatikatCatSet, number]>;
    error?: string;
}

export interface GramatikatSourceDetail extends SourceDetails {}

/**
 *
 */
export class GramatikatAPI
    implements ResourceApi<GramatikatAPIArgs, [LemmaProfileResponse, number]>
{
    private readonly apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    getSourceDescription(
        streaming: IDataStreaming,
        tileId: number,
        lang: string,
        corpname: string
    ): Observable<GramatikatSourceDetail> {
        return EMPTY;
    }

    getBacklink(queryId: number, subqueryId?: number): Backlink | null {
        return null;
    }

    call(
        streaming: IDataStreaming,
        tileId: number,
        queryIdx: number,
        args: GramatikatAPIArgs | null
    ): Observable<[LemmaProfileResponse, number]> {
        const reqArgs: Partial<LemmaArgs> = args
            ? {
                  lemma: args.lemma,
                  pos: args.pos,
                  catComb: List.map(([v]) => v, args.catComb),
                  frameCatComb: List.map(([v]) => v, args.frameCatComb),
                  corpus: args.corpus,
              }
            : {};
        return streaming
            .registerTileRequest<LemmaProfileResponse>({
                tileId,
                queryIdx,
                method: HTTP.Method.POST,
                url:
                    args && args.pos
                        ? urlJoin(this.apiUrl, 'lemma-profile')
                        : '',
                body: reqArgs,
                isEventSource: false,
                contentType: 'application/json',
            })
            .pipe(
                map<LemmaProfileResponse, LemmaProfileResponse>((resp) => {
                    if (!resp) {
                        return {
                            lemmaInfo: {
                                frameInfos: [],
                            },
                            posInfo: {
                                frameGroupInfos: [
                                    {
                                        frameValComb: undefined,
                                        valCombInfos: [],
                                    },
                                ],
                            },
                            pos: args?.pos,
                            isAmbiguousPos: !args?.pos,
                            catMapping: args.catComb,
                            frameCatMapping: args.frameCatComb,
                            error: resp?.error,
                        };
                    }

                    const lemmaInfo = resp.lemmaInfo;
                    if (isErrorLemmaInfo(lemmaInfo)) {
                        // TODO
                        throw new Error(
                            'should not return lemma info error directly'
                        );
                    } else {
                        return {
                            lemmaInfo,
                            posInfo: resp.posInfo,
                            pos: args.pos,
                            isAmbiguousPos: !args.pos,
                            catMapping: args.catComb,
                            frameCatMapping: args.frameCatComb,
                        };
                    }
                }),
                map((resp) => tuple(resp, queryIdx))
            );
    }
}
