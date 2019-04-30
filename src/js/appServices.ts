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
import { ITranslator } from 'kombo';

import { DbValueMapping, HTTPHeaders, SystemMessageType } from './common/types';
import { LemmaDbApi, LemmaDbResponse } from './common/api/lemma';
import { SystemNotifications } from './notifications';


declare var DocumentTouch;

/**
 *
 */
export interface AppServicesArgs {
    notifications:SystemNotifications;
    uiLang:string;
    translator:ITranslator;
    staticUrlCreator:(path:string)=>string;
    actionUrlCreator:(path: string)=>string;
    dbValuesMapping:DbValueMapping;
    apiHeadersMapping:{[urlPrefix:string]:HTTPHeaders};
}

/**
 *
 */
export class AppServices {

    private readonly notifications:SystemNotifications;

    private readonly translator:ITranslator;

    private readonly uiLang:string;

    private forcedMobileMode:boolean; // for debugging

    private readonly dbValuesMapping:DbValueMapping;

    private readonly staticUrlCreator:(path:string) => string;

    private readonly actionUrlCreator:(path: string, args?:{[k:string]:string}|Array<[string, string]>) => string;

    private readonly apiHeadersMapping:{[urlPrefix:string]:HTTPHeaders};

    private readonly lemmaDbApi:LemmaDbApi;

    constructor({notifications, uiLang, translator, staticUrlCreator, actionUrlCreator, dbValuesMapping, apiHeadersMapping}:AppServicesArgs) {
        this.notifications = notifications;
        this.uiLang = uiLang;
        this.translator = translator;
        this.staticUrlCreator = staticUrlCreator;
        this.actionUrlCreator = actionUrlCreator;
        this.forcedMobileMode = false;
        this.dbValuesMapping = dbValuesMapping;
        this.apiHeadersMapping = apiHeadersMapping || {};
        this.lemmaDbApi = new LemmaDbApi(actionUrlCreator('get-lemmas'));
    }

    showMessage(type:SystemMessageType, text:string|Error):void {
        this.notifications.showMessage(type, text);
    }

    translate(key: string, args?: {[key: string]: string;}): string {
        return this.translator.translate(key, args);
    }

    importExternalMessage(label:string|{[lang:string]:string}):string {
        if (!label) {
            return '';

        } else if (typeof label === 'string') {
            return this.translate(label);

        } else if (typeof label === 'object') {
            for (let k in label) {
                if (k === this.uiLang || k.split('-')[0] === this.uiLang) {
                    return label[k];
                }
            }
        }
        return `?? ${label}`;
    }

    formatDate(d: Date, timeFormat?: number): string {
        return this.translator.formatDate(d, timeFormat);
    }

    createStaticUrl(path:string):string {
        return this.staticUrlCreator(path);
    }

    createActionUrl(path:string, args?:{[k:string]:string}|Array<[string, string]>):string {
        return this.actionUrlCreator(path, args);
    }

    forceMobileMode():void {
        this.forcedMobileMode = true;
    }

    isMobileMode():boolean {
        return this.forcedMobileMode ||
            (window.matchMedia('screen and (max-width: 480px)').matches
                && (('ontouchstart' in window) || window['DocumentTouch'] && document instanceof DocumentTouch));
    }

    translateDbValue(corpname:string, value:string):string {
        return this.importExternalMessage((this.dbValuesMapping[corpname] || {})[value]) || value;
    }

    getApiHeaders(apiUrl:string):HTTPHeaders {
        const prefixes = Object.keys(this.apiHeadersMapping);
        for (let i = 0; i < prefixes.length; i += 1) {
            if (apiUrl.indexOf(prefixes[i]) === 0) {
                return this.apiHeadersMapping[prefixes[i]];
            }
        }
        return {};
    }

    queryLemmaDbApi(q:string):Observable<LemmaDbResponse> {
        return this.lemmaDbApi.call({q: q});
    }

    getISO639UILang():string {
        return this.uiLang.split('-')[0];
    }
}