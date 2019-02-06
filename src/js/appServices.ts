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

import { SystemNotifications } from "./notifications";
import {ITranslator} from 'kombo';
import { SystemMessageType } from "./abstract/types";


export class AppServices {

    private readonly notifications:SystemNotifications;

    private readonly translator:ITranslator;

    private readonly uiLang:string;

    private readonly staticUrlCreator:(path:string) => string;

    private readonly actionUrlCreator:(path: string, args?:{[k:string]:string}|Array<[string, string]>) => string;

    constructor(notifications:SystemNotifications, uiLang:string, translator:ITranslator, staticUrlCreator:(path:string) => string,
                actionUrlCreator:(path: string, args?:{[k:string]:string}|Array<[string, string]>) => string) {
        this.notifications = notifications;
        this.uiLang = uiLang;
        this.translator = translator;
        this.staticUrlCreator = staticUrlCreator;
        this.actionUrlCreator = actionUrlCreator;
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
        } else {
            for (let k in label) {
                if (k.split('-')[0] === this.uiLang) {
                    return label[k];
                }
            }
        }``
        return '??';
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
}