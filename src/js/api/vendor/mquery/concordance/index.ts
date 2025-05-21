/*
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2025 Institute of the Czech National Corpus,
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

import { EMPTY, map, Observable } from 'rxjs';

import { QueryMatch } from '../../../../query/index.js';
import { DataApi } from '../../../../types.js';
import { IAppServices } from '../../../../appServices.js';
import { ConcResponse, ViewMode } from './common.js';
import { Backlink, BacklinkConf } from '../../../../page/tile.js';
import { Dict, HTTP, List, pipe, tuple } from 'cnc-tskit';
import urlJoin from 'url-join';
import { IDataStreaming } from '../../../../page/streaming.js';


export interface ConcApiArgs {
    corpusName:string;
    q:string;
    queryIdx:number;
    maxRows:number;
    rowsOffset:number;
    contextWidth:number;
    contextStruct:string;
}

// ------------------------------

/**
 * @todo
 */
export class MQueryConcApi implements DataApi<ConcApiArgs, [ConcResponse, number]> {

    private readonly apiUrl:string;

    private readonly appServices:IAppServices;

    private readonly backlinkConf:BacklinkConf;

    constructor(apiUrl:string, appServices:IAppServices, backlinkConf:BacklinkConf) {
        this.apiUrl = apiUrl;
        this.appServices = appServices;
        this.backlinkConf = backlinkConf;
    }

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        if (this.backlinkConf) {
            return {
                queryId,
                subqueryId,
                label: this.backlinkConf.label || 'KonText',
            };
        }
        return null;
    }

    mkMatchQuery(lvar:QueryMatch, generator:[string, string]):string {
        return '';
    }

    /**
     * Note: the first item will be set as an initial one
     */
    getSupportedViewModes():Array<ViewMode> {
        return [ViewMode.KWIC, ViewMode.SENT];
    }

    private prepareArgs(queryArgs:ConcApiArgs):string {
        return pipe(
            {
                q: queryArgs.q,
                maxRows: queryArgs.maxRows,
                rowsOffset: queryArgs.rowsOffset,
                contextWidth: queryArgs.contextWidth,
                contextStruct: queryArgs.contextStruct || undefined
            },
            Dict.filter((v,) => v !== undefined && v !== null),
            Dict.toEntries(),
            List.map(([v0, v1]) => `${v0}=${encodeURIComponent(v1)}`)
        ).join('&')
    }

    call(streaming:IDataStreaming|null, tileId:number, queryIdx:number, args:ConcApiArgs):Observable<[ConcResponse, number]> {
        if (streaming) {
            return streaming.registerTileRequest<ConcResponse>(
                {
                    tileId,
                    queryIdx,
                    method: HTTP.Method.GET,
                    url: args ?
                        urlJoin(this.apiUrl, 'concordance', args.corpusName) + `?${this.prepareArgs(args)}` :
                        '',
                    body: {},
                    contentType: 'application/json',
                }
            ).pipe(
                map(
                    resp => tuple(resp, queryIdx)
                )
            )

        } else {
            return EMPTY
        }
    }

    requestBacklink(args:ConcApiArgs):URL {
        const url = new URL(urlJoin(this.backlinkConf.url, 'create_view'));
        url.searchParams.set('corpname', args.corpusName);
        url.searchParams.set('q', `q${args.q}`);
        return url;
    }
}