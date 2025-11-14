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
import { Bound, IActionDispatcher, useModel, ViewUtils } from 'kombo';
import * as React from 'react';
import { Keyboard, pipe, List } from 'cnc-tskit';
import { debounceTime, map, tap } from 'rxjs/operators';

import { Input } from '../page/forms.js';
import { SystemMessageType, SourceDetails, isCorpusDetails } from '../types.js';
import {
    QueryType,
    QueryMatch,
    RecognizedQueries,
    QueryTypeMenuItem,
} from '../query/index.js';
import { AltViewIconProps, TileFrameProps } from '../page/tile.js';
import { TileGroup } from '../page/layout.js';
import { Actions } from '../models/actions.js';
import { MessagesModel, MessagesState } from '../models/messages.js';
import { QueryFormModel } from '../models/query.js';
import {
    WdglanceTilesModel,
    blinkAndDehighlight,
    TileResultFlag,
    TileResultFlagRec,
} from '../models/tiles.js';
import { init as corpusInfoViewInit } from './common/corpusInfo.js';
import { GlobalComponents } from './common/index.js';
import { fromEvent, timer } from 'rxjs';
import { ThemeProvider } from 'styled-components';

import * as S from './style.js';
import * as CS from './common/style.js';
import { GlobalStyle } from './layout/style.js';
import {
    MainPosAttrValues,
    TranslatLanguage,
    UserQuery,
} from '../conf/index.js';
import { Theme } from '../page/theme.js';

export interface WdglanceMainProps {
    layout: Array<TileGroup>;
    homepageSections: Array<{ label: string; html: string; isFooterIntegrated: boolean; }>;
    queries: Array<UserQuery>;
    isMobile: boolean;
    isAnswerMode: boolean;
    error: [number, string] | null;
    onMount: () => void;
}

