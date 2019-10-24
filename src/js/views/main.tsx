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
import { Bound, BoundWithProps, IActionDispatcher, ViewUtils } from 'kombo';
import * as React from 'react';

import { Forms } from '../common/data';
import { SystemMessageType, SourceDetails } from '../common/types';
import { QueryType, LemmaVariant, QueryTypeMenuItem, SearchLanguage } from '../common/query';
import { TileFrameProps } from '../common/tile';
import { KeyCodes } from '../common/util';
import { TileGroup } from '../layout';
import { ActionName, Actions } from '../models/actions';
import { MessagesModel, MessagesState } from '../models/messages';
import { QueryFormModel, QueryFormModelState } from '../models/query';
import { WdglanceTilesModel, WdglanceTilesState, TileResultFlagRec } from '../models/tiles';
import { SystemMessage } from '../notifications';
import { init as corpusInfoViewInit } from './corpusInfo';
import { GlobalComponents } from './global';
import { isAPIResponse as isCorpusBasedResponse } from '../common/api/kontext/corpusInfo'; // TODO generalize


export interface WdglanceMainProps {
    layout:Immutable.List<TileGroup>;
    homepageSections:Immutable.List<{label:string; html:string}>;
    isMobile:boolean;
    isAnswerMode:boolean;
}


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, formModel:QueryFormModel, tilesModel:WdglanceTilesModel,
            messagesModel:MessagesModel) {

    const globalComponents = ut.getComponents();
    const CorpusInfo = corpusInfoViewInit(dispatcher, ut);

    // ------------------ <SystemMessage /> ------------------------------

    const SystemMessage:React.SFC<{
        type:SystemMessageType;
        text:string;
        ident:string;
    }> = (props) => {

        let classType:string;

        switch (props.type) {
            case SystemMessageType.WARNING:
                classType = 'cnc-msgbox-warning';
            break;
            case SystemMessageType.ERROR:
                classType = 'cnc-msgbox-critical';
            break;
            case SystemMessageType.INFO:
            default:
                classType = 'cnc-msgbox-information'
            break;
        }

        const handleCloseClick = () => {
            dispatcher.dispatch({
                name: ActionName.RemoveSystemMessage,
                    payload: {
                        ident: props.ident
                    }
            });
        };

        return (
            <li className="SystemMessage">
                <div className={`wrapper cnc-msgbox ${classType}`}>
                    <div className="flex">
                        <globalComponents.MessageStatusIcon statusType={props.type} isInline={false} />
                        <p>{props.text}</p>
                        <div className="close">
                            <a onClick={handleCloseClick}>
                                <img src={ut.createStaticUrl('close-icon.svg')} />
                            </a>
                        </div>
                    </div>
                </div>
            </li>
        );
    };

    // ------------------ <QueryLangSelector /> ------------------------------

    const QueryLangSelector:React.SFC<{
        value:string;
        searchLanguages:Immutable.List<SearchLanguage>;
        htmlClass?:string;
        queryType:QueryType;
        onChange:(v:string)=>void;

    }> = (props) => {
        const changeHandler = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            props.onChange(evt.target.value);
        }

        return (
            <select className={`QueryLangSelector${props.htmlClass ? ' ' + props.htmlClass : ''}`} onChange={changeHandler}
                    value={props.value}
                    aria-label={ut.translate('global__aria_search_lang')}>
                {props.searchLanguages.filter(v => v.queryTypes.indexOf(props.queryType) > -1).map(v =>
                        <option key={v.code} value={v.code}>{v.label}</option>)}
            </select>
        );
    };

    // ------------------ <QueryLang2Selector /> ------------------------------

    const QueryLang2Selector:React.SFC<{
        value:string;
        targetLanguages:Immutable.List<[string, string]>;
        htmlClass?:string;
        queryType:QueryType;
        onChange:(v:string)=>void;

    }> = (props) => {
        const changeHandler = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            props.onChange(evt.target.value);
        }

        return (
            <select className={`QueryLangSelector${props.htmlClass ? ' ' + props.htmlClass : ''}`} onChange={changeHandler}
                    value={props.value}
                    aria-label={ut.translate('global__aria_search_lang')}>
                {props.targetLanguages.map(v => <option key={v[0]} value={v[0]}>{v[1]}</option>)}
            </select>
        );
    };


    // ------------------ <QueryInput /> ------------------------------

    const QueryInput:React.SFC<{
        value:Forms.Input;
        wantsFocus:boolean;
        onContentChange:(s:string)=>void;
        onEnter:()=>void;
    }> = (props) => {

        const ref = React.useRef(null);
        React.useEffect(() => {
            if (ref.current !== null && props.wantsFocus) {
                ref.current.focus();
            }
        }, []);

        const handleInput = (evt:React.ChangeEvent<HTMLInputElement>) => {
            props.onContentChange(evt.target.value);
        };

        const handleKeyDown = (evt:React.KeyboardEvent):void => {
            if (evt.keyCode === KeyCodes.ENTER) {
                props.onEnter();
                evt.stopPropagation();
                evt.preventDefault();
            }
        };

        return <input type="text" ref={ref} className={`QueryInput${props.value.isValid ? '' : ' invalid'}`}
                aria-label={ut.translate('global__aria_searched_word')}
                onChange={handleInput} value={props.value.value}
                onKeyDown={handleKeyDown} />;
    }

    // ------------------ <SubmitButton /> ------------------------------

    const SubmitButton:React.SFC<{
        onClick:()=>void;

    }> = (props) => {

        return (
            <span className="SubmitButton">
                <button className="cnc-button cnc-button-primary" type="button" onClick={props.onClick}
                        aria-label={ut.translate('global__aria_search_btn')}>
                    {ut.translate('global__search')}
                </button>
            </span>
        );
    };

    // ------------------ <QueryTypeSelector /> ------------------------------

    const QueryTypeSelector:React.SFC<{
        menuItems:Immutable.List<QueryTypeMenuItem>;
        value:QueryType;
        isMobile:boolean;
        onChange:(v:QueryType)=>void;

    }> = (props) => {
        return <div className="QueryTypeSelector">
            <nav>
            {props.menuItems.filter(v => v.isEnabled).map((v, i) =>
                <React.Fragment key={v.type}>
                    {i > 0 && <span className="separ"> | </span>}
                    <span className={`item${v.type === props.value ? ' current' : ''}`}>
                        <a onClick={(evt:React.MouseEvent<HTMLAnchorElement>) => props.onChange(v.type)}
                                    aria-current={v.type === props.value ? 'page' : null}>
                            {v.label}
                        </a>
                    </span>
                </React.Fragment>
            )}
            </nav>
        </div>
    };

    // ------------------ <AddCmpQueryField /> ------------------------------

    const AddCmpQueryField:React.SFC<{
    }> = (_) => {

        const handleClick = () => {
            dispatcher.dispatch<Actions.AddCmpQueryInput>({
                name: ActionName.AddCmpQueryInput
            })
        };

        return (
            <div className="AddCmpQueryField">
                <button type="button" onClick={handleClick} title={ut.translate('global__add_query_field')}>+</button>
            </div>
        );
    }

    // ------------------ <RemoveCmpQueryField /> ------------------------------

    const RemoveCmpQueryField:React.SFC<{
        queryIdx:number;

    }> = (props) => {

        const handleClick = () => {
            dispatcher.dispatch<Actions.RemoveCmpQueryInput>({
                name: ActionName.RemoveCmpQueryInput,
                payload: {
                    queryIdx: props.queryIdx
                }
            });
        };

        return (
            <span className="RemoveCmpQueryField">
                <button type="button" onClick={handleClick} title={ut.translate('global__remove_query_field')}>
                    <globalComponents.ImageWithMouseover
                        file={'close-icon.svg'} alt={ut.translate('global__remove_query_field')} />
                </button>
            </span>
        );
    }

    // ------------------ <QueryFields /> ------------------------------

    const QueryFields:React.SFC<{
        queries:Immutable.List<Forms.Input>;
        queryType:QueryType;
        wantsFocus:boolean;
        queryLanguage:string;
        queryLanguage2:string;
        searchLanguages:Immutable.List<SearchLanguage>;
        targetLanguages:Immutable.List<[string, string]>;
        maxCmpQueries:number;
        onEnterKey:()=>void;

    }> = (props) => {

        const handleQueryInput = (idx:number) => (s:string):void => {
            dispatcher.dispatch<Actions.ChangeQueryInput>({
                name: ActionName.ChangeQueryInput,
                payload: {
                    queryIdx: idx,
                    value: s
                }
            });
        };

        const handleTargetLanguageChange = (primary:boolean) => (lang:string) => {
            dispatcher.dispatch<Actions.ChangeTargetLanguage>({
                name: ActionName.ChangeTargetLanguage,
                payload: {
                    lang1: primary ? lang : props.queryLanguage,
                    lang2: primary ? props.queryLanguage2 : lang,
                    queryType: props.queryType,
                    queries: props.queries.map(v => v.value).toArray()
                }
            });
        };


        switch (props.queryType) {

            case QueryType.SINGLE_QUERY:
                return (
                    <>
                        <QueryLangSelector value={props.queryLanguage} searchLanguages={props.searchLanguages}
                                onChange={handleTargetLanguageChange(true)} queryType={QueryType.SINGLE_QUERY} />
                        <span className="input-row">
                            <QueryInput value={props.queries.get(0)} onEnter={props.onEnterKey}
                                    onContentChange={handleQueryInput(0)} wantsFocus={props.wantsFocus} />
                        </span>
                    </>
                );
            case QueryType.CMP_QUERY:
                return (
                    <>
                        <QueryLangSelector value={props.queryLanguage} searchLanguages={props.searchLanguages}
                                onChange={handleTargetLanguageChange(true)} queryType={QueryType.CMP_QUERY} />
                        <div className="input-group">
                            {props.queries.map((query, queryIdx) => (
                                <span className="input-row" key={`query:${queryIdx}`}>
                                    <QueryInput value={query} onEnter={props.onEnterKey}
                                        onContentChange={handleQueryInput(queryIdx)} wantsFocus={props.wantsFocus && query.value === ''} />
                                    {queryIdx > 0 && props.queries.size > 2 ? <RemoveCmpQueryField queryIdx={queryIdx} /> : null}
                                    <br />
                                </span>
                            ))}
                            {props.queries.size < props.maxCmpQueries ? <AddCmpQueryField /> : null}
                        </div>
                    </>
                );
            case QueryType.TRANSLAT_QUERY:
                return (
                    <>
                        <QueryLangSelector value={props.queryLanguage} searchLanguages={props.searchLanguages}
                                onChange={handleTargetLanguageChange(true)} queryType={QueryType.TRANSLAT_QUERY} />
                        <span className="arrow">{'\u25B6'}</span>
                        <QueryLang2Selector value={props.queryLanguage2} targetLanguages={props.targetLanguages}
                                htmlClass="secondary"
                                onChange={handleTargetLanguageChange(false)} queryType={QueryType.TRANSLAT_QUERY} />
                        <span className="input-row">
                            <QueryInput value={props.queries.get(0)} onEnter={props.onEnterKey}
                                    onContentChange={handleQueryInput(0)} wantsFocus={props.wantsFocus} />
                        </span>
                    </>
                );

        }
    };

    // --------------- <LemmaSelector /> -------------------------------------------

    const LemmaSelector:React.SFC<{
        queryIdx:number;
        lemmas:Immutable.List<LemmaVariant>;

    }> = (props) => {

        const mkHandleClick = (lemmaVar:LemmaVariant) => () => {
            dispatcher.dispatch<Actions.ChangeCurrLemmaVariant>({
                name: ActionName.ChangeCurrLemmaVariant,
                payload: {
                    queryIdx: props.queryIdx,
                    word: lemmaVar.word,
                    lemma: lemmaVar.lemma,
                    pos: lemmaVar.pos.map(p => p.value)
                }
            });
        };

        const mkAltLabel = (v:LemmaVariant) => {
            if (v.pos.length > 1) {
                return ut.translate('global__alt_expr_any');

            } else if (v.pos.length === 1) {
                return v.pos[0].label;
            }
            return ut.translate('global__alt_expr_nondict');
        };

        if (props.lemmas.size > 0) {
            const curr = props.lemmas.find(v => v.isCurrent == true);
            if (curr) {
                return (
                    <div className="LemmaSelector">
                        {ut.translate('global__searching_by_pos')}:{'\u00a0'}
                        <span className="curr">{curr.isNonDict ? curr.word : curr.lemma} ({mkAltLabel(curr)})</span>
                        <br />
                        {props.lemmas.size > 1 ?
                            <div className="variants">
                                {ut.translate('global__multiple_words_for_query')}:{'\u00a0'}
                                <ul>
                                    {props.lemmas.filter(v => !v.isCurrent).map((v, i) =>
                                        <li key={`${v.lemma}:${v.pos}:${i}`}>
                                            {i > 0 ? <span>, </span> : null}
                                            <a onClick={mkHandleClick(v)}>{v.lemma} ({mkAltLabel(v)})</a>
                                        </li>
                                    )}
                                </ul>
                            </div>
                            : null
                        }
                    </div>
                );
            }
        }
        return <div className="LemmaSelector"></div>;
    }

    // ------------------ <WdglanceControls /> ------------------------------

    class WdglanceControls extends React.PureComponent<QueryFormModelState & {isMobile:boolean; isAnswerMode:boolean}> {

        constructor(props) {
            super(props);
            this.handleQueryTypeChange = this.handleQueryTypeChange.bind(this);
        }

        private handleSubmit() {
            dispatcher.dispatch<Actions.SubmitQuery>({
                name: ActionName.SubmitQuery
            });
        }

        handleQueryTypeChange(qt:QueryType):void {
            dispatcher.dispatch<Actions.ChangeQueryType>({
                name: ActionName.ChangeQueryType,
                payload: {
                    queryType: qt,
                    lang1: this.props.queryLanguage,
                    lang2: this.props.queryLanguage2,
                    queries: this.props.queries.map(v => v.value).toArray(),
                }
            });
        };

        render() {
            return (
                <div className="WdglanceControls">
                    <form className="cnc-form">
                        <div>
                            {this.props.queryTypesMenuItems.filter(v => v.isEnabled).size > 1 ?
                                <QueryTypeSelector menuItems={this.props.queryTypesMenuItems}
                                        value={this.props.queryType}
                                        onChange={this.handleQueryTypeChange}
                                        isMobile={this.props.isMobile} /> :
                                null}
                        </div>
                        <div className="main">
                            <QueryFields
                                    wantsFocus={!this.props.isAnswerMode || this.props.initialQueryType !== this.props.queryType}
                                    queries={this.props.queries}
                                    queryType={this.props.queryType}
                                    queryLanguage={this.props.queryLanguage}
                                    queryLanguage2={this.props.queryLanguage2}
                                    searchLanguages={this.props.searchLanguages}
                                    targetLanguages={this.props.targetLanguages.get(this.props.queryType)}
                                    onEnterKey={this.handleSubmit}
                                    maxCmpQueries={this.props.maxCmpQueries} />
                            <SubmitButton onClick={this.handleSubmit} />
                        </div>
                    </form>
                    {this.props.isAnswerMode ?
                        <LemmaSelector lemmas={this.props.lemmas.get(0)} queryIdx={0} /> :
                        null
                    }
                </div>
            );
        }
    }

    const WdglanceControlsBound = BoundWithProps<{isMobile:boolean; isAnswerMode:boolean}, QueryFormModelState>(WdglanceControls, formModel);


    // ------------- <HelpButton /> --------------------------------------

    const HelpButton:React.SFC<{
        tileId:number;

    }> = (props) => {

        const handleClick = () => {
            dispatcher.dispatch<Actions.ShowTileHelp>({
                name: ActionName.ShowTileHelp,
                payload: {
                    tileId: props.tileId
                }
            });
        }

        return (
            <span className="HelpButton bar-button">
                <button type="button" onClick={handleClick} title={ut.translate('global__show_tile_help')}>
                    <img src={ut.createStaticUrl('question-mark.svg')}
                        alt={ut.translate('global__img_alt_question_mark')} />
                </button>
            </span>
        );
    }

    // ------------- <AltViewButton /> --------------------------------------

    const AltViewButton:React.SFC<{
        isAltView:boolean;
        tileId:number;

    }> = (props) => {

        const handleClick = () => {
            if (props.isAltView) {
                dispatcher.dispatch({
                    name: ActionName.DisableAltViewMode,
                    payload: {
                        ident: props.tileId
                    }
                });

            } else {
                dispatcher.dispatch({
                    name: ActionName.EnableAltViewMode,
                    payload: {
                        ident: props.tileId
                    }
                });
            }
        };

        const label = props.isAltView ?
                ut.translate('global__switch_to_default_view') :
                ut.translate('global__switch_to_alt_view');

        return (
            <span className="AltViewButton bar-button">
                <button type="button" onClick={handleClick} title={label}>
                    <img src={ut.createStaticUrl(props.isAltView ? 'alt-view_s.svg' : 'alt-view.svg')}
                            alt={ut.translate('global__img_alt_alt_view')} />
                </button>
            </span>
        );
    }


    // ------------- <TweakButton /> --------------------------------------

    const TweakButton:React.SFC<{
        tileId:number;
        isExtended:boolean;

    }> = (props) => {

        const handleClick = (evt:React.MouseEvent<HTMLButtonElement>) => {
            if (props.isExtended) {
                dispatcher.dispatch({
                    name: ActionName.DisableTileTweakMode,
                    payload: {
                        ident: props.tileId
                    }
                });

            } else {
                dispatcher.dispatch({
                    name: ActionName.EnableTileTweakMode,
                    payload: {
                        ident: props.tileId
                    }
                });
            }
        };

        return (
            <span className="TweakButton bar-button">
                <button type="button" onClick={handleClick} title={props.isExtended ? ut.translate('global__reset_size') : ut.translate('global__tweak')}>
                    <img src={ut.createStaticUrl(props.isExtended ? 'config-icon_s.svg' : 'config-icon.svg')}
                        alt={props.isExtended ? 'configuration icon (highlighted)' : 'configuration icon'} />
                </button>
            </span>
        );
    };

    // ------------- <AmbiguousResultWarning /> -------------------------------

    const AmbiguousResultWarning:React.SFC<{
    }> = (props) => {

        const handleClick = (evt:React.MouseEvent<HTMLButtonElement>) => {
            dispatcher.dispatch({
                name: ActionName.ShowAmbiguousResultHelp
            });
        };

        return (
            <span className="bar-button">
                <button type="button" onClick={handleClick} title={ut.translate('global__not_using_lemmatized_query_title')}>
                    <globalComponents.MessageStatusIcon statusType={SystemMessageType.WARNING} />
                </button>
            </span>
        );
    };

    // ------------- <InitialHelpTile /> --------------------------------------

    const InitialHelpTile:React.SFC<{html:string}> = (props) => {

        const ref = React.useRef(null);
        React.useEffect(() => {
            if (ref.current !== null) {
                ref.current.querySelectorAll('a').forEach(((elm:HTMLAnchorElement) => {
                    elm.target = '_blank';
                }))
            }
        });

        return (
            <div className="tile-body text">
                <div className="raw-html" dangerouslySetInnerHTML={{__html: props.html}} ref={ref} />
            </div>
        );
    };

    // ------------- <InitialHelp /> --------------------------------------

    const InitialHelp:React.SFC<{
        sections:Immutable.List<{label:string; html:string}>;

    }> = (props) => {

        return (
            <>
                {props.sections.map((sect, i) => (
                    <section key={`${sect}:${i}`} className="cnc-tile help">
                        <header className="cnc-tile-header panel">
                            {sect.label}
                        </header>
                        <InitialHelpTile html={sect.html} />
                    </section>
                ))}
            </>
        );
    }


    // ------------- <TileContainer /> --------------------------------------

    class TileContainer extends React.Component<{
        isTweakMode:boolean;
        isMobile:boolean;
        isAltViewMode:boolean;
        helpURL:string;
        tile:TileFrameProps;
        supportsCurrQuery:boolean;
        tileResultFlag:TileResultFlagRec;
    }, {}> {

        private ref:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.ref = React.createRef();
        }

        componentDidMount() {
            dispatcher.dispatch<Actions.SetTileRenderSize>({
                name: ActionName.SetTileRenderSize,
                payload: {
                    tileId: this.props.tile.tileId,
                    size: ut.getElementSize(this.ref.current),
                    isMobile: this.props.isMobile
                }
            });
        }

        private getHTMLClass() {
            const ans = ['cnc-tile', 'app-output'];
            if (this.props.isTweakMode) {
                ans.push('expanded');
            }
            if (!this.props.isMobile) {
                ans.push(`span${this.props.tile.widthFract}`);
            }
            return ans.join(' ');
        }

        render() {
            return (
                <section key={`tile-ident-${this.props.tile.tileId}`}
                        className={this.getHTMLClass()}>
                    <header className="cnc-tile-header panel">
                        <h2>{this.props.tile.label}</h2>
                        <div className="window-buttons">
                        {this.props.tileResultFlag && this.props.tileResultFlag.canBeAmbiguousResult ?
                            <AmbiguousResultWarning /> :
                            null
                        }
                        {this.props.tile.supportsAltView ?
                            <AltViewButton tileId={this.props.tile.tileId} isAltView={this.props.isAltViewMode} />  :
                            null
                        }
                        {this.props.tile.supportsTweakMode ?
                            <TweakButton tileId={this.props.tile.tileId} isExtended={this.props.isTweakMode} /> :
                            null
                        }
                        {this.props.tile.supportsHelpView ?
                            <HelpButton tileId={this.props.tile.tileId} /> :
                            null
                        }
                        </div>
                    </header>
                    <div className="provider" ref={this.ref} style={this.props.tile.maxTileHeight ? {overflow: 'auto'} : {}}>
                        <div style={this.props.tile.maxTileHeight ? {maxHeight: this.props.tile.maxTileHeight} : {}}>
                            <globalComponents.ErrorBoundary>
                                {this.props.supportsCurrQuery ?
                                    <this.props.tile.Component
                                            tileId={this.props.tile.tileId}
                                            tileName={this.props.tile.tileName}
                                            renderSize={this.props.tile.renderSize}
                                            isMobile={this.props.isMobile}
                                            widthFract={this.props.tile.widthFract}
                                            supportsReloadOnError={this.props.tile.supportsReloadOnError} /> :
                                    <div className="TileWrapper empty">
                                        <div className="loader-wrapper"></div>
                                        <div className="cnc-tile-body content empty">
                                            <div className="message">
                                                <globalComponents.MessageStatusIcon statusType={SystemMessageType.WARNING} isInline={false} />
                                                <p>
                                                    {ut.translate('global__query_not_supported')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                }
                            </globalComponents.ErrorBoundary>
                        </div>
                    </div>
                </section>
            );
        }
    }


    // ------- <MessagesBox /> ---------------------

    class MessagesBox extends React.PureComponent<MessagesState> {

        render() {
            return (
                <div className="MessagesBox">
                {this.props.systemMessages.size > 0 ?
                    <ul className="Messages">
                        {this.props.systemMessages.map(
                                msg => <SystemMessage key={msg.ident} type={msg.type} text={msg.text}
                                                ident={msg.ident} />)
                        }
                    </ul> :
                    null
                }
                </div>
            );
        }
    }

    const BoundMessagesBox = messagesModel ?
            Bound(MessagesBox, messagesModel) :
            (props) => <MessagesBox systemMessages={Immutable.List<SystemMessage>()} />;


    // -------------------- <TileGroupButton /> -----------------------------

    const TileGroupButton:React.SFC<{
        groupHidden:boolean;
        groupDisabled:boolean;
        group:TileGroup;
        clickHandler:()=>void;
        helpClickHandler:(()=>void)|null;

    }> = (props) => {


        return (
            <div className={`TileGroupButton${props.groupDisabled ? ' disabled' : ''}`}>
                <h2>
                    <span className="flex">
                    <span className={`triangle${props.groupHidden ? ' right' : ''}`}>
                                {props.groupHidden ?
                                    <img src={ut.createStaticUrl('triangle_w_right.svg')} alt={ut.translate('global__img_alt_triangle_w_right')} /> :
                                    <img src={ut.createStaticUrl('triangle_w_down.svg')} alt={ut.translate('global__img_alt_triangle_w_down')} />
                                }
                            </span>
                        <a className="switch-common" onClick={props.groupDisabled ? null : ()=>props.clickHandler()}
                                    title={props.groupHidden ? ut.translate('global__click_to_show_group') : ut.translate('global__click_to_hide_group')}>
                            <span className="switch">
                                {props.group.groupLabel}
                            </span>
                        </a>
                        {props.helpClickHandler ?
                            <a className="help" onClick={()=>props.helpClickHandler()}>?</a> :
                            null
                        }
                    </span>
                </h2>
            </div>
        );
    };


    // -------------------- <TileGroup /> -----------------------------

    const TileGroup:React.SFC<{
        data:TileGroup;
        idx:number;
        isHidden:boolean;
        hasData:boolean;
        isMobile:boolean;
        tileFrameProps:Immutable.List<TileFrameProps>;
        tweakActiveTiles:Immutable.Set<number>;
        altViewActiveTiles:Immutable.Set<number>;
        tileResultFlags:Immutable.List<TileResultFlagRec>;

    }> = (props) => {

        const handleGroupClick = ():void => {
            dispatcher.dispatch<Actions.ToggleGroupVisibility>({
                name: ActionName.ToggleGroupVisibility,
                payload: {
                    groupIdx: props.idx
                }
            });
        }

        const handleGroupHeaderClick = ():void => {
            dispatcher.dispatch<Actions.ShowGroupHelp>({
                name: ActionName.ShowGroupHelp,
                payload: {
                    url: props.data.groupDescURL,
                    groupIdx: props.idx
                }
            });
        }

        const renderResult = () => {
            if (!props.hasData) {
                return (
                    <section className="tiles">
                        <section className="cnc-tile app-output" style={{gridColumn: 'span 3'}}>
                            <div className="provider">
                                <div className="TileWrapper">
                                    <div className="cnc-tile-body content empty">
                                        <div className="message">
                                            <globalComponents.MessageStatusIcon statusType={SystemMessageType.WARNING} isInline={false} />
                                            <p>
                                                {ut.translate('global__not_enought_data_for_group')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </section>
                );

            } else if (props.isHidden) {
                return null;

            } else {
                return (
                    <section className="tiles">
                    {props.data.tiles
                        .map(v => props.tileFrameProps.get(v.tileId))
                        .map(tile => <TileContainer key={`tile:${tile.tileId}`} tile={tile}
                                            isMobile={props.isMobile}
                                            helpURL={tile.helpURL}
                                            isTweakMode={props.tweakActiveTiles.contains(tile.tileId)}
                                            isAltViewMode={props.altViewActiveTiles.contains(tile.tileId)}
                                            supportsCurrQuery={tile.supportsCurrQuery}
                                            tileResultFlag={props.tileResultFlags.get(tile.tileId)} />)
                    }
                    </section>
                );
            }
        }

        return (
            <section key={`group:${props.data.groupLabel}`} className="group">
                <header>
                    <TileGroupButton
                            groupDisabled={!props.hasData}
                            groupHidden={props.isHidden}
                            group={props.data}
                            clickHandler={handleGroupClick}
                            helpClickHandler={props.data.groupDescURL ? handleGroupHeaderClick : null} />
                </header>
                {renderResult()}
            </section>
        );
    };

    // -------------------- <NothingFoundBox /> ----------------------------

    const NothingFoundBox:React.SFC<{}> = (props) => {
        return (
            <section className="group">
                <section className="tiles">
                    <section className="cnc-tile app-output span3">
                        <div className="provider">
                            <div className="NothingFoundBox">
                                <div className="cnc-tile-body content">
                                    <p>{ut.translate('global__nothing_found_msg')}</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </section>
            </section>
        );
    };

    // -------------------- <SourceInfo /> -----------------------------

    const SourceInfo:React.SFC<{
        data:SourceDetails;
        tileProps:Immutable.List<TileFrameProps>;
    }> = (props) => {

        if (props.data) {
            const tile = props.tileProps.find(v => v.tileId === props.data.tileId);
            if (!tile) {
                throw new Error('Unable to get tile for loaded source info data');
            }

            if (tile.SourceInfoComponent) {
                return <div><tile.SourceInfoComponent data={props.data} /></div>;

            } else if (isCorpusBasedResponse(props.data)) {
                return <CorpusInfo data={props.data} />;

            } else {
                return <globalComponents.SourceInfoBox data={props.data} />;
            }
        }
        return (
            <div style={{textAlign: 'center', minWidth: '10em', minHeight: '5em'}}>
                <globalComponents.AjaxLoader htmlClass="loader" />
            </div>
        );
    };

    // -------------------- <WithinModalAjaxLoader /> ---------------------

    const WithinModalAjaxLoader:React.SFC<{}> = (props) => {
        return (
            <div style={{textAlign: 'center', minWidth: '10em', minHeight: '5em'}}>
                <globalComponents.AjaxLoader htmlClass="loader" />
            </div>
        );
    };

    // -------------------- <ModalHelpContent /> --------------------------

    const ModalHelpContent:React.SFC<{
        isBusy:boolean;
        title:string;
        html:string;
        onClose:()=>void;

    }> = (props) => {
        const ref = React.useRef(null);
        React.useEffect(() => {
            if (ref.current !== null) {
                ref.current.querySelectorAll('a').forEach(((elm:HTMLAnchorElement) => {
                    elm.target = '_blank';
                }))
            }
        });

        return (
            <globalComponents.ModalBox onCloseClick={props.onClose}
                    title={props.title} tileClass="text">
                <globalComponents.ErrorBoundary>
                    {props.isBusy ?
                        <WithinModalAjaxLoader /> :
                        <div className="raw-html" ref={ref} dangerouslySetInnerHTML={{__html: props.html}} />
                    }
                </globalComponents.ErrorBoundary>
            </globalComponents.ModalBox>
        );
    };

    // -------------------- <TilesSections /> -----------------------------

    class TilesSections extends React.PureComponent<{
        layout:Immutable.List<TileGroup>;
        homepageSections:Immutable.List<{label:string; html:string}>;

    } & WdglanceTilesState> {

        constructor(props) {
            super(props);
            this.handleCloseSourceInfo = this.handleCloseSourceInfo.bind(this);
            this.handleCloseGroupHelp = this.handleCloseGroupHelp.bind(this);
            this.handleCloseTileHelp = this.handleCloseTileHelp.bind(this);
            this.handleAmbiguousResultHelp = this.handleAmbiguousResultHelp.bind(this);
        }

        private handleCloseSourceInfo() {
            dispatcher.dispatch<Actions.CloseSourceInfo>({
                name: ActionName.CloseSourceInfo
            });
        }

        private handleCloseGroupHelp() {
            dispatcher.dispatch<Actions.HideGroupHelp>({
                name: ActionName.HideGroupHelp
            });
        }

        private handleCloseTileHelp() {
            dispatcher.dispatch<Actions.HideTileHelp>({
                name: ActionName.HideTileHelp
            });
        }

        private handleAmbiguousResultHelp() {
            dispatcher.dispatch<Actions.HideAmbiguousResultHelp>({
                name: ActionName.HideAmbiguousResultHelp
            });
        }

        private renderModal() {
            if (this.props.activeSourceInfo !== null) {
                return (
                    <globalComponents.ModalBox onCloseClick={this.handleCloseSourceInfo}
                            title={ut.translate('global__source_detail')}>
                        <globalComponents.ErrorBoundary>
                            {this.props.isBusy ?
                                <WithinModalAjaxLoader /> :
                                <SourceInfo tileProps={this.props.tileProps} data={this.props.activeSourceInfo} />
                            }
                        </globalComponents.ErrorBoundary>
                    </globalComponents.ModalBox>
                );

            } else if (this.props.activeGroupHelp !== null) {
                const group = this.props.layout.get(this.props.activeGroupHelp.idx);
                return <ModalHelpContent onClose={this.handleCloseGroupHelp} title={group.groupLabel}
                            html={this.props.activeGroupHelp.html}
                            isBusy={this.props.isBusy} />;

            } else if (this.props.activeTileHelp !== null) {
                return <ModalHelpContent onClose={this.handleCloseTileHelp}
                            title={this.props.tileProps.get(this.props.activeTileHelp.ident).label}
                            html={this.props.activeTileHelp.html}
                            isBusy={this.props.isBusy} />;

            } else if (this.props.showAmbiguousResultHelp) {
                return <ModalHelpContent onClose={this.handleAmbiguousResultHelp}
                            title={ut.translate('global__not_using_lemmatized_query_title')}
                            html={'<p>' + ut.translate('global__not_using_lemmatized_query_msg') + '</p>'}
                            isBusy={this.props.isBusy} />;

            } else {
                return null;
            }
        }

        render() {
            return (
                <section className="TilesSections">
                    {this.props.isAnswerMode ?
                        (this.props.datalessGroups.size < this.props.layout.size ?
                            this.props.layout.map((group, groupIdx) => (
                                <TileGroup
                                    key={`${group.groupLabel}:${groupIdx}`}
                                    data={group}
                                    idx={groupIdx}
                                    isHidden={this.props.hiddenGroups.contains(groupIdx)}
                                    hasData={!this.props.datalessGroups.contains(groupIdx)}
                                    isMobile={this.props.isMobile}
                                    tileFrameProps={this.props.tileProps}
                                    tweakActiveTiles={this.props.tweakActiveTiles}
                                    altViewActiveTiles={this.props.altViewActiveTiles}
                                    tileResultFlags={this.props.tileResultFlags} />

                            )) :
                            <NothingFoundBox />
                        ) :
                        <section className="tiles"><InitialHelp sections={this.props.homepageSections} /></section>
                    }
                    {this.renderModal()}
                </section>
            );
        }
    }

    const BoundTilesSections = BoundWithProps<any, any>(TilesSections, tilesModel);

    // ------------------ <WdglanceMain /> ------------------------------

    const WdglanceMain:React.SFC<WdglanceMainProps> = (props) => {
        return (
            <div className="WdglanceMain">
                <WdglanceControlsBound isMobile={props.isMobile} isAnswerMode={props.isAnswerMode} />
                <BoundMessagesBox />
                <BoundTilesSections layout={props.layout} homepageSections={props.homepageSections} />
            </div>
        );
    }

    return WdglanceMain;
}