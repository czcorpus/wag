/*
 * Copyright 2021 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2021 Institute of the Czech National Corpus,
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

import { Request } from 'express';
import { List } from 'cnc-tskit';
import { HTTPAction } from '../../page/actions.js';
import { IActionWriter } from './abstract.js';
import { UserConf } from '../../conf/index.js';
import { Observable, of as rxOf } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActionLogRecord } from '../actionLog/abstract.js';

interface LogActionArgs {
    actionWriter: IActionWriter;
    req: Request;
    httpAction: HTTPAction;
    datetime: string;
    userId: number | null;
    userConf: UserConf | null;
    isMobileClient: boolean | null;
    hasMatch: boolean | null;
}

function extractRemoteIP(req: Request): string {
    const xff = req.headers['x-forwarded-for'];
    if (xff != undefined) {
        return Array.isArray(xff) ? xff[0] : xff;
    }
    return req.socket.remoteAddress;
}

export function logAction({
    actionWriter,
    req,
    httpAction,
    datetime,
    userId,
    userConf,
    isMobileClient,
    hasMatch,
}: LogActionArgs): Observable<ActionLogRecord> {
    return rxOf({
        action: httpAction.substring(1, httpAction.length - 1),
        userId,
        datetime,
        queryType: userConf ? userConf.queryType : null,
        request: {
            origin: extractRemoteIP(req),
            userAgent: req.headers['user-agent'],
            referer: req.headers['referer'],
        },
        applicationId: userConf ? userConf.applicationId : null,
        lang2:
            userConf && httpAction === HTTPAction.TRANSLATE
                ? userConf.translatLanguage
                : null,
        isQuery: List.some(
            (a) => a === httpAction,
            [
                HTTPAction.SEARCH,
                HTTPAction.COMPARE,
                HTTPAction.TRANSLATE,
                HTTPAction.EMBEDDED_SEARCH,
            ]
        ),
        isMobileClient,
        hasMatch,
        hasPosSpecification: userConf
            ? List.some((query) => List.size(query.pos) > 0, userConf.queries)
            : false,
    }).pipe(
        tap((item) => {
            actionWriter.write(item);
        })
    );
}
