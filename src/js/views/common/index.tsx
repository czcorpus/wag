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

import { MultiDict } from '../../multidict';
import { SystemMessageType, SourceDetails } from '../../types';
import { ScreenProps } from '../../page/hostPage';
import { BacklinkWithArgs } from '../../page/tile';
import { Actions } from '../../models/actions';

import * as S from './style';


export interface SourceInfo {
    corp:string;
    subcorp?:string;
    url?:string;
}

export type TooltipValues = {[key:string]:Array<{value:string|number; unit?:string}>}|null;

export interface GlobalComponents {

    AjaxLoader:React.FC<{
        htmlClass?:string;
    }>;

    MessageStatusIcon:React.FC<{
        statusType:SystemMessageType;
        isInline?:boolean;
        htmlClass?:string;
    }>;

    TileWrapper:React.FC<{
        isBusy:boolean;
        hasData:boolean;
        tileId:number;
        sourceIdent?:SourceInfo|Array<SourceInfo>;
        supportsTileReload:boolean;
        issueReportingUrl:string;
        backlink?:BacklinkWithArgs<{}>|Array<BacklinkWithArgs<{}>>;
        htmlClass?:string;
        error?:string;
        children:React.ReactNode;
    }>;

    ErrorBoundary:React.ComponentClass;

    ModalBox:React.ComponentClass<{
        onCloseClick?:()=>void;
        title:string;
        tileClass?:string;
        children?:React.ReactNode;
    }>;

    HorizontalBlockSwitch:React.FC<{
        blockIndices:Array<number>;
        currentIdx:number;
        htmlClass?:string;
        onChange:(idx:number)=>void;
    }>;

    ImageWithMouseover:React.FC<{
        file:string;
        alt:string;
        file2?:string;
        htmlClass?:string;
    }>;

    ResponsiveWrapper:React.ComponentClass<{
        render:(width:number, height:number)=>React.ReactElement<{width:number, height:number} & {}>;
        minWidth?:number;

        /**
         * Providing cell width fraction (1, 2, 3) may help
         * the wrapper to reduce size in case the box gets
         * potentially too big.
         */
        widthFract?:number;
    }>;

    ElementTooltip:React.FC<{
        x:number;
        y:number;
        visible:boolean;
        caption?:string;
        values:TooltipValues;

        multiWord?:boolean;
        colors?:(idx:number) => string;
    }>;

    SourceInfoBox:React.FC<{
        data:SourceDetails;
    }>;

    AlignedRechartsTooltip:React.FC<{
        active?:boolean;
        payload?:Array<{[key:string]:any}>;
        label?:string;
        formatter?:(value:string,name:string,data:{[key:string]:any}) => string | [string, string];
        payloadMapper?:(payload:{[key:string]:any}) => Array<{name:string; value:string|number; unit?:string}>;

        multiWord?:boolean;
        colors?:(idx:number) => string;
    }>;

    Paginator: React.FC<{
        page: number;
        numPages: number;

        onPrev: () => void;
        onNext: () => void;
    }>;
}

