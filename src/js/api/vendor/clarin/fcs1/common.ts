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

import { XMLNode } from '../../../../page/xml.js';


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

export enum ViewMode {
    KWIC = 'kwic',
    SENT = 'sen',
    ALIGN = 'align'
}

export type LineElementType = ''|'strc'|'attr'|'str'|'coll';

export interface LineElement {
    type:LineElementType;
    str:string;
    mouseover?:Array<string>;
}

export interface Line {
    left:Array<LineElement>;
    kwic:Array<LineElement>;
    right:Array<LineElement>;
    align?:Array<{
        left:Array<LineElement>;
        kwic:Array<LineElement>;
        right:Array<LineElement>;
        toknum:number;
    }>;
    toknum:number;
    metadata?:Array<{label:string; value:string}>;
    interactionId?:string;
    isHighlighted?:boolean;
}

export interface ConcResponse {
    query:string;
    corpName:string;
    primaryCorp?:string;
    subcorpName:string;
    lines:Array<Line>;
    concsize:number;
    arf:number;
    ipm:number;
    messages:Array<[string, string]>;
    concPersistenceID:string;
    kwicNumTokens?:number;
}

/**
 *
 */
export function importRecord(node:XMLNode, lineNum:number):Line {
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
export function importResponse(root:XMLNode, query:string, corpName:string, subcorpName:string):ConcResponse {
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

export type AttrViewMode = 'visible-all'|'visible-kwic'|'visible-multiline'|'mouseover';


export interface ConcData {
    concsize:number;
    numPages:number;
    resultARF:number;
    resultIPM:number;
    currPage:number;
    loadPage:number; // the one we are going to load
    concId:string;
    lines:Array<Line>;
}

export interface ConcordanceMinState {
    tileId:number;
    queries:Array<string>;
    corpname:string;
    subcname:string;
    subcDesc:string;
    kwicLeftCtx:number;
    kwicRightCtx:number;
    pageSize:number;
    attr_vmode:AttrViewMode;
    viewMode:ViewMode;
    shuffle:boolean;
    metadataAttrs:Array<{value:string; label:string}>;
    attrs:Array<string>;
    posQueryGenerator:[string, string];
    concordances:Array<ConcData>;
}