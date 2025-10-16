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
import { List, Keyboard, pipe, Dict, Color, tuple } from 'cnc-tskit';

import { SystemMessageType, SourceDetails } from '../../types.js';
import { ScreenProps } from '../../page/hostPage.js';
import { Backlink, backlinkIsValid } from '../../page/tile.js';
import { Actions } from '../../models/actions.js';

import * as S from './style.js';
import { SourceCitation } from '../../api/abstract/sourceInfo.js';
import { Theme } from '../../page/theme.js';

export interface SourceInfo {
    corp: string;
    subcorp?: string;
    url?: string;
}

export type TooltipValues = {
    [key: string]: Array<{ value: string | number; unit?: string }>;
} | null;

export interface GlobalComponents {
    TileMinHeightContext: React.Context<number>;

    AjaxLoader: React.FC<{
        htmlClass?: string;
    }>;

    MessageStatusIcon: React.FC<{
        statusType: SystemMessageType;
        isInline?: boolean;
        htmlClass?: string;
    }>;

    TileWrapper: React.FC<{
        isBusy: boolean;
        hasData: boolean;
        tileId: number;
        sourceIdent?: SourceInfo | Array<SourceInfo>;
        supportsTileReload: boolean;
        issueReportingUrl: string;
        backlink?: Backlink | Array<Backlink>;
        htmlClass?: string;
        error?: string;
        children: React.ReactNode;
    }>;

    ErrorBoundary: React.ComponentClass;

    ModalBox: React.FC<{
        onCloseClick?: () => void;
        title: string;
        tileClass?: string;
        scrollableContents?: boolean;
        children?: React.ReactNode;
    }>;

    HorizontalBlockSwitch: React.FC<{
        blockIndices: Array<number>;
        currentIdx: number;
        htmlClass?: string;
        onChange: (idx: number) => void;
    }>;

    ImageWithMouseover: React.FC<{
        file: string;
        alt: string;
        file2?: string;
        htmlClass?: string;
    }>;

    ResponsiveWrapper: React.ComponentClass<{
        render: (
            width: number,
            height: number
        ) => React.ReactElement<{ width: number; height: number } & {}>;
        minWidth?: number;

        /**
         * Providing cell width fraction (1, 2, 3) may help
         * the wrapper to reduce size in case the box gets
         * potentially too big.
         */
        widthFract?: number;
    }>;

    ElementTooltip: React.FC<{
        x: number;
        y: number;
        visible: boolean;
        caption?: string;
        values: TooltipValues;
        customFooter?: React.ReactElement;

        multiWord?: boolean;
        colors?: (idx: number) => string;
    }>;

    SourceInfoBox: React.FC<{
        data: SourceDetails;
    }>;

    AlignedRechartsTooltip: React.FC<{
        active?: boolean;
        payload?: Array<{ [key: string]: any }>;
        label?: string;
        formatter?: (
            value: string,
            name: string,
            data: { [key: string]: any }
        ) => string | [string, string];
        payloadMapper?: (payload: {
            [key: string]: any;
        }) => Array<{ name: string; value: string | number; unit?: string }>;

        multiWord?: boolean;
        colors?: (idx: number) => string;
    }>;

    Paginator: React.FC<{
        page: number;
        numPages: number;

        onPrev: () => void;
        onNext: () => void;
    }>;

