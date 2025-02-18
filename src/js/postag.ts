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

/**
 * This module contains miscellaneous definitions and utilities for
 * working with Part of Speech tags. In WaG we're interested only
 * in the actual "part of speech" part (i.e. no other token meta-information
 * is used in WaG).
 */

import { IAppServices } from './appServices.js';
import { pipe, List, Dict, tuple } from 'cnc-tskit';
import { MainPosAttrValues } from './conf/index.js';

/**
 * PosQueryExport exports a normalized part of speech value
 * (e.g. N, V, A) to a query form able to be inserted as part
 * of a query (e.g. 'N.*', 'V.*', 'A.*). The concrete solution
 * depends on actual tagset.
 */
interface PosQueryExport {
    (pos:string):string;
}

/**
 * A PoS description of a single-word token
 */
export interface PosItem {
    label:string;
    value:string;
}

/**
 * A list of common single-letter
 * codes for different part of speech types.
 */
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
    FOREIGN = 'F',
    UNKNOWN = 'X',
    SEGMENT = 'S',
    ABBREVIATION = 'B'
}

/**
 * A list of universal dependencies
 * codes for different part of speech types.
 * https://universaldependencies.org/u/pos/
 */
export enum UPoSValues {
    NOUN = 'NOUN',
    PROPER_NOUN = 'PROPN',
    ADJECTIVE = 'ADJ',
    PRONOUN = 'PRON',
    NUMERAL = 'NUM',
    VERB = 'VERB',
    ADVERB = 'ADV',
    PARTICLE = 'PART',
    INTERJECTION = 'INTJ',
    PUNCTUATION = 'PUNCT',
    ADPOSITION = 'ADP',
    AUXILIARY = 'AUX',
    COORD_CONJUNCTION = 'CCONJ',
    SUBORD_CONJUNCTION = 'SCONJ',
    DETERMINER = 'DET',
    SYMBOL = 'SYM',
    OTHER = 'X',
}

/**
 * A mapping between single-code part of speech
 * codes and their respective labels in different
 * languages.
 */

const posTable = {
    [PoSValues.NOUN]: {
        'cs-CZ': 'podstatné jméno',
        'en-US': 'noun'
    },
	[PoSValues.ADJECTIVE]: {
        'cs-CZ': 'přídavné jméno',
        'en-US': 'adjective'},
	[PoSValues.PRONOUN]: {
        'cs-CZ': 'zájmeno',
        'en-US': 'pronoun'
    },
	[PoSValues.NUMERAL]: {
        'cs-CZ': 'číslovka, nebo číselný výraz s číslicemi',
        'en-US': 'numeral'
    },
	[PoSValues.VERB]: {
        'cs-CZ': 'sloveso',
        'en-US': 'verb'
    },
	[PoSValues.ADVERB]: {
        'cs-CZ': 'příslovce',
        'en-US': 'adverb'
    },
	[PoSValues.PREPOSITION]: {
        'cs-CZ': 'předložka',
        'en-US': 'preposition'
    },
	[PoSValues.CONJUNCTION]: {
        'cs-CZ': 'spojka',
        'en-US': 'conjunction'
    },
	[PoSValues.PARTICLE]: {
        'cs-CZ': 'částice',
        'en-US': 'particle'
    },
	[PoSValues.INTERJECTION]: {
        'cs-CZ': 'citoslovce',
        'en-US': 'interjection'
    },
	[PoSValues.PUNCTUATION]: {
        'cs-CZ': 'interpunkce',
        'en-US': 'punctuation'
    },
    [PoSValues.FOREIGN]: {
        'cs-CZ': 'cizí slovo',
        'en-US': 'foreign word'
    },
    [PoSValues.ABBREVIATION]: {
        'cs-CZ': 'zkratka',
        'en-US': 'abbreviation'
    },
    [PoSValues.SEGMENT]: {
        'cs-CZ': 'segment',
        'en-US': 'segment'
    },
    [PoSValues.UNKNOWN]: {
        'cs-CZ': 'neznámý nebo neurčený slovní druh',
        'en-US': 'unknown or undetermined part of speech'
    }
};

/**
 * A mapping between universal dependenciese part of speech
 * codes and their respective labels in different
 * languages.
 */