export function init(dispatcher:IActionDispatcher, ut:ViewUtils<{}>, resize$:Observable<ScreenProps>):GlobalComponents {

    // --------------- <AjaxLoader /> -------------------------------------------

    const AjaxLoader:GlobalComponents['AjaxLoader'] = (props) => {
        return <S.AjaxLoader src={ut.createStaticUrl('ajax-loader.gif')}
                    alt={ut.translate('global__alt_loading')}
                    className={props.htmlClass} />;
    }

    // --------------- <TitleLoaderBar /> -------------------------------------------

    const TitleLoaderBar:React.FC<{
    }> = (props) => {
        return (
            <S.TitleLoaderBar title={ut.translate('global__alt_loading')}>
                <div className="grad"></div>
            </S.TitleLoaderBar>
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

    const BacklinkForm:React.FC<{
        values:BacklinkWithArgs<{}>;

    }> = (props) => {
        const args = new MultiDict(props.values.args);
        return <S.BacklinkForm action={props.values.url} method={props.values.method} target="_blank" createStaticUrl={ut.createStaticUrl}>
            {pipe(
                args.items(),
                List.filter(v => v[1] !== null && v[1] !== undefined),
                List.map(([k, v], i) =>
                    <input key={`arg:${i}:${k}`} type="hidden" name={k} value={v} />
                )
            )}
            <button type="submit">
                {typeof props.values.label === 'string' ?
                    props.values.label :
                    props.values.label['en-US']
                }
            </button>
        </S.BacklinkForm>;
    }

    // --------------- <SourceLink /> ------------------------------------------------

    const SourceLink:React.FC<{
        data:SourceInfo;
        onClick:(corp:string, subcorp:string|undefined)=>void
    }> = (props) => {

        if (props.data.url) {
            return (
                <a href={props.data.url} target="_blank">{props.data.corp || props.data.url}</a>
            );

        } else if (props.data.corp) {
            return (
                <>
                    <a onClick={()=>props.onClick(props.data.corp, props.data.subcorp)}>
                        {props.data.corp}
                    </a>
                    {props.data.subcorp ? <span> / {props.data.subcorp}</span> : null}
                </>
            );

        } else {
            return (
                <a onClick={()=>props.onClick(props.data.corp, props.data.subcorp)}>
                    {ut.translate('global__click_for_details')}
                </a>
            );
        }
    }

    // --------------- <SourceReference /> -------------------------------------------

    const SourceReference:React.FC<{
        tileId:number;
        data:SourceInfo|Array<SourceInfo>|undefined;
        backlink:BacklinkWithArgs<{}>|Array<BacklinkWithArgs<{}>>|undefined;

    }> = (props) => {

        const handleClick = (corp:string, subcorp:string|undefined) => {
            dispatcher.dispatch<typeof Actions.GetSourceInfo>({
                name: Actions.GetSourceInfo.name,
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
                                <SourceLink data={item} onClick={handleClick} />
                            </React.Fragment>,
                        Array.isArray(props.data) ? props.data : [props.data]
                    ) :
                    null
                }
                {!Array.isArray(props.backlink) && props.backlink || Array.isArray(props.backlink) && !List.empty(props.backlink) ?
                    <>
                    ,{'\u00a0'}
                    {ut.translate('global__more_info')}:{'\u00a0'}
                    {pipe(
                        Array.isArray(props.backlink) ? props.backlink : [props.backlink],
                        List.filter(v => !!v),
                        List.sortAlphaBy(v => typeof v.label === 'string' ? v.label : v.label['en-US']),
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

    const SourceInfoBox:React.FC<{
        data:SourceDetails;

    }> = (props) => {
        return (
            <S.SourceInfoBox createStaticUrl={ut.createStaticUrl}>
                <h2>{props.data.title}</h2>
                <p>{props.data.description}</p>
                {props.data.href ?
                    <p>{ut.translate('global__more_info')}: <a className="external" href={props.data.href} target="_blank" rel="noopener">{props.data.href}</a></p> :
                    null
                }
            </S.SourceInfoBox>
        );
    };

    // --------------- <TileReloadControl /> -------------------------------------------

    const TileReloadControl:React.FC<{
        tileId:number;

    }> = (props) => {

        const handleClick = () => {
            dispatcher.dispatch<typeof Actions.RetryTileLoad>({
                name: Actions.RetryTileLoad.name,
                payload: {tileId: props.tileId}
            });
        };

        return (
            <S.TileReloadControl>
                <a onClick={handleClick}>{ut.translate('global__retry_reload')} {'\u21bb'}</a>
            </S.TileReloadControl>
        );
    };

    // --------------- <ErrorReportControl /> -------------------------------------------

    const ErrorReportControl:React.FC<{
        url:string;

    }> = (props) => {
        return (
            <p className="report">
                <a href={props.url} target="_blank" rel="noopener">{ut.translate('global__report_the_problem')}</a>
            </p>
        );
    };

    // --------------- <TileWrapper /> -------------------------------------------

    const TileWrapper:GlobalComponents['TileWrapper'] = (props) => {

        const handleAreaClick = () => {
            dispatcher.dispatch<typeof Actions.TileAreaClicked>({
                name: Actions.TileAreaClicked.name,
                payload: {
                    tileId: props.tileId
                }
            });
        };

        if (props.isBusy && !props.hasData) {
            return (
                <S.TileWrapper>
                    <div className="cnc-tile-body content">
                        <p>
                            <AjaxLoader htmlClass="centered" />
                        </p>
                    </div>
                </S.TileWrapper>
            );

        } else if (props.error) {
            return (
                <S.TileWrapper>
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
                </S.TileWrapper>
            );

        } else {
            const htmlClasses = [];
            if (props.htmlClass) {
                htmlClasses.push(props.htmlClass);
            }
            if (!props.hasData && !props.isBusy) {
                htmlClasses.push('empty');
            }
            return (
                <S.TileWrapper className={htmlClasses.join(' ')} onClick={handleAreaClick}>
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
                        <SourceReference data={props.sourceIdent} backlink={props.backlink} tileId={props.tileId} /> :
                        null
                    }
                </S.TileWrapper>
            );
        }
    };

    // --------------- <ErrorBoundary /> -------------------------------------------

    class ErrorBoundary extends React.Component<{children:React.ReactNode;}, {error: string|null}> {

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

    class ModalBox extends React.PureComponent<{
        onCloseClick:()=>void;
        title:string;
        tileClass?:string;
        children:React.ReactNode;
    }> {

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
                <S.ModalOverlay id="modal-overlay">
                    <div className="box cnc-tile">
                        <header className="cnc-tile-header">
                            <span>{this.props.title}</span>
                            <button className="close"
                                    ref={this.ref}
                                    onClick={this.props.onCloseClick}
                                    onKeyDown={this.handleKey}
                                    title={ut.translate('global__close_modal')}>
                                <img src={ut.createStaticUrl('close-icon.svg')} alt={ut.translate('global__img_alt_close_icon')} />
                            </button>
                        </header>
                        <div className={tileClasses}>
                            {this.props.children}
                        </div>
                        <footer><div className="fcontent" /></footer>
                    </div>
                </S.ModalOverlay>
            );
        }
    }

    // ------- <HorizontalBlockSwitch /> ---------------------------------------------------

    const HorizontalBlockSwitch:GlobalComponents['HorizontalBlockSwitch'] = (props) => {
        return (
            <S.HorizontalBlockSwitch className={props.htmlClass}>
                {List.map(
                    ident =>
                        <a key={ident} className={`${props.currentIdx === ident ? 'current' : ''}`}
                                onClick={ident != null ? ()=>props.onChange(ident) : undefined}>{'\u25A0'}</a>,
                    props.blockIndices
                )}
            </S.HorizontalBlockSwitch>
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
                    onMouseOut={()=>set2ndState(!is2ndState)}
                    alt={props.alt} />
        );
    };

    // --------- <ResponsiveWrapper /> ----------------------------------------------

    class ResponsiveWrapper extends React.Component<{
            render:(width:number, height:number)=>React.ReactElement<{width: number, height:number} & {}>;
            minWidth?:number;
            widthFract?:number;
       },
       {
            width:number;
            height:number;
            frameWidth:number;
            frameHeight:number;
        }> {

        private readonly ref:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.state = {
                width: 1,
                height: 1,
                frameWidth: 1,
                frameHeight: 1
            };
            this.ref = React.createRef();
            this.handleWindowResize = this.handleWindowResize.bind(this);
            resize$.subscribe(this.handleWindowResize);
        }

        private calcAndSetSizes():void {
            if (this.ref.current) {
                const cellWidthFract = this.props.widthFract ?? 1;
                const maxHeightPortion = cellWidthFract > 2 ? 0.25 : 0.32;
                const newWidth = this.ref.current.getBoundingClientRect().width;
                const newHeight = this.ref.current.getBoundingClientRect().height;
                this.setState({
                    width: newWidth,
                    height: newHeight < window.innerHeight * maxHeightPortion ? newHeight : window.innerHeight * maxHeightPortion,
                    frameWidth: window.innerWidth,
                    frameHeight: window.innerHeight
                });
            }
        }

        componentDidMount() {
            this.calcAndSetSizes();
        }

        private handleWindowResize(props:ScreenProps) {
            this.calcAndSetSizes();
        }

        render() {
            return (
                <S.ResponsiveWrapper minWidth={this.props.minWidth} ref={this.ref}>
                    {this.props.render(this.state.width, this.state.height)}
                </S.ResponsiveWrapper>
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
            position: 'absolute',
            top: calcYPos(),
            left: calcXPos()
        };

        const decimalSeparator = ut.formatNumber(0.1).slice(1, -1);

        return (
            <S.WdgTooltip multiword={props.multiWord} ref={ref} style={style}>
                <table>
                    <thead><tr><th className='value' colSpan={4}>{props.caption}</th></tr></thead>
                    <tbody>
                        {pipe(
                            props.values || {},
                            Dict.toEntries(),
                            List.map(
                                ([label, values], i) => {
                                    const labelTheme = props.multiWord && props.colors ? {backgroundColor: props.colors(i)} : null;
                                    return <tr key={label}>
                                        <td className='label' style={labelTheme}>{label}</td>
                                        {List.flatMap((data, index) => {
                                            if (typeof data.value === 'number') {
                                                const [numWh, numDec] = ut.formatNumber(data.value, 1).split(decimalSeparator);
                                                return [
                                                    <td key={`numWh${index}`} className='value numWh'>{numWh}</td>,
                                                    <td key={`numDec${index}`} className='value numDec'>{numDec ? decimalSeparator + numDec : null}</td>,
                                                    <td key={`unit${index}`} className='value'>{data.unit}</td>
                                                ]

                                            } else if (typeof data.value === 'string') {
                                                return [
                                                    <td key={`value${index}`} className='value' colSpan={2}>{data.value}</td>,
                                                    <td key={`unit${index}`} className='value'>{data.unit}</td>
                                                ]
                                            }
                                        }, values)}
                                    </tr>
                                }
                            )
                        )}
                    </tbody>
                </table>
            </S.WdgTooltip>
        );
    }


    // -------------------- <AlignedRechartsTooltip /> ----------------------------------------------


    const AlignedRechartsTooltip:GlobalComponents['AlignedRechartsTooltip'] = (props?) => {

        const { active, payload, label, formatter, payloadMapper, multiWord, colors} = props;
        if (active && payload) {
            const decimalSeparator = ut.formatNumber(0.1).slice(1, -1);
            return (
                <S.WdgTooltip multiword={multiWord}>
                    <table>
                        <thead><tr><th className="value" colSpan={4}>{label}</th></tr></thead>
                        <tbody>
                        {List.map(
                            (data, index) => {
                                const formated_value = formatter ? formatter(data.value, data.name, data) : [data.value, data.name];
                                const [value, label] = Array.isArray(formated_value) ? formated_value : [formated_value, data.name];
                                const labelTheme = multiWord && colors ? {backgroundColor: colors(index)} : null;

                                if (value && label) {
                                    if (typeof value === 'string') {
                                        return <tr key={label}>
                                            <td key="name" className="label" style={labelTheme}>{label}</td>
                                            <td key="value" className="value" colSpan={2}>{value}</td>
                                            <td key="unit" className="value">{data.unit}</td>
                                        </tr>

                                    } else if (Array.isArray(value)) {
                                        return (
                                            <tr key={label}>
                                                <td key="name" className="label" style={labelTheme}>{label}</td>
                                                {List.map(
                                                    ([val, unit]) => {
                                                        if (typeof val === 'string') {
                                                            return <React.Fragment key={`value:${val}:${unit}`}>
                                                                <td className="value" colSpan={2}>{val}</td>
                                                                <td className="value">{unit}</td>
                                                            </React.Fragment>;
                                                        } else {
                                                            const [numWh, numDec] = ut.formatNumber(val, 1).split(decimalSeparator);
                                                            return <React.Fragment key={`value:${numWh}:${unit}`}>
                                                                <td className="value numWh">{numWh}</td>
                                                                <td className="value numDec">{numDec ? decimalSeparator + numDec : null}</td>
                                                                <td className="value">{unit}</td>
                                                            </React.Fragment>;
                                                        }
                                                    },
                                                    value
                                                )}
                                            </tr>
                                        );

                                    } else if (typeof value === 'number') {
                                        const [numWh, numDec] = ut.formatNumber(value, 1).split(decimalSeparator);
                                        return <tr key={label}>
                                            <td key="name" className="label" style={labelTheme}>{label}</td>
                                            <td key="valueWh" className="numWh">{numWh}</td>
                                            <td key="valueDec" className="numDec">{numDec ? decimalSeparator + numDec : null}</td>
                                            <td key="unit" className="unit">{data.unit}</td>
                                        </tr>
                                    }
                                }
                                return null
                            },
                            payloadMapper ? List.flatMap(p => payloadMapper(p.payload), payload) : payload
                        )}
                        </tbody>
                    </table>
                </S.WdgTooltip>
            );
        }

        return null;
    };

    // ------------------ <Paginator /> --------------------------------------------

    const Paginator:React.FC<{
        page: number;
        numPages: number;

        onPrev: () => void;
        onNext: () => void;
    }> = (props) => {

        return (
            <S.Paginator>
                <a onClick={props.onPrev} className={`${props.page === 1 ? 'disabled' : null}`}>
                    <img className="arrow" src={ut.createStaticUrl(props.page === 1 ? 'triangle_left_gr.svg' : 'triangle_left.svg')}
                        alt={ut.translate('global__img_alt_triable_left')} />
                </a>
                <input className="page" type="text" readOnly={true} value={props.page} />
                <a onClick={props.onNext} className={`${props.page === props.numPages ? 'disabled' : null}`}>
                    <img className="arrow" src={ut.createStaticUrl(props.page === props.numPages ? 'triangle_right_gr.svg' : 'triangle_right.svg')}
                        alt={ut.translate('global__img_alt_triable_right')} />
                </a>
            </S.Paginator>
        );
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
        AlignedRechartsTooltip: AlignedRechartsTooltip,
        Paginator: Paginator,
    };
}
