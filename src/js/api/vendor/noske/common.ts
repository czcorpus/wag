/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import { pipe, List } from "cnc-tskit";

export interface HTTPApiResponse {
    api_version:string;
}

export function processConcId(concId: string):Array<string> {
    return pipe(
        concId.split('&'),
        List.map(v => v.split('=').slice(0, 2)),
        List.filter(([k, v]) => k === 'q'),
        List.map(([,v]) => decodeURIComponent(v.replace(/\++/g, ' ')))
    )
}