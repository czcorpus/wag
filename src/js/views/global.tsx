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
import { SystemMessageType } from '../abstract/types';
import { Actions, ActionName } from '../models/actions';


export interface GlobalComponents {

    AjaxLoader:React.SFC<{
        htmlClass?:string;
    }>;

    MessageStatusIcon:React.SFC<{
        statusType:SystemMessageType;
        isInline?:boolean;
        htmlClass?:string;
    }>;

    EmptySet:React.SFC<{
        fontSize:string;
    }>;

    TileWrapper:React.SFC<{
        isBusy:boolean;
        hasData:boolean;
        sourceIdent:string;
        htmlClass?:string;
        error?:string;
    }>;

    ErrorBoundary:React.ComponentClass;

    ModalBox:React.ComponentClass<{
        onCloseClick:()=>void;
        title:string;
        isScrollable:boolean;
    }>;
}

export function init(dispatcher:ActionDispatcher, ut:ViewUtils<{}>):GlobalComponents {

    // --------------- <AjaxLoader /> -------------------------------------------

    const AjaxLoader:GlobalComponents['AjaxLoader'] = (props) => {
        return <img src={ut.createStaticUrl('ajax-loader.gif')}
                    alt={ut.translate('global__alt_loading')}
                    className={props.htmlClass ? `AjaxLoader ${props.htmlClass}` : 'AjaxLoader'} />;
    }

    // --------------- <TitleLoaderBar /> -------------------------------------------

    const TitleLoaderBar:React.SFC<{
    }> = (props) => {
        return (
            <div className="TitleLoaderBar" title={ut.translate('global__alt_loading')}>
                <div className="grad"></div>
            </div>
        );
    }

    // --------------- <MessageStatusIcon /> -------------------------------------------

    const MessageStatusIcon:GlobalComponents['MessageStatusIcon'] = (props) => {
        const m = {
            [SystemMessageType.INFO]: 'info-icon.svg',
            [SystemMessageType.WARNING]: 'warning-icon.svg',
            [SystemMessageType.ERROR]: 'error-icon.svg'
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
                <span className={`MessageStatusIcon${props.htmlClass ? ' ' + props.htmlClass : ''}`}>
                    {renderImg()}
                </span>
            );

        } else {
            return (
                <div className={`MessageStatusIcon${props.htmlClass ? ' ' + props.htmlClass : ' icon-box'}`}>
                    {renderImg()}
                </div>
            );
        }
    };

    // --------------- <EmptySet /> -------------------------------------------

    const EmptySet:GlobalComponents['EmptySet'] = (props) => {
        return <span className="EmptySet" style={{fontSize: props.fontSize}}>{'\u2205'}</span>;
    };

    // --------------- <TileWrapper /> -------------------------------------------

    const TileWrapper:GlobalComponents['TileWrapper'] = (props) => {

        const handleSourceClick = () => {
            dispatcher.dispatch<Actions.GetCorpusInfo>({
                name: ActionName.GetCorpusInfo,
                payload: {
                    corpusId: props.sourceIdent
                }
            });
        };

        if (props.isBusy && !props.hasData) {
            return <div className="service-tile"><AjaxLoader htmlClass="centered" /></div>;

        } else if (props.error) {
            return (
                <div className="service-tile">
                    <p>
                        <MessageStatusIcon statusType={SystemMessageType.ERROR} isInline={true} />
                        {props.error}
                    </p>
                    <div style={{textAlign: 'center'}}>
                        <EmptySet fontSize="10em" />
                    </div>
                </div>
            );

        } else {
            return (
                <div className={`service-tile${props.htmlClass ? ' ' + props.htmlClass : ''}`}>
                    <div className="loader-wrapper">{props.hasData && props.isBusy ? <TitleLoaderBar  /> : null}</div>
                    {props.children}
                    <div className="source">
                        {ut.translate('global__source')}:{'\u00a0'}
                        <a onClick={handleSourceClick}>{props.sourceIdent}</a>
                    </div>
                </div>
            );
        }
    };

    // --------------- <ErrorBoundary /> -------------------------------------------

    class ErrorBoundary extends React.Component<{}, {error: string}> {

        constructor(props) {
            super(props);
            this.state = {error: null};
        }

        componentDidCatch(error, info) {
            console.error(error);
            this.setState({error: error});
        }

        render() {
            if (this.state.error) {
                return (
                    <div>
                        <p>
                        <MessageStatusIcon statusType={SystemMessageType.ERROR} isInline={true} />
                            {ut.translate('global__failed_to_render_component')}
                        </p>
                        <p style={{textAlign: 'center'}}>
                            <EmptySet fontSize="5em" />
                        </p>
                    </div>
                );

            } else {
                return this.props.children;
            }
        }
    }

    // --------------- <ModalBox /> -------------------------------------------

    class ModalBox extends React.PureComponent<{onCloseClick:()=>void; title:string; isScrollable:boolean}> {

        private ref:React.RefObject<HTMLButtonElement>;

        constructor(props) {
            super(props);
            this.ref = React.createRef();
            this.handleKey = this.handleKey.bind(this);
        }

        componentDidMount() {
            if (this.ref.current) {
                this.ref.current.focus();
            }
        }

        private handleKey(evt:React.KeyboardEvent) {
            if (evt.keyCode === KeyCodes.ESC) {
                this.props.onCloseClick();
            }
        }

        render() {
            const style = {};
            if (this.props.isScrollable) {
                style['overflow'] = 'auto';

            } else {
                style['overflow'] = 'hidden';
            }
            return (
                <div id="modal-overlay">
                    <div className="box cnc-tile" style={style}>
                        <header className="cnc-tile-header">
                            <span>{this.props.title}</span>
                            <button className="close"
                                    ref={this.ref}
                                    onClick={this.props.onCloseClick}
                                    onKeyDown={this.handleKey}>
                                <i className="fa fa-window-close" aria-hidden="true"></i>
                            </button>
                        </header>
                        <div className="content">
                            {this.props.children}
                        </div>
                    </div>
                </div>
            );
        }
    }

    return {
        AjaxLoader: AjaxLoader,
        MessageStatusIcon: MessageStatusIcon,
        EmptySet: EmptySet,
        TileWrapper: TileWrapper,
        ErrorBoundary: ErrorBoundary,
        ModalBox: ModalBox
    };
}
