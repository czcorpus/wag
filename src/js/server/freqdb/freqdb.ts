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

import { QueryMatch, QueryPoS } from '../../common/query';
import { IAppServices } from '../../appServices';


export interface IFreqDB {

    findQueryMatches(appServices:IAppServices, word:string, minFreq:number):Observable<Array<QueryMatch>>;

    getSimilarFreqWords(appServices:IAppServices, lemma:string, pos:Array<QueryPoS>, rng:number):Observable<Array<QueryMatch>>;

    getWordForms(appServices:IAppServices, lemma:string, pos:Array<QueryPoS>):Observable<Array<QueryMatch>>;
}
