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

import { ajax$ } from '../../../page/ajax';
import { DataApi, HTTPHeaders } from '../../../types';
import { HTTP } from 'cnc-tskit';


export interface WordListArgs {
	corpname:string;
	wlattr:string;
	wlpat:string;
	wlminfreq:number;
	wlnums:'frq';
	wltype:'simple';
	wlsort:'f';
	include_nonwords:0;
	format:'json';
}

export interface WordListResponse {
	Items:Array<{ freq: number; str: string }>;
}

/**
 *
 */
export class WordListAPI implements DataApi<WordListArgs, WordListResponse> {

	private readonly url:string;

    private readonly customHeaders:HTTPHeaders;

	constructor(url:string, customHeaders?:HTTPHeaders) {
		this.url = url;
		this.customHeaders = customHeaders || {};
	}

	call(args:WordListArgs):Observable<WordListResponse> {

		return ajax$<WordListResponse>(
			HTTP.Method.GET,
			this.url + '/wordlist',
			args,
			{headers: this.customHeaders}
		);
	}
}