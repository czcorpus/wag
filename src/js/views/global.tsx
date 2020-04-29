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
import { ViewUtils, IActionDispatcher } from 'kombo';
import * as React from 'react';
import { Observable } from 'rxjs';
import { List, Keyboard, pipe, Dict } from 'cnc-tskit';

import { MultiDict } from '../common/data';
import { SystemMessageType, SourceDetails } from '../common/types';
import { ScreenProps } from '../common/hostPage';
import { BacklinkWithArgs } from '../common/tile';
import { ActionName, Actions } from '../models/actions';

export interface SourceInfo {
    corp:string;
    subcorp?:string;
}

export type TooltipValues = {[key:string]:number|string|Array<string|number>}|null;

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
        sourceIdent?:SourceInfo|Array<SourceInfo>;
        supportsTileReload:boolean;
        issueReportingUrl:string;
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
        blockIndices:Array<number>;
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
        minWidth?:number;
    }>;

    ElementTooltip:React.SFC<{
        x:number;
        y:number;
        visible:boolean;
        values:TooltipValues;
    }>;

    SourceInfoBox:React.SFC<{
        data:SourceDetails;
    }>;

    AlignedRechartsTooltip:React.SFC<{
        active:boolean;
        payload:Array<{[key:string]:any}>;
        label:string;
        separator:string;
        formatter:(value:string,name:string,data:{[key:string]:any}) => string | [string, string];
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
            {pipe(
                args.items(),
                List.filter(v => v[1] !== null && v[1] !== undefined),
                List.map(([k, v], i) =>
                    <input key={`arg:${i}:${k}`} type="hidden" name={k} value={v} />
                )
            )}
            <button type="submit">
                {props.values.label}
            </button>
        </form>;
    }

    // --------------- <SourceLink /> -------------------------------------------

    const SourceLink:React.SFC<{
        tileId:number;
        data:SourceInfo|Array<SourceInfo>|undefined;
        backlink:BacklinkWithArgs<{}>|Array<BacklinkWithArgs<{}>>|undefined;

    }> = (props) => {

        const handleClick = (corp:string, subcorp:string|undefined) => () => {
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
                {props.data ? ut.translate('global__source') + ':\u00a0' : null}
                {props.data ?
                    List.map(
                        (item, i) =>
                            <React.Fragment key={`${item.corp}:${item.subcorp}`}>
                                {i > 0 ? <span> + </span> : null}
                                {item.corp ?
                                    <>
                                    <a onClick={handleClick(item.corp, item.subcorp)}>
                                        {item.corp}
                                    </a>
                                    {item.subcorp ? <span> / {item.subcorp}</span> : null}
                                    </> :
                                    <a onClick={handleClick(item.corp, item.subcorp)}>
                                        {ut.translate('global__click_for_details')}
                                    </a>
                                }
                            </React.Fragment>,
                        Array.isArray(props.data) ? props.data : [props.data]
                    ) :
                    null
                }
                {props.backlink ?
                    <>
                    ,{'\u00a0'}
                    {ut.translate('global__more_info')}:{'\u00a0'}
                    {pipe(
                        Array.isArray(props.backlink) ? props.backlink : [props.backlink],
                        List.filter(v => !!v),
                        List.map((item, i) =>
                            <React.Fragment key={`${item.label}:${i}`}>
                                {i > 0 ? <span>, </span> : null}
                                <BacklinkForm values={item} />
                            </React.Fragment>
                        )
                    )}
                    </> :
                    null
                }
            </div>
        );
    };

    // ------------------ <SourceInfoBox /> --------------------------------------------

    const SourceInfoBox:React.SFC<{
        data:SourceDetails;

    }> = (props) => {
        return (
            <div className="SourceInfoBox">
                <h2>{props.data.title}</h2>
                <p>{props.data.description}</p>
                {props.data.href ?
                    <p>{ut.translate('global__more_info')}: <a className="external" href={props.data.href} target="_blank">{props.data.href}</a></p> :
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
    };

    // --------------- <ErrorReportControl /> -------------------------------------------

    const ErrorReportControl:React.SFC<{
        url:string;

    }> = (props) => {
        return (
            <p className="report">
                <a href={props.url} target="_blank">{ut.translate('global__report_the_problem')}</a>
            </p>
        );
    };

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
                    <div className="cnc-tile-body content">
                        <p>
                            <AjaxLoader htmlClass="centered" />
                        </p>
                    </div>
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
                        {props.issueReportingUrl ? <ErrorReportControl url={props.issueReportingUrl} /> : null}

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
                        <div style={{height: '100%'}}>
                            {props.hasData ?
                                props.children :
                                <div className="not-applicable-box">
                                    <div className="message">
                                        <MessageStatusIcon statusType={SystemMessageType.WARNING} isInline={false} />
                                        <p>
                                            {ut.translate('global__not_enough_data_to_show_result')}
                                        </p>
                                    </div>
                                    <p className="not-applicable"><span>N/A</span></p>
                                </div>
                            }
                        </div>
                    </div>
                    {props.hasData && (props.sourceIdent || props.backlink) ?
                        <SourceLink data={props.sourceIdent} backlink={props.backlink} tileId={props.tileId} /> :
                        null
                    }
                </div>
            );
        }
    };

    // --------------- <ErrorBoundary /> -------------------------------------------

    class ErrorBoundary extends React.Component<{}, {error: string|null}> {

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
            if (evt.keyCode === Keyboard.Code.ESC) {
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
                {List.map(
                    ident =>
                        <a key={ident} className={`${props.currentIdx === ident ? 'current' : ''}`}
                                onClick={ident != null ? ()=>props.onChange(ident) : undefined}>{'\u25A0'}</a>,
                    props.blockIndices
                )}
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
            minWidth?:number;
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
            return (
                <div className="ResponsiveWrapper" style={{width: '100%', height: '100%', minWidth: this.props.minWidth}} ref={this.ref}>
                    {this.props.render(this.state.width, this.state.height)}
                </div>
            );
        }

    };


    // -------------------- <ElementTooltip /> ----------------------------------------------


    const ElementTooltip:GlobalComponents['ElementTooltip'] = (props) => {

        const ref = React.useRef<HTMLDivElement>(null);

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
                        {pipe(
                            props.values || {},
                            Dict.keys(),
                            List.map(
                                label => {
                                    const v = props.values ? props.values[label] : '';
                                    return (
                                        <tr key={label}>
                                        <th>{label}:</th>
                                        {typeof v === 'number' ?
                                            <td className="num">{ut.formatNumber(v, 1)}</td> :
                                            <td>{v}</td>
                                        }
                                        </tr>
                                    );
                                }
                            )
                        )}
                    </tbody>
                </table>
            </div>
        );
    }


    // -------------------- <AlignedRechartsTooltip /> ----------------------------------------------


    const AlignedRechartsTooltip:GlobalComponents['AlignedRechartsTooltip'] = (props) => {
        const { active, payload, label, formatter, separator } = props;
        if (active && payload) {
            return (
                <div style={{backgroundColor: 'white', padding: '0.5em', border: '1px solid lightgrey'}} >
                    <table>
                        <thead><tr><td colSpan={2}>{label}</td></tr></thead>
                        <tbody>
                        {List.map(
                            data => {
                                const formated_value = formatter ? formatter(data.value, data.name, data) : [data.value, data.name];
                                const [value, name] = typeof formated_value === "string" ? [formated_value, data.name] : formated_value;
                                return ((Array.isArray(value) ? value.every(v => Boolean(v)) : value) && name) ?
                                    <tr key={name}>
                                        <td key="name" style={{color: data.color}}>{`${name}${separator}`}</td>
                                        <td key="value" className="num">{Array.isArray(value) ? value.join(" ~ ") : value}{data.unit}</td>
                                    </tr> :
                                    null;
                            },
                            payload
                        )}
                        </tbody>
                    </table>
                </div>
            );
        }

        return null;
      };


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
        ElementTooltip: ElementTooltip,
        SourceInfoBox: SourceInfoBox,
        AlignedRechartsTooltip: AlignedRechartsTooltip
    };
}
