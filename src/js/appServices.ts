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
import { Observable, of as rxOf } from 'rxjs';
import { ITranslator } from 'kombo';
import { Dict } from 'cnc-tskit';

import { HTTPHeaders, SystemMessageType } from './types';
import { LemmaDbApi, LemmaDbResponse } from './api/lemma';
import { SystemNotifications } from './page/notifications';
import { HTTPAction } from './server/routes/actions';
import { AudioPlayer } from './page/audioPlayer';
import { MultiDict } from './multidict';
import { DataReadabilityMapping, CommonTextStructures } from './conf';


export interface IApiServices {

    getApiHeaders(apiUrl:string):HTTPHeaders;

    translateResourceMetadata(corpname:string, value:string):string;

    getCommonResourceStructure(corpname:string, struct:keyof CommonTextStructures):string|undefined;
}


export interface IAppServices extends IApiServices {

    showMessage(type:SystemMessageType, text:string|Error):void;

    translate(key:string, args?:{[key: string]:string|number;}):string;

    getDomainName(langCode:string):string;

    importExternalMessage(label:string|{[lang:string]:string}):string;

    externalMessageIsDefined(label:string|{[lang:string]:string}):boolean;

    importExternalText(ident:string|{[lang:string]:string|{file:string}}, readResource:(path:string)=>Observable<string>):Observable<string>;

    formatDate(d:Date, timeFormat?:number):string;

    formatNumber(v:number, fractionDigits?:number):string;

    createStaticUrl(path:string):string;

    createActionUrl(path:string, args?:{[k:string]:string|Array<string>}|Array<[string, string]>|MultiDict):string;

    forceMobileMode():void;

    isMobileMode():boolean;

    queryLemmaDbApi(domain:string, q:string):Observable<LemmaDbResponse>;

    getISO639UILang():string;

    getUILang():string;

    getISODatetime():string;

    getAudioPlayer():AudioPlayer;

    decodeError(err:Error):string;
}


/**
 *
 */
export interface AppServicesArgs {
    notifications:SystemNotifications;
    uiLang:string;
    domainNames:Array<[string, string]>;
    translator:ITranslator;
    staticUrlCreator:(path:string)=>string;
    actionUrlCreator:(path: string)=>string;
    dataReadability:DataReadabilityMapping;
    apiHeadersMapping:{[urlPrefix:string]:HTTPHeaders};
    mobileModeTest:()=>boolean;
}

/**
 *
 */
export class AppServices implements IAppServices {

    private readonly notifications:SystemNotifications;

    private readonly translator:ITranslator;

    private readonly uiLang:string;

    private forcedMobileMode:boolean; // for debugging

    private readonly dataReadability:DataReadabilityMapping;

    private readonly staticUrlCreator:(path:string) => string;

    private readonly actionUrlCreator:(path: string, args?:{[k:string]:string|Array<string>}|Array<[string, string]>|MultiDict) => string;

    private readonly apiHeadersMapping:{[urlPrefix:string]:HTTPHeaders};

    private readonly lemmaDbApi:LemmaDbApi;

    private readonly mobileModeTest:()=>boolean;

    private readonly audioPlayer:AudioPlayer;

    private readonly domainNames:{[k:string]:string};

    constructor({notifications, uiLang, domainNames, translator, staticUrlCreator, actionUrlCreator, dataReadability,
            apiHeadersMapping, mobileModeTest}:AppServicesArgs) {
        this.notifications = notifications;
        this.uiLang = uiLang;
        this.domainNames = Dict.fromEntries(domainNames);
        this.translator = translator;
        this.staticUrlCreator = staticUrlCreator;
        this.actionUrlCreator = actionUrlCreator;
        this.forcedMobileMode = false;
        this.dataReadability = dataReadability;
        this.apiHeadersMapping = apiHeadersMapping || {};
        this.mobileModeTest = mobileModeTest;
        this.lemmaDbApi = new LemmaDbApi(actionUrlCreator(HTTPAction.GET_LEMMAS));
        this.audioPlayer = new AudioPlayer();
    }

