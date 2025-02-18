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
import { Observable, of as rxOf, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

import { cachedAjax$ } from '../../../page/ajax.js';
import { IAsyncKeyValueStore, SourceDetails } from '../../../types.js';
import {
    WordTranslation,
    TranslationAPI,
    TranslationResponse,
    TranslationSubsetsAPI
} from '../../abstract/translations.js';
import {
    TranslationsModelState,
    TranslationsSubsetsModelState
} from '../../../models/tiles/translations.js';
import { IAppServices } from '../../../appServices.js';
import { HTTP, List } from 'cnc-tskit';
import { Backlink } from '../../../page/tile.js';


export type SearchPackages = {[domain2:string]:Array<string>};

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
    to:string;
}

interface HTTPResponse {
    sum:number;
    lines:Array<HTTPResponseLine>;
}

export const mkInterctionId = (word:string):string => {
    return `treqInteractionKey:${word}`;
};


class TreqAPICaller {

    private readonly cache:IAsyncKeyValueStore;

    private readonly apiURL:string;

    private readonly titleI18n:{[lang:string]:string};

    private readonly descI18n:{[lang:string]:string};

    private readonly appServices:IAppServices;

    constructor(cache:IAsyncKeyValueStore, apiURL:string, appServices:IAppServices) {
        this.cache = cache;
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

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<SourceDetails> {
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

    private mergeByLowercase(lines:Array<WordTranslation>):Array<WordTranslation> {
        return Object.values<WordTranslation>(lines.reduce(
            (acc, curr) => {
                if (!(curr.firstTranslatLc in acc)) {
                    acc[curr.firstTranslatLc] = {
                        freq: curr.freq,
                        score: curr.score,
                        left: curr.word,
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

    call(args:RequestArgs):Observable<TranslationResponse> {
        const headers = this.appServices.getApiHeaders(this.apiURL);
        headers['X-Is-Web-App'] = '1';
        return cachedAjax$<HTTPResponse>(this.cache)(
            HTTP.Method.GET,
            `${this.apiURL}/api/v1/`,
            args,
            {
                headers,
                withCredentials: true
            },

        ).pipe(
            map(
                resp => {
                    if (!resp) {
                        throw new Error('Empty response from Treq server');
                    }
                    return {
                        translations: this.mergeByLowercase(
                            List.map(
                                v => ({
                                    freq: parseInt(v.freq),
                                    score: parseFloat(v.perc),
                                    word: v.from,
                                    firstTranslatLc: v.to.toLowerCase(),
                                    translations: [v.to],
                                    interactionId: ''
                                }),
                                resp.lines
                            )).slice(0, 10)
                    };
                }
            )
        );
    }

    getBackLink(backlink:Backlink):Backlink {
        return {
            label: 'Treq',
            method: HTTP.Method.GET,
            ...(backlink || {}),
            url: (backlink?.url ? backlink.url : this.apiURL) + '/index.php',
        }
    }
}


export class TreqAPI extends TreqAPICaller implements TranslationAPI<RequestArgs, PageArgs> {

    constructor(cache:IAsyncKeyValueStore, apiURL:string, appServices:IAppServices) {
        super(cache, apiURL, appServices);
    }

    stateToArgs(state:TranslationsModelState<PageArgs>, query:string):RequestArgs {
        return {
            from: state.domain1,
            to: state.domain2,
            multiword: query.split(' ').length > 1,
            regex: false,
            lemma: true,
            ci: true,
            'pkgs[i]': state.searchPackages,
            query: query,
            order: 'perc',
            asc: false,
        };
    }


    stateToPageArgs(state:TranslationsModelState<PageArgs>, query:string):PageArgs {
        return {
            jazyk1: state.domain1,
            jazyk2: state.domain2,
            viceslovne: query.split(' ').length > 1 ? '1' : '0',
            regularni: '0',
            lemma: '1',
            caseInsen: '1',
            hledejCo: query,
            'hledejKde[]': state.searchPackages
        };
    }
}



export class TreqSubsetsAPI extends TreqAPICaller implements TranslationSubsetsAPI<RequestArgs> {


    stateToArgs(state:TranslationsSubsetsModelState, query:string, packages:Array<string>):RequestArgs {
        return {
            from: state.domain1,
            to: state.domain2,
            multiword: query.split(' ').length > 1,
            regex: false,
            lemma: true,
            ci: true,
            'pkgs[i]': packages,
            query: query,
            order: 'perc',
            asc: false,
        };
    }

}