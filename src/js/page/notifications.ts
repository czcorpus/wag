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
import { IActionDispatcher } from 'kombo';
import { asyncScheduler, of as rxOf, Subject } from 'rxjs';
import { delay, observeOn } from 'rxjs/operators';

import { SystemMessageType } from '../types.js';
import { Ident } from 'cnc-tskit';
import { Actions } from '../models/actions.js';



export interface SystemMessage {
    ident:string;
    type:SystemMessageType;
    text:string;
    ttl:number;
}

export const importMessageType = (t:string):SystemMessageType => {
    switch (t) {
        case 'info': return SystemMessageType.INFO;
        case 'warning': return SystemMessageType.WARNING;
        case 'error': return SystemMessageType.ERROR;
        default: return SystemMessageType.INFO;
    }
}


export interface ISystemNotifications {
    showMessage(type:SystemMessageType, text:string|Error):void;
}


export class ServerNotifications {
    showMessage(type:SystemMessageType, text:string|Error):void {
        switch (type) {
            case SystemMessageType.ERROR:
                console.error(text);
            case SystemMessageType.WARNING:
                console.warn(text);
            case SystemMessageType.INFO:
            default:
                console.info(text);
        }
    }
}


export class SystemNotifications {

    private static DEFAULT_MESSAGE_TTL = 10;

    private messageEvents:Subject<SystemMessage>;

    constructor(dispatcher:IActionDispatcher) {
        this.messageEvents = new Subject<SystemMessage>();
        this.messageEvents.pipe(observeOn(asyncScheduler)).subscribe(
            (data) => {
                dispatcher.dispatch<typeof Actions.AddSystemMessage>({
                    name: Actions.AddSystemMessage.name,
                    payload: {
                        ident: data.ident,
                        type: data.type,
                        text: data.text,
                        ttl: data.ttl
                    }
                });
                rxOf<typeof Actions.RemoveSystemMessage>({
                    name: Actions.RemoveSystemMessage.name,
                    payload: {
                        ident: data.ident
                    }

                }).pipe(
                    delay(SystemNotifications.DEFAULT_MESSAGE_TTL * 1000)

                ).subscribe(
                    (data) => {
                        dispatcher.dispatch(data);
                    }
                );
            }
        );
    }

    showMessage(type:SystemMessageType, text:string|Error):void {
        let msg:string;
        if (text instanceof Error) {
            msg = text.message;

        } else {
            msg = text;
        }

        this.messageEvents.next({
            ident: Ident.puid(),
            type: type,
            text: msg,
            ttl: SystemNotifications.DEFAULT_MESSAGE_TTL
        });
    }


}