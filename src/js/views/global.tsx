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
import { ViewUtils, IActionDispatcher } from 'kombo';
import * as React from 'react';
import { Observable } from 'rxjs';

import { MultiDict } from '../common/data';
import { SystemMessageType } from '../common/types';
import { ScreenProps } from '../common/hostPage';
import { BacklinkWithArgs } from '../common/tile';
import { KeyCodes } from '../common/util';
import { ActionName, Actions } from '../models/actions';

export interface SourceInfo {
    corp:string;
    subcorp?:string;
}

export type TooltipValues = {[key:string]:number|string}|null;

export interface GlobalComponents {

    AjaxLoader:React.SFC<{
        htmlClass?:string;
    }>;

    MessageStatusIcon:React.SFC<{
        statusType:SystemMessageType;
        isInline?:boolean;
        htmlClass?:string;
    }>;

    TileWrapper:React.SFC<{
        isBusy:boolean;
        hasData:boolean;
        tileId:number;
        sourceIdent:SourceInfo|Array<SourceInfo>;
        supportsTileReload:boolean;
        backlink?:BacklinkWithArgs<{}>|Array<BacklinkWithArgs<{}>>;
        htmlClass?:string;
        error?:string;
    }>;

    ErrorBoundary:React.ComponentClass;

    ModalBox:React.ComponentClass<{
        onCloseClick?:()=>void;
        title:string;
        tileClass?:string;
    }>;

    HorizontalBlockSwitch:React.SFC<{
        blockIndices:Immutable.List<number>;
        currentIdx:number;
        htmlClass?:string;
        onChange:(idx:number)=>void;
    }>;

    ImageWithMouseover:React.SFC<{
        file:string;
        alt:string;
        file2?:string;
        htmlClass?:string;
    }>;

    ResponsiveWrapper:React.ComponentClass<{
        render:(width:number, height:number)=>React.ReactElement<{width:number, height:number} & {}>;
    }>;

    ElementTooltip:React.SFC<{
        x:number;
        y:number;
        visible:boolean;
        values:TooltipValues;
    }>;
}

