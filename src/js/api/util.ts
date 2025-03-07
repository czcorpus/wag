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
import { map } from 'rxjs/operators';

import { DataApi } from '../types.js';

/**
 * callWithExtraVal calls a DataApi<T, U> instance while also passing through
 * addional value V. This can be used to create Observable pipes where we
 * need to pass values not returned by the API but needed by one of subsequent
 * operations (e.g. other APIs).
 * @param api
 * @param args API call arguments
 * @param passThrough
 */
export const callWithExtraVal = <T, U, V>(api:DataApi<T, U>, tileId:number, args:T, passThrough:V):Observable<[U, V]> => {
    return api.call(tileId, args).pipe(
        map(v => [v, passThrough] as [U, V])
    );
}