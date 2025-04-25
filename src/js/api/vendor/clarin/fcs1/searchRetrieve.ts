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
import { HTTP } from 'cnc-tskit';
import { XMLParser } from '../../../../page/xml.js';
import { ajax$, ResponseType } from '../../../../page/ajax.js';
import { QueryMatch } from '../../../../query/index.js';
import { FCS1ExplainAPI, FCS1ExplainResponse } from './explain.js';
import { IApiServices } from '../../../../appServices.js';
import { ResourceApi } from '../../../../types.js';
import { ConcordanceMinState, ConcResponse, FCS1Args, importResponse, ViewMode } from './common.js';
import { Backlink } from '../../../../page/tile.js';
import { IDataStreaming } from '../../../../page/streaming.js';


/**
 *
 */
export class FCS1SearchRetrieveAPI implements ResourceApi<FCS1Args, ConcResponse> {

    private readonly url:string;

    private readonly parser:XMLParser;

    private readonly apiServices:IApiServices;

    private readonly srcInfoApi:FCS1ExplainAPI;

    constructor(url:string, apiServices:IApiServices) {
        this.url = url;
        this.apiServices = apiServices;
        this.parser = new XMLParser();
        this.srcInfoApi = new FCS1ExplainAPI(url, apiServices);
    }

    getSupportedViewModes():Array<ViewMode> {
        return [ViewMode.KWIC];
    }

    mkMatchQuery(lvar:QueryMatch, generator:[string, string]):string {
        return lvar.word;
    }

    stateToArgs(state:ConcordanceMinState, lvar:QueryMatch, lvarIdx:number, otherLangCql:string):FCS1Args {
        return {
            operation: 'searchRetrieve',
            query: lvar.lemma,
            recordPacking: 'xml',
            recordSchema: 'http://clarin.eu/fcs/resource',
            startRecord: state.pageSize * (state.concordances[lvarIdx].loadPage - 1) + 1,
            maximumRecords: state.pageSize ? state.pageSize : undefined,
            'x-cmd-context': state.corpname ? state.corpname : undefined
        };
    }

    getSourceDescription(streaming:IDataStreaming, tileId:number, lang:string, corpname:string):Observable<FCS1ExplainResponse> {
        return this.srcInfoApi.call(streaming, tileId, {
            tileId: tileId,
            uiLang: lang,
            'x-fcs-endpoint-description': 'true' // TODO
        });
    }

    getBacklink(queryId:number, subqueryId?:number):Backlink|null {
        return null;
    }

	call(streaming:IDataStreaming, tileId:number, args:FCS1Args):Observable<ConcResponse> {
		return ajax$(
            HTTP.Method.GET,
            this.url,
            args,
            {
                headers: this.apiServices.getApiHeaders(this.url),
                withCredentials: true,
                responseType: ResponseType.TEXT
            }

        ).pipe(
            map(
                (xml:string) => {
                    return importResponse(
                        this.parser.parse(xml),
                        args.query,
                        args['x-cmd-context'] || '',
                        ''
                    );
                }
            )
        );
    }

}