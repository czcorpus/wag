/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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

import {ActionDispatcher, ViewUtils} from 'kombo';
import * as React from 'react';
import { KeyCodes } from '../shared/util';
import { SystemMessageType } from '../notifications';


export interface GlobalComponents {
    AjaxLoader:React.SFC<{}>;
    ModalOverlay:React.SFC<{
        onCloseKey?:()=>void;
    }>;
    MessageStatusIcon:React.SFC<{
        statusType:SystemMessageType;
        isInline?:boolean;
        htmlClass?:string;
    }>;
    EmptySet:React.SFC<{
        fontSize:string;
    }>;
}

export function init(dispatcher:ActionDispatcher, ut:ViewUtils<{}>):GlobalComponents {

    const AjaxLoader:React.SFC<{}> = (props) => {
        return <img src={ut.createStaticUrl('ajax-loader.gif')} alt="ajax-loader" />;
    }

    const ModalOverlay:GlobalComponents['ModalOverlay'] = (props) => {

        const keyPressHandler = (evt:React.KeyboardEvent) => {
            if (evt.keyCode === KeyCodes.ESC && typeof props.onCloseKey === 'function') {
                props.onCloseKey();
            }
        };

        const style = {};
        if (this.props.isScrollable) {
            style['overflow'] = 'auto';
        }
        return (
            <div id="modal-overlay" style={style} onKeyDown={keyPressHandler}>
                {this.props.children}
            </div>
        );
    };


    const MessageStatusIcon:GlobalComponents['MessageStatusIcon'] = (props) => {
        const m = {
            info: 'info-icon.svg',
            warning: 'warning-icon.svg',
            error: 'error-icon.svg'
        };

        const renderImg = () => {
            if (props.statusType && m[props.statusType]) {
                return <img className="info-icon" src={ut.createStaticUrl(m[props.statusType])}
                            alt={props.statusType} />;
            }
            return null;
        };

        if (props.isInline) {
            return (
                <span className={props.htmlClass ? props.htmlClass : null}>
                    {renderImg()}
                </span>
            );

        } else {
            return (
                <div className={props.htmlClass ? props.htmlClass : 'icon-box'}>
                    {renderImg()}
                </div>
            );
        }
    };

    const EmptySet:GlobalComponents['EmptySet'] = (props) => {
        return <span className="EmptySet" style={{fontSize: props.fontSize}}>{'\u2205'}</span>;
    };

    return {
        AjaxLoader: AjaxLoader,
        ModalOverlay: ModalOverlay,
        MessageStatusIcon: MessageStatusIcon,
        EmptySet: EmptySet
    };
}
