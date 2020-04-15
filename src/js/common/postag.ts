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

import { PoSValues, QueryPoS } from './query';


export interface PosQueryExport {
    (pos:QueryPoS):string;
}

const directPos:PosQueryExport = (pos) => pos;

const ppTagset:PosQueryExport = (pos) => `${pos.toUpperCase()}.+`;


const pennTreebank:PosQueryExport = (pos) => {
    // source: https://www.ling.upenn.edu/courses/Fall_2003/ling001/penn_treebank_pos.html
    return {
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
    }[pos];
};


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