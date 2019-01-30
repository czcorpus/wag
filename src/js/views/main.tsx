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

import {ActionDispatcher, Bound, ViewUtils} from 'kombo';
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


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, formModel:WdglanceMainFormModel, tilesModel:WdglanceTilesModel,
            messagesModel:MessagesModel) {

    const globalComponents = ut.getComponents();

    // ------------------ <SystemMessage /> ------------------------------

    const SystemMessage:React.SFC<{
        type:SystemMessageType;
        text:string;
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

        return (
            <li className="SystemMessage">
                <div className={`wrapper cnc-msgbox ${classType}`}>
                    <div className="flex">
                        <globalComponents.MessageStatusIcon statusType={props.type} isInline={true} />
                        <p>{props.text}</p>
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

        return <button className="SubmitButton cnc-button cnc-button-primary" type="button" onClick={props.onClick}>
            {ut.translate('global__search')}
        </button>;
    };

    // ------------------ <QueryTypeSelector /> ------------------------------

    const QueryTypeSelector:React.SFC<{
        avail:Immutable.List<[QueryType, string]>;
        value:QueryType;
        onChange:(v:QueryType)=>void;

    }> = (props) => {

        return <div className="QueryTypeSelector">
            {props.avail.map(v =>
                <label key={v[0]}>
                    <input type="radio" value={v[0]}
                            onChange={(evt:React.ChangeEvent<HTMLInputElement>) => props.onChange(evt.target.value as QueryType)}
                            checked={v[0] === props.value} />
                    {v[1]}
                </label>
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

    class WdglanceControls extends React.PureComponent<WdglanceMainState> {

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
                        <div>
                            <QueryTypeSelector avail={this.props.availQueryTypes}
                                    value={this.props.queryType}
                                    onChange={this.handleQueryTypeChange} />
                        </div>
                    </form>
                </div>
            );
        }
    }

    const WdglanceControlsBound = Bound<WdglanceMainState>(WdglanceControls, formModel);


    // ------------- <ExtendButton /> --------------------------------------

    const ExtendButton:React.SFC<{
        tileIdent:number;
        extended:boolean;

    }> = (props) => {

        const handleClick = () => {
            if (props.extended) {
                dispatcher.dispatch({
                    name: ActionName.ResetExpandTile,
                    payload: {
                        ident: props.tileIdent
                    }
                });

            } else {
                dispatcher.dispatch({
                    name: ActionName.ExpandTile,
                    payload: {
                        ident: props.tileIdent
                    }
                });
            }
        };

        return <span className="ExtendButton">
            <button type="button" onClick={handleClick} title={props.extended ? ut.translate('global__reset_size') : ut.translate('global__extend')}>
                {props.extended ? <i className="fa fa-compress"></i> : <i className="fa fa-expand"></i>}
            </button>
        </span>
    };

    // ------------- <InitialHelp /> --------------------------------------

    const InitialHelp:React.SFC<{

    }> = (props) => {
        return <div className="cnc-tile"><h2>help</h2></div>;
    }


    // ------------- <TileContainer /> --------------------------------------

    class TileContainer extends React.Component<{
        isExpanded:boolean;
        tile:TileFrameProps;
    }, {}> {

        private ref:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.ref = React.createRef();
        }

        componentDidMount() {
            dispatcher.dispatch<Actions.AcknowledgeSize>({
                name: ActionName.AcknowledgeSize,
                payload: {
                    tileId: this.props.tile.tileId,
                    size: ut.getElementSize(this.ref.current)
                }
            })
        }

        render() {
            return (
                <section key={`tile-ident-${this.props.tile.tileId}`}
                        className={`cnc-tile app-output${this.props.isExpanded ? ' expanded' : ''}`}>
                    <div className="cnc-tile-header panel">
                        <h2>{this.props.tile.label}</h2>
                        {this.props.tile.supportsExtendedView ?
                            <ExtendButton tileIdent={this.props.tile.tileId} extended={this.props.isExpanded} /> :
                            null
                        }
                    </div>
                    <div className="provider" ref={this.ref}>
                        {this.props.tile.Component ?
                            <globalComponents.ErrorBoundary>
                                <this.props.tile.Component renderSize={this.props.tile.renderSize} />
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
                <div>
                {this.props.systemMessages.size > 0 ?
                    <ul className="Messages">
                        {this.props.systemMessages.map(
                                msg => <SystemMessage key={msg.ident} type={msg.type} text={msg.text} />)
                        }
                    </ul> :
                    null
                }
                </div>
            );
        }
    }

    const BoundMessagesBox = Bound(MessagesBox, messagesModel);

    // -------------------- <TilesSections /> -----------------------------

    class TilesSections extends React.PureComponent<WdglanceTilesState> {

        render() {
            return (
                <div>
                    <section className="tiles">
                    {this.props.isAnswerMode ?
                        (
                            <>
                            {this.props.tileProps
                                .filter(tile => tile.queryTypeSupport > 0)
                                .sort((a, b) => b.queryTypeSupport - a.queryTypeSupport)
                                .map((tile) => <TileContainer key={`tile:${tile.tileId}`} tile={tile}
                                                    isExpanded={this.props.expandedTiles.contains(tile.tileId)} />)
                            }
                            </>
                        ) :
                        <InitialHelp />
                    }
                    </section>
                </div>
            );
        }
    }

    const BoundTilesSections = Bound(TilesSections, tilesModel);

    // ------------------ <WdglanceMain /> ------------------------------

    const WdglanceMain:React.SFC<{}> = (props) => {

        return (
            <div className="WdglanceMain">
                <WdglanceControlsBound />
                <BoundMessagesBox />
                <BoundTilesSections />
            </div>
        );
    }

    return {
        WdglanceMain: WdglanceMain
    };
}