function mkTileSectionId(tileId: number): string {
    return `tile-${tileId}`;
}

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    formModel: QueryFormModel,
    tilesModel: WdglanceTilesModel,
    messagesModel: MessagesModel,
    dynamicTheme: Theme
): React.FC<WdglanceMainProps> {
    const globalComponents = ut.getComponents();
    const CorpusInfo = corpusInfoViewInit(dispatcher, ut);
    const GlobalStyleWithDynamicTheme = GlobalStyle(dynamicTheme);

    // ------------------ <SystemMessage /> ------------------------------

    const SystemMessage: React.FC<{
        type: SystemMessageType;
        text: string;
        ident: string;
    }> = (props) => {
        let classType: string;

        switch (props.type) {
            case SystemMessageType.WARNING:
                classType = 'cnc-msgbox-warning';
                break;
            case SystemMessageType.ERROR:
                classType = 'cnc-msgbox-critical';
                break;
            case SystemMessageType.INFO:
            default:
                classType = 'cnc-msgbox-information';
                break;
        }

        const handleCloseClick = () => {
            dispatcher.dispatch<typeof Actions.RemoveSystemMessage>({
                name: Actions.RemoveSystemMessage.name,
                payload: {
                    ident: props.ident,
                },
            });
        };

        return (
            <S.SystemMessage>
                <div className={`wrapper cnc-msgbox ${classType}`}>
                    <div className="flex">
                        <globalComponents.MessageStatusIcon
                            statusType={props.type}
                            isInline={false}
                        />
                        <p className="text">{props.text}</p>
                        <div className="close">
                            <a onClick={handleCloseClick}>
                                <img
                                    className="filtered"
                                    src={ut.createStaticUrl('close-icon.svg')}
                                    alt={ut.translate(
                                        'global__img_alt_close_icon'
                                    )}
                                />
                            </a>
                        </div>
                    </div>
                </div>
            </S.SystemMessage>
        );
    };

    // ------------------ <TranslationLangSelector /> ------------------------------

    const TranslationLangSelector: React.FC<{
        value: string;
        translatLanguages: Array<TranslatLanguage>;
        htmlClass?: string;
        queryType: QueryType;
        onChange: (v: string) => void;
    }> = (props) => {
        const changeHandler = (evt: React.ChangeEvent<HTMLSelectElement>) => {
            props.onChange(evt.target.value);
        };

        return (
            <select
                className={`translat-lang-selector${props.htmlClass ? ' ' + props.htmlClass : ''}`}
                onChange={changeHandler}
                value={props.value}
                aria-label={ut.translate('global__aria_search_lang')}
            >
                {List.map(
                    (v) => (
                        <option key={v.code} value={v.code}>
                            {v.label}
                        </option>
                    ),
                    props.translatLanguages
                )}
            </select>
        );
    };

    // ------------------ <QueryInput /> ------------------------------

    const QueryInput: React.FC<{
        idx: number;
        value: Input;
        wantsFocus: boolean;
        allowRemoval: boolean;
        onContentChange: (s: string) => void;
        onEnter: () => void;
    }> = (props) => {
        const ref = React.useRef(null);

        React.useEffect(() => {
            if (ref.current !== null && props.wantsFocus) {
                ref.current.focus();
            }
        }, []);

        const handleInput = (evt: React.ChangeEvent<HTMLInputElement>) => {
            props.onContentChange(evt.target.value);
        };

        const handleKeyDown = (evt: React.KeyboardEvent): void => {
            if (evt.key === Keyboard.Value.ENTER) {
                props.onEnter();
                evt.stopPropagation();
                evt.preventDefault();
            }
        };

        return (
            <>
                <input
                    type="text"
                    name="search-query"
                    ref={ref}
                    className={`QueryInput${props.value.isValid ? '' : ' invalid'}`}
                    aria-label={ut.translate('global__aria_searched_word')}
                    onChange={handleInput}
                    value={props.value.value}
                    onKeyDown={handleKeyDown}
                    tabIndex={props.idx + 1}
                />
                {props.allowRemoval ? (
                    <RemoveCmpQueryField queryIdx={props.idx} />
                ) : null}
            </>
        );
    };

    // ------------------ <SubmitButton /> ------------------------------

    const SubmitButton: React.FC<{
        onClick: () => void;
    }> = (props) => {
        return (
            <S.SubmitButton>
                <button
                    className="wag-button wag-button-primary"
                    type="button"
                    onClick={props.onClick}
                    aria-label={ut.translate('global__aria_search_btn')}
                >
                    {ut.translate('global__search')}
                </button>
            </S.SubmitButton>
        );
    };

    // ------------------ <QueryTypeSelector /> ------------------------------

    const QueryTypeSelector: React.FC<{
        qeryTypes: Array<QueryTypeMenuItem>;
        value: string;
        hideUnavailableQueryTypes: boolean;
        expandMobileMenu: boolean;
        onChange: (v: string) => void;
    }> = (props) => (
        <S.QueryTypeSelector>
            {pipe(
                props.qeryTypes,
                List.filter((x) => x.isEnabled),
                List.size()
            ) < 2 && props.hideUnavailableQueryTypes ? (
                <span></span>
            ) : (
                <nav className={!props.expandMobileMenu ? 'collapsed' : ''}>
                    {pipe(
                        props.qeryTypes,
                        List.filter(
                            (v) =>
                                v.isEnabled || !props.hideUnavailableQueryTypes
                        ),
                        List.map((v, i) => (
                            <React.Fragment key={v.type}>
                                {i > 0 && <span className="separ"> | </span>}
                                <span
                                    className={`item${v.type === props.value ? ' current' : ''}`}
                                >
                                    {v.isEnabled ? (
                                        <a
                                            onClick={(
                                                evt: React.MouseEvent<HTMLAnchorElement>
                                            ) => props.onChange(v.type)}
                                            aria-current={
                                                v.type === props.value
                                                    ? 'page'
                                                    : null
                                            }
                                        >
                                            {v.label}
                                        </a>
                                    ) : (
                                        <span className="disabled">
                                            {v.label}
                                        </span>
                                    )}
                                </span>
                            </React.Fragment>
                        ))
                    )}
                </nav>
            )}
        </S.QueryTypeSelector>
    );

    // ------------------ <AddCmpQueryField /> ------------------------------

    const AddCmpQueryField: React.FC<{}> = (_) => {
        const handleClick = () => {
            dispatcher.dispatch<typeof Actions.AddCmpQueryInput>({
                name: Actions.AddCmpQueryInput.name,
            });
        };

        return (
            <li className="AddCmpQueryField">
                <button
                    type="button"
                    onClick={handleClick}
                    title={ut.translate('global__add_query_field')}
                >
                    <globalComponents.ImageWithMouseover
                        file={'plus-icon.svg'}
                        alt={ut.translate('global__img_alt_plus_icon')}
                    />
                </button>
            </li>
        );
    };

    // ------------------ <RemoveCmpQueryField /> ------------------------------

    const RemoveCmpQueryField: React.FC<{
        queryIdx: number;
    }> = (props) => {
        const handleClick = () => {
            dispatcher.dispatch<typeof Actions.RemoveCmpQueryInput>({
                name: Actions.RemoveCmpQueryInput.name,
                payload: {
                    queryIdx: props.queryIdx,
                },
            });
        };

        return (
            <span className="RemoveCmpQueryField">
                <button
                    type="button"
                    onClick={handleClick}
                    title={ut.translate('global__remove_query_field')}
                >
                    <globalComponents.ImageWithMouseover
                        file={'close-icon.svg'}
                        alt={ut.translate('global__remove_query_field')}
                    />
                </button>
            </span>
        );
    };

    // ------------------ <QueryFields /> ------------------------------

    const QueryFields: React.FC<{
        queries: Array<Input>;
        currQueryType: QueryType;
        wantsFocus: boolean;
        translatLang: string;
        translatLanguages: Array<TranslatLanguage>;
        maxCmpQueries: number;
        onEnterKey: () => void;
    }> = (props) => {
        const handleQueryInput =
            (idx: number) =>
            (s: string): void => {
                dispatcher.dispatch<typeof Actions.ChangeQueryInput>({
                    name: Actions.ChangeQueryInput.name,
                    payload: {
                        queryIdx: idx,
                        value: s,
                    },
                });
            };

        const handleTranslatLangChange = (lang: string) => {
            dispatcher.dispatch<typeof Actions.ChangeTranslatLanguage>({
                name: Actions.ChangeTranslatLanguage.name,
                payload: {
                    lang,
                },
            });
        };

        switch (props.currQueryType) {
            case QueryType.SINGLE_QUERY:
                return (
                    <>
                        <span className="input-row">
                            <QueryInput
                                idx={0}
                                value={props.queries[0]}
                                onEnter={props.onEnterKey}
                                onContentChange={handleQueryInput(0)}
                                wantsFocus={props.wantsFocus}
                                allowRemoval={false}
                            />
                        </span>
                    </>
                );
            case QueryType.CMP_QUERY:
                const focusOn = props.queries.findIndex(
                    (query, index) =>
                        query.value === '' || index === props.queries.length - 1
                );
                return (
                    <>
                        <ul className="input-group">
                            {props.queries.map((query, queryIdx) => (
                                <li
                                    className="input-row"
                                    key={`query:${queryIdx}`}
                                >
                                    <QueryInput
                                        idx={queryIdx}
                                        value={query}
                                        onEnter={props.onEnterKey}
                                        onContentChange={handleQueryInput(
                                            queryIdx
                                        )}
                                        wantsFocus={
                                            props.wantsFocus &&
                                            queryIdx === focusOn
                                        }
                                        allowRemoval={true}
                                    />
                                </li>
                            ))}
                            {props.queries.length < props.maxCmpQueries ? (
                                <AddCmpQueryField />
                            ) : null}
                        </ul>
                    </>
                );
            case QueryType.TRANSLAT_QUERY:
                return (
                    <>
                        <span className="input-row">
                            <QueryInput
                                idx={0}
                                value={props.queries[0]}
                                onEnter={props.onEnterKey}
                                onContentChange={handleQueryInput(0)}
                                wantsFocus={props.wantsFocus}
                                allowRemoval={false}
                            />
                        </span>
                        <span className="arrow">{'\u25B6'}</span>
                        <TranslationLangSelector
                            value={props.translatLang}
                            translatLanguages={props.translatLanguages}
                            htmlClass="secondary"
                            onChange={handleTranslatLangChange}
                            queryType={QueryType.TRANSLAT_QUERY}
                        />
                    </>
                );
        }
    };

    // --------------- <LemmaSelector /> -------------------------------------------

    const LemmaSelector: React.FC<{
        matches: RecognizedQueries;
        queries: Array<string>;
        lemmaSelectorModalVisible: boolean;
        modalSelections: Array<number>;
        mainPosAttr: MainPosAttrValues;
    }> = (props) => {
        const mkHandleClick =
            (queryIdx: number, lemmaVar: QueryMatch) => () => {
                dispatcher.dispatch<typeof Actions.ChangeCurrQueryMatch>({
                    name: Actions.ChangeCurrQueryMatch.name,
                    payload: {
                        queryIdx: queryIdx,
                        word: lemmaVar.word,
                        lemma: lemmaVar.lemma,
                        pos: List.map((p) => p.value, lemmaVar.pos),
                        upos: List.map((p) => p.value, lemmaVar.upos),
                    },
                });
            };

        const mkAltLabel = (v: QueryMatch) => {
            if (v[props.mainPosAttr].length === 0) {
                return ut.translate('global__alt_expr_any');
            } else {
                return List.map((v) => v.label, v[props.mainPosAttr]).join(' ');
            }
        };

        const handleCloseModal = () => {
            dispatcher.dispatch<typeof Actions.HideQueryMatchModal>({
                name: Actions.HideQueryMatchModal.name,
            });
        };

        const handleShowModal = () => {
            dispatcher.dispatch<typeof Actions.ShowQueryMatchModal>({
                name: Actions.ShowQueryMatchModal.name,
            });
        };

        const handleModalLemmaSelection =
            (queryIdx: number, variantIdx: number) => () => {
                dispatcher.dispatch<typeof Actions.SelectModalQueryMatch>({
                    name: Actions.SelectModalQueryMatch.name,
                    payload: {
                        queryIdx: queryIdx,
                        variantIdx: variantIdx,
                    },
                });
            };

        const handleConfirmModalSelection = () => {
            dispatcher.dispatch<typeof Actions.ApplyModalQueryMatchSelection>({
                name: Actions.ApplyModalQueryMatchSelection.name,
            });
        };

        if (props.queries.length === 1) {
            if (props.matches[0].length > 0) {
                const curr = List.find(
                    (v) => v.isCurrent == true,
                    props.matches[0]
                );
                if (curr) {
                    return (
                        <S.LemmaSelector>
                            {ut.translate('global__searching_by_pos')}:
                            {'\u00a0'}
                            <span className="curr">
                                {curr.lemma ? curr.lemma : curr.word} (
                                {mkAltLabel(curr)})
                            </span>
                            <br />
                            {props.matches[0].length > 1 ? (
                                <div className="variants">
                                    {ut.translate(
                                        'global__multiple_words_for_query'
                                    )}
                                    :{'\u00a0'}
                                    <ul>
                                        {pipe(
                                            props.matches[0],
                                            List.filter((v) => !v.isCurrent),
                                            List.map((v, i) => (
                                                <li
                                                    key={`${v.lemma}:${v[props.mainPosAttr]}:${i}`}
                                                >
                                                    {i > 0 ? (
                                                        <span>, </span>
                                                    ) : null}
                                                    <a
                                                        onClick={mkHandleClick(
                                                            0,
                                                            v
                                                        )}
                                                    >
                                                        {v.lemma} (
                                                        {mkAltLabel(v)})
                                                    </a>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                </div>
                            ) : null}
                        </S.LemmaSelector>
                    );
                }
                return <S.LemmaSelector></S.LemmaSelector>;
            }
        } else {
            if (props.lemmaSelectorModalVisible) {
                return (
                    <globalComponents.ModalBox
                        onCloseClick={handleCloseModal}
                        title={ut.translate('global__query_specification')}
                        tileClass="text"
                    >
                        <div className="LemmaSelector multiple-queries">
                            {List.map(
                                (queryMatches, queryIdx) => (
                                    <div
                                        key={`varGroup${queryIdx}`}
                                        className="variants"
                                    >
                                        <h2 className="query-num">
                                            [{queryIdx + 1}]
                                        </h2>
                                        <ul>
                                            {List.map(
                                                (v, i) => (
                                                    <li
                                                        key={`${v.lemma}:${v[props.mainPosAttr]}:${i}`}
                                                    >
                                                        <label>
                                                            <input
                                                                type="radio"
                                                                name={`lemma_${queryIdx}`}
                                                                checked={
                                                                    props
                                                                        .modalSelections[
                                                                        queryIdx
                                                                    ] === i
                                                                }
                                                                onChange={handleModalLemmaSelection(
                                                                    queryIdx,
                                                                    i
                                                                )}
                                                            />
                                                            <em>{v.lemma}</em> (
                                                            {mkAltLabel(v)})
                                                        </label>
                                                    </li>
                                                ),
                                                queryMatches
                                            )}
                                        </ul>
                                    </div>
                                ),
                                props.matches
                            )}
                            <p className="buttons">
                                <button
                                    className="wag-button wag-button-primary"
                                    type="button"
                                    onClick={handleConfirmModalSelection}
                                    aria-label={ut.translate(
                                        'global__aria_search_btn'
                                    )}
                                >
                                    {ut.translate(
                                        'global__modal_variants_confirm_btn'
                                    )}
                                </button>
                            </p>
                        </div>
                    </globalComponents.ModalBox>
                );
            } else {
                const numAmbig = props.matches.reduce(
                    (acc, curr) => acc + (curr.length > 1 ? 1 : 0),
                    0
                );
                return (
                    <S.LemmaSelector>
                        {numAmbig > 0 ? (
                            <a
                                className="modal-box-trigger"
                                onClick={handleShowModal}
                            >
                                {ut.translate(
                                    'global__some_results_ambiguous_msg_{num}',
                                    { num: numAmbig.toFixed() }
                                )}
                            </a>
                        ) : null}
                    </S.LemmaSelector>
                );
            }
        }
    };

    // ------------------ <WdglanceControls /> ------------------------------

    const WdglanceControls: React.FC<{
        isAnswerMode: boolean;
    }> = (props) => {
        const handleSubmit = () => {
            dispatcher.dispatch<typeof Actions.SubmitQuery>({
                name: Actions.SubmitQuery.name,
            });
        };

        const handleQueryTypeChange = (queryType: QueryType) => {
            dispatcher.dispatch(Actions.ChangeQueryType, { queryType });
        };

        const handleToggleMobileMenu = () => {
            dispatcher.dispatch(Actions.ToggleMobileMenu);
        };

        const state = useModel(formModel);
        const shouldShowHamburger = globalComponents.useMobileComponent();

        const numQTypes = pipe(
            state.queryTypesMenuItems,
            List.filter((x) => x.isEnabled),
            List.size()
        );
        const numSubWags = List.size(state.instanceSwitchMenu);

        return (
            <S.WdglanceControls
                className={props.isAnswerMode ? 'result-page-mode' : null}
            >
                <form className="wag-form">
                    <S.MenuTabs
                        className={
                            numQTypes + numSubWags < 2 &&
                            state.hideUnavailableQueryTypes
                                ? 'empty'
                                : ''
                        }
                    >
                        {shouldShowHamburger ? (
                            <S.HamburgerButton
                                className="wag-button wag-button-primary"
                                type="button"
                                onClick={handleToggleMobileMenu}
                            >
                                <span className="hamburger-icon">
                                    {'\u2630'}
                                </span>
                                {
                                    List.find(
                                        (v) => v.type === state.queryType,
                                        state.queryTypesMenuItems
                                    ).label
                                }
                            </S.HamburgerButton>
                        ) : null}
                        <QueryTypeSelector
                            onChange={handleQueryTypeChange}
                            qeryTypes={state.queryTypesMenuItems}
                            hideUnavailableQueryTypes={
                                state.hideUnavailableQueryTypes
                            }
                            value={state.queryType}
                            expandMobileMenu={state.expandMobileMenu}
                        />
                        {state.instanceSwitchMenu.length > 0 ? (
                            <OtherVariantsMenu
                                instanceSwitchMenu={state.instanceSwitchMenu}
                                expandMobileMenu={state.expandMobileMenu}
                            />
                        ) : null}
                    </S.MenuTabs>
                    <div className="main">
                        <QueryFields
                            wantsFocus={
                                !props.isAnswerMode ||
                                state.initialQueryType !== state.queryType
                            }
                            queries={state.queries}
                            currQueryType={state.queryType}
                            translatLang={state.currTranslatLanguage}
                            translatLanguages={state.translatLanguages}
                            onEnterKey={handleSubmit}
                            maxCmpQueries={state.maxCmpQueries}
                        />
                        <SubmitButton onClick={handleSubmit} />
                    </div>
                </form>
            </S.WdglanceControls>
        );
    };

    // ------------- <OtherVariantsMenu /> -------------------------------

    const OtherVariantsMenu: React.FC<{
        instanceSwitchMenu: Array<{
            label: string;
            url: string;
            current: boolean;
        }>;
        expandMobileMenu: boolean;
    }> = (props) => {
        return (
            <S.OtherVariantsMenu>
                <nav className={!props.expandMobileMenu ? 'collapsed' : ''}>
                    {List.map(
                        (item, i) => (
                            <React.Fragment key={item.label}>
                                {i > 0 ? (
                                    <span className="separ">|</span>
                                ) : null}
                                <span
                                    className={`item${item.current ? ' current' : ''}`}
                                >
                                    <a href={item.url}>{item.label}</a>
                                </span>
                            </React.Fragment>
                        ),
                        props.instanceSwitchMenu
                    )}
                </nav>
            </S.OtherVariantsMenu>
        );
    };

    // ------------- <HelpButton /> --------------------------------------

    const HelpButton: React.FC<{
        tileId: number;
    }> = (props) => {
        const handleClick = () => {
            dispatcher.dispatch<typeof Actions.ShowTileHelp>({
                name: Actions.ShowTileHelp.name,
                payload: {
                    tileId: props.tileId,
                },
            });
        };

        return (
            <span className="HelpButton bar-button">
                <button
                    type="button"
                    onClick={handleClick}
                    title={ut.translate('global__show_tile_help')}
                >
                    <img
                        className="filtered"
                        src={ut.createStaticUrl('question-mark.svg')}
                        alt={ut.translate('global__img_alt_question_mark')}
                    />
                </button>
            </span>
        );
    };

    // ------------- <AltViewButton /> --------------------------------------

    const AltViewButton: React.FC<{
        isAltView: boolean;
        tileId: number;
        altIconProps: AltViewIconProps;
    }> = ({
        isAltView,
        tileId,
        altIconProps: { baseImg, highlightedImg, inlineCss },
    }) => {
        const icon = ut.createStaticUrl(baseImg);
        const lightIcon = ut.createStaticUrl(highlightedImg);

        const handleClick = () => {
            if (isAltView) {
                dispatcher.dispatch<typeof Actions.DisableAltViewMode>({
                    name: Actions.DisableAltViewMode.name,
                    payload: {
                        ident: tileId,
                    },
                });
            } else {
                dispatcher.dispatch<typeof Actions.DisableAltViewMode>({
                    name: Actions.EnableAltViewMode.name,
                    payload: {
                        ident: tileId,
                    },
                });
            }
        };

        const label = isAltView
            ? ut.translate('global__switch_to_default_view')
            : ut.translate('global__switch_to_alt_view');

        return (
            <span className="AltViewButton bar-button">
                <button type="button" onClick={handleClick} title={label}>
                    <img
                        className="filtered"
                        src={isAltView ? lightIcon : icon}
                        alt={ut.translate('global__img_alt_alt_view')}
                        style={inlineCss}
                    />
                </button>
            </span>
        );
    };

    // ------------- <TweakButton /> --------------------------------------

    const TweakButton: React.FC<{
        tileId: number;
        isExtended: boolean;
    }> = (props) => {
        const handleClick = (evt: React.MouseEvent<HTMLButtonElement>) => {
            if (props.isExtended) {
                dispatcher.dispatch<typeof Actions.DisableTileTweakMode>({
                    name: Actions.DisableTileTweakMode.name,
                    payload: {
                        ident: props.tileId,
                    },
                });
            } else {
                dispatcher.dispatch<typeof Actions.EnableTileTweakMode>({
                    name: Actions.EnableTileTweakMode.name,
                    payload: {
                        ident: props.tileId,
                    },
                });
            }
        };

        return (
            <span className="TweakButton bar-button">
                <button
                    type="button"
                    onClick={handleClick}
                    title={
                        props.isExtended
                            ? ut.translate('global__reset_size')
                            : ut.translate('global__tweak')
                    }
                >
                    <img
                        className="filtered"
                        src={ut.createStaticUrl(
                            props.isExtended
                                ? 'config-icon_s.svg'
                                : 'config-icon.svg'
                        )}
                        alt={
                            props.isExtended
                                ? 'configuration icon (highlighted)'
                                : 'configuration icon'
                        }
                    />
                </button>
            </span>
        );
    };

    // ------------- <SaveButton /> --------------------------------------

    const SaveButton: React.FC<{
        tileId: number;
        disabled: boolean;
    }> = (props) => {
        const handleClick = (evt: React.MouseEvent<HTMLButtonElement>) => {
            if (!props.disabled) {
                dispatcher.dispatch(Actions.SaveSVGFigure, {
                    tileId: props.tileId,
                });
            }
        };

        return (
            <span className="SaveButton bar-button">
                <button
                    type="button"
                    onClick={handleClick}
                    title={ut.translate('global__save_svg')}
                >
                    <img
                        className="filtered"
                        src={
                            props.disabled
                                ? ut.createStaticUrl('download-button_g.svg')
                                : ut.createStaticUrl('download-button.svg')
                        }
                        alt={'download button'}
                    />
                </button>
            </span>
        );
    };

    // ------------- <AmbiguousResultWarning /> -------------------------------

    const AmbiguousResultWarning: React.FC<{}> = (props) => {
        const handleClick = (evt: React.MouseEvent<HTMLButtonElement>) => {
            dispatcher.dispatch<typeof Actions.ShowAmbiguousResultHelp>({
                name: Actions.ShowAmbiguousResultHelp.name,
            });
        };

        return (
            <span className="bar-button">
                <button
                    type="button"
                    onClick={handleClick}
                    title={ut.translate(
                        'global__not_using_lemmatized_query_title'
                    )}
                >
                    <globalComponents.MessageStatusIcon
                        statusType={SystemMessageType.WARNING}
                    />
                </button>
            </span>
        );
    };

    // ------------- <InitialHelpTile /> --------------------------------------

    const InitialHelpTile: React.FC<{ html: string }> = (props) => {
        const ref = React.useRef(null);
        React.useEffect(() => {
            if (ref.current !== null) {
                ref.current
                    .querySelectorAll('a')
                    .forEach((elm: HTMLAnchorElement) => {
                        elm.target = '_blank';
                        elm.rel = 'noopener';
                    });
            }
        });

        return (
            <div className="tile-body text">
                <div
                    className="raw-html"
                    dangerouslySetInnerHTML={{ __html: props.html }}
                    ref={ref}
                />
            </div>
        );
    };

    // ------------- <InitialHelp /> --------------------------------------

    const InitialHelp: React.FC<{
        sections: Array<{ label: string; html: string; isFooterIntegrated: boolean; }>;
    }> = (props) => {
        return (
            <>
                {pipe(
                    props.sections,
                    List.filter(sect => !sect.isFooterIntegrated),
                    List.map((sect, i) => (
                        <section key={`${sect}:${i}`} className="wag-tile help">
                            <header className="wag-tile-header panel">
                                {sect.label}
                            </header>
                            <InitialHelpTile html={sect.html} />
                        </section>
                    ))
                )}
            </>
        );
    };

    // ------------- <DisabledTile /> --------------------------------------

    const DisabledTile: React.FC<{
        reason: string;
    }> = (props) => (
        <CS.TileWrapper className="empty">
            <div className="loader-wrapper"></div>
            <div className="wag-tile-body content empty">
                <div className="not-applicable-box">
                    <div className="message">
                        <globalComponents.MessageStatusIcon
                            statusType={SystemMessageType.INFO}
                            isInline={false}
                        />
                        <p>{props.reason}</p>
                    </div>
                    <p
                        className="not-applicable"
                        title={ut.translate('global__not_applicable')}
                    >
                        <span>N/A</span>
                    </p>
                </div>
            </div>
        </CS.TileWrapper>
    );

    // ------------- <TileContainer /> --------------------------------------

    const TileContainer: React.FC<{
        isTweakMode: boolean;
        isMobile: boolean;
        isAltViewMode: boolean;
        helpURL: string;
        tile: TileFrameProps;
        overwriteLabel: string;
        supportsCurrQuery: boolean;
        tileResultFlag: TileResultFlagRec;
        isHighlighted: boolean;
        altViewIcon: AltViewIconProps;
    }> = (props) => {
        const getHTMLClass = () => {
            const ans = [
                'wag-tile',
                'app-output',
                `span-${props.tile.widthFract}`,
            ];

            if (props.isTweakMode) {
                ans.push('expanded');
            }
            if (props.isHighlighted) {
                ans.push('highlighted');
            }
            if (
                props.tileResultFlag.status === TileResultFlag.EMPTY_RESULT &&
                props.tile.hideOnNoData
            ) {
                ans.push('hidden-no-data');
            }
            return ans.join(' ');
        };

        const currLabel = props.overwriteLabel
            ? props.overwriteLabel
            : props.tile.label;

        return (
            <section
                id={mkTileSectionId(props.tile.tileId)}
                key={`tile-ident-${props.tile.tileId}`}
                className={getHTMLClass()}
            >
                <header className="wag-tile-header panel">
                    <h2>{currLabel}</h2>
                    <div className="window-buttons">
                        {props.tileResultFlag &&
                        props.tileResultFlag.canBeAmbiguousResult ? (
                            <AmbiguousResultWarning />
                        ) : null}
                        {props.tile.supportsSVGFigureSave ? (
                            <SaveButton
                                tileId={props.tile.tileId}
                                disabled={
                                    !props.tileResultFlag ||
                                    props.tileResultFlag.status !==
                                        TileResultFlag.VALID_RESULT
                                }
                            />
                        ) : null}
                        {props.tile.supportsAltView ? (
                            <AltViewButton
                                tileId={props.tile.tileId}
                                isAltView={props.isAltViewMode}
                                altIconProps={props.altViewIcon}
                            />
                        ) : null}
                        {props.tile.supportsTweakMode ? (
                            <TweakButton
                                tileId={props.tile.tileId}
                                isExtended={props.isTweakMode}
                            />
                        ) : null}
                        {props.tile.supportsHelpView ? (
                            <HelpButton tileId={props.tile.tileId} />
                        ) : null}
                    </div>
                </header>
                <div
                    className="provider"
                    style={{
                        height: '100%',
                        overflow: props.tile.maxTileHeight ? 'auto' : 'initial',
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            maxHeight: props.tile.maxTileHeight
                                ? props.tile.maxTileHeight
                                : 'initial',
                        }}
                    >
                        <globalComponents.ErrorBoundary>
                            {props.supportsCurrQuery ? (
                                <props.tile.Component
                                    tileId={props.tile.tileId}
                                    tileName={props.tile.tileName}
                                    tileLabel={currLabel}
                                    isMobile={props.isMobile}
                                    widthFract={props.tile.widthFract}
                                    supportsReloadOnError={
                                        props.tile.supportsReloadOnError
                                    }
                                    issueReportingUrl={
                                        props.tile.issueReportingUrl
                                    }
                                />
                            ) : (
                                <DisabledTile
                                    reason={props.tile.reasonTileDisabled}
                                />
                            )}
                        </globalComponents.ErrorBoundary>
                    </div>
                </div>
            </section>
        );
    };

    // ------- <MessagesBox /> ---------------------

    class MessagesBox extends React.PureComponent<MessagesState> {
        render() {
            return (
                <S.MessagesBox>
                    {this.props.systemMessages.length > 0 ? (
                        <S.Messages>
                            {List.map(
                                (msg) => (
                                    <SystemMessage
                                        key={msg.ident}
                                        type={msg.type}
                                        text={msg.text}
                                        ident={msg.ident}
                                    />
                                ),
                                this.props.systemMessages
                            )}
                        </S.Messages>
                    ) : null}
                </S.MessagesBox>
            );
        }
    }

    const BoundMessagesBox = messagesModel
        ? Bound(MessagesBox, messagesModel)
        : (_) => <MessagesBox systemMessages={[]} />;

    // -------------------- <TileGroupButton /> -----------------------------

    const TileGroupButton: React.FC<{
        groupHidden: boolean;
        groupDisabled: boolean;
        group: TileGroup;
        clickHandler: () => void;
        helpClickHandler: (() => void) | null;
    }> = (props) => {
        return (
            <S.TileGroupButton
                className={props.groupDisabled ? 'disabled' : null}
            >
                <h2>
                    <span className="flex">
                        <span
                            className={`triangle${props.groupHidden ? ' right' : ''}`}
                        >
                            {props.groupHidden ? (
                                <img
                                    className="filtered"
                                    src={ut.createStaticUrl(
                                        'triangle_w_right.svg'
                                    )}
                                    alt={ut.translate(
                                        'global__img_alt_triangle_w_right'
                                    )}
                                />
                            ) : (
                                <img
                                    className="filtered"
                                    src={ut.createStaticUrl(
                                        'triangle_w_down.svg'
                                    )}
                                    alt={ut.translate(
                                        'global__img_alt_triangle_w_down'
                                    )}
                                />
                            )}
                        </span>
                        <a
                            className="switch-common"
                            onClick={
                                props.groupDisabled
                                    ? null
                                    : () => props.clickHandler()
                            }
                            title={
                                props.groupHidden
                                    ? ut.translate(
                                          'global__click_to_show_group'
                                      )
                                    : ut.translate(
                                          'global__click_to_hide_group'
                                      )
                            }
                        >
                            <span className="switch">
                                {props.group.groupLabel}
                            </span>
                        </a>
                        {props.helpClickHandler ? (
                            <a
                                className="help"
                                onClick={() => props.helpClickHandler()}
                            >
                                ?
                            </a>
                        ) : null}
                    </span>
                </h2>
            </S.TileGroupButton>
        );
    };

    // -------------------- <MinimizedGroup /> ------------------------

    const MinimizedGroup: React.FC<{
        groupIdx: number;
        tiles: Array<TileFrameProps>;
    }> = (props) => {
        const handleClick = (tileId: number) => () => {
            dispatcher.dispatch<typeof Actions.OpenGroupAndHighlightTile>({
                name: Actions.OpenGroupAndHighlightTile.name,
                payload: {
                    groupIdx: props.groupIdx,
                    tileId: tileId,
                },
            });
        };

        return (
            <S.MinimizedGroup>
                {List.map(
                    (item) => (
                        <li key={`tile:${item.tileId}`}>
                            <a onClick={handleClick(item.tileId)}>
                                {item.label}
                            </a>
                        </li>
                    ),
                    props.tiles
                )}
            </S.MinimizedGroup>
        );
    };

    // -------------------- <TileGroupSection /> -----------------------------

    const TileGroupSection: React.FC<{
        data: TileGroup;
        labelsOverwrites: { [tileId: number]: string };
        idx: number;
        isHidden: boolean;
        hasData: boolean;
        isMobile: boolean;
        tileFrameProps: Array<TileFrameProps>;
        tweakActiveTiles: Array<number>;
        altViewActiveTiles: Array<number>;
        tileResultFlags: Array<TileResultFlagRec>;
        highlightedTileId: number;
    }> = (props) => {
        const handleGroupClick = (): void => {
            dispatcher.dispatch<typeof Actions.ToggleGroupVisibility>({
                name: Actions.ToggleGroupVisibility.name,
                payload: {
                    groupIdx: props.idx,
                },
            });
        };

        const handleGroupHeaderClick = (): void => {
            dispatcher.dispatch<typeof Actions.ShowGroupHelp>({
                name: Actions.ShowGroupHelp.name,
                payload: {
                    url: props.data.groupDescURL,
                    groupIdx: props.idx,
                },
            });
        };

        const renderResult = () => {
            if (!props.hasData) {
                return (
                    <S.Tiles>
                        <section
                            className="wag-tile app-output"
                            style={{ gridColumn: 'span 3' }}
                        >
                            <div className="provider">
                                <CS.TileWrapper>
                                    <div className="wag-tile-body content empty">
                                        <div className="message">
                                            <globalComponents.MessageStatusIcon
                                                statusType={
                                                    SystemMessageType.WARNING
                                                }
                                                isInline={false}
                                            />
                                            <p>
                                                {ut.translate(
                                                    'global__not_enought_data_for_group'
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </CS.TileWrapper>
                            </div>
                        </section>
                    </S.Tiles>
                );
            } else if (props.isHidden) {
                return (
                    <MinimizedGroup
                        groupIdx={props.idx}
                        tiles={List.map(
                            (v) => props.tileFrameProps[v.tileId],
                            props.data.tiles
                        )}
                    />
                );
            } else {
                return (
                    <S.Tiles>
                        {pipe(
                            props.data.tiles,
                            List.map((v) => props.tileFrameProps[v.tileId]),
                            List.map((tile) => (
                                <TileContainer
                                    key={`tile:${tile.tileId}`}
                                    tile={tile}
                                    isMobile={props.isMobile}
                                    helpURL={tile.helpURL}
                                    overwriteLabel={
                                        props.labelsOverwrites[tile.tileId]
                                    }
                                    isTweakMode={props.tweakActiveTiles.some(
                                        (v) => v === tile.tileId
                                    )}
                                    isAltViewMode={
                                        props.altViewActiveTiles.find(
                                            (v) => v === tile.tileId
                                        ) !== undefined
                                    }
                                    supportsCurrQuery={tile.supportsCurrQuery}
                                    tileResultFlag={props.tileResultFlags.find(
                                        (v) => v.tileId === tile.tileId
                                    )}
                                    isHighlighted={
                                        props.highlightedTileId === tile.tileId
                                    }
                                    altViewIcon={tile.altViewIcon}
                                />
                            ))
                        )}
                    </S.Tiles>
                );
            }
        };

        return (
            <S.Group
                key={`group:${props.data.groupLabel ? props.data.groupLabel : props.idx}`}
            >
                {props.data.groupLabel ? (
                    <header>
                        <TileGroupButton
                            groupDisabled={!props.hasData}
                            groupHidden={props.isHidden}
                            group={props.data}
                            clickHandler={handleGroupClick}
                            helpClickHandler={
                                props.data.groupDescURL
                                    ? handleGroupHeaderClick
                                    : null
                            }
                        />
                    </header>
                ) : null}
                {renderResult()}
            </S.Group>
        );
    };

    // -------------------- <NothingFoundBox /> ----------------------------

    const NothingFoundBox: React.FC<{}> = (props) => {
        return (
            <S.Group>
                <S.Tiles>
                    <section className="wag-tile app-output span3">
                        <div className="provider">
                            <S.NothingFoundBox>
                                <div className="wag-tile-body content">
                                    <p>
                                        {ut.translate(
                                            'global__nothing_found_msg'
                                        )}
                                    </p>
                                </div>
                            </S.NothingFoundBox>
                        </div>
                    </section>
                </S.Tiles>
            </S.Group>
        );
    };

    // -------------------- <TooManyErrorsBox /> ----------------------------

    const TooManyErrorsBox: React.FC<{
        reportHref: string;
    }> = (props) => {
        return (
            <S.Group>
                <S.Tiles>
                    <section className="wag-tile app-output span3">
                        <div className="provider">
                            <S.TooManyErrorsBox>
                                <div className="wag-tile-body content">
                                    {props.reportHref ? (
                                        <p
                                            dangerouslySetInnerHTML={{
                                                __html: ut.translate(
                                                    'global__too_many_tile_errors_{href}',
                                                    { href: props.reportHref }
                                                ),
                                            }}
                                        />
                                    ) : (
                                        <p>
                                            {ut.translate(
                                                'global__too_many_tile_errors'
                                            )}
                                        </p>
                                    )}
                                    <p className="reload">
                                        <a
                                            onClick={() =>
                                                window.location.reload()
                                            }
                                        >
                                            {ut.translate(
                                                'global__retry_reload'
                                            )}{' '}
                                            {'\u21bb'}
                                        </a>
                                    </p>
                                </div>
                            </S.TooManyErrorsBox>
                        </div>
                    </section>
                </S.Tiles>
            </S.Group>
        );
    };

    // -------------------- <SourceInfo /> -----------------------------

    const SourceInfo: React.FC<{
        data: SourceDetails;
        tileProps: Array<TileFrameProps>;
    }> = (props) => {
        if (props.data) {
            const tile = props.tileProps.find(
                (v) => v.tileId === props.data.tileId
            );
            if (!tile) {
                throw new Error(
                    'Unable to get tile for loaded source info data'
                );
            }
            if (isCorpusDetails(props.data)) {
                return <CorpusInfo data={props.data} />;
            } else if (tile.SourceInfoComponent) {
                return (
                    <div>
                        <tile.SourceInfoComponent data={props.data} />
                    </div>
                );
            } else {
                return <globalComponents.SourceInfoBox data={props.data} />;
            }
        }
        return (
            <div
                style={{
                    textAlign: 'center',
                    minWidth: '10em',
                    minHeight: '5em',
                }}
            >
                <globalComponents.AjaxLoader htmlClass="loader" />
            </div>
        );
    };

    // -------------------- <WithinModalAjaxLoader /> ---------------------

    const WithinModalAjaxLoader: React.FC<{}> = (props) => {
        return (
            <div
                style={{
                    textAlign: 'center',
                    minWidth: '10em',
                    minHeight: '5em',
                }}
            >
                <globalComponents.AjaxLoader htmlClass="loader" />
            </div>
        );
    };

    // -------------------- <ModalHelpContent /> --------------------------

    const ModalHelpContent: React.FC<{
        isBusy: boolean;
        title: string;
        html: string;
        onClose: () => void;
    }> = (props) => {
        const ref = React.useRef(null);
        React.useEffect(() => {
            if (ref.current !== null) {
                ref.current
                    .querySelectorAll('a')
                    .forEach((elm: HTMLAnchorElement) => {
                        elm.target = '_blank';
                        elm.rel = 'noopener';
                    });
            }
        });

        return (
            <globalComponents.ModalBox
                onCloseClick={props.onClose}
                title={props.title}
                tileClass="text"
            >
                <globalComponents.ErrorBoundary>
                    {props.isBusy ? (
                        <WithinModalAjaxLoader />
                    ) : (
                        <div
                            className="raw-html"
                            ref={ref}
                            dangerouslySetInnerHTML={{ __html: props.html }}
                        />
                    )}
                </globalComponents.ErrorBoundary>
            </globalComponents.ModalBox>
        );
    };

    // -------------------- <ModalRedirecting /> --------------------------

    const ModalRedirecting: React.FC<{
        title: string;
        content?: string;
        onClose: () => void;
    }> = (props) => {
        return (
            <globalComponents.ModalBox
                onCloseClick={props.onClose}
                title={props.title}
                tileClass="text"
            >
                <globalComponents.ErrorBoundary>
                    <div style={{ padding: '1em', paddingBottom: '0em' }}>
                        {props.content ? (
                            <span>{ut.translate(props.content)}</span>
                        ) : (
                            <WithinModalAjaxLoader />
                        )}
                    </div>
                </globalComponents.ErrorBoundary>
            </globalComponents.ModalBox>
        );
    };

    // -------------------- <TilesSections /> -----------------------------

    const TilesSections: React.FC<{
        layout: Array<TileGroup>;
        homepageSections: Array<{ label: string; html: string; isFooterIntegrated: boolean; }>;
    }> = (props) => {
        const state = useModel(tilesModel);

        const handleCloseSourceInfo = () => {
            dispatcher.dispatch<typeof Actions.CloseSourceInfo>({
                name: Actions.CloseSourceInfo.name,
            });
        };

        const handleCloseGroupHelp = () => {
            dispatcher.dispatch<typeof Actions.HideGroupHelp>({
                name: Actions.HideGroupHelp.name,
            });
        };

        const handleCloseTileHelp = () => {
            dispatcher.dispatch<typeof Actions.HideTileHelp>({
                name: Actions.HideTileHelp.name,
            });
        };

        const handleAmbiguousResultHelp = () => {
            dispatcher.dispatch<typeof Actions.HideAmbiguousResultHelp>({
                name: Actions.HideAmbiguousResultHelp.name,
            });
        };

        const handleRedirectingModal = () => {
            dispatcher.dispatch<typeof Actions.BacklinkPreparationDone>({
                name: Actions.BacklinkPreparationDone.name,
            });
        };

        const renderModal = () => {
            if (state.activeSourceInfo !== null) {
                return (
                    <globalComponents.ModalBox
                        onCloseClick={handleCloseSourceInfo}
                        title={ut.translate('global__source_detail')}
                    >
                        <globalComponents.ErrorBoundary>
                            <div className="content">
                                {state.isBusy ? (
                                    <WithinModalAjaxLoader />
                                ) : (
                                    <SourceInfo
                                        tileProps={state.tileProps}
                                        data={state.activeSourceInfo}
                                    />
                                )}
                            </div>
                        </globalComponents.ErrorBoundary>
                    </globalComponents.ModalBox>
                );
            } else if (state.activeGroupHelp !== null) {
                const group = props.layout[state.activeGroupHelp.idx];
                return (
                    <ModalHelpContent
                        onClose={handleCloseGroupHelp}
                        title={group.groupLabel}
                        html={state.activeGroupHelp.html}
                        isBusy={state.isBusy}
                    />
                );
            } else if (state.activeTileHelp !== null) {
                return (
                    <ModalHelpContent
                        onClose={handleCloseTileHelp}
                        title={
                            state.tileProps[state.activeTileHelp.ident].label
                        }
                        html={state.activeTileHelp.html}
                        isBusy={state.isBusy}
                    />
                );
            } else if (state.showAmbiguousResultHelp) {
                return (
                    <ModalHelpContent
                        onClose={handleAmbiguousResultHelp}
                        title={ut.translate(
                            'global__not_using_lemmatized_query_title'
                        )}
                        html={
                            '<p>' +
                            ut.translate(
                                'global__not_using_lemmatized_query_msg'
                            ) +
                            '</p>'
                        }
                        isBusy={state.isBusy}
                    />
                );
            } else if (state.showRedirectingModal) {
                return (
                    <ModalRedirecting
                        onClose={handleRedirectingModal}
                        title={ut.translate(
                            'global__redirecting_to_extrenal_page'
                        )}
                        content={state.redirectingMessage}
                    />
                );
            } else {
                return null;
            }
        };

        const renderContents = () => {
            if (state.numTileErrors > state.maxTileErrors) {
                return (
                    <TooManyErrorsBox reportHref={state.issueReportingUrl} />
                );
            } else if (state.datalessGroups.length >= props.layout.length) {
                return <NothingFoundBox />;
            } else {
                return List.map(
                    (group, groupIdx) => (
                        <TileGroupSection
                            key={`${group.groupLabel}:${groupIdx}`}
                            data={group}
                            labelsOverwrites={state.labelsOverwrites}
                            idx={groupIdx}
                            isHidden={List.some(
                                (v) => v === groupIdx,
                                state.hiddenGroups
                            )}
                            hasData={
                                !List.some(
                                    (v) => v === groupIdx,
                                    state.datalessGroups
                                )
                            }
                            isMobile={state.isMobile}
                            tileFrameProps={state.tileProps}
                            tweakActiveTiles={state.tweakActiveTiles}
                            altViewActiveTiles={state.altViewActiveTiles}
                            tileResultFlags={state.tileResultFlags}
                            highlightedTileId={state.highlightedTileId}
                        />
                    ),
                    props.layout
                );
            }
        };

        const [height, setHeight] = React.useState(200);

        React.useEffect(() => {
            const subsc = fromEvent(window, 'resize')
                .pipe(
                    debounceTime(500),
                    map((v) => window.innerWidth / props.layout.length)
                )
                .subscribe((v) => setHeight(v));

            setHeight(window.innerHeight / props.layout.length);

            return () => {
                subsc.unsubscribe();
            };
        }, []);

        React.useEffect(() => {
            if (state.allTilesLoaded && state.scrollToTileId > -1) {
                blinkAndDehighlight(
                    state.scrollToTileId,
                    dispatcher,
                    timer(0).pipe(
                        tap(() => {
                            const elm = window.document.getElementById(
                                mkTileSectionId(state.highlightedTileId)
                            );
                            if (elm) {
                                elm.scrollIntoView();
                            }
                        })
                    )
                );
            }
        });

        const handleAboutInfoClose = () => {
            dispatcher.dispatch(Actions.AboutAppInfoClosed);
        };

        return (
            <S.TilesSections>
                {state.aboutInfo ?
                    <globalComponents.ModalBox
                        onCloseClick={handleAboutInfoClose}
                        title={state.aboutInfo.label}
                        tileClass="text">
                        <S.AboutApp>
                            {state.aboutInfo.body}
                        </S.AboutApp>
                    </globalComponents.ModalBox> :
                    null
                }
                {state.isAnswerMode ? (
                    <globalComponents.TileMinHeightContext value={height}>
                        <SubmenuTile />
                        {renderContents()}
                    </globalComponents.TileMinHeightContext>
                ) : (
                    <S.Tiles>
                        <InitialHelp sections={props.homepageSections} />
                    </S.Tiles>
                )}
                {renderModal()}
            </S.TilesSections>
        );
    };

    // ------------------ <SubmenuTile /> -------------------------------

    const SubmenuTile = () => {
        const state = useModel(formModel);

        return (
            <S.SubmenuTile>
                <LemmaSelector
                    matches={state.queryMatches}
                    queries={state.queries.map((v) => v.value)}
                    lemmaSelectorModalVisible={state.lemmaSelectorModalVisible}
                    modalSelections={state.modalSelections}
                    mainPosAttr={state.mainPosAttr}
                />
            </S.SubmenuTile>
        );
    };

    // ------------------ <WdglanceMain /> ------------------------------

    const WdglanceMain: React.FC<WdglanceMainProps> = (props) => {
        React.useEffect(() => {
            props.onMount();
        }, []);

        return (
            <S.WdglanceMain>
                <GlobalStyleWithDynamicTheme
                    createStaticUrl={ut.createStaticUrl}
                />
                <ThemeProvider theme={dynamicTheme}>
                    <BoundMessagesBox />
                    <WdglanceControls isAnswerMode={props.isAnswerMode} />
                    <TilesSections
                        layout={props.layout}
                        homepageSections={props.homepageSections}
                    />
                </ThemeProvider>
            </S.WdglanceMain>
        );
    };

    return WdglanceMain;
}
