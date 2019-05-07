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
import { SystemMessageType, SearchLanguage, SourceDetails } from '../common/types';
import { AvailableLanguage } from '../common/hostPage';
import { QueryType, LemmaVariant } from '../common/query';
import { TileFrameProps } from '../common/tile';
import { KeyCodes } from '../common/util';
import { TileGroup } from '../layout';
import { ActionName, Actions } from '../models/actions';
import { MessagesModel, MessagesState } from '../models/messages';
import { WdglanceMainFormModel, WdglanceMainState } from '../models/query';
import { TileResultFlagRec, WdglanceTilesModel, WdglanceTilesState } from '../models/tiles';
import { SystemMessage } from '../notifications';
import { init as corpusInfoViewInit } from './corpusInfo';
import { GlobalComponents } from './global';
import { isAPIResponse } from '../common/api/kontext/corpusInfo';


export interface WdglanceMainProps {
    layout:Immutable.List<TileGroup>;
    homepageSections:Immutable.List<{label:string; html:string}>;
    isMobile:boolean;
    isAnswerMode:boolean;
}


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, formModel:WdglanceMainFormModel, tilesModel:WdglanceTilesModel,
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
                        <globalComponents.MessageStatusIcon statusType={props.type} isInline={true} />
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
        availLanguages:Immutable.List<SearchLanguage>;
        htmlClass?:string;
        onChange:(v:string)=>void;

    }> = (props) => {

        const changeHandler = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            props.onChange(evt.target.value);
        }

        return (
            <select className={`QueryLangSelector${props.htmlClass ? ' ' + props.htmlClass : ''}`} onChange={changeHandler}
                    value={props.value}>
                {props.availLanguages.map(v =>
                        <option key={v.ident} value={v.ident}>{v.label}</option>)}
            </select>
        );
    };


    // ------------------ <QueryInput /> ------------------------------

    const QueryInput:React.SFC<{
        value:Forms.Input;
        onContentChange:(s:string)=>void;
        onEnter:()=>void;
    }> = (props) => {

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

        return <input type="text" className={`QueryInput${props.value.isValid ? '' : ' invalid'}`}
                onChange={handleInput} value={props.value.value}
                onKeyDown={handleKeyDown} />;
    }

    // ------------------ <SubmitButton /> ------------------------------

    const SubmitButton:React.SFC<{
        onClick:()=>void;

    }> = (props) => {

        return (
            <span className="SubmitButton">
                <button className="cnc-button cnc-button-primary" type="button" onClick={props.onClick}>
                    {ut.translate('global__search')}
                </button>
            </span>
        );
    };

    // ------------------ <QueryTypeSelector /> ------------------------------

    const QueryTypeSelector:React.SFC<{
        avail:Immutable.List<[QueryType, string]>;
        value:QueryType;
        isMobile:boolean;
        onChange:(v:QueryType)=>void;

    }> = (props) => {
        return <div className="QueryTypeSelector">
            {props.avail.map((v, i) =>
                <React.Fragment key={v[0]}>
                    {i > 0 && !props.isMobile ? <span className="separ"> | </span> : null}
                    <span className={`item${v[0] === props.value ? ' current' : ''}`}>
                        <a onClick={(evt:React.MouseEvent<HTMLAnchorElement>) => props.onChange(v[0])}
                                    aria-current={v[0] === props.value ? 'page' : null}>
                            {v[1]}
                        </a>
                    </span>
                </React.Fragment>
            )}
        </div>
    };

    // ------------------ <QueryFields /> ------------------------------

    const QueryFields:React.SFC<{
        query:Forms.Input;
        query2:Forms.Input;
        queryType:QueryType;
        targetLanguage:string;
        targetLanguage2:string;
        availLanguages:Immutable.List<SearchLanguage>;
        onEnterKey:()=>void;

    }> = (props) => {

        const handleQueryInput1 = (s:string):void => {
            dispatcher.dispatch<Actions.ChangeQueryInput>({
                name: ActionName.ChangeQueryInput,
                payload: {
                    value: s
                }
            });
        };

        const handleQueryInput2 = (s:string):void => {
            dispatcher.dispatch<Actions.ChangeQueryInput2>({
                name: ActionName.ChangeQueryInput2,
                payload: {
                    value: s
                }
            });
        };

        const handleTargetLanguageChange = (primary:boolean) => (lang:string) => {
            dispatcher.dispatch<Actions.ChangeTargetLanguage>({
                name: ActionName.ChangeTargetLanguage,
                payload: {
                    lang1: primary ? lang : props.targetLanguage,
                    lang2: primary ? props.targetLanguage2 : lang,
                    queryType: props.queryType,
                    q1: props.query.value,
                    q2: props.query2.value
                }
            });
        };


        switch (props.queryType) {

            case QueryType.SINGLE_QUERY:
                return (
                    <>
                        <QueryLangSelector value={props.targetLanguage} availLanguages={props.availLanguages}
                                onChange={handleTargetLanguageChange(true)} />
                        <QueryInput value={props.query} onEnter={props.onEnterKey}
                                onContentChange={handleQueryInput1} />
                    </>
                );
            case QueryType.CMP_QUERY:
                return (
                    <>
                        <QueryLangSelector value={props.targetLanguage} availLanguages={props.availLanguages}
                                onChange={handleTargetLanguageChange(true)} />
                        <div className="input-group">
                            <QueryInput value={props.query} onEnter={props.onEnterKey}
                                onContentChange={handleQueryInput1} />
                            <br />
                            <QueryInput value={props.query2} onEnter={props.onEnterKey}
                                onContentChange={handleQueryInput2} />
                        </div>
                    </>
                );
            case QueryType.TRANSLAT_QUERY:
                return (
                    <>
                        <QueryLangSelector value={props.targetLanguage} availLanguages={props.availLanguages}
                                onChange={handleTargetLanguageChange(true)} />
                        <QueryInput value={props.query} onEnter={props.onEnterKey}
                                onContentChange={handleQueryInput1} />
                        <span className="arrow">{'\u21E8'}</span>
                        <QueryLangSelector value={props.targetLanguage2} availLanguages={props.availLanguages}
                                htmlClass="secondary"
                                onChange={handleTargetLanguageChange(false)} />
                    </>
                );

        }
    };

    // --------------- <LemmaSelector /> -------------------------------------------

    const LemmaSelector:React.SFC<{
        lemmas:Immutable.List<LemmaVariant>;

    }> = (props) => {

        const mkHandleClick = (lemmaVar:LemmaVariant) => () => {
            dispatcher.dispatch<Actions.ChangeCurrLemmaVariant>({
                name: ActionName.ChangeCurrLemmaVariant,
                payload: {
                    word: lemmaVar.word,
                    lemma: lemmaVar.lemma,
                    pos: lemmaVar.pos
                }
            });
            dispatcher.dispatch<Actions.SubmitQuery>({
                name: ActionName.SubmitQuery
            });
        }

        if (props.lemmas.size > 0) {
            const curr = props.lemmas.find(v => v.isCurrent == true);
            if (curr) {
                return (
                    <div className="LemmaSelector">
                        {ut.translate('global__searching_by_pos')}:{'\u00a0'}<span className="curr">{curr.lemma} ({curr.posLabel})</span>
                        <br />
                        {props.lemmas.size > 1 ?
                            <div className="variants">
                                {ut.translate('global__multiple_words_for_query')}:{'\u00a0'}
                                <ul>
                                    {props.lemmas.filter(v => !v.isCurrent).map((v, i) =>
                                        <li key={`${v.lemma}:${v.pos}:${i}`}>
                                            {i > 0 ? <span>, </span> : null}
                                            <a onClick={mkHandleClick(v)}>{v.lemma} ({v.posLabel})</a>
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

    class WdglanceControls extends React.PureComponent<WdglanceMainState & {isMobile:boolean; isAnswerMode:boolean}> {

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
                    lang1: this.props.targetLanguage,
                    lang2: this.props.targetLanguage2,
                    q1: this.props.query.value,
                    q2: this.props.query2.value
                }
            });
        };

        render() {
            return (
                <div className="WdglanceControls">
                    <form className="cnc-form">
                        <div>
                            <QueryTypeSelector avail={this.props.availQueryTypes}
                                    value={this.props.queryType}
                                    onChange={this.handleQueryTypeChange}
                                    isMobile={this.props.isMobile} />
                        </div>
                        <div className="main">
                            <QueryFields query={this.props.query}
                                    query2={this.props.query2}
                                    queryType={this.props.queryType}
                                    targetLanguage={this.props.targetLanguage}
                                    targetLanguage2={this.props.targetLanguage2}
                                    availLanguages={this.props.availLanguages}
                                    onEnterKey={this.handleSubmit} />
                            <SubmitButton onClick={this.handleSubmit} />
                        </div>
                    </form>
                    {this.props.isAnswerMode ?
                        <LemmaSelector lemmas={this.props.lemmas} /> :
                        null
                    }
                </div>
            );
        }
    }

    const WdglanceControlsBound = BoundWithProps<{isMobile:boolean; isAnswerMode:boolean}, WdglanceMainState>(WdglanceControls, formModel);


    // ------------- <HelpButton /> --------------------------------------

    const HelpButton:React.SFC<{
        tileId:number;
        isHelpMode:boolean;

    }> = (props) => {

        const handleClick = () => {
            if (props.isHelpMode) {
                dispatcher.dispatch<Actions.HideTileHelp>({
                    name: ActionName.HideTileHelp,
                    payload: {
                        tileId: props.tileId
                    }
                });

            } else {
                dispatcher.dispatch<Actions.ShowTileHelp>({
                    name: ActionName.ShowTileHelp,
                    payload: {
                        tileId: props.tileId
                    }
                });
            }
        }

        return (
            <span className="HelpButton">
                <button type="button" onClick={handleClick} title={props.isHelpMode ? ut.translate('global__hide_tile_help') : ut.translate('global__show_tile_help')}>
                    {props.isHelpMode ?
                        <img src={ut.createStaticUrl('question-mark_s.svg')}   /> :
                        <img src={ut.createStaticUrl('question-mark.svg')}   />
                    }
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

        return <span className="AltViewButton">
            <button type="button" onClick={handleClick} title={label}>
                <img src={ut.createStaticUrl('brackets.svg')} />
            </button>
        </span>
    }


    // ------------- <TweakButton /> --------------------------------------

    const TweakButton:React.SFC<{
        tileId:number;
        isExtended:boolean;
        isDisabled:boolean;

    }> = (props) => {

        const handleClick = (evt:React.MouseEvent<HTMLButtonElement>) => {
            if (!props.isDisabled) {
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
            }
        };

        const getIcon = () => {
            if (props.isDisabled) {
                return <img src={ut.createStaticUrl('config-icon_g.svg')} alt="configuration icon (disabled)" />;

            } else if (props.isExtended) {
                return <img src={ut.createStaticUrl('config-icon_s.svg')} alt="configuration icon" />;

            } else {
                return <img src={ut.createStaticUrl('config-icon.svg')} alt="configuration icon (highlighted)" />;
            }
        };

        return <span className={`TweakButton${props.isDisabled ? ' disabled' : ''}`}>
            <button type="button" onClick={handleClick} title={props.isExtended ? ut.translate('global__reset_size') : ut.translate('global__tweak')}>
                {getIcon()}
            </button>
        </span>
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
                        <div className="tile-body" dangerouslySetInnerHTML={{__html: sect.html}} />
                    </section>
                ))}
            </>
        );
    }


    // ------------- <TileContainer /> --------------------------------------

    class TileContainer extends React.Component<{
        isTweakMode:boolean;
        helpHTML:string;
        isMobile:boolean;
        isAltViewMode:boolean;
        helpURL:string;
        tile:TileFrameProps;
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
                        {this.props.tile.supportsAltView ?
                            <AltViewButton tileId={this.props.tile.tileId} isAltView={this.props.isAltViewMode} />  :
                            null
                        }
                        {this.props.tile.supportsTweakMode ?
                            <TweakButton tileId={this.props.tile.tileId} isExtended={this.props.isTweakMode}
                                    isDisabled={!!this.props.helpHTML} /> :
                            null
                        }
                        {this.props.tile.supportsHelpView ?
                            <HelpButton tileId={this.props.tile.tileId} isHelpMode={!!this.props.helpHTML} /> :
                            null
                        }
                        </div>
                    </header>
                    {this.props.helpHTML ?
                        <div className="provider"><div className="cnc-tile-body" dangerouslySetInnerHTML={{__html: this.props.helpHTML}} /></div> :
                        null
                    }
                    <div className={`provider${!!this.props.helpHTML ? ' hidden' : ''}`} ref={this.ref}>
                        {this.props.tile.Component ?
                            <globalComponents.ErrorBoundary>
                                <this.props.tile.Component
                                        tileId={this.props.tile.tileId}
                                        renderSize={this.props.tile.renderSize}
                                        isMobile={this.props.isMobile}
                                        widthFract={this.props.tile.widthFract}
                                        supportsReloadOnError={this.props.tile.supportsReloadOnError} />
                            </globalComponents.ErrorBoundary> :
                            null
                        }
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
        headerTextActive:boolean;
        clickHandler:()=>void;
        helpClickHandler:()=>void;

    }> = (props) => {


        return (
            <div className={`TileGroupButton${props.groupDisabled ? ' disabled' : ''}`}>
                <h2>
                    <span className="flex">
                        <a className="switch-common" onClick={props.groupDisabled ? null : ()=>props.clickHandler()}
                                    title={props.groupHidden ? ut.translate('global__click_to_show_group') : ut.translate('global__click_to_hide_group')}>
                            <span className={`triangle${props.groupHidden ? ' right' : ''}`}>
                                {props.groupHidden ?
                                    <img src={ut.createStaticUrl('triangle_w_right.svg')} /> :
                                    <img src={ut.createStaticUrl('triangle_w_down.svg')} />
                                }
                            </span>
                            <span className="switch">
                                {props.group.groupLabel}
                            </span>
                        </a>
                        <a className={`help${props.headerTextActive ? ' active' : ''}`} onClick={()=>props.helpClickHandler()}>?</a>
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
        hasHeaderTextActive:boolean;
        isMobile:boolean;
        tileFrameProps:Immutable.List<TileFrameProps>;
        tilesHelpData:Immutable.Map<number, string>;
        helpActiveTiles:Immutable.Set<number>;
        tweakActiveTiles:Immutable.Set<number>;
        altViewActiveTiles:Immutable.Set<number>;

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
            dispatcher.dispatch<Actions.ToggleGroupHeader>({
                name: ActionName.ToggleGroupHeader,
                payload: {
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
                                <div className="TileWrapper empty">
                                    <div className="cnc-tile-body content">
                                        <p className="msg">
                                            <globalComponents.MessageStatusIcon statusType={SystemMessageType.WARNING} isInline={true} />
                                            {ut.translate('global__not_enought_data_for_group')}
                                        </p>
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
                        .filter(v => v.supportsCurrQueryType)
                        .map(tile => <TileContainer key={`tile:${tile.tileId}`} tile={tile}
                                            isMobile={props.isMobile}
                                            helpHTML={props.helpActiveTiles.contains(tile.tileId) ? props.tilesHelpData.get(tile.tileId) : null}
                                            helpURL={tile.helpURL}
                                            isTweakMode={props.tweakActiveTiles.contains(tile.tileId)}
                                            isAltViewMode={props.altViewActiveTiles.contains(tile.tileId)} />)
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
                            headerTextActive={props.hasHeaderTextActive}
                            clickHandler={handleGroupClick}
                            helpClickHandler={handleGroupHeaderClick} />
                    {props.hasHeaderTextActive ?
                        <div className="description"><p>{props.data.groupDesc}</p></div> :
                        null
                    }
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
                return <div><tile.SourceInfoComponent data={props.data} /></div>

            } else if (isAPIResponse(props.data)) {
                return <CorpusInfo data={props.data} />;

            } else {
                throw new Error('Unsupported source info view/data');
            }
        }
        return (
            <div style={{textAlign: 'center', minWidth: '10em', minHeight: '5em'}}>
                <globalComponents.AjaxLoader htmlClass="loader" />
            </div>
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
        }

        handleCloseSourceInfo() {
            dispatcher.dispatch<Actions.CloseSourceInfo>({
                name: ActionName.CloseSourceInfo
            })
        }

        render() {
            return (
                <section className="TilesSections">
                    <header className="status">
                        {this.props.isBusy && !this.props.isModalVisible ?
                            <globalComponents.AjaxLoader htmlClass="loader" /> : null}
                    </header>
                    {this.props.isAnswerMode ?
                        (this.props.datalessGroups.size < this.props.layout.size ?
                            this.props.layout.map((group, groupIdx) => (
                                <TileGroup
                                    key={`${group.groupLabel}:${groupIdx}`}
                                    data={group}
                                    idx={groupIdx}
                                    isHidden={this.props.hiddenGroups.contains(groupIdx)}
                                    hasData={!this.props.datalessGroups.contains(groupIdx)}
                                    hasHeaderTextActive={!this.props.hiddenGroupsHeaders.contains(groupIdx)}
                                    isMobile={this.props.isMobile}
                                    tileFrameProps={this.props.tileProps}
                                    tilesHelpData={this.props.tilesHelpData}
                                    helpActiveTiles={this.props.helpActiveTiles}
                                    tweakActiveTiles={this.props.tweakActiveTiles}
                                    altViewActiveTiles={this.props.altViewActiveTiles} />

                            )) :
                            <NothingFoundBox />
                        ) :
                        <section className="tiles"><InitialHelp sections={this.props.homepageSections} /></section>
                    }
                    {this.props.isModalVisible ?
                        <globalComponents.ModalBox onCloseClick={this.handleCloseSourceInfo}
                                title={this.props.modalBoxData ? this.props.modalBoxData.title : ''}>
                            <globalComponents.ErrorBoundary>
                                <SourceInfo tileProps={this.props.tileProps} data={this.props.modalBoxData} />
                            </globalComponents.ErrorBoundary>
                        </globalComponents.ModalBox> : null}
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