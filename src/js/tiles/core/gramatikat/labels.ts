/*
 * Copyright 2026 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2026 Department of Linguistics,
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

import { GramatikatCatSet } from './api.js';

export interface LabelGenerator {
    (tag: string, tagElm?: number): string;
}

const caseTagToLabel: LabelGenerator = (tag, tagElm = 0): string => {
    return (
        {
            1: 'gramatikat__nominative',
            2: 'gramatikat__genitive',
            3: 'gramatikat__dative',
            4: 'gramatikat__accusative',
            5: 'gramatikat__vocative',
            6: 'gramatikat__locative',
            7: 'gramatikat__instrumental',
        }[tag.split('-')[tagElm]] || '??'
    );
};

const genderTagToLabel: LabelGenerator = (tag, tagElm = 0): string => {
    return (
        {
            F: 'gramatikat__feminine',
            I: 'gramatikat__masculine_inanimate',
            M: 'gramatikat__masculine_animate',
            N: 'gramatikat__neuter',
        }[tag.split('-')[tagElm]] || '??'
    );
};

const tenseTagToLabel: LabelGenerator = (tag, tagElm = 0): string => {
    return (
        {
            P: 'gramatikat__present',
            R: 'gramatikat__past',
            F: 'gramatikat__future',
            B: 'B',
            Q: 'Q',
        }[tag.split('-')[tagElm]] || '??'
    );
};

const numberTagToLabel: LabelGenerator = (tag, tagElm = 0): string => {
    return (
        {
            S: 'gramatikat__singular',
            P: 'gramatikat__plural',
            D: 'gramatikat__dual',
        }[tag.split('-')[tagElm]] || '??'
    );
};

const polarityTagToLabel: LabelGenerator = (tag, tagElm = 0): string => {
    return (
        {
            A: 'gramatikat__affirmative',
            N: 'gramatikat__negative',
        }[tag.split('-')[tagElm]] || '??'
    );
};

const degreeTagToLabel: LabelGenerator = (tag, tagElm = 0): string => {
    return (
        {
            '1': 'gramatikat__degree_1',
            '2': 'gramatikat__degree_2',
            '3': 'gramatikat__degree_3',
        }[tag.split('-')[tagElm]] || '??'
    );
};

const aspectTagToLabel: LabelGenerator = (tag, tagElm = 0): string => {
    return (
        {
            I: 'gramatikat__imperfective',
            P: 'gramatikat__perfective',
            B: 'gramatikat__biaspectual',
        }[tag.split('-')[tagElm]] || '??'
    );
};

const moodTagToLabel: LabelGenerator = (tag, tagElm = 0): string => {
    return (
        {
            I: 'gramatikat_indicative',
            D: 'gramatikat_directive',
            O: 'gramatikat_passive',
            F: 'gramatikat_infinitive',
            T: 'gramatikat_transgressive',
            C: 'gramatikat_conditional',
        }[tag.split('-')[tagElm]] || '??'
    );
};

export const gramPropTolabelGen = (prop: GramatikatCatSet): LabelGenerator => {
    switch (prop) {
        case 'aspect':
            return aspectTagToLabel;
        case 'case':
            return caseTagToLabel;
        case 'degree':
            return degreeTagToLabel;
        case 'gender':
            return genderTagToLabel;
        case 'mood':
            return moodTagToLabel;
        case 'number':
            return numberTagToLabel;
        case 'person':
            return (s) => s; // TODO
        case 'polarity':
            return polarityTagToLabel;
        case 'tense':
            return tenseTagToLabel;
        case 'voice':
            return (s) => s; // TODO
        default:
            return (s) => s;
    }
};
