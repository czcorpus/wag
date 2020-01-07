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
import * as Redis from 'ioredis';
import { Observable } from 'rxjs';
import { share } from 'rxjs/operators';
import { ILogQueue, LogRecord } from './abstract';
import { LogQueueConf } from '../../conf';


export class RedisLogQueue implements ILogQueue {

    private readonly client:Redis.Redis;

    private readonly queueKey:string;

    constructor(conf:LogQueueConf) {
        this.client = new Redis({
            port: conf.port,
            host: conf.host,
            db: conf.db
        });
        this.queueKey = conf.key;
    }

    put(value:LogRecord):Observable<number> {
        return new Observable<number>(
            (observer) => {
                this.client.rpush(this.queueKey, JSON.stringify(value)).then(
                    (res) => {
                        observer.next(res);
                        observer.complete();
                    },
                    (err) => {
                        observer.error(err);
                    }
                );
            }
        ).pipe(
            share()
        );
    }
}