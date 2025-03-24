/*
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Dict, HTTP, List, pipe } from 'cnc-tskit';
import urlJoin from 'url-join';

import { ajax$ } from '../../../page/ajax.js';
import { CorpusDetails } from '../../../types.js';
import { CorpusInfoAPI } from './corpusInfo.js';
import { BacklinkWithArgs, Backlink } from '../../../page/tile.js';
import { MinSingleCritFreqState } from '../../../models/tiles/freq.js';
import { IApiServices } from '../../../appServices.js';
import { CollApiResponse, CollocationApi } from '../../abstract/collocations.js';
import { CollocModelState, ctxToRange } from '../../../models/tiles/collocations.js';
import { QueryMatch } from '../../../query/index.js';
import { mkMatchQuery } from './common.js';


export interface HTTPResponse {
    concSize:number;
    corpusSize:number;
    subcSize?:number;
    colls:Array<{
        word:string;
        score:number;
        freq:number;
    }>;
    measure:string;
    srchRange:[number, number];
    error?:string;
    resultType:'coll';
}

interface MQueryCollArgs {
    corpusId:string;
    q:string;
    subcorpus:string;
    measure:
        'absFreq'|
        'logLikelihood'|
        'logDice'|
        'minSensitivity'|
        'mutualInfo'|
        'mutualInfo3'|
        'mutualInfoLogF'|
        'relFreq'|
        'tScore';
    srchLeft:number;
    srchRight:number;
    srchAttr:string;
    minCollFreq:number;
    maxItems:number;
}

const measureMap = {
    'm': 'mutualInfo',
    '3': 'mutualInfo3',
    'l': 'logLikelihood',
    's': 'minSensitivity',
    'd': 'logDice',
    'p': 'mutualInfoLogF',
    'f': 'relFreq'
};

export class MQueryCollAPI implements CollocationApi<MQueryCollArgs> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly srcInfoService:CorpusInfoAPI;

    private readonly useDataStream:boolean;

    constructor(apiURL:string, useDataStream:boolean, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.srcInfoService = new CorpusInfoAPI(apiURL, apiServices);
        this.useDataStream = useDataStream;
    }

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<CorpusDetails> {
        return this.srcInfoService.call(tileId, {corpname, lang});
    }

    createBacklink(state:MinSingleCritFreqState, backlink:Backlink, concId:string):BacklinkWithArgs<{}> {
        return null;
    }

    supportsLeftRightContext():boolean {
        return true;
    }

    supportsMultiWordQueries():boolean {
        return false;
    }

    stateToArgs(state:CollocModelState, queryMatch:QueryMatch, queryId:string):MQueryCollArgs {
        const [cfromw, ctow] = ctxToRange(state.srchRangeType, state.srchRange);
        return {
            corpusId: state.corpname,
            q: mkMatchQuery(queryMatch, state.posQueryGenerator),
            subcorpus: '', // TODO
            measure: measureMap[state.appliedMetrics[0]],
            srchLeft: Math.abs(cfromw),
            srchRight:  Math.abs(ctow),
            srchAttr: state.tokenAttr,
            minCollFreq: state.minAbsFreq, // TODO what about global vs local freq.?
            maxItems: state.citemsperpage
        }
    }

    private prepareArgs(queryArgs:MQueryCollArgs):string {
        return pipe(
            {
                ...queryArgs
            },
            Dict.toEntries(),
            List.map(
                ([k, v]) => `${k}=${encodeURIComponent(v)}`
            ),
            x => x.join('&')
        )
    }

    call(tileId:number, args:MQueryCollArgs):Observable<CollApiResponse> {
        const eargs = this.prepareArgs(args);
        return (
            this.useDataStream ?
            this.apiServices.dataStreaming().registerTileRequest<HTTPResponse>({
                tileId,
                method: HTTP.Method.GET,
                url: urlJoin(this.apiURL, '/collocations/', args.corpusId) + `?${eargs}`,
                body: {},
                contentType: 'application/json',
            }) :
            ajax$<HTTPResponse>(
                'GET',
                urlJoin(this.apiURL, '/collocations/', args.corpusId),
                args,
                {
                    headers: this.apiServices.getApiHeaders(this.apiURL),
                    withCredentials: true
                }
            )

        ).pipe(
            map(
                v => ({
                    concId: undefined,
                    collHeadings: [
                        {
                            label: '-', // will be replaced by the tile
                            ident: pipe(
                                measureMap,
                                Dict.find((v2, k) => v.measure === v2),
                                srch => srch ? srch[0] : '-'
                            )
                        }
                    ],
                    data: List.map(
                        x => ({
                            str: x.word,
                            stats: [x.score],
                            freq: x.freq,
                            nfilter: [null, null],
                            pfilter: [null, null],
                            interactionId: null // TODO
                        }),
                        v.colls
                    )
                })
            )
        );
    }
}