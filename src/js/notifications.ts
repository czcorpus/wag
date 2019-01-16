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

import * as Rx from '@reactivex/rxjs';
import { ActionDispatcher } from 'kombo';
import {ActionNames} from './models/actions';
import {puid} from './shared/util';
import { SystemMessageType } from './abstract/types';


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


export class SystemNotifications {

    private static DEFAULT_MESSAGE_TTL = 10;

    private messageEvents:Rx.Subject<SystemMessage>;

    constructor(dispatcher:ActionDispatcher) {
        this.messageEvents = new Rx.Subject<SystemMessage>();
        this.messageEvents.observeOn(Rx.Scheduler.async).subscribe(
            (data) => {
                dispatcher.dispatch({
                    name: ActionNames.AddSystemMessage,
                    payload: {
                        ident: data.ident,
                        type: data.type,
                        text: data.text,
                        ttl: data.ttl
                    }
                });
                Rx.Observable.of({
                    name: ActionNames.RemoveSystemMessage,
                    payload: {
                        ident: data.ident
                    }
                })
                .delay(SystemNotifications.DEFAULT_MESSAGE_TTL * 1000)
                .subscribe(
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
            ident: puid(),
            type: type,
            text: msg,
            ttl: SystemNotifications.DEFAULT_MESSAGE_TTL
        });
    }


}