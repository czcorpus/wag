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
import { Observable, of as rxOf } from 'rxjs';
import { map } from 'rxjs/operators';

import { cachedAjax$ } from '../../ajax';
import { IAsyncKeyValueStore, SourceDetails } from '../../types';
import { WordTranslation, TranslationAPI, TranslationResponse, TranslationSubsetsAPI } from '../abstract/translations';
import { TranslationsModelState, TranslationsSubsetsModelState } from '../../models/translations';


export type SearchPackages = {[lang2:string]:Array<string>};

export interface RequestArgs {
    left:string;
    right:string;
    viceslovne:string;
    regularni:string;
    lemma:string;
    aJeA:string;
    hledejKde:string;
    hledejCo:string;
    order:string;
    api:'true';
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
    left:string;
    righ:string;
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

    constructor(cache:IAsyncKeyValueStore, apiURL:string) {
        this.cache = cache;
        this.apiURL = apiURL;
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

    getSourceDescription(tileId:number, uiLang:string, corpname:string):Observable<SourceDetails> {
        return rxOf({
            tileId: tileId,
            title: this.translateText(this.titleI18n, uiLang),
            description: this.translateText(this.descI18n, uiLang),
            author: 'Czech National Corpus',
            href: 'https://wiki.korpus.cz/doku.php/cnk:intercorp'
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
        return cachedAjax$<HTTPResponse>(this.cache)(
            'GET',
            this.apiURL,
            args

        ).pipe(
            map(
                resp => ({
                    translations: this.mergeByLowercase(resp.lines.map(v => ({
                        freq: parseInt(v.freq),
                        score: parseFloat(v.perc),
                        word: v.left,
                        firstTranslatLc: v.righ.toLowerCase(),
                        translations: [v.righ],
                        interactionId: ''
                    }))).slice(0, 10)
                })
            )
        );
    }
}


export class TreqAPI extends TreqAPICaller implements TranslationAPI<RequestArgs, PageArgs> {

    constructor(cache:IAsyncKeyValueStore, apiURL:string) {
        super(cache, apiURL);
    }

    stateToArgs(state:TranslationsModelState<PageArgs>, query:string):RequestArgs {
        return {
            left: state.lang1,
            right: state.lang2,
            viceslovne: '0',
            regularni: '0',
            lemma: '1',
            aJeA: '1',
            hledejKde: state.searchPackages.join(','),
            hledejCo: query,
            order: 'percDesc',
            api: 'true'
        };
    }


    stateToPageArgs(state:TranslationsModelState<PageArgs>, query:string):PageArgs {
        return {
            jazyk1: state.lang1,
            jazyk2: state.lang2,
            viceslovne: '0',
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
            left: state.lang1,
            right: state.lang2,
            viceslovne: '0',
            regularni: '0',
            lemma: '1',
            aJeA: '1',
            hledejKde: packages.join(','),
            hledejCo: query,
            order: 'percDesc',
            api: 'true'
        };
    }

}