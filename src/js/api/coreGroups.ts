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

export enum CoreApiGroup {

	/**
	 * Datamuse.com API
	 */
	DATAMUSE = 'datamuse',

	/**
	 * Elasticsearch API
	 */
	ELASTICSEARCH = 'elasticsearch',

	/**
	 * Clarin FCS Core 1 functions
	 */
	FCS_V1 = 'fcsv1',

	/**
	 * KonText API
	 */
	KONTEXT = 'kontext',
	KONTEXT_LIVEATTRS = 'kontextLiveattrs',  // kontext with liveattrs support
	KONTEXT_API = 'kontextApi',
	KONTEXT_API_LIVEATTRS = 'kontextApiLiveattrs',  // kontext api with liveattrs support

	/**
	 * Leipzig Corpora Collection
	 */
	LCC = 'lcc',

	/**
	 * No Sketch Engine
	 */
	NOSKE = 'noske',

	/**
	 * Treq (CNC app)
	 */
	TREQ = 'treq',

	/**
	 * Mquery (CNC app)
	 */
	MQUERY = 'mquery',

	/**
	 * Embedded API functions
	 */
	WDGLANCE = 'wdglance',

	WIKTIONARY = 'wiktionary'
}

export function supportedCoreApiGroups() {
	return Object.keys(CoreApiGroup).map(k => CoreApiGroup[k]);
}