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
import { ConcResponse, Line, IConcordanceApi, ViewMode } from '../../../abstract/concordance';
import { XMLParser, XMLNode } from '../../../../page/xml';
import { ConcordanceMinState } from '../../../../models/tiles/concordance';
import { ajax$, ResponseType } from '../../../../page/ajax';
import { QueryMatch } from '../../../../query';
import { FCS1ExplainAPI, FCS1ExplainResponse } from './explain';
import { IApiServices } from '../../../../appServices';


/**
 *
 */
export interface FCS1Args {
    query:string;
    startRecord?:number;
    maximumRecords?:number;
    operation:'searchRetrieve';
    recordPacking:'xml';
    recordSchema:'http://clarin.eu/fcs/resource';
    'x-cmd-context'?:string;
    'x-fcs-context'?:string;
}

/**
 *
 */
interface FCSLine {
    left:Array<string>;
    kwic:Array<string>;
    right:Array<string>;
}

/**
 *
 */
function importRecord(node:XMLNode, lineNum:number):Line {
    const recordData = node.findChildRecursive(item => item.name === 'hits:Result', new XMLNode());
    let key = 'left';
    const line:FCSLine = {left: [], kwic: [], right: []};
    recordData.children.forEach((item, i) => {
        if (typeof item === 'string') {
            line[key].push(item.trim());

        } else {
            if (item.name === 'hits:Hit') {
                line.kwic.push(item.textContent());
                key = 'right';
            }
        }
    });

    return {
        left: line.left.map(v => ({type: 'str', str: v})),
        kwic: line.kwic.map(v => ({type: 'str', str: v})),
        right: line.right.map(v => ({type: 'str', str: v})),
        toknum: lineNum
    };
}

/**
 *
 */
function importDiagnostics(root:XMLNode):string|undefined {
    const srch = root.findChild(v => v.name === 'sru:diagnostics');
    if (srch) {
        const srch2 = srch.findChild(v => v.name === 'diag:diagnostic');
        if (srch2) {
            const msgElm = srch2.findChild(v => v.name === 'diag:message', new XMLNode());
            const detailsElm = srch2.findChild(v => v.name === 'diag:details', new XMLNode());
            return `${msgElm.textContent()}. ${detailsElm.textContent()}`;
        }
    }
    return undefined;
}

/**
 *
 */
function importResponse(root:XMLNode, query:string, corpName:string, subcorpName:string):ConcResponse {
    const ans = {
        query: query,
        corpName: corpName,
        subcorpName: subcorpName,
        lines: [],
        concsize: -1,
        arf: -1,
        ipm: -1,
        messages: [],
        concPersistenceID: null
    };

    const respNode = root.findChild(v => v.name === 'sru:searchRetrieveResponse');
    if (respNode) {
        const numRecNode = respNode.findChild(v => v.name === 'sru:numberOfRecords', new XMLNode());
        ans.concsize = parseInt(numRecNode.textContent());
        if (isNaN(ans.concsize)) {
            ans.concsize = -1;
        }

        // try diagnostics
        const diag = importDiagnostics(respNode);
        if (diag) {
            throw new Error(diag);
        }

        const recordsRootNode = respNode.findChild(v => v.name === 'sru:records');
        ans.lines = recordsRootNode ?
            recordsRootNode.findAllChildren(v => v.name === 'sru:record').map(importRecord) :
            [];

    } else {
        throw new Error('Unable to parse FCS response');
    }
    return ans;
}

/**
 *
 */
export class FCS1SearchRetrieveAPI implements IConcordanceApi<FCS1Args> {

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

    getSourceDescription(tileId:number, lang:string, corpname:string):Observable<FCS1ExplainResponse> {
        return this.srcInfoApi.call({
            tileId: tileId,
            uiLang: lang,
            'x-fcs-endpoint-description': 'true' // TODO
        });
    }

	call(args:FCS1Args):Observable<ConcResponse> {
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