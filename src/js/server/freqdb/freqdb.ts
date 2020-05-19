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
import { Observable } from 'rxjs';

import { QueryMatch } from '../../common/query/index';
import { IAppServices } from '../../appServices';
import { SourceDetails } from '../../common/types';


export interface IFreqDB {

    findQueryMatches(appServices:IAppServices, word:string, minFreq:number):Observable<Array<QueryMatch>>;

    getSimilarFreqWords(appServices:IAppServices, lemma:string, pos:Array<string>, rng:number):Observable<Array<QueryMatch>>;

    /**
     * Find words with similar frequency as the one specified by lemma and pos.
     * The 'pos' argument specifies possibly multi-word PoS information (that is why
     * we use array type).
     */
    getWordForms(appServices:IAppServices, lemma:string, pos:Array<string>):Observable<Array<QueryMatch>>;

    getSourceDescription(uiLang:string, corpname:string):Observable<SourceDetails>;
}
