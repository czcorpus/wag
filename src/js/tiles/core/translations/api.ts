/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2022 Martin Zimandl <martin.zimandl@gmail.com>
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
import { Observable, of as rxOf } from 'rxjs';
import { map } from 'rxjs/operators';

import { ajax$, encodeArgs } from '../../../page/ajax.js';
import { SourceDetails } from '../../../types.js';
import { IAppServices } from '../../../appServices.js';
import { HTTP, List, pipe } from 'cnc-tskit';
import { Backlink, BacklinkConf } from '../../../page/tile.js';
import { IDataStreaming } from '../../../page/streaming.js';
import { Line } from '../../../api/vendor/mquery/concordance/common.js';


export type SearchPackages = {[translatLang:string]:Array<string>};

export interface RequestArgs {
    from:string;
    to:string;
    multiword:boolean;
    regex:boolean;
    lemma:boolean;
    ci:boolean;
    'pkgs[i]':Array<string>;
    query:string;
    asc:boolean;
    order:string;
}


export interface PageArgs {
    jazyk1:string;
    jazyk2:string;
    viceslovne:string;
    regularni:string;
    lemma:string;
    caseInsen:string;
    hledejCo:string;
    'hledejKde[]':Array<string>;
}

interface HTTPResponseLine {
    freq:string;
    perc:string;
    from:string;
    to:{
        word:string;
        error?:string;
        examples?:{
            text:Array<Line>;
            interactionId:string;
            ref:string;
        }
    }
}

export interface HTTPResponse {
    sum:number;
    lines:Array<HTTPResponseLine>;
    fromCorp?:string;
    toCorp?:string;
}

export const mkInterctionId = (word:string):string => {
    return `treqInteractionKey:${word}`;
};


export interface Translation {
    word:string;
    examples?:{
        text:Array<Line>;
        interactionId:string;
        ref:string;
    }
}


export interface WordTranslation {
    score:number;
    freq:number; // TODO probably a candidate for removal
    word:string;
    firstTranslatLc:string;
    translations:Array<Translation>;
    interactionId:string;
    color?:string;
}


export interface TranslationResponse {
    translations:Array<WordTranslation>;
}


/**
 * TranslationsModelState is a general state for core and core-derived translation tiles.
 * The 'T' generic parameter specifies a format for backlink page arguments to a possible
 * original application which produces the results.
 */
export interface TranslationsModelState {

    minItemFreq:number;
    lang1:string;
    lang2:string;

    isBusy:boolean;
    isAltViewMode:boolean;
    error:string;

    /**
     * List of packages/subcorpora where we can search. If not
     * applicable push just a single item.
     */
    searchPackages:Array<string>;

    /**
     * List of found translations
     */
    translations:Array<WordTranslation>;

    backlink?:Backlink;

    maxNumLines:number;
}


export class TreqAPICommon {

    protected readonly apiURL:string;

    private readonly titleI18n:{[lang:string]:string};

    private readonly descI18n:{[lang:string]:string};

    protected readonly appServices:IAppServices;

    protected readonly backlinkConf:BacklinkConf;

    constructor(apiURL:string, appServices:IAppServices, backlinkConf:BacklinkConf) {
        this.apiURL = apiURL;
        this.appServices = appServices;
        this.titleI18n = {
            'cs-CZ': 'InterCorp - mnohojazyčný paralelní korpus',
            'en-US': 'InterCorp - a multilingual parallel corpus',
        };
        this.descI18n = {
            'cs-CZ': 'Projekt spravovaný Ústavem Českého národního korpusu',
            'en-US': 'A project managed by the Institute of the Czech National Corpus',
        };
        this.backlinkConf = backlinkConf;
    }

    private translateText(data:{[lang:string]:string}, lang:string):string {
        if (data[lang]) {
            return data[lang];
        }
        const langGen = lang.split('-')[0];
        for (let k in data) {
            const kGen = k.split('-')[0];
            if (kGen === langGen) {
                return data[k];
            }
        }
        return data['en-US'];
    }

    getSourceDescription(dataStreaming:IDataStreaming, tileId:number, lang:string, corpname:string):Observable<SourceDetails> {
        return rxOf({
            tileId: tileId,
            title: this.translateText(this.titleI18n, this.appServices.getUILang()),
            description: this.translateText(this.descI18n, this.appServices.getUILang()),
            author: 'Czech National Corpus',
            href: 'https://wiki.korpus.cz/doku.php/cnk:intercorp',
            structure: {
                numTokens: 1700000000
            },
            citationInfo: {
                sourceName: 'InterCorp',
                papers: [],
                main: 'ČERMÁK, F. – ROSEN, A. (2012). The case of InterCorp, a multilingual parallel corpus. <em>International Journal of Corpus Linguistics</em>. Vol. 13, no. 3, p. 411–427.',
                otherBibliography: '<a target="_blank" rel="noopener" href="https://intercorp.korpus.cz/">intercorp.korpus.cz</a>'
            }
        });
    }

