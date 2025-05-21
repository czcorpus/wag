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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { pipe, List, HTTP } from 'cnc-tskit';
import urlJoin from 'url-join';

import { ajax$, encodeURLParameters } from '../../../page/ajax.js';
import { matchesPos, calcFreqBand } from '../../../query/index.js';
import { MultiDict } from '../../../multidict.js';
import { RequestArgs, SimilarFreqWord } from '../../../api/abstract/similarFreq.js';
import { HTTPAction } from '../../../server/routes/actions.js';
import { IApiServices } from '../../../appServices.js';
import { IDataStreaming } from '../../../page/streaming.js';


interface ResponseItem {
    count:number;
    forms:Array<{arf:number; count:number; word:string}>;
    is_pname:boolean;
    lemma:string;
    ngramSize:number;
    pos:string;
    ipm:number;
    simFreqScore:number;
    sublemmas:Array<{value:string; count:number}>;
    _id:string;
}


interface HTTPResponse {
    matches:Array<ResponseItem>;
}


export class SimilarFreqWordsFrodoAPI {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly useDataStream:boolean;

    constructor(apiURL:string, apiServices:IApiServices, useDataStream:boolean) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
        this.useDataStream = useDataStream;
    }

    call(dataStreaming:IDataStreaming, tileId:number, queryIdx:number, args:RequestArgs|null):Observable<Array<SimilarFreqWord>> {
        return (
            this.useDataStream ?
                this.apiServices.dataStreaming().registerTileRequest<HTTPResponse>(
                    {
                        contentType: 'application/json',
                        body: {},
                        method: HTTP.Method.GET,
                        tileId,
                        queryIdx,
                        url: args && this.apiURL ?
                            urlJoin(
                                this.apiURL,
                                'dictionary',
                                args.corpname,
                                'similarARFWords',
                                args.word
                            ) + '?' + encodeURLParameters(
                                [['domain', args.corpname],
                                ['lemma', args.lemma],
                                ['pos', args.pos.join(' ')],
                                ['mainPosAttr', args.mainPosAttr],
                                ['srchRange', args.srchRange]]
                            ) :
                            ''
                    }
                ).pipe(
                    map(
                        v => v ? v : { matches: []}
                    )
                ) :
                ajax$<HTTPResponse>(
                    'GET',
                    this.apiURL + HTTPAction.SIMILAR_FREQ_WORDS,
                    new MultiDict([
                        ['domain', args.corpname],
                        ['word', args.word],
                        ['lemma', args.lemma],
                        ['pos', args.pos.join(' ')],
                        ['mainPosAttr', args.mainPosAttr],
                        ['srchRange', args.srchRange]
                    ]),
                    {
                        headers: this.apiServices.getApiHeaders(this.apiURL),
                        withCredentials: true
                    }
                )

        ).pipe(
            map(
                data =>  pipe(
                    data.matches,
                    List.map(
                        v => ({
                            lemma: v.lemma,
                            pos: [{value: v.pos, label: v.pos}], // TODO what about label?
                            upos: [], // TODO UD support?
                            ipm: v.ipm,
                            flevel: calcFreqBand(v.ipm)
                        })
                    ),
                    List.filter(
                        item => (
                            item.lemma !== args.lemma ||
                            !matchesPos(item, args.mainPosAttr, args.pos)
                        )
                    )
                )
            )
        );
    }
}

