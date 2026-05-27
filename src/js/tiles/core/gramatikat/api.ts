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
import { HTTP, tuple } from 'cnc-tskit';
import urlJoin from 'url-join';

export interface GramatikatAPIArgs {
    lemma: string;

    /**
     * Part of Speech. In case it is undefined, the API
     * skips firing request to GramatiKat and responses
     * giving the information that it requires PoS to be
     * able to provide information.
     */
    pos: string | undefined;
    catSet: Array<GramatikatCatSet>;
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

export type GramatikatTense = 'F' | 'P' | 'R';

// "gender" "number" "case" "degree" "polarity" "mood" "tense" "person" "voice" "aspect"

export type Tag = Subset<
    [
        GramatikatGender,
        GramatikatNumber,
        GramatikatCase,
        GramatikatDegree,
        GramatikatPolarity,
        GramatikatTense,
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

const wagPosToGramatikat = (pos: string): GramatikatPoS | undefined => {
    switch (pos) {
        case 'N':
        case 'NOUN':
        case 'PROPN':
            return 'nouns';
        case 'A':
        case 'ADJ':
            return 'adjectives';
        case 'V':
        case 'VERB':
        case 'AUX':
            return 'verbs';
        default:
            return undefined;
    }
};

export const tagCodeToHuman = (pos: GramatikatPoS, tc: string): string => {
    const ans: Array<string> = [];
    switch (pos) {
        case 'nouns':
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
            break;
        case 'verbs':
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
            switch (tc[3]) {
                case 'N':
                    ans.push('negace');
                    break;
                case 'A':
                    ans.push('afirmativ');
                    break;
            }
            break;
        default:
            ans.push(tc);
    }
    return ans.join(', ');
};

const posToCatSet = (cs: GramatikatPoS): Array<GramatikatCatSet> => {
    switch (cs) {
        case 'adjectives':
            return ['case', 'degree', 'polarity'];
        case 'nouns':
            return ['gender', 'number', 'case'];
        case 'verbs':
            return ['tense', 'number', 'polarity', 'aspect'];
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
    catSet: Array<GramatikatCatSet>;

    /**
     * If given, proportions of instances of values of catSet are computed
     * separately within instances of each value of frameCatSet
     */
    frameCatSet?: GramatikatCatSet;

    corpus: string;
}

export interface GramatikatFreq {
    valSet: Tag;
    proportion: number;
}

export interface LemmaResponse {
    freq: number;
    proportions: Array<GramatikatFreq>;
}

export interface Summary {
    lowerWhisker: number;
    max: number;
    min: number;
    mean: number;
    quartiles: [number, number, number];
    upperWhisker: number;
    valSet: Tag;
}

export interface PosInfoResponse {
    frameValSet: unknown;
    summaries: Array<Summary>;
}

export interface LemmaProfileResponse {
    isAmbiguousPos: boolean;
    lemmaInfo: Array<LemmaResponse>;
    posInfo: Array<PosInfoResponse>;
    pos: GramatikatPoS;
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
        const pos = wagPosToGramatikat(args.pos);
        const catSet = posToCatSet(pos);

        const reqArgs: LemmaArgs = {
            lemma: args.lemma,
            pos,
            catSet,
            corpus: args.corpus,
        };
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
                map<LemmaProfileResponse, LemmaProfileResponse>((resp) =>
                    resp
                        ? { ...resp, pos, isAmbiguousPos: !args.pos }
                        : {
                              lemmaInfo: [
                                  {
                                      freq: 0,
                                      proportions: [],
                                  },
                              ],
                              posInfo: [
                                  {
                                      frameValSet: undefined,
                                      summaries: [],
                                  },
                              ],
                              pos,
                              isAmbiguousPos: !args.pos,
                          }
                ),
                map((resp) => tuple(resp, queryIdx))
            );
    }
}
