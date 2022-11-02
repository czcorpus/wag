/*
 * Copyright 2020 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2021 Tomas Machalek <tomas.machalek@gmail.com>
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
import { Observable, forkJoin, of as rxOf } from 'rxjs';
import { concatMap, map, mergeMap, reduce } from 'rxjs/operators';
import { List, HTTP, tuple, pipe } from 'cnc-tskit';

import { IFreqDB } from '../freqdb';
import { IAppServices, IApiServices } from '../../../appServices';
import { QueryMatch, calcFreqBand } from '../../../query/index';
import { FreqDbOptions } from '../../../conf';
import { importQueryPosWithLabel, PosItem, posTable, posTagsEqual } from '../../../postag';
import { SourceDetails } from '../../../types';
import { serverHttpRequest } from '../../request';
import { CouchStoredSourceInfo } from './couchdb/sourceInfo';


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
        size:number;
    }
}


export class KorpusFreqDB implements IFreqDB {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly fcrit:string;

    private readonly ngramFcrit:string;

    private readonly normPath:string[];

    private readonly sourceInfoApi:CouchStoredSourceInfo|undefined;

    constructor(apiUrl:string, apiServices:IApiServices, options:FreqDbOptions) {
        this.apiURL = apiUrl;
        this.apiServices = apiServices;
        this.fcrit = options.korpusDBCrit;
        this.ngramFcrit = options.korpusDBNgramCrit;
        this.normPath = options.korpusDBNorm.split('/');
        this.sourceInfoApi = options.sourceInfoUrl ?
            new CouchStoredSourceInfo(
                options.sourceInfoUrl,
                options.sourceInfoUsername,
                options.sourceInfoPassword,
                apiServices
            ) :
            undefined;
    }

    private loadResources():Observable<HTTPResourcesResponse> {
        return serverHttpRequest<HTTPResourcesResponse>({
            url: this.apiURL + '/api/meta/resources',
            method: HTTP.Method.GET,
            headers: this.apiServices.getApiHeaders(this.apiURL)

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
        const words = value.split(' ');
        const fcritLocation = List.init(words.length > 1 ? this.ngramFcrit.split(':') : this.fcrit.split(':')).join(':');

        return serverHttpRequest<HTTPDataResponse>({
            url: this.apiURL + '/api/cunits/_view',
            method: HTTP.Method.POST,
            data: {
                feats:[':form:attr:cnc:w', fcritLocation],
                sort: [
                    {
                        'feats._i_value': {
                            order: 'desc',
                            nested: {
                                path: 'feats',
                                filter: {
                                    term: {
                                        'feats.type': fcritLocation
                                    }
                                }
                            }
                        }
                    }
                ],
                page: {from: 0, size: 1000},
                query: {
                    feats: [],
                    type: words.length > 1 ? `:ngram:form:${words.length}` : ':token:form',
                    slots: List.map(
                        word => ({
                            fillers: [{
                                feats: [{
                                    type: type,
                                    value: word,
                                    ci: true
                                }]
                            }]
                        }),
                        words
                    )
                },
                _client: 'wag'
            },
            headers: this.apiServices.getApiHeaders(this.apiURL)

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
        const fcrit = word.includes(' ') ? this.ngramFcrit : this.fcrit;

        return forkJoin([this.loadResources(), this.loadData(word, ':form:attr:cnc:w:word')]).pipe(
            concatMap(([rsc, data]) => rxOf(...pipe(
                data.data,
                List.reduce<DataBlock, Array<[string, string, Array<PosItem>]>>(
                    (acc, curr) => {
                        if (word.toLowerCase() === curr._name.toLowerCase() && curr[fcrit]) {
                            const lemma = List.map(
                                slot => slot._fillers[0][':form:attr:cnc:w:lemma'],
                                curr._slots
                            ).join(' ');
                            const pos = importQueryPosWithLabel(
                                List.map(
                                    slot => slot._fillers[0][':form:attr:cnc:w:tag'][0],
                                    curr._slots
                                ).join(' '),
                                posTable,
                                appServices
                            );
                            const exists = List.some(
                                ([, ilemma, ipos]) => ilemma === lemma &&
                                        ipos.length === pos.length &&
                                        List.every(
                                            ([a, b]) => a.value === b.value,
                                            List.zip(ipos, pos)
                                        ),
                                acc
                            );
                            return exists ? acc : [...acc, tuple(word, lemma, pos)];
                        }
                        return acc;
                    },
                    []
                ),
                List.map(res => tuple(rsc, res))
            ))),
            mergeMap(([rsc, [word, lemma, pos]]) =>
                this.getWordFormsUsingResources(
                    appServices,
                    lemma,
                    List.map(p => p.value, pos),
                    rsc
                ).pipe(
                    map(wordForms =>
                        List.reduce((acc, curr) => {
                                acc.ipm += curr.ipm;
                                acc.flevel = calcFreqBand(acc.ipm);
                                acc.abs += curr.abs;
                                return acc;
                            },
                            {
                                word,
                                lemma,
                                pos,
                                ipm: 0,
                                flevel: null,
                                abs: 0,
                                arf: 0,
                                isCurrent: false // TODO
                            },
                            wordForms
                        )
                    )
                )
            ),
            reduce(
                (acc, curr) => List.push(curr, acc), [] as Array<QueryMatch>
            ),
            map(
                items => pipe(
                    items,
                    List.sortedBy(val => val.ipm),
                    List.reversed()
                )
            )
        );
    }


    getSimilarFreqWords(appServices:IAppServices, lemma:string, pos:Array<string>, rng:number):Observable<Array<QueryMatch>> {
        return new Observable<Array<QueryMatch>>((observer) => {
            observer.next([]);
            observer.complete();
        });
    }

    private getWordFormsUsingResources(
        appServices:IAppServices,
        lemma:string,
        pos:Array<string>,
        resources:HTTPResourcesResponse
    ):Observable<Array<QueryMatch>> {

        const fcrit = lemma.includes(' ') ? this.ngramFcrit : this.fcrit;
        return this.loadData(lemma, ':form:attr:cnc:w:lemma').pipe(
            map(data => List.reduce(
                (acc, curr) => {
                    if (curr[fcrit]) {
                        const wordPos = importQueryPosWithLabel(
                            List.map(slot => slot._fillers[0][':form:attr:cnc:w:tag'][0], curr._slots).join(' '),
                            posTable,
                            appServices
                        );
                        if (List.empty(pos) || posTagsEqual(pos, List.map(v => v.value, wordPos))) {
                            const total = resources.data[0][this.normPath[0]][this.normPath[1]].params.size_tokens;
                            const ipm = 1000000 * curr[fcrit] /  total;
                            // aggregate items with identical word
                            const ident = List.findIndex(obj => obj.word === curr._name, acc);
                            if (ident > -1) {
                                acc[ident].abs += curr[fcrit];
                                acc[ident].ipm += ipm;
                                acc[ident].flevel = calcFreqBand(acc[ident].ipm);
                                return acc;

                            } else {
                                return [...acc, {
                                    word: curr._name,
                                    lemma: lemma,
                                    pos: pos,
                                    ipm: ipm,
                                    flevel: calcFreqBand(ipm),
                                    abs: curr[fcrit],
                                    arf: -1,
                                    isCurrent: false,
                                }];
                            }
                        }
                    }

                    return acc;
                },
                [],
                data.data
            ))
        );
    }

    getWordForms(appServices:IAppServices, lemma:string, pos:Array<string>):Observable<Array<QueryMatch>> {
        return this.loadResources().pipe(
            concatMap(
                res => this.getWordFormsUsingResources(
                    appServices,
                    lemma,
                    pos,
                    res
                )
            )
        );
    }

    getSourceDescription(uiLang:string, corpname:string):Observable<SourceDetails> {
        return this.sourceInfoApi ?
            this.sourceInfoApi.getSourceDescription(uiLang, corpname) :
            this.loadResources().pipe(
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