    protected mergeByLowercase(lines:Array<WordTranslation>):Array<WordTranslation> {
        return Object.values<WordTranslation>(lines.reduce(
            (acc, curr) => {
                if (!(curr.firstTranslatLc in acc)) {
                    acc[curr.firstTranslatLc] = {
                        freq: curr.freq,
                        score: curr.score,
                        word: curr.word,
                        translations: curr.translations,
                        firstTranslatLc: curr.firstTranslatLc,
                        interactionId: mkInterctionId(curr.firstTranslatLc)
                    };

                } else {
                    acc[curr.firstTranslatLc].freq += curr.freq;
                    acc[curr.firstTranslatLc].score += curr.score;
                    curr.translations.forEach(variant => {
                        if (acc[curr.firstTranslatLc].translations.indexOf(variant) === -1) {
                            acc[curr.firstTranslatLc].translations.push(variant);
                        }
                    });
                }
                return acc;
            },
            {}
        )).sort((x1, x2) => x2.score - x1.score);
    }



    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        if (this.backlinkConf) {
            return {
                queryId,
                subqueryId,
                label: this.backlinkConf.label || 'Treq',
            }
        }
        return null;
    }
}


export class TreqAPI extends TreqAPICommon {

    private readonly fetchExamplesFrom:[string, string]|undefined;

    constructor(
        apiURL:string,
        fetchExamplesFrom:[string, string]|undefined,
        appServices:IAppServices,
        backlinkConf:BacklinkConf
    ) {
        super(apiURL, appServices, backlinkConf);
        this.fetchExamplesFrom = fetchExamplesFrom;
    }

    call(streaming:IDataStreaming|null, tileId:number, queryIdx:number, args:RequestArgs):Observable<TranslationResponse> {
        const headers = this.appServices.getApiHeaders(this.apiURL);
        headers['X-Is-Web-App'] = '1';
        const allArgs = this.fetchExamplesFrom ?
            {
                ...args,
                fromCorp: this.fetchExamplesFrom[0],
                toCorp: this.fetchExamplesFrom[1],
                tileId
            } :
            args;
        const source = streaming ?
            streaming.registerTileRequest<HTTPResponse>({
                contentType: 'application/json',
                isEventSource: true,
                body: {},
                method: HTTP.Method.GET,
                tileId,
                url: this.fetchExamplesFrom ?
                    this.apiURL + '/with-examples' + '?' + encodeArgs(allArgs) :
                    this.apiURL + '/' + '?' + encodeArgs(allArgs),
            }) : ajax$<HTTPResponse>(
                HTTP.Method.GET,
                this.apiURL,
                args,
                {
                    headers,
                    withCredentials: true
                },
            );

        return source.pipe(
            map(
                resp => {
                    if (!resp) {
                        throw new Error('Empty response from Treq server');
                    }
                    return {
                        translations: this.mergeByLowercase(
                            pipe(
                                resp.lines,
                                List.map(
                                    v => ({
                                        freq: parseInt(v.freq),
                                        score: parseFloat(v.perc),
                                        word: v.from,
                                        firstTranslatLc: v.to.word.toLowerCase(),
                                        translations: [{
                                            word: v.to.word,
                                            examples: v.to.examples,
                                            error: v.to.error

                                        }],
                                        interactionId: ''
                                    })
                                ),
                                x => x.slice(0, 10)
                            )
                        )
                    };
                }
            )
        );
    }

    requestBacklink(state:TranslationsModelState, query:string):URL {
        const url = new URL(this.backlinkConf.url);
        url.searchParams.set('jazyk1', state.lang1);
        url.searchParams.set('jazyk2', state.lang2);
        url.searchParams.set('viceslovne', query.split(' ').length > 1 ? '1' : '0');
        url.searchParams.set('regularni', '0');
        url.searchParams.set('lemma', '1');
        url.searchParams.set('caseInsen', '1');
        url.searchParams.set('hledejCo', query);
        for (const pkg of state.searchPackages) {
            url.searchParams.append('hledejKde[]', pkg);
        }
        return url;
    }
}


