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

import { HTTPAction } from "../routes/actions";
import { IActionWriter } from "./abstract";
import { Request } from 'express';
import { UserConf } from "../../conf";
import { List } from "cnc-tskit";


export function logAction(actionWriter:IActionWriter, req:Request, httpAction:HTTPAction, datetime:string, userId:number|null, userConf:UserConf) {
    actionWriter.write({
        userId: userId,
        datetime: datetime,
        queryType: userConf.queryType,
        request: {
            origin: req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            referer: req.headers['referer']
        },
        lang1: userConf.query1Domain,
        lang2: userConf.query1Domain,
        isQuery: [HTTPAction.SEARCH, HTTPAction.COMPARE, HTTPAction.TRANSLATE, HTTPAction.EMBEDDED_SEARCH].includes(httpAction),
        hasPosSpecification: List.some(query => List.size(query.pos) > 0, userConf.queries)
    })
}
