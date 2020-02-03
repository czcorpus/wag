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
import { WordTranslation } from '../api/abstract/translations';
import { BacklinkWithArgs } from '../tile';


interface TranslationsModelCoreState {
    minItemFreq:number;
    lang1:string;
    lang2:string;
}


/**
 * TranslationsModelState is a general state for core and core-derived translation tiles.
 * The 'T' generic parameter specifies a format for backlink page arguments to a possible
 * original application which produces the results.
 */
export interface TranslationsModelState<T> extends TranslationsModelCoreState {
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

    backLink:BacklinkWithArgs<T>|null;

    maxNumLines:number;
}


/**
 * TranslationSubset specifies a subset of packages/subcorpora we
 * search the translation in.
 */
export interface TranslationSubset {
    ident:string;
    label:string;
    packages:Array<string>;
    translations:Array<WordTranslation>;
}

/**
 * TranslationsSubsetsModelState is a state for package/subcorpus based
 * translation tile where we show how the translation differs when using
 * different data as sources for translation.
 */
export interface TranslationsSubsetsModelState extends TranslationsModelCoreState {
    isBusy:boolean;
    error:string;
    isAltViewMode:boolean;
    subsets:Array<TranslationSubset>;
    highlightedRowIdx:number;
    maxNumLines:number;
    colorMap:{[k:string]:string};
}