    useMobileComponent: () => boolean;
}

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<{}>,
    resize$: Observable<ScreenProps>,
    theme: Theme
): GlobalComponents {
    // --------------- <AjaxLoader /> -------------------------------------------

    const AjaxLoader: GlobalComponents['AjaxLoader'] = (props) => {
        return (
            <S.AjaxLoader
                src={ut.createStaticUrl('ajax-loader.svg')}
                alt={ut.translate('global__alt_loading')}
                className={props.htmlClass}
            />
        );
    };

    // --------------- <TitleLoaderBar /> -------------------------------------------

    const TitleLoaderBar: React.FC<{}> = (props) => {
        return (
            <S.TitleLoaderBar title={ut.translate('global__alt_loading')}>
                <div className="grad"></div>
            </S.TitleLoaderBar>
        );
    };

    // --------------- <MessageStatusIcon /> -------------------------------------------

    const MessageStatusIcon: GlobalComponents['MessageStatusIcon'] = (
        props
    ) => {
        const m = {
            [SystemMessageType.INFO]: 'info-icon.svg',
            [SystemMessageType.WARNING]: 'warning-icon.svg',
            [SystemMessageType.ERROR]: 'error-icon.svg',
        };

        const renderImg = () => {
            if (props.statusType && m[props.statusType]) {
                return (
                    <img
                        className="info-icon"
                        src={ut.createStaticUrl(m[props.statusType])}
                        alt={props.statusType}
                    />
                );
            }
            return null;
        };

        if (props.isInline) {
            return (
                <span
                    className={`MessageStatusIcon${props.htmlClass ? ' ' + props.htmlClass : ''}`}
                >
                    {renderImg()}
                </span>
            );
        } else {
            return (
                <div
                    className={`MessageStatusIcon${props.htmlClass ? ' ' + props.htmlClass : ' icon-box'}`}
                >
                    {renderImg()}
                </div>
            );
        }
    };

    // ------------- <BacklinkButton /> ----------------------------------

    const BacklinkButton: React.FC<{
        backlink: Backlink;
        backlinkHandler: () => void;
    }> = (props) => {
        return (
            <S.BacklinkButton
                $createStaticUrl={ut.createStaticUrl}
                type="button"
                onClick={props.backlinkHandler}
            >
                {typeof props.backlink.label === 'string'
                    ? props.backlink.label
                    : props.backlink.label['en-US']}
            </S.BacklinkButton>
        );
    };

    // --------------- <SourceLink /> ------------------------------------------------

    const SourceLink: React.FC<{
        data: SourceInfo;
        onClick: (corp: string, subcorp?: string) => void;
    }> = (props) => {
        if (props.data.url) {
            return (
                <a href={props.data.url} target="_blank">
                    {props.data.corp || props.data.url}
                </a>
            );
        } else if (props.data.corp) {
            return (
                <>
                    <a
                        onClick={() =>
                            props.onClick(props.data.corp, props.data.subcorp)
                        }
                    >
                        {props.data.corp}
                    </a>
                    {props.data.subcorp ? (
                        <span> / {props.data.subcorp}</span>
                    ) : null}
                </>
            );
        } else {
            return (
                <a
                    onClick={() =>
                        props.onClick(props.data.corp, props.data.subcorp)
                    }
                >
                    {ut.translate('global__click_for_details')}
                </a>
            );
        }
    };

    // --------------- <SourceReference /> -------------------------------------------

    const SourceReference: React.FC<{
        tileId: number;
        data?: SourceInfo | Array<SourceInfo>;
        backlink?: Backlink | Array<Backlink>;
    }> = (props) => {
        const handleSourceClick = (
            corp: string,
            subcorp: string | undefined
        ) => {
            dispatcher.dispatch<typeof Actions.GetSourceInfo>({
                name: Actions.GetSourceInfo.name,
                payload: {
                    tileId: props.tileId,
                    corpusId: corp,
                    subcorpusId: subcorp,
                },
            });
        };

        const handleBacklinkClick = (backlink: Backlink) => {
            dispatcher.dispatch<typeof Actions.FollowBacklink>({
                name: Actions.FollowBacklink.name,
                payload: {
                    tileId: props.tileId,
                    backlink,
                },
            });
        };

        return (
            <div className="source">
                {props.data ? ut.translate('global__source') + ':\u00a0' : null}
                {props.data
                    ? List.map(
                          (item, i) => (
                              <React.Fragment
                                  key={`${item.corp}:${item.subcorp}`}
                              >
                                  {i > 0 ? <span> + </span> : null}
                                  <SourceLink
                                      data={item}
                                      onClick={handleSourceClick}
                                  />
                              </React.Fragment>
                          ),
                          Array.isArray(props.data) ? props.data : [props.data]
                      )
                    : null}
                {backlinkIsValid(props.backlink) ? (
                    <>
                        ,{'\u00a0'}
                        {ut.translate('global__more_info')}:{'\u00a0'}
                        {pipe(
                            Array.isArray(props.backlink)
                                ? props.backlink
                                : [props.backlink],
                            List.filter((v) => !!v),
                            List.sortAlphaBy((v) =>
                                typeof v.label === 'string'
                                    ? v.label
                                    : v.label['en-US']
                            ),
                            List.map((item, i) => (
                                <React.Fragment key={`${item.label}:${i}`}>
                                    {i > 0 ? <span>, </span> : null}
                                    <BacklinkButton
                                        backlink={item}
                                        backlinkHandler={() =>
                                            handleBacklinkClick(item)
                                        }
                                    />
                                </React.Fragment>
                            ))
                        )}
                    </>
                ) : null}
            </div>
        );
    };

    // ------------------- <SourceCitations /> -----------------------------------------

    const SourceCitations: React.FC<{
        data: SourceCitation;
    }> = (props) => {
        if (
            props.data.papers.length > 0 ||
            props.data.main ||
            props.data.otherBibliography
        ) {
            return (
                <>
                    <h2>
                        {ut.translate('global__corpus_as_resource_{corpus}', {
                            corpus: props.data.sourceName,
                        })}
                        :
                    </h2>
                    <div
                        className="html"
                        dangerouslySetInnerHTML={{ __html: props.data.main }}
                    />
                    {props.data.papers.length > 0 ? (
                        <>
                            <h2>{ut.translate('global__references')}:</h2>
                            {List.map(
                                (item, i) => (
                                    <div
                                        key={i}
                                        className="html"
                                        dangerouslySetInnerHTML={{
                                            __html: item,
                                        }}
                                    />
                                ),
                                props.data.papers
                            )}
                        </>
                    ) : null}
                    {props.data.otherBibliography ? (
                        <>
                            <h2>
                                {ut.translate('global__general_references')}:
                            </h2>
                            <div
                                className="html"
                                dangerouslySetInnerHTML={{
                                    __html: props.data.otherBibliography,
                                }}
                            />
                        </>
                    ) : null}
                </>
            );
        } else {
            return (
                <div className="empty-citation-info">
                    {ut.translate('global__no_citation_info')}
                </div>
            );
        }
    };

    // ------------------ <SourceInfoBox /> --------------------------------------------

    const SourceInfoBox: React.FC<{
        data: SourceDetails;
    }> = (props) => {
        const mkStyle = (bgCol: string) => ({
            color: pipe(
                bgCol,
                Color.importColor(1),
                Color.textColorFromBg(),
                Color.color2str()
            ),
            backgroundColor: pipe(
                bgCol,
                Color.importColor(1),
                ([r, g, b, o]) => {
                    return tuple(r, g, b, 0.6);
                },
                Color.color2str()
            ),
        });

        const renderKeywords = () => {
            if (props.data.keywords && props.data.keywords.length > 0) {
                return props.data.keywords.map((kw) => (
                    <span
                        key={kw.name}
                        className="keyword"
                        style={kw.color ? mkStyle(kw.color) : undefined}
                    >
                        {kw.name}
                    </span>
                ));
            } else {
                return '-';
            }
        };

        return (
            <S.SourceInfoBox $createStaticUrl={ut.createStaticUrl}>
                <h2>{props.data.title}</h2>
                <p>{props.data.description}</p>
                {props.data.href ? (
                    <p>
                        {ut.translate('global__more_info')}:{' '}
                        <a
                            className="external"
                            href={props.data.href}
                            target="_blank"
                            rel="noopener"
                        >
                            {props.data.href}
                        </a>
                    </p>
                ) : null}
                {props.data.keywords && props.data.keywords.length > 0 ? (
                    <>
                        <h2>{ut.translate('global__keywords')}:</h2>
                        <p>{renderKeywords()}</p>
                    </>
                ) : null}
                {props.data.citationInfo ? (
                    <SourceCitations data={props.data.citationInfo} />
                ) : null}
            </S.SourceInfoBox>
        );
    };

    // --------------- <TileReloadControl /> -------------------------------------------

    const TileReloadControl: React.FC<{
        tileId: number;
    }> = (props) => {
        const handleClick = () => {
            dispatcher.dispatch<typeof Actions.RetryTileLoad>({
                name: Actions.RetryTileLoad.name,
                payload: { tileId: props.tileId },
            });
        };

        return (
            <S.TileReloadControl>
                <a onClick={handleClick}>
                    {ut.translate('global__retry_reload')} {'\u21bb'}
                </a>
            </S.TileReloadControl>
        );
    };

    // --------------- <ErrorReportControl /> -------------------------------------------

    const ErrorReportControl: React.FC<{
        url: string;
    }> = (props) => {
        return (
            <p className="report">
                <a href={props.url} target="_blank" rel="noopener">
                    {ut.translate('global__report_the_problem')}
                </a>
            </p>
        );
    };

    // --------------- <TileWrapper /> -------------------------------------------

    const TileWrapper: GlobalComponents['TileWrapper'] = (props) => {
        const handleAreaClick = () => {
            dispatcher.dispatch<typeof Actions.TileAreaClicked>({
                name: Actions.TileAreaClicked.name,
                payload: {
                    tileId: props.tileId,
                },
            });
        };

        if (props.isBusy && !props.hasData) {
            return (
                <S.TileWrapper>
                    <div className="wag-tile-body content">
                        <p>
                            <AjaxLoader htmlClass="centered" />
                        </p>
                    </div>
                </S.TileWrapper>
            );
        } else if (props.error) {
            return (
                <S.TileWrapper>
                    <div className="wag-tile-body content error">
                        <div className="message">
                            <MessageStatusIcon
                                statusType={SystemMessageType.ERROR}
                                isInline={false}
                            />
                            <p>{props.error}</p>
                        </div>
                        <div />
                        {props.supportsTileReload ? (
                            <TileReloadControl tileId={props.tileId} />
                        ) : null}
                        {props.issueReportingUrl ? (
                            <ErrorReportControl url={props.issueReportingUrl} />
                        ) : null}
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
                <S.TileWrapper
                    className={htmlClasses.join(' ')}
                    onClick={handleAreaClick}
                >
                    <div className="loader-wrapper">
                        {props.hasData && props.isBusy ? (
                            <TitleLoaderBar />
                        ) : null}
                    </div>
                    <div
                        className={`wag-tile-body content${props.hasData ? '' : ' empty'}`}
                    >
                        <div style={{ height: '100%' }}>
                            {props.hasData ? (
                                props.children
                            ) : (
                                <div className="not-applicable-box">
                                    <div className="message">
                                        <MessageStatusIcon
                                            statusType={
                                                SystemMessageType.WARNING
                                            }
                                            isInline={false}
                                        />
                                        <p>
                                            {ut.translate(
                                                'global__not_enough_data_to_show_result'
                                            )}
                                        </p>
                                    </div>
                                    <p className="not-applicable">
                                        <span>N/A</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    {props.hasData && (props.sourceIdent || props.backlink) ? (
                        <SourceReference
                            data={props.sourceIdent}
                            backlink={props.backlink}
                            tileId={props.tileId}
                        />
                    ) : null}
                </S.TileWrapper>
            );
        }
    };

    // --------------- <ErrorBoundary /> -------------------------------------------

    class ErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { error: string | null }
    > {
        constructor(props) {
            super(props);
            this.state = { error: null };
        }

        componentDidCatch(error, info) {
            console.error(error);
            this.setState({ error: error });
        }

        render() {
            if (this.state.error) {
                return (
                    <div className="wag-tile-body error">
                        <div className="message">
                            <MessageStatusIcon
                                statusType={SystemMessageType.ERROR}
                                isInline={false}
                            />
                            <p>
                                {ut.translate(
                                    'global__failed_to_render_component'
                                )}
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

    const ModalBox: GlobalComponents['ModalBox'] = (props) => {
        const ref: React.RefObject<HTMLButtonElement> = React.createRef();

        React.useEffect(() => {
            if (ref.current) {
                ref.current.focus();
            }
        }, []);

        const handleKey = (evt: React.KeyboardEvent) => {
            if (evt.key === Keyboard.Value.ESC) {
                props.onCloseClick();
            }
        };

        return (
            <S.ModalOverlay id="modal-overlay">
                <div className="box">
                    <header className="wag-tile-header">
                        <span>{props.title}</span>
                        <button
                            className="close"
                            ref={ref}
                            onClick={props.onCloseClick}
                            onKeyDown={handleKey}
                            title={ut.translate('global__close_modal')}
                        >
                            <img
                                className="filtered"
                                src={ut.createStaticUrl('close-icon.svg')}
                                alt={ut.translate('global__img_alt_close_icon')}
                            />
                        </button>
                    </header>
                    <div
                        className={props.tileClass || null}
                        style={
                            props.scrollableContents
                                ? { paddingRight: 0, paddingBottom: 0 }
                                : null
                        }
                    >
                        {props.children}
                    </div>
                    <footer>
                        <div className="fcontent" />
                    </footer>
                </div>
            </S.ModalOverlay>
        );
    };

    // ------- <HorizontalBlockSwitch /> ---------------------------------------------------

    const HorizontalBlockSwitch: GlobalComponents['HorizontalBlockSwitch'] = (
        props
    ) => {
        return (
            <S.HorizontalBlockSwitch className={props.htmlClass}>
                {List.map(
                    (ident) => (
                        <a
                            key={ident}
                            className={`${props.currentIdx === ident ? 'current' : ''}`}
                            onClick={
                                ident != null
                                    ? () => props.onChange(ident)
                                    : undefined
                            }
                        >
                            {'\u25A0'}
                        </a>
                    ),
                    props.blockIndices
                )}
            </S.HorizontalBlockSwitch>
        );
    };

    // --------- <ImageWithMouseover /> ---------------------------------------------------------

    const ImageWithMouseover: GlobalComponents['ImageWithMouseover'] = (
        props
    ) => {
        const [is2ndState, set2ndState] = React.useState(false);

        let file2 = props.file2;
        if (!file2) {
            const items = props.file.split('.');
            file2 = `${items.slice(0, items.length - 1).join('.')}_s.${items[items.length - 1]}`;
        }

        return (
            <img
                src={ut.createStaticUrl(is2ndState ? file2 : props.file)}
                onMouseOver={() => set2ndState(!is2ndState)}
                onMouseOut={() => set2ndState(!is2ndState)}
                alt={props.alt}
            />
        );
    };

    // --------- <ResponsiveWrapper /> ----------------------------------------------

    class ResponsiveWrapper extends React.Component<
        {
            render: (
                width: number,
                height: number
            ) => React.ReactElement<{ width: number; height: number } & {}>;
            minWidth?: number;
            widthFract?: number;
        },
        {
            width: number;
            height: number;
            frameWidth: number;
            frameHeight: number;
        }
    > {
        private readonly ref: React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.state = {
                width: 1,
                height: 1,
                frameWidth: 1,
                frameHeight: 1,
            };
            this.ref = React.createRef();
            this.handleWindowResize = this.handleWindowResize.bind(this);
            resize$.subscribe(this.handleWindowResize);
        }

        private calcAndSetSizes(): void {
            if (this.ref.current) {
                const wrapper = this.ref.current.closest('.wag-tile-body');
                const cellWidthFract = this.props.widthFract ?? 1;
                const maxHeightPortion = cellWidthFract > 2 ? 0.25 : 0.32;
                const newWidth = wrapper.getBoundingClientRect().width;
                const newHeight = wrapper.getBoundingClientRect().height;
                this.setState({
                    width: newWidth,
                    height:
                        newHeight < window.innerHeight * maxHeightPortion
                            ? newHeight
                            : window.innerHeight * maxHeightPortion,
                    frameWidth: window.innerWidth,
                    frameHeight: window.innerHeight,
                });
            }
        }

        componentDidMount() {
            this.calcAndSetSizes();
        }

        private handleWindowResize(props: ScreenProps) {
            this.calcAndSetSizes();
        }

        render() {
            return (
                <S.ResponsiveWrapper
                    $minWidth={this.props.minWidth}
                    ref={this.ref}
                >
                    {this.props.render(this.state.width, this.state.height)}
                </S.ResponsiveWrapper>
            );
        }
    }

    // -------------------- <ElementTooltip /> ----------------------------------------------

    const ElementTooltip: GlobalComponents['ElementTooltip'] = (props) => {
        const ref = React.useRef<HTMLDivElement>(null);

        const calcXPos = () =>
            ref.current
                ? Math.max(
                      0,
                      props.x - ref.current.getBoundingClientRect().width - 20
                  )
                : props.x;

        const calcYPos = () => (ref.current ? props.y + 10 : props.y);

        const style: React.CSSProperties = {
            display: props.visible ? 'block' : 'none',
            visibility: ref.current ? 'visible' : 'hidden',
            position: 'absolute',
            top: calcYPos(),
            left: calcXPos(),
        };

        const decimalSeparator = ut.formatNumber(0.1).slice(1, -1);

        return (
            <S.WdgTooltip $multiword={props.multiWord} ref={ref} style={style}>
                <table>
                    <thead>
                        <tr>
                            <th className="value" colSpan={4}>
                                {props.caption}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {pipe(
                            props.values || {},
                            Dict.toEntries(),
                            List.map(([label, values], i) => {
                                const labelTheme =
                                    props.multiWord && props.colors
                                        ? { backgroundColor: props.colors(i) }
                                        : null;
                                return (
                                    <tr key={label}>
                                        <td
                                            className="label"
                                            style={labelTheme}
                                        >
                                            {label}
                                        </td>
                                        {List.flatMap((data, index) => {
                                            if (
                                                typeof data.value === 'number'
                                            ) {
                                                const [numWh, numDec] = ut
                                                    .formatNumber(data.value, 1)
                                                    .split(decimalSeparator);
                                                return [
                                                    <td
                                                        key={`numWh${index}`}
                                                        className="value numWh"
                                                    >
                                                        {numWh}
                                                    </td>,
                                                    <td
                                                        key={`numDec${index}`}
                                                        className="value numDec"
                                                    >
                                                        {numDec
                                                            ? decimalSeparator +
                                                              numDec
                                                            : null}
                                                    </td>,
                                                    <td
                                                        key={`unit${index}`}
                                                        className="value"
                                                    >
                                                        {data.unit}
                                                    </td>,
                                                ];
                                            } else if (
                                                typeof data.value === 'string'
                                            ) {
                                                return [
                                                    <td
                                                        key={`value${index}`}
                                                        className="value"
                                                        colSpan={2}
                                                    >
                                                        {data.value}
                                                    </td>,
                                                    <td
                                                        key={`unit${index}`}
                                                        className="value"
                                                    >
                                                        {data.unit}
                                                    </td>,
                                                ];
                                            }
                                        }, values)}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                {props.customFooter ? (
                    <div className="footer">{props.customFooter}</div>
                ) : null}
            </S.WdgTooltip>
        );
    };

    // -------------------- <AlignedRechartsTooltip /> ----------------------------------------------

    const AlignedRechartsTooltip: GlobalComponents['AlignedRechartsTooltip'] = (
        props?
    ) => {
        const {
            active,
            payload,
            label,
            formatter,
            payloadMapper,
            multiWord,
            colors,
        } = props;
        if (active && payload) {
            const decimalSeparator = ut.formatNumber(0.1).slice(1, -1);
            return (
                <S.WdgTooltip $multiword={multiWord}>
                    <table>
                        <thead>
                            <tr>
                                <th className="value" colSpan={4}>
                                    {label}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {List.map(
                                (data, index) => {
                                    const formated_value = formatter
                                        ? formatter(data.value, data.name, data)
                                        : [data.value, data.name];
                                    const [value, label] = Array.isArray(
                                        formated_value
                                    )
                                        ? formated_value
                                        : [formated_value, data.name];
                                    const labelTheme =
                                        multiWord && colors
                                            ? { backgroundColor: colors(index) }
                                            : null;

                                    if (value && label) {
                                        if (typeof value === 'string') {
                                            return (
                                                <tr key={`${index}:${label}`}>
                                                    <td
                                                        key="name"
                                                        className="label"
                                                        style={labelTheme}
                                                    >
                                                        {label}
                                                    </td>
                                                    <td
                                                        key="value"
                                                        className="value"
                                                        colSpan={2}
                                                    >
                                                        {value}
                                                    </td>
                                                    <td
                                                        key="unit"
                                                        className="value"
                                                    >
                                                        {data.unit}
                                                    </td>
                                                </tr>
                                            );
                                        } else if (Array.isArray(value)) {
                                            return (
                                                <tr key={label}>
                                                    <td
                                                        key="name"
                                                        className="label"
                                                        style={labelTheme}
                                                    >
                                                        {label}
                                                    </td>
                                                    {List.map(([val, unit]) => {
                                                        if (
                                                            typeof val ===
                                                            'string'
                                                        ) {
                                                            return (
                                                                <React.Fragment
                                                                    key={`value:${val}:${unit}`}
                                                                >
                                                                    <td
                                                                        className="value"
                                                                        colSpan={
                                                                            2
                                                                        }
                                                                    >
                                                                        {val}
                                                                    </td>
                                                                    <td className="value">
                                                                        {unit}
                                                                    </td>
                                                                </React.Fragment>
                                                            );
                                                        } else {
                                                            const [
                                                                numWh,
                                                                numDec,
                                                            ] = ut
                                                                .formatNumber(
                                                                    val,
                                                                    1
                                                                )
                                                                .split(
                                                                    decimalSeparator
                                                                );
                                                            return (
                                                                <React.Fragment
                                                                    key={`value:${numWh}:${unit}`}
                                                                >
                                                                    <td className="value numWh">
                                                                        {numWh}
                                                                    </td>
                                                                    <td className="value numDec">
                                                                        {numDec
                                                                            ? decimalSeparator +
                                                                              numDec
                                                                            : null}
                                                                    </td>
                                                                    <td className="value">
                                                                        {unit}
                                                                    </td>
                                                                </React.Fragment>
                                                            );
                                                        }
                                                    }, value)}
                                                </tr>
                                            );
                                        } else if (typeof value === 'number') {
                                            const [numWh, numDec] = ut
                                                .formatNumber(value, 1)
                                                .split(decimalSeparator);
                                            return (
                                                <tr key={label}>
                                                    <td
                                                        key="name"
                                                        className="label"
                                                        style={labelTheme}
                                                    >
                                                        {label}
                                                    </td>
                                                    <td
                                                        key="valueWh"
                                                        className="numWh"
                                                    >
                                                        {numWh}
                                                    </td>
                                                    <td
                                                        key="valueDec"
                                                        className="numDec"
                                                    >
                                                        {numDec
                                                            ? decimalSeparator +
                                                              numDec
                                                            : null}
                                                    </td>
                                                    <td
                                                        key="unit"
                                                        className="unit"
                                                    >
                                                        {data.unit}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    }
                                    return null;
                                },
                                payloadMapper
                                    ? List.flatMap(
                                          (p) => payloadMapper(p.payload),
                                          payload
                                      )
                                    : payload
                            )}
                        </tbody>
                    </table>
                </S.WdgTooltip>
            );
        }

        return null;
    };

    // ------------------ <Paginator /> --------------------------------------------

    const Paginator: React.FC<{
        page: number;
        numPages: number;

        onPrev: () => void;
        onNext: () => void;
    }> = (props) => {
        return (
            <S.Paginator>
                <a
                    onClick={props.onPrev}
                    className={`${props.page === 1 ? 'disabled' : null}`}
                >
                    <img
                        className="filtered arrow"
                        src={ut.createStaticUrl(
                            props.page === 1
                                ? 'triangle_left_gr.svg'
                                : 'triangle_left.svg'
                        )}
                        alt={ut.translate('global__img_alt_triable_left')}
                    />
                </a>
                <input
                    className="page"
                    type="text"
                    readOnly={true}
                    value={props.page}
                />
                <a
                    onClick={props.onNext}
                    className={`${props.page === props.numPages ? 'disabled' : null}`}
                >
                    <img
                        className="filtered arrow"
                        src={ut.createStaticUrl(
                            props.page === props.numPages
                                ? 'triangle_right_gr.svg'
                                : 'triangle_right.svg'
                        )}
                        alt={ut.translate('global__img_alt_triable_right')}
                    />
                </a>
            </S.Paginator>
        );
    };

    /**
     * useMobileComponent is a React hook providing information if the current
     * environment is a mobile screen. The condition is equivalent to the CSS
     * media query we use.
     */
    function useMobileComponent(): boolean {

            const [shouldUseMobile, setShouldUseMobile] = React.useState(false);
            const [isClient, setIsClient] = React.useState(false);
            const testQuery = theme.cssMobileScreen.replace("@media", "");

            React.useEffect(
                () => {
                    setIsClient(true);
                },
                []
            );

            React.useEffect(
                () => {
                    if (!isClient) {
                        return;
                    }
                    const mediaQuery = window.matchMedia(testQuery);
                    setShouldUseMobile(mediaQuery.matches);

                    const handleChange = (e: MediaQueryListEvent) => {
                        setShouldUseMobile(e.matches);
                    };
                    mediaQuery.addEventListener?.('change', handleChange);

                    return () => {
                        mediaQuery.removeEventListener?.('change', handleChange);
                    };
                },
                [isClient]
            );
        return shouldUseMobile;
    }

    // ===================

    return {
        AjaxLoader,
        MessageStatusIcon,
        TileWrapper,
        ErrorBoundary,
        ModalBox,
        HorizontalBlockSwitch,
        ImageWithMouseover,
        ResponsiveWrapper,
        ElementTooltip,
        SourceInfoBox,
        AlignedRechartsTooltip,
        Paginator,
        TileMinHeightContext: React.createContext(100),
        useMobileComponent
    };
}
