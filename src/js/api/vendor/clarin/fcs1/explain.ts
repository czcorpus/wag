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
import { DataApi, SourceDetails } from '../../../../types.js';
import { HTTP } from 'cnc-tskit';
import { XMLParser, XMLNode } from '../../../../page/xml.js';
import { ajax$, ResponseType } from '../../../../page/ajax.js';
import { IApiServices } from '../../../../appServices.js';
import { IDataStreaming } from '../../../../page/streaming.js';


export interface FCS1ExplainArgs {
    tileId:number;
    uiLang:string;
    'x-fcs-endpoint-description': 'true'|'false';
}


export interface FCS1ExplainResponse extends SourceDetails {
    version:string;
    title:string;
    description:string;
    author:string;
    resourceDescription:string;
    supportedIndices:Array<{name:string; title:string}>;
}


const importResponse = (tileId:number, lang:string) => (root:XMLNode):FCS1ExplainResponse => {
    const ans:FCS1ExplainResponse = {
        tileId: tileId,
        title: '?',
        description: '',
        author: '',
        resourceDescription: '',
        version: '?',
        supportedIndices: Array<{name:string; title:string}>()
    };

    const dbInfoElm = root.findChildRecursive(v => v.name === 'zr:databaseInfo');
    if (dbInfoElm) {
        ans.version = dbInfoElm.findChild(v => v.name === 'sru:version', new XMLNode()).textContent();
        ans.title = dbInfoElm.findChild(v => v.name === 'zr:title', new XMLNode()).textContent();
        ans.description = dbInfoElm.findChild(v => v.name === 'zr:description' && v.attributes['lang'] === lang, new XMLNode()).textContent();
        if (!ans.description) {
            ans.description = dbInfoElm.findChild(v => v.name === 'zr:description', new XMLNode()).textContent();
        }
        ans.author = dbInfoElm.findChild(v => v.name === 'zr:author', new XMLNode()).textContent();
    }

    const extraElm = dbInfoElm.findChildRecursive(v => v.name === 'sruResponse:extraResponseData');
    if (extraElm) {
        ans.resourceDescription = extraElm.findChildRecursive(v => v.name === 'ed:Description',new XMLNode()).textContent();
    }

    const indexInfoElm = root.findChildRecursive(v => v.name === 'zr:indexInfo');
    if (indexInfoElm) {
        ans.supportedIndices = (indexInfoElm.findAllChildren(v => v.name === 'zr:index').map(
            (item) => {
                let name = item.findChildRecursive(v => v.name === 'zr:name', new XMLNode()).textContent();
                let title = item.findChild(v => v.name === 'zr:title' && v.attributes['lang'] === lang, new XMLNode()).textContent();
                if (!title) {
                    title = item.findChild(v => v.name === 'zr:title', new XMLNode()).textContent();
                }
                return {name: name, title: title};
            }
        ));
    }

    return ans;
}


export class FCS1ExplainAPI implements DataApi<FCS1ExplainArgs, FCS1ExplainResponse> {

    private readonly url:string;

    private readonly parser:XMLParser;

    private readonly apiServices:IApiServices;

    constructor(url:string, apiServices:IApiServices) {
        this.url = url;
        this.apiServices = apiServices;
        this.parser = new XMLParser();
    }

	call(streaming:IDataStreaming, tileId:number, queryIdx:number, args:FCS1ExplainArgs):Observable<FCS1ExplainResponse> {
        return ajax$(
            HTTP.Method.GET,
            this.url,
            {
                'x-fcs-endpoint-description': args['x-fcs-endpoint-description']
            },
            {
                headers: this.apiServices.getApiHeaders(this.url),
                withCredentials: true,
                responseType: ResponseType.TEXT
            }

        ).pipe(
            map(
                (xmlSrc:string) => this.parser.parse(xmlSrc)
            ),
            map(importResponse(args.tileId, args.uiLang))
        );
    }

}