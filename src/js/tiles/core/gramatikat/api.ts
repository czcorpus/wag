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
    catSet: [GramatikatCatSet, GramatikatCatSet];
    corpus: string;
}

export type GramatikatNumber = 'S' | 'P';

export type GramatikatCase = '1' | '2' | '3' | '4' | '5' | '6' | '7';

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
            return 'nouns';
        case 'A':
            return 'adjectives';
        case 'V':
            return 'verbs';
        default:
            return undefined;
    }
};

interface LemmaArgs {
    lemma: string;

    pos: GramatikatPoS;

    /**
     * Set of grammatical categories.
     */
    catSet: [GramatikatCatSet, GramatikatCatSet];

    /**
     * If given, proportions of instances of values of catSet are computed
     * separately within instances of each value of frameCatSet
     */
    frameCatSet?: GramatikatCatSet;

    corpus: string;
}

export interface GramatikatFreq {
    valSet: [GramatikatNumber, GramatikatCase];
    proportion: number;
}

export interface LemmaResponse {
    freq: number;
    proportions: Array<GramatikatFreq>;
}

export interface Histogram {
    valSet: [GramatikatNumber, GramatikatCase];
    histogram: Array<number>;
}

export interface Histograms {
    binEdges: Array<number>;
    histograms: Array<Histogram>;
}

export interface LemmaProfileResponse {
    isAmbiguousPos: boolean;
    lemmaInfo: Array<LemmaResponse>;
    posInfo: Array<Histograms>;
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
        const reqArgs: LemmaArgs = {
            lemma: args.lemma,
            pos: wagPosToGramatikat(args.pos),
            catSet: args.catSet,
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
                        ? { ...resp, isAmbiguousPos: !args.pos }
                        : {
                              lemmaInfo: [
                                  {
                                      freq: 0,
                                      proportions: [],
                                  },
                              ],
                              posInfo: [{ binEdges: [], histograms: [] }],
                              isAmbiguousPos: !args.pos,
                          }
                ),
                map((resp) => tuple(resp, queryIdx))
            );
    }
}
