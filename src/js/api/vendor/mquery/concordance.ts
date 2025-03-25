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

import { Observable, of as rxOf } from 'rxjs';

import { ConcordanceMinState } from '../../../models/concordance/index.js';
import { QueryMatch } from '../../../query/index.js';
import { ResourceApi, SourceDetails } from '../../../types.js';
import { ConcResponse, ViewMode } from './common.js';
import { IAppServices } from 'src/js/appServices.js';

interface NullApiArgs {
    corpusName:string;
    queryMatch:QueryMatch;
    qmIndex:number;
}

export class NullConcApi implements ResourceApi<NullApiArgs, ConcResponse> {

    stateToArgs(state:ConcordanceMinState, queryMatch:QueryMatch|null, qmIndex:number, otherLangCql:string|null):NullApiArgs {
        return {
            corpusName: state.corpname,
            queryMatch,
            qmIndex
        };
    }

    getSourceDescription(tileId:number, multicastRequest:boolean, lang:string, corpname:string):Observable<SourceDetails> {
        return rxOf({
            tileId,
            title: '',
            description: '',
            author: ''
        })
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


    call(tileId:number, multicastRequest:boolean, args:NullApiArgs):Observable<ConcResponse> {
        return rxOf({
                query: '',
                corpName: args.corpusName,
                subcorpName: '',
                lines: [],
                concsize: 0,
                arf: 0,
                ipm: 0,
                messages: [],
                concPersistenceID: ''
        })
    }
}

// ------------------------------

/**
 * @todo
 */
export class MQueryConcApi implements ResourceApi<NullApiArgs, ConcResponse> {

    private readonly apiUrl:string;

    private readonly usesDataStream:boolean;

    private readonly appServices:IAppServices;

    private readonly apiOptions:{};

    constructor(apiUrl:string, usesDataStream:boolean, appServices:IAppServices, apiOptions:{}) {
        this.apiUrl = apiUrl;
        this.usesDataStream = usesDataStream;
        this.appServices = appServices;
        this.apiOptions = apiOptions;
    }

    stateToArgs(state:ConcordanceMinState, queryMatch:QueryMatch|null, qmIndex:number, otherLangCql:string|null):NullApiArgs {
        return {
            corpusName: state.corpname,
            queryMatch,
            qmIndex
        };
    }

    getSourceDescription(tileId:number, multicastRequest:boolean, lang:string, corpname:string):Observable<SourceDetails> {
        return rxOf({
            tileId,
            title: '',
            description: '',
            author: ''
        })
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


    call(tileId:number, multicastRequest:boolean, args:NullApiArgs):Observable<ConcResponse> {
        return rxOf({
                query: '',
                corpName: args.corpusName,
                subcorpName: '',
                lines: [],
                concsize: 0,
                arf: 0,
                ipm: 0,
                messages: [],
                concPersistenceID: ''
        })
    }
}