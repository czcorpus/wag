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
import { UserConf } from '../../conf';
import { QueryPoS } from '../../common/query';

/**
 * The format is intentionally based on KonText log format to make
 * ETL and subsequent analysis easier.
 */
export interface LogRecord {
    user_id:number;
    proc_time:number;
    date:string;
    action:string;
    request:{
        HTTP_X_FORWARDED_FOR:string;
	    HTTP_USER_AGENT:string;
	    HTTP_REMOTE_ADDR:string;
	    REMOTE_ADDR:string;
    };
    params:{
        uiLang:string;
        queryType:string;
        query1Lang:string;
        query2Lang:string|null;
        queryPos:QueryPoS|null;
        query1:string|null;
        query2:string|null;
        error:string|null;
   };
   pid:number;
   settings:{};
}

export interface ILogQueue {
    put(rec:LogRecord):Observable<number>;
}