export function init(dispatcher:IActionDispatcher, ut:ViewUtils<{}>, resize$:Observable<ScreenProps>):GlobalComponents {

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
        tileId:number;
        data:SourceInfo|Array<SourceInfo>;
        backlink:BacklinkWithArgs<{}>|Array<BacklinkWithArgs<{}>>;

    }> = (props) => {

        const handleClick = (corp:string, subcorp:string) => () => {
            dispatcher.dispatch<Actions.GetSourceInfo>({
                name: ActionName.GetSourceInfo,
                payload: {
                    tileId: props.tileId,
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

    // --------------- <TileReloadControl /> -------------------------------------------

    const TileReloadControl:React.SFC<{
        tileId:number;

    }> = (props) => {

        const handleClick = () => {
            dispatcher.dispatch({
                name: ActionName.RetryTileLoad,
                payload: {tileId: props.tileId}
            });
        };

        return (
            <p className="TileReloadControl">
                <a onClick={handleClick}>{ut.translate('global__retry_reload')} {'\u21bb'}</a>
            </p>
        );
    }

    // --------------- <TileWrapper /> -------------------------------------------

    const TileWrapper:GlobalComponents['TileWrapper'] = (props) => {

        const handleAreaClick = () => {
            dispatcher.dispatch<Actions.TileAreaClicked>({
                name: ActionName.TileAreaClicked,
                payload: {
                    tileId: props.tileId
                }
            });
        };

        if (props.isBusy && !props.hasData) {
            return (
                <div className="TileWrapper">
                    <p>
                        <AjaxLoader htmlClass="centered" />
                    </p>
                </div>
            );

        } else if (props.error) {
            return (
                <div className="TileWrapper">
                    <div className="cnc-tile-body content error">
                        <div className="message">
                            <MessageStatusIcon statusType={SystemMessageType.ERROR} isInline={false} />
                            <p>
                                {props.error}
                            </p>
                        </div>
                        <div />
                        {props.supportsTileReload ? <TileReloadControl tileId={props.tileId} /> : null}
                    </div>
                </div>
            );

        } else {
            const htmlClasses = ['TileWrapper'];
            if (props.htmlClass) {
                htmlClasses.push(props.htmlClass);
            }
            if (!props.hasData && !props.isBusy) {
                htmlClasses.push('empty');
            }
            return (
                <div className={htmlClasses.join(' ')} onClick={handleAreaClick}>
                    <div className="loader-wrapper">{props.hasData && props.isBusy ? <TitleLoaderBar  /> : null}</div>
                    <div className={`cnc-tile-body content${props.hasData ? '' : ' empty'}`}>
                        <div>
                            {props.hasData ?
                                props.children :
                                <>
                                    <div className="message">
                                        <MessageStatusIcon statusType={SystemMessageType.WARNING} isInline={false} />
                                        <p>
                                            {ut.translate('global__not_enough_data_to_show_result')}
                                        </p>
                                    </div>
                                    <div />
                                </>
                            }
                        </div>
                    </div>
                    {props.hasData ? <SourceLink data={props.sourceIdent} backlink={props.backlink} tileId={props.tileId} /> : null}
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
                    <div className="cnc-tile-body error">
                        <div className="message">
                            <MessageStatusIcon statusType={SystemMessageType.ERROR} isInline={false} />
                            <p>
                                {ut.translate('global__failed_to_render_component')}
                            </p>
                        </div>
                        <div />
                    </div>
                );

            } else {
                return this.props.children;
            }
        }
    }

    // --------------- <ModalBox /> -------------------------------------------

    class ModalBox extends React.PureComponent<{onCloseClick:()=>void; title:string; tileClass?:string}> {

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
            const tileClasses = `content cnc-tile-body${this.props.tileClass ? ' ' + this.props.tileClass : ''}`;

            return (
                <div id="modal-overlay">
                    <div className="box cnc-tile">
                        <header className="cnc-tile-header">
                            <span>{this.props.title}</span>
                            <button className="close"
                                    ref={this.ref}
                                    onClick={this.props.onCloseClick}
                                    onKeyDown={this.handleKey}
                                    title={ut.translate('global__close_modal')}>
                                <img src={ut.createStaticUrl('close-icon.svg')} alt="close icon" />
                            </button>
                        </header>
                        <div className={tileClasses}>
                            {this.props.children}
                        </div>
                        <footer><div className="fcontent" /></footer>
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

    // --------- <ImageWithMouseover /> ---------------------------------------------------------

    const ImageWithMouseover:GlobalComponents['ImageWithMouseover'] = (props) => {

        const [is2ndState, set2ndState] = React.useState(false);

        let file2 = props.file2;
        if (!file2) {
            const items = props.file.split('.');
            file2 = `${items.slice(0, items.length - 1).join('.')}_s.${items[items.length - 1]}`;
        }

        return (
            <img src={ut.createStaticUrl(is2ndState ? file2 : props.file)}
                    onMouseOver={()=>set2ndState(!is2ndState)}
                    onMouseOut={()=>set2ndState(!is2ndState)} />
        );
    };

    // --------- <ResponsiveWrapper /> ----------------------------------------------

    class ResponsiveWrapper extends React.Component<{
            render:(width:number, height:number)=>React.ReactElement<{width: number, height:number} & {}>;
       },
       {
            width:number;
            height:number;
        }> {

        private readonly ref:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.state = {
                width: 1,
                height: 1,
            };
            this.ref = React.createRef();
            this.handleWindowResize = this.handleWindowResize.bind(this);
            resize$.subscribe(this.handleWindowResize);
        }

        componentDidMount() {
            if (this.ref.current) {
                this.setState({
                    width: this.ref.current.getBoundingClientRect().width,
                    height: this.ref.current.getBoundingClientRect().height
                });
            }
        }

        private handleWindowResize(props:ScreenProps) {
            if (this.ref.current) {
                this.setState({
                    width: this.ref.current.getBoundingClientRect().width,
                    height: this.ref.current.getBoundingClientRect().height
                });
            }
        }

        render() {
            return <div style={{width: '100%', height: '100%'}} ref={this.ref}>{this.props.render(this.state.width, this.state.height)}</div>;
        }

    };


    // -------------------- <ElementTooltip /> ----------------------------------------------


    const ElementTooltip:GlobalComponents['ElementTooltip'] = (props) => {

        const ref = React.useRef(null);

        const calcXPos = () =>
            ref.current ? Math.max(0, props.x - ref.current.getBoundingClientRect().width - 20) : props.x;

        const calcYPos = () =>
            ref.current ? props.y +  10 : props.y;

        const style:React.CSSProperties = {
            display: props.visible ? 'block' : 'none',
            visibility: ref.current ? 'visible' : 'hidden',
            top: calcYPos(),
            left: calcXPos()
        };

        return (
            <div className="wdg-tooltip" ref={ref} style={style}>
                <table>
                    <tbody>
                        {Object.keys(props.values || {}).map(label => {
                            const v = props.values[label];
                            return (
                                <tr key={label}>
                                <th>{label}:</th>
                                {typeof v === 'number' ?
                                    <td className="num">{ut.formatNumber(v, 1)}</td> :
                                    <td>{v}</td>
                                }
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    // ===================

    return {
        AjaxLoader: AjaxLoader,
        MessageStatusIcon: MessageStatusIcon,
        TileWrapper: TileWrapper,
        ErrorBoundary: ErrorBoundary,
        ModalBox: ModalBox,
        HorizontalBlockSwitch: HorizontalBlockSwitch,
        ImageWithMouseover: ImageWithMouseover,
        ResponsiveWrapper: ResponsiveWrapper,
        ElementTooltip: ElementTooltip
    };
}