    showMessage(type:SystemMessageType, text:string|Error):void {
        this.notifications.showMessage(type, text);
    }

    translate(key:string, args?:{[key: string]:string|number;}): string {
        return this.translator.translate(key, args);
    }

    getDomainName(langCode:string):string {
        return Dict.get(langCode.split('-')[0], '??', this.domainNames);
    }

    private importText<T>(label:string|{[lang:string]:T}):string|T {
        if (!label) {
            return '';

        } else if (typeof label === 'string') {
            return this.translate(label);

        } else if (typeof label === 'object' && Object.keys(label).length > 0) {
            for (let k in label) {
                if (k === this.uiLang || k.split('-')[0] === this.uiLang) {
                    return label[k];
                }
            }
            if ('en-US' in label) {
                return label['en-US'];

            } else {
                const k0 = Object.keys(label)[0];
                return `?? (${k0}: ${label[k0]})`;
            }
        }
        return '??';
    }

    externalMessageIsDefined(label:string|{[lang:string]:string}):boolean {
        if (typeof label === 'string') {
            return !!label;

         } else {
             return Dict.size(label) > 0;
         }
    }

    importExternalMessage(label:string|{[lang:string]:string}):string {
        return this.importText<string>(label);
    }

    importExternalText(ident:string|{[lang:string]:string|{file:string}}, readResource:(path:string)=>Observable<string>):Observable<string> {
        const ans = this.importText<string|{file:string}>(ident);
        return typeof ans  === 'string' ? rxOf(ans) : readResource(ans.file);
    }

    formatDate(d: Date, timeFormat?: number): string {
        return this.translator.formatDate(d, timeFormat);
    }

    formatNumber(v:number, fractionDigits?:number):string {
        return this.translator.formatNumber(v, fractionDigits);
    }

    createStaticUrl(path:string):string {
        return this.staticUrlCreator(path);
    }

    createActionUrl(path:string, args?:{[k:string]:string|Array<string>}|Array<[string, string]>|MultiDict):string {
        return this.actionUrlCreator(path, args);
    }

    forceMobileMode():void {
        this.forcedMobileMode = true;
    }

    isMobileMode():boolean {
        return this.mobileModeTest() || this.forcedMobileMode;
    }

    translateResourceMetadata(corpname:string, value:string):string {
        return this.importExternalMessage((this.dataReadability.metadataMapping[corpname] || {})[value]) || value;
    }

    getCommonResourceStructure(corpname:string, struct:keyof CommonTextStructures):string|undefined {
        return (this.dataReadability.commonStructures[corpname] || {})[struct];
    }

    getApiHeaders(apiUrl:string):HTTPHeaders {
        const prefixes = Object.keys(this.apiHeadersMapping);
        for (let i = 0; i < prefixes.length; i += 1) {
            if (apiUrl && apiUrl.indexOf(prefixes[i]) === 0) {
                return this.apiHeadersMapping[prefixes[i]];
            }
        }
        return {};
    }

    queryLemmaDbApi(domain:string, q:string):Observable<LemmaDbResponse> {
        return this.lemmaDbApi.call({domain: domain, q: q});
    }

    getISO639UILang():string {
        return this.uiLang.split('-')[0];
    }

    getUILang():string {
        return this.uiLang;
    }

    getISODatetime():string {
        const dat = new Date();
        const lzv = (n:number) => n < 10 ? '0' + n : n.toFixed(0);
        const [y, m, d, h, M, s] =
            [dat.getFullYear(), dat.getMonth() + 1, dat.getDate(), dat.getHours(), dat.getMinutes(), dat.getSeconds()].map(lzv);
        return `${y}-${m}-${d}T${h}:${M}:${s}`;
    }

    getAudioPlayer():AudioPlayer {
        return this.audioPlayer;
    }

    decodeError(err:Error):string {
        if (err.name === 'AjaxError') {
            return this.translate('global__general_tile_ajax_error_{err}', {err: err.message});
        }
        return err.message;
    }
}