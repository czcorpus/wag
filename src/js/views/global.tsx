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
import * as Immutable from 'immutable';
import { ActionDispatcher, ViewUtils } from 'kombo';
import * as React from 'react';

import { MultiDict } from '../common/data';
import { BacklinkWithArgs, SystemMessageType } from '../common/types';
import { KeyCodes } from '../common/util';
import { ActionName, Actions } from '../models/actions';

export interface SourceInfo {
    corp:string;
    subcorp?:string;
}

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
        sourceIdent:SourceInfo|Array<SourceInfo>;
        backlink?:BacklinkWithArgs<{}>|Array<BacklinkWithArgs<{}>>;
        htmlClass?:string;
        error?:string;
    }>;

    ErrorBoundary:React.ComponentClass;

    ModalBox:React.ComponentClass<{
        onCloseClick?:()=>void;
        title:string;
    }>;

    HorizontalBlockSwitch:React.SFC<{
        blockIndices:Immutable.List<number>;
        currentIdx:number;
        htmlClass?:string;
        onChange:(idx:number)=>void;
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

    // ------------- <BacklinkForm /> ----------------------------------

    const BacklinkForm:React.SFC<{
        values:BacklinkWithArgs<{}>;

    }> = (props) => {
        const args = new MultiDict(props.values.args);
        return <form className="BacklinkForm" action={props.values.url} method={props.values.method} target="_blank">
            {args.items().filter(v => v[1] !== null && v[1] !== undefined).map(([k, v], i) =>
                <input key={`arg:${i}:${k}`} type="hidden" name={k} value={v} />
            )}
            <button type="submit">
                {props.values.label}
            </button>
        </form>;
    }

    // --------------- <SourceLink /> -------------------------------------------

    const SourceLink:React.SFC<{
        data:SourceInfo|Array<SourceInfo>;
        backlink:BacklinkWithArgs<{}>|Array<BacklinkWithArgs<{}>>;

    }> = (props) => {

        const handleClick = (corp:string, subcorp:string) => () => {
            dispatcher.dispatch<Actions.GetCorpusInfo>({
                name: ActionName.GetCorpusInfo,
                payload: {
                    corpusId: corp,
                    subcorpusId: subcorp
                }
            });
        };

        return (
            <div className="source">
                {ut.translate('global__source')}:{'\u00a0'}
                {(Array.isArray(props.data) ? props.data : [props.data]).map((item, i) =>
                    <React.Fragment key={`${item.corp}:${item.subcorp}`}>
                        {i > 0 ? <span> + </span> : null}
                        <a onClick={handleClick(item.corp, item.subcorp)}>{item.corp}</a>
                        {item.subcorp ? <span> / {item.subcorp}</span> : null}
                    </React.Fragment>
                )}
                {props.backlink ?
                    <>
                    ,{'\u00a0'}
                    {ut.translate('global__more_info')}:{'\u00a0'}
                    {(Array.isArray(props.backlink) ? props.backlink : [props.backlink]).filter(v => !!v).map((item, i) =>
                        <React.Fragment key={`${item.label}:${i}`}>
                            {i > 0 ? <span>, </span> : null}
                            <BacklinkForm values={item} />
                        </React.Fragment>
                    )}
                    </> :
                    null
                }
            </div>
        );
    };

    // --------------- <TileWrapper /> -------------------------------------------

    const TileWrapper:GlobalComponents['TileWrapper'] = (props) => {

        if (props.isBusy && !props.hasData) {
            return <div className="TileWrapper"><AjaxLoader htmlClass="centered" /></div>;

        } else if (props.error) {
            return (
                <div className="TileWrapper">
                    <div className="cnc-tile-body content">
                        <p>
                            <MessageStatusIcon statusType={SystemMessageType.ERROR} isInline={true} />
                            {props.error}
                        </p>
                        <div style={{textAlign: 'center'}}>
                            <EmptySet fontSize="10em" />
                        </div>
                    </div>
                </div>
            );

        } else {
            return (
                <div className={`TileWrapper${props.htmlClass ? ' ' + props.htmlClass : ''}`}>
                    <div className="loader-wrapper">{props.hasData && props.isBusy ? <TitleLoaderBar  /> : null}</div>
                    <div className="cnc-tile-body content">
                        <div>
                            {props.hasData ?
                                props.children :
                                <>
                                    <p>
                                        <MessageStatusIcon statusType={SystemMessageType.ERROR} isInline={true} />
                                        {ut.translate('global__not_enough_data_to_show_result')}
                                    </p>
                                    <div style={{textAlign: 'center'}}>
                                        <EmptySet fontSize="10em" />
                                    </div>
                                </>
                            }
                        </div>
                        <SourceLink data={props.sourceIdent} backlink={props.backlink} />
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
                    <div className="cnc-tile-body">
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

    class ModalBox extends React.PureComponent<{onCloseClick:()=>void; title:string}> {

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
            return (
                <div id="modal-overlay">
                    <div className="box cnc-tile">
                        <header className="cnc-tile-header">
                            <span>{this.props.title}</span>
                            <button className="close"
                                    ref={this.ref}
                                    onClick={this.props.onCloseClick}
                                    onKeyDown={this.handleKey}>
                                <img src={ut.createStaticUrl('close-icon.svg')} alt="close icon" />
                            </button>
                        </header>
                        <div className="content cnc-tile-body">
                            {this.props.children}
                        </div>
                    </div>
                </div>
            );
        }
    }

    // ------- <HorizontalBlockSwitch /> ---------------------------------------------------

    const HorizontalBlockSwitch:GlobalComponents['HorizontalBlockSwitch'] = (props) => {
        return (
            <div className={`HorizontalBlockSwitch${props.htmlClass ? ' ' + props.htmlClass : ''}`}>
                {props.blockIndices.map(ident =>
                        <a key={ident} className={`${props.currentIdx === ident ? 'current' : ''}`}
                                onClick={()=>props.onChange(ident)}>{'\u25A0'}</a>)}
            </div>
        );
    };

    // ===================

    return {
        AjaxLoader: AjaxLoader,
        MessageStatusIcon: MessageStatusIcon,
        EmptySet: EmptySet,
        TileWrapper: TileWrapper,
        ErrorBoundary: ErrorBoundary,
        ModalBox: ModalBox,
        HorizontalBlockSwitch: HorizontalBlockSwitch
    };
}
