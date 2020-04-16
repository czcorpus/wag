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

import { IAppServices } from '../appServices';
import { pipe, List } from 'cnc-tskit';


export interface PosQueryExport {
    (pos:string):string;
}

export interface PosItem {
    label:Array<string>;
    value:Array<string>;
}

export enum PoSValues {
    NOUN = 'N',
    ADJECTIVE = 'A',
    PRONOUN = 'P',
    NUMERAL = 'C',
    VERB = 'V',
    ADVERB = 'D',
    PREPOSITION = 'R',
    CONJUNCTION = 'J',
    PARTICLE = 'T',
    INTERJECTION = 'I',
    PUNCTUATION = 'Z',
    UNKNOWN = 'X'
}

export const posTable = {
    [PoSValues.NOUN]: {'cs-CZ': 'podstatné jméno', 'en-US': 'noun'},
	[PoSValues.ADJECTIVE]: {'cs-CZ': 'přídavné jméno', 'en-US': 'adjective'},
	[PoSValues.PRONOUN]: {'cs-CZ': 'zájmeno', 'en-US': 'pronoun'},
	[PoSValues.NUMERAL]: {'cs-CZ': 'číslovka, nebo číselný výraz s číslicemi', 'en-US': 'numeral'},
	[PoSValues.VERB]: {'cs-CZ': 'sloveso', 'en-US': 'verb'},
	[PoSValues.ADVERB]: {'cs-CZ': 'příslovce', 'en-US': 'adverb'},
	[PoSValues.PREPOSITION]: {'cs-CZ': 'předložka', 'en-US': 'preposition'},
	[PoSValues.CONJUNCTION]: {'cs-CZ': 'spojka', 'en-US': 'conjunction'},
	[PoSValues.PARTICLE]: {'cs-CZ': 'částice', 'en-US': 'particle'},
	[PoSValues.INTERJECTION]: {'cs-CZ': 'citoslovce', 'en-US': 'interjection'},
	[PoSValues.PUNCTUATION]: {'cs-CZ': 'interpunkce', 'en-US': 'punctuation'},
    [PoSValues.UNKNOWN]: {'cs-CZ': 'neznámý nebo neurčený slovní druh', 'en-US': 'unknown or undetermined part of speech'}
};

// source: https://www.ling.upenn.edu/courses/Fall_2003/ling001/penn_treebank_pos.html
const pennTreebankLabels = {
    [PoSValues.CONJUNCTION]: 'CC',
    [PoSValues.NUMERAL]: 'CD',
    //DT	Determiner
    //EX	Existential there
    //FW	Foreign word
    [PoSValues.PREPOSITION]: 'IN',
    [PoSValues.ADJECTIVE]: 'J.*',
    //LS	List item marker
    //MD	Modal
    [PoSValues.NOUN]: 'N.*',
    //PDT	Predeterminer
    //POS	Possessive ending
    [PoSValues.PRONOUN]: 'PRP.*',
    [PoSValues.ADVERB]: 'R.*',
    [PoSValues.PARTICLE]: 'RP',
    //SYM	Symbol
    //TO	to
    [PoSValues.INTERJECTION]: 'UH', //	Interjection
    [PoSValues.VERB]: 'V.*'
    //WDT	Wh-determiner
    //WP	Wh-pronoun
    //WP$	Possessive wh-pronoun
    //WRB	Wh-adverb
};

const directPos:PosQueryExport = (pos) => pos;

const ppTagset:PosQueryExport = (pos) => `${pos.toUpperCase()}.+`;

const pennTreebank:PosQueryExport = (pos) => pennTreebankLabels[pos];


export function posTagsEqual(tag1:Array<string>, tag2:Array<string>):boolean {
    for (let i = 0; i < Math.max(tag1.length, tag2.length); i++) {
        if (tag1[i] !== tag2[i]) {
            return false;
        }
    }
    return true;
}


export const posQueryFactory = (fnName:string):PosQueryExport => {
    switch (fnName) {
        case 'ppTagset':
            return ppTagset;
        case 'pennTreebank':
            return pennTreebank;
        case 'directPos':
        default:
            return directPos;
    }
}

export function importQueryPos(s:string):string {
    return List.map(
        v => {
            if (['n', 'a', 'p', 'c', 'v', 'd', 'r', 'j', 't', 'i', 'z', 'x'].indexOf(v.toLowerCase()) > -1) {
                return v.toUpperCase();
            }
            throw new Error(`Invalid PoS value [${v}]`);
        },
        s.split(' ')
    ).join(' ');
}

/**

 */
export function importQueryPosWithLabel(s:string, postable:{[key:string]:{[lang:string]:string}}, appServices:IAppServices):PosItem {
    return pipe(
        s.split(' '),
        List.map(
            v => {
                if (['n', 'a', 'p', 'c', 'v', 'd', 'r', 'j', 't', 'i', 'z', 'x'].indexOf(v.toLowerCase()) > -1) {
                    const ident = v.toUpperCase();
                    return {
                        value: ident,
                        label: appServices.importExternalMessage(postable[ident])
                    };
                }
                throw new Error(`Invalid PoS value [${v}]`);
            }
        ),
        List.foldl(
            (acc, curr) => ({
                value: acc.value.concat([curr.value]),
                label: acc.label.concat([curr.label])
            }),
            {value: [], label: []}
        )
    );
}