const uposTable = {
    [UPoSValues.NOUN]: {
        'cs-CZ': 'podstatné jméno',
        'en-US': 'noun'
    },
    [UPoSValues.PROPER_NOUN]: {
        'cs-CZ': 'vlastní jméno',
        'en-US': 'proper noun'
    },
	[UPoSValues.ADJECTIVE]: {
        'cs-CZ': 'přídavné jméno',
        'en-US': 'adjective'},
	[UPoSValues.PRONOUN]: {
        'cs-CZ': 'zájmeno',
        'en-US': 'pronoun'
    },
	[UPoSValues.NUMERAL]: {
        'cs-CZ': 'číslovka, nebo číselný výraz s číslicemi',
        'en-US': 'numeral'
    },
	[UPoSValues.VERB]: {
        'cs-CZ': 'sloveso',
        'en-US': 'verb'
    },
	[UPoSValues.ADVERB]: {
        'cs-CZ': 'příslovce',
        'en-US': 'adverb'
    },
	[UPoSValues.ADPOSITION]: {
        'cs-CZ': 'předložka',
        'en-US': 'preposition'
    },
	[UPoSValues.COORD_CONJUNCTION]: {
        'cs-CZ': 'spojka souřadná',
        'en-US': 'coordinating conjunction'
    },
    [UPoSValues.SUBORD_CONJUNCTION]: {
        'cs-CZ': 'spojka podřadná',
        'en-US': 'subordinating conjunction'
    },
	[UPoSValues.PARTICLE]: {
        'cs-CZ': 'částice',
        'en-US': 'particle'
    },
	[UPoSValues.INTERJECTION]: {
        'cs-CZ': 'citoslovce',
        'en-US': 'interjection'
    },
	[UPoSValues.PUNCTUATION]: {
        'cs-CZ': 'interpunkce',
        'en-US': 'punctuation'
    },
    [UPoSValues.AUXILIARY]: {
        'cs-CZ': 'pomocné sloveso',
        'en-US': 'auxiliary'
    },
    [UPoSValues.DETERMINER]: {
        'cs-CZ': 'determiner',
        'en-US': 'determiner'
    },
    [UPoSValues.SYMBOL]: {
        'cs-CZ': 'symbol',
        'en-US': 'symbol'
    },
    [UPoSValues.OTHER]: {
        'cs-CZ': 'neznámý nebo neurčený slovní druh',
        'en-US': 'unknown or undetermined part of speech'
    },
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


/**
 * Test two multi-word PoS tags whether they are equal.
 * E.g. ['A', 'N'] is equal to ['A', 'N'] but
 * ['A', 'A', 'N'] is not equal ['A', 'N']
 */
export function posTagsEqual(tag1:Array<string>, tag2:Array<string>):boolean {
    for (let i = 0; i < Math.max(tag1.length, tag2.length); i++) {
        if (tag1[i] !== tag2[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Returns a function producing proper PoS tag query
 * based on provided PoS tag type.
 *
 * Currently supported:
 *  - Prague positional tagset (ppTagset)
 *  - Penn Treebank (pennTreebank)
 *  - direct (directPos)
 */
export function posQueryFactory(fnName:string):PosQueryExport {
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

/**
 * Imports a string-encoded, possibly multi-word-based
 * PoS encoding (e.g. "A A N") by validating individual
 * values. In normal case the returned value is equal
 * to the entered one.
 */
export function importQueryPos(s:string, posAttr:MainPosAttrValues):string {
    const usedValues = posAttr === 'pos' ? PoSValues : UPoSValues;
    return List.map(
        v => {
            if (Object.values<string>(usedValues).indexOf(v.toUpperCase()) > -1) {
                return v.toUpperCase();
            }
            throw new Error(`Invalid PoS value [${v}]`);
        },
        s.split(' ')
    ).join(' ');
}

/**
 * Imports a string-encoded, possibly multi-word-based PoS
 * along with localized label.
 */
export function importQueryPosWithLabel(s:string, posAttr:MainPosAttrValues, appServices:IAppServices):Array<PosItem> {
    const labels = posAttr === 'pos' ? posTable : uposTable;
    const usedValues = pipe(
        Object.entries(posAttr === 'pos' ? PoSValues : UPoSValues),
        List.map(([k, v]) => tuple(v, k)),
        Dict.fromEntries()
    );
    return s ?
        pipe(
            s.split(' '),
            List.map(
                v => {
                    if (Dict.hasKey(v.toUpperCase(), usedValues)) {
                        const ident = v.toUpperCase();
                        return {
                            value: ident,
                            label: appServices.importExternalMessage(labels[ident])
                        };
                    }
                    throw new Error(`Invalid PoS value [${v}]`);
                }
            ),
            List.foldl(
                (acc, curr) => acc.concat([{
                    value: curr.value,
                    label: curr.label
                }]),
                [] as Array<PosItem>
            )
        ) :
        [{value: null, label: ''}];
}