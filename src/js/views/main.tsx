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

import {ActionDispatcher, Bound, ViewUtils, BoundWithProps} from 'kombo';
import * as React from 'react';
import * as Immutable from 'immutable';
import * as Rx from '@reactivex/rxjs';
import {WdglanceMainState, WdglanceMainFormModel} from '../models/query';
import {ActionName, Actions} from '../models/actions';
import {KeyCodes} from '../shared/util';
import { GlobalComponents } from './global';
import { Forms } from '../shared/data';
import { TileFrameProps, SystemMessageType, QueryType } from '../abstract/types';
import { WdglanceTilesModel, WdglanceTilesState } from '../models/tiles';
import { MessagesState, MessagesModel } from '../models/messages';
import {init as corpusInfoViewInit} from './corpusInfo';
import { TileGroup } from '../layout';
import { SystemMessage } from '../notifications';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, formModel:WdglanceMainFormModel, tilesModel:WdglanceTilesModel,
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
        availLanguages:Immutable.List<[string, string]>;
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
                        <option key={v[0]} value={v[0]}>{v[1]}</option>)}
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
                    {i > 0 && props.isMobile ? <span> | </span> : null}
                    <a onClick={(evt:React.MouseEvent<HTMLAnchorElement>) => props.onChange(v[0])}
                                className={v[0] === props.value ? 'current' : null}
                                aria-current={v[0] === props.value ? 'page' : null}>
                        {v[1]}
                    </a>
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
        availLanguages:Immutable.List<[string, string]>;
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

    // ------------------ <WdglanceControls /> ------------------------------

    class WdglanceControls extends React.PureComponent<WdglanceMainState & {isMobile:boolean}> {

        constructor(props) {
            super(props);
            this.handleQueryTypeChange = this.handleQueryTypeChange.bind(this);
        }

        private handleSubmit() {
            dispatcher.dispatch(Rx.Observable.of(
                {
                    name: ActionName.EnableAnswerMode
                },
                {
                    name: ActionName.SubmitQuery
                },
                {
                    name: ActionName.RequestQueryResponse
                }
            ));
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
                <div>
                    <form className="WdglanceControls cnc-form">
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
                </div>
            );
        }
    }

    const WdglanceControlsBound = formModel ?
            BoundWithProps<{isMobile:boolean}, WdglanceMainState>(WdglanceControls, formModel) :
            (props) => <WdglanceControls
                            query={Forms.newFormValue('', true)}
                            query2={Forms.newFormValue('', false)}
                            queryType={QueryType.SINGLE_QUERY}
                            targetLanguage="cs" /* TODO */
                            targetLanguage2="en"
                            availLanguages={Immutable.List<[string, string]>()}
                            availQueryTypes={Immutable.List<[QueryType, string]>()}
                            isMobile={false}
                            isValid={true} />

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


    // ------------- <TweakButton /> --------------------------------------

    const TweakButton:React.SFC<{
        tileId:number;
        isExtended:boolean;
        isDisabled:boolean;

    }> = (props) => {

        const handleClick = () => {
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

    }> = (props) => {
        return (
            <>
                <section className="cnc-tile help">
                    <header className="cnc-tile-header panel">
                        {ut.translate('help__intro_tile_header')}
                    </header>
                    <div className="tile-body">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
                     in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident,
                     sunt in culpa qui officia deserunt mollit anim id est laborum.
                    </div>
                </section>
                <section className="cnc-tile help">
                    <header className="cnc-tile-header panel">
                        {ut.translate('help__help_tile_header')}
                    </header>
                    <div className="tile-body">
                    Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae
                    ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur
                    aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum
                    quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat
                    voluptatem.
                    </div>
                </section>
                <section className="cnc-tile help">
                    <header className="cnc-tile-header panel">
                        {ut.translate('help__tips_tile_header')}
                    </header>
                    <div className="tile-body">
                        Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem
                        vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla
                        pariatur?"
                        </div>
                </section>
            </>
        );
    }


    // ------------- <TileContainer /> --------------------------------------

    class TileContainer extends React.Component<{
        isTweakMode:boolean;
        helpHTML:string;
        isMobile:boolean;
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

        private genStyle() {
            if (this.props.isMobile) {
                return {};

            } else {
                return {
                    gridColumn: `span ${this.props.tile.widthFract}`
                };
            }
        }

        render() {
            return (
                <section key={`tile-ident-${this.props.tile.tileId}`}
                        className={`cnc-tile app-output${this.props.isTweakMode ? ' expanded' : ''}`}
                        style={this.genStyle()}>
                    <header className="cnc-tile-header panel">
                        <h2>{this.props.tile.label}</h2>
                        <div className="window-buttons">
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
                                        widthFract={this.props.tile.widthFract} />
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

    // -------------------- <TilesSections /> -----------------------------

    class TilesSections extends React.PureComponent<{layout:Immutable.List<TileGroup>} & WdglanceTilesState> {

        constructor(props) {
            super(props);
            this.handleCloseCorpusInfo = this.handleCloseCorpusInfo.bind(this);
        }

        handleCloseCorpusInfo() {
            dispatcher.dispatch<Actions.CloseCorpusInfo>({
                name: ActionName.CloseCorpusInfo
            })
        }

        mkGroupClickHandler(groupIdx:number) {
            return () => {
                dispatcher.dispatch<Actions.ToggleGroupVisibility>({
                    name: ActionName.ToggleGroupVisibility,
                    payload: {
                        groupIdx: groupIdx
                    }
                });
            }
        }

        render() {
            return (
                <section className="TilesSections">
                    <header className="status">
                        {this.props.isBusy && !this.props.isModalVisible ?
                            <globalComponents.AjaxLoader htmlClass="loader" /> : null}
                    </header>
                    {this.props.isAnswerMode ?
                        this.props.layout.map((group, groupIdx) => {
                            const groupHidden = this.props.hiddenGroups.contains(groupIdx);
                            return (
                                <section key={`group:${group.groupLabel}`} className="group">
                                    <header>
                                        <h2>
                                            <span className="mark">{'\u25B6'}</span>
                                            <a onClick={this.mkGroupClickHandler(groupIdx)}
                                                    title={groupHidden ? ut.translate('global__click_to_show_group') : ut.translate('global__click_to_hide_group')}>
                                                {group.groupLabel}
                                            </a>
                                        </h2>
                                        <p>{group.groupDesc}</p>
                                    </header>
                                    {groupHidden ?
                                        <section className="hidden-content cnc-tile">
                                            <div className="cnc-tile-body">
                                                <a className="show" onClick={this.mkGroupClickHandler(groupIdx)}>
                                                    {ut.translate('global__show_group_link')}
                                                    {'\u00a0'}
                                                    {'\u2026'}
                                                </a>
                                            </div>
                                        </section> :
                                        <section className="tiles">
                                        {group.tiles
                                            .map(v => this.props.tileProps.get(v.tileId))
                                            .filter(v => v.supportsCurrQueryType)
                                            .map(tile => <TileContainer key={`tile:${tile.tileId}`} tile={tile}
                                                                isMobile={this.props.isMobile}
                                                                helpHTML={this.props.helpActiveTiles.contains(tile.tileId) ? this.props.tilesHelpData.get(tile.tileId) : null}
                                                                helpURL={tile.helpURL}
                                                                isTweakMode={this.props.tweakActiveTiles.contains(tile.tileId)} />)
                                        }
                                        </section>
                                    }
                                </section>
                            );
                        }) :
                        <section className="tiles"><InitialHelp /></section>
                    }
                    {this.props.isModalVisible ?
                        <globalComponents.ModalBox onCloseClick={this.handleCloseCorpusInfo}
                                title={this.props.modalBoxTitle}>
                            {this.props.modalBoxData ? /* TODO thisis hardcoded; no other type possible here */
                                <CorpusInfo data={this.props.modalBoxData} /> :
                                <div style={{textAlign: 'center', minWidth: '10em', minHeight: '5em'}}>
                                    <globalComponents.AjaxLoader htmlClass="loader" />
                                </div>
                            }
                        </globalComponents.ModalBox> : null}
                </section>
            );
        }
    }

    const BoundTilesSections = tilesModel ?
        BoundWithProps<any, any>(TilesSections, tilesModel) :   // TODO type issue
        (props) => {
            return <TilesSections
                        isAnswerMode={false}
                        isBusy={false}
                        isMobile={false}
                        isModalVisible={false}
                        tweakActiveTiles={Immutable.Set<number>()}
                        helpActiveTiles={Immutable.Set<number>()}
                        tilesHelpData={Immutable.Map<number, string>()}
                        hiddenGroups={Immutable.Set<number>()}
                        tileProps={Immutable.List<TileFrameProps>()}
                        modalBoxData={null}
                        modalBoxTitle=""
                        layout={Immutable.List<TileGroup>()} />
        }

    // ------------------ <WdglanceMain /> ------------------------------

    const WdglanceMain:React.SFC<{
        layout:Immutable.List<TileGroup>;
        isMobile:boolean;
    }> = (props) => {

        return (
            <div className="WdglanceMain">
                <WdglanceControlsBound />
                <BoundMessagesBox />
                <BoundTilesSections layout={props.layout} />
            </div>
        );
    }

    return {
        WdglanceMain: WdglanceMain
    };
}