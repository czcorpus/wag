/*
 * Copyright 2020 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { List, HTTP } from 'cnc-tskit';

import { IFreqDB } from '../freqdb';
import { IAppServices, IApiServices } from '../../../appServices';
import { QueryMatch, calcFreqBand } from '../../../query/index';
import { FreqDbOptions } from '../../../conf';
import { importQueryPosWithLabel, posTable } from '../../../postag';
import { CorpusDetails } from '../../../types';
import { serverHttpRequest } from '../../request';


export interface ResourceInfo {
    clsname:string;
    type:string;
    user:string;
    group:string;
    label:{[lang:string]:string},
    description:string;
    subdef_required:boolean;
    subspec_required:boolean;
    perms:{
        group_read:boolean;
        group_write:boolean;
        public_read:boolean;
        public_write:boolean;
    },
    params:{
        size_tokens:number;
    }
}


export interface HTTPResourcesResponse {
    code:number;
    message:string;
    data:Array<{[type:string]:{[attr:string]:ResourceInfo}}>;
}


export interface DataBlock {
    _name:string;
    _type:string;
    _id:string;
    _path:string;
    _slots:Array<{
        _pos:number;
        _name:string;
        _type:string;
        _fillers:Array<{
            _name:string;
            _type:string;
            [':form:attr:cnc:w:lemma']:string;
            [':form:attr:cnc:w:tag']:string;
            [':form:attr:cnc:w:word']:string;
        }>
    }>;
    [':stats:fq:abs:cnc:corpus-syn8']:number;
}


export interface HTTPDataResponse {
    code:number;
    message:string;
    data:Array<DataBlock>;
    total:{
        value:number;
        relation:string;
    },
    query:{[key:string]:any},
    page:{
        from:number;
        to:number;
    }
}


export class KorpusFreqDB implements IFreqDB {

    private readonly apiURL:string;

    private readonly customHeaders:{[key:string]:string};

    private readonly fcrit:string;

    private readonly normPath:string[];

    constructor(apiUrl:string, apiServices:IApiServices, options:FreqDbOptions) {
        this.apiURL = apiUrl;
        this.customHeaders = options.httpHeaders || {};
        this.fcrit = options.korpusDBCrit;
        this.normPath = options.korpusDBNorm.split('/');
    }

    private loadResources():Observable<HTTPResourcesResponse> {
        return serverHttpRequest<HTTPResourcesResponse>({
            url: this.apiURL + '/api/meta/resources',
            method: HTTP.Method.GET,
            headers: this.customHeaders

        }).pipe(
            map(
                resp => {
                    // KorpusDB returning incorrect status code workaround
                    if (typeof resp !== 'object') {
                        throw new Error('Invalid response type');
                    }
                    return resp;
                }
            )
        )
    }

    private loadData(value:string, type:string):Observable<HTTPDataResponse> {
        return serverHttpRequest<HTTPDataResponse>({
            url: this.apiURL + '/api/cunits/_view',
            method: HTTP.Method.POST,
            data: {
                feats:[':form:attr:cnc:w', ':stats:fq:abs:cnc'],
                sort: [
                    {
                        'feats._i_value': {
                            order: 'desc',
                            nested: {
                                path: 'feats',
                                filter: {
                                    term: {
                                        'feats.type': ':stats:fq:abs:cnc'
                                    }
                                }
                            }
                        }
                    }
                ],
                page: {from: 0, to: 100},
                query: {
                    feats: [{
                        ci: true,
                        type: type,
                        value: value
                    }],
                    type: ':token:form'
                },
                _client: 'wag'
            },
            headers: this.customHeaders

        }).pipe(
            map(
                resp => {
                    // KorpusDB returning incorrect status code workaround
                    if (typeof resp !== 'object') {
                        throw new Error('Invalid response type');
                    }
                    return resp;
                }
            )
        )
    }

    findQueryMatches(appServices:IAppServices, word:string, minFreq:number):Observable<Array<QueryMatch>> {
        return forkJoin(this.loadResources(), this.loadData(word, ':form:attr:cnc:w:word')).pipe(
            map(([res, data]) => List.reduce(
                (acc, curr) => {
                    if (curr[this.fcrit]) {
                        const lemma = curr._slots[0]._fillers[0][':form:attr:cnc:w:lemma'];
                        const pos = importQueryPosWithLabel(curr._slots[0]._fillers[0][':form:attr:cnc:w:tag'][0], posTable, appServices);
                        const ipm = 1000000 * curr[this.fcrit]/res.data[0][this.normPath[0]][this.normPath[1]].params.size_tokens;

                        // aggregate items whit identical pos and lemma
                        const ident = List.findIndex(obj =>
                            obj.lemma === lemma &&
                            obj.pos.length === pos.length &&
                            List.every(([a, b]) => a.value === b.value, List.zip(obj.pos, pos)),
                            acc
                        );
                        if (ident > -1) {
                            acc[ident].abs += curr[this.fcrit];
                            acc[ident].ipm += ipm;
                            acc[ident].flevel = calcFreqBand(acc[ident].ipm);
                            return acc;

                        } else {
                            return [...acc, {
                                word: word,
                                lemma: lemma,
                                pos: pos,
                                ipm: ipm,
                                flevel: calcFreqBand(ipm),
                                abs: curr[this.fcrit],
                                arf: -1,
                                isCurrent: false,
                            }];
                        }
                    } else {
                        return acc
                    }
                },
                [],
                data.data
            ))
        );
    }

    getSimilarFreqWords(appServices:IAppServices, lemma:string, pos:Array<string>, rng:number):Observable<Array<QueryMatch>> {
        return new Observable<Array<QueryMatch>>((observer) => {
            observer.next([]);
            observer.complete();
        });
    }

    getWordForms(appServices:IAppServices, lemma:string, pos:Array<string>):Observable<Array<QueryMatch>> {
        return forkJoin(this.loadResources(), this.loadData(lemma, ':form:attr:cnc:w:lemma')).pipe(
            map(([res, data]) => List.reduce(
                (acc, curr) => {
                    if (curr[this.fcrit]) {
                        const wordPos = importQueryPosWithLabel(curr._slots[0]._fillers[0][':form:attr:cnc:w:tag'][0], posTable, appServices);
                        if (wordPos.length === pos.length && List.every(([a, b]) => a === b.value, List.zip(wordPos, pos))) {
                            const word = curr._slots[0]._fillers[0][':form:attr:cnc:w:word'];
                            const ipm = 1000000 * curr[this.fcrit]/res.data[0][this.normPath[0]][this.normPath[1]].params.size_tokens;

                            // aggregate items whit identical pos and lemma
                            const ident = List.findIndex(obj => obj.word === word, acc);
                            if (ident > -1) {
                                acc[ident].abs += curr[this.fcrit];
                                acc[ident].ipm += ipm;
                                acc[ident].flevel = calcFreqBand(acc[ident].ipm);
                                return acc;

                            } else {
                                return [...acc, {
                                    word: word,
                                    lemma: lemma,
                                    pos: pos,
                                    ipm: ipm,
                                    flevel: calcFreqBand(ipm),
                                    abs: curr[this.fcrit],
                                    arf: -1,
                                    isCurrent: false,
                                }];
                            }
                        }
                    } else {
                        return acc
                    }
                },
                [],
                data.data
            ))
        );
    }

    getSourceDescription(uiLang:string, corpname:string):Observable<CorpusDetails> {
        return this.loadResources().pipe(
            map(res => ({
                tileId: -1,
                title: res.data[0][this.normPath[0]][this.normPath[1]].label[uiLang],
                description: res.data[0][this.normPath[0]][this.normPath[1]].description,
                author: '',
                structure: {
                    numTokens: res.data[0][this.normPath[0]][this.normPath[1]].params.size_tokens
                }
            }))
        );
    }


}