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

import { SystemNotifications, SystemMessageType } from "./notifications";
import {ITranslator} from 'kombo';


export class AppServices {

    private readonly notifications:SystemNotifications;

    private readonly translator:ITranslator;

    constructor(notifications:SystemNotifications, translator:ITranslator) {
        this.notifications = notifications;
        this.translator = translator;
    }

    showMessage(type:SystemMessageType, text:string|Error):void {
        this.notifications.showMessage(type, text);
    }

    translate(key: string, args?: {[key: string]: string;}): string {
        return this.translator.translate(key, args);
    }
    formatDate(d: Date, timeFormat?: number): string {
        return this.translator.formatDate(d, timeFormat);
    }
}