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
import {ActionName, Actions, QueryType} from '../models/actions';
import {KeyCodes} from '../shared/util';
import { SystemMessage } from '../notifications';
import { GlobalComponents } from './global';
import { Forms } from '../shared/data';
import { TileFrameProps, SystemMessageType } from '../abstract/types';
import { WdglanceTilesModel, WdglanceTilesState } from '../models/tiles';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, formModel:WdglanceMainFormModel, tilesModel:WdglanceTilesModel) {

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
        onChange:(v:string)=>void;

    }> = (props) => {

        const changeHandler = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            props.onChange(evt.target.value);
        }

        return (
            <select className='QueryLangSelector' onChange={changeHandler}
                    value={props.value}>
                {props.availLanguages.map(v =>
                        <option key={v[0]} value={v[0]}>{v[1]}</option>)}
            </select>
        );
    };


    // ------------------ <QueryInput /> ------------------------------

    class QueryInput extends React.PureComponent<
        {
            initialValue:Forms.Input;
            onContentChange:(s:string)=>void;
            onEnter:()=>void;
        },
        {value: string}> {

        private queryWritingIn:Rx.Subject<string>;

        private queryWritingInSubsc:Rx.Subscription;

        constructor(props) {
            super(props);
            this.state = {value: this.props.initialValue.value};
            this.handleInput = this.handleInput.bind(this);
            this.handleKeyDown = this.handleKeyDown.bind(this);
            this.queryWritingIn = new Rx.Subject<string>();
            this.queryWritingIn.debounceTime(300).subscribe(this.props.onContentChange);
        }

        private handleInput(evt:React.ChangeEvent<HTMLInputElement>) {
            this.queryWritingIn.next(evt.target.value);
        }

        private handleKeyDown(evt:React.KeyboardEvent):void {
            if (evt.keyCode === KeyCodes.ENTER) {
                this.props.onEnter();
                evt.stopPropagation();
                evt.preventDefault();
            }
        }

        componentDidMount() {
            this.queryWritingInSubsc = this.queryWritingIn.subscribe(v => {
                this.setState({value: v});
            });
        }

        componentWillUnmount() {
            this.queryWritingInSubsc.unsubscribe();
        }

        render() {
            return <input type="text" className={`QueryInput${this.props.initialValue.isValid ? '' : ' invalid'}`}
                    onChange={this.handleInput} value={this.state.value}
                    onKeyDown={this.handleKeyDown} />;
        }
    }

    // ------------------ <SubmitButton /> ------------------------------

    const SubmitButton:React.SFC<{
        onClick:()=>void;

    }> = (props) => {

        return <button className="cnc-button cnc-button-primary query-submit" type="button" onClick={props.onClick}>
            {ut.translate('global__search')}
        </button>;
    };

    // ------------------ <QueryTypeSelector /> ------------------------------

    const QueryTypeSelector:React.SFC<{
        avail:Immutable.List<[QueryType, string]>;
        value:QueryType;

    }> = (props) => {

        const handleChange = (evt:React.ChangeEvent<HTMLInputElement>) => {
            dispatcher.dispatch<Actions.ChangeQueryType>({
                name: ActionName.ChangeQueryType,
                payload: {
                    value: evt.target.value as QueryType
                }
            });
        }

        return <div className="QueryTypeSelector">
            {props.avail.map(v =>
                <label key={v[0]}>
                    <input type="radio" value={v[0]} onChange={handleChange} checked={v[0] === props.value} />
                    {v[1]}
                </label>
            )}
        </div>
    };

    // ------------------ <QueryForm /> ------------------------------

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

        const handleTargetLanguageChange = (lang:string) => {
            dispatcher.dispatch<Actions.ChangeTargetLanguage>({
                name: ActionName.ChangeTargetLanguage,
                payload: {
                    value: lang
                }
            });
        };

        const handleTargetLanguageChange2 = (lang:string) => {
            dispatcher.dispatch<Actions.ChangeTargetLanguage2>({
                name: ActionName.ChangeTargetLanguage2,
                payload: {
                    value: lang
                }
            });
        };


        switch (props.queryType) {

            case QueryType.SINGLE_QUERY:
                return (
                    <>
                        <QueryLangSelector value={props.targetLanguage} availLanguages={props.availLanguages}
                                onChange={handleTargetLanguageChange} />
                        <QueryInput initialValue={props.query} onEnter={props.onEnterKey}
                                onContentChange={handleQueryInput1} />
                    </>
                );
            case QueryType.CMP_QUERY:
                return (
                    <>
                        <QueryLangSelector value={props.targetLanguage} availLanguages={props.availLanguages}
                                onChange={handleTargetLanguageChange} />
                        <div className="input-group">
                            <QueryInput initialValue={props.query} onEnter={props.onEnterKey}
                                onContentChange={handleQueryInput1} />
                            <br />
                            <QueryInput initialValue={props.query2} onEnter={props.onEnterKey}
                                onContentChange={handleQueryInput2} />
                        </div>
                    </>
                );
            case QueryType.TRANSLAT_QUERY:
                return (
                    <>
                        <div className="select-group">
                            <QueryLangSelector value={props.targetLanguage} availLanguages={props.availLanguages}
                                    onChange={handleTargetLanguageChange} />
                            <br />
                            <QueryLangSelector value={props.targetLanguage2} availLanguages={props.availLanguages}
                                    onChange={handleTargetLanguageChange2} />
                        </div>
                        <QueryInput initialValue={props.query} onEnter={props.onEnterKey}
                                onContentChange={handleQueryInput1} />
                    </>
                );

        }
    };

    // ------------------ <WdglanceControls /> ------------------------------

    class WdglanceControls extends React.PureComponent<WdglanceMainState> {

        constructor(props) {
            super(props);
        }

        private handleSubmit() {
            dispatcher.dispatch(Rx.Observable.from([
                {
                    name: ActionName.SubmitQuery
                },
                {
                    name: ActionName.RequestQueryResponse
                }
            ]));
        }

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
                            <QueryTypeSelector avail={this.props.availQueryTypes} value={this.props.queryType} />
                        </div>
                    </form>
                </div>
            );
        }
    }

    const WdglanceControlsBound = Bound<WdglanceMainState>(WdglanceControls, formModel);


    // -------

    const Messages:React.SFC<{
        messages:Immutable.List<SystemMessage>;
    }> = (props) => {
        return <ul className="Messages">{props.messages.map(
            msg => <SystemMessage key={msg.ident} type={msg.type} text={msg.text} />)}</ul>
    };

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
                {props.extended ? '\uD83D\uDDD5' : '\uD83D\uDDD6'}
            </button>
        </span>
    };

    // -------------------- <TileSections /> -----------------------------

    class TileSections extends React.Component<{
        tiles:Immutable.List<TileFrameProps>;
    },
        WdglanceTilesState> {

        private modelSubscription:Rx.Subscription;

        private frame0Ref:React.RefObject<HTMLElement>;

        private frame1Ref:React.RefObject<HTMLElement>;

        private frame2Ref:React.RefObject<HTMLElement>;

        private frame3Ref:React.RefObject<HTMLElement>;

        constructor(props) {
            super(props);
            this.state = tilesModel.getState();
            this.frame0Ref = React.createRef();
            this.frame1Ref = React.createRef();
            this.frame2Ref = React.createRef();
            this.frame3Ref = React.createRef();
            window.onresize = () => this.dispatchSizes();
            this.handleModelChange = this.handleModelChange.bind(this);
        }

        private handleModelChange(state) {
            this.setState(state);
        }

        private getElmSize(elm:HTMLElement):[number, number] {
            return elm ? [~~Math.round(elm.clientWidth), ~~Math.round(elm.clientHeight)] : [0, 0];
        }

        private dispatchSizes():void {
            dispatcher.dispatch<Actions.AcknowledgeSizes>({
                name: ActionName.AcknowledgeSizes,
                payload: {
                    values: [
                        this.getElmSize(this.frame0Ref.current),
                        this.getElmSize(this.frame1Ref.current),
                        this.getElmSize(this.frame2Ref.current),
                        this.getElmSize(this.frame3Ref.current),
                    ]
                }
            });
        }

        componentDidMount() {
            this.modelSubscription = tilesModel.addListener(this.handleModelChange);
            this.dispatchSizes();
        }

        componentWillUnmount() {
            this.modelSubscription.unsubscribe();
        }

        render() {
            const availRefs = [this.frame0Ref, this.frame1Ref, this.frame2Ref, this.frame3Ref];
            return (
                <div>
                    {this.state.systemMessages.size > 0 ? <Messages messages={this.state.systemMessages} /> : null}

                    <section className={`tiles${this.state.expandedTile > -1 ? ' exclusive' : ''}`}>
                    {this.props.tiles.map((tile) => {
                         if (this.state.expandedTile > -1 && this.state.expandedTile !== tile.tileId) {
                            return <section key={`tile-ident-${tile.tileId}`} className="cnc-tile app-output expanded">
                                <div className="cnc-tile-header panel">
                                    <h2>{tile.label}</h2>
                                </div>
                            </section>;

                        } else {
                            return (
                                <section key={`tile-ident-${tile.tileId}`}
                                        className={`cnc-tile app-output${this.state.expandedTile === tile.tileId ? ' expanded' : ''}`}
                                        ref={availRefs[tile.tileId]}>
                                    <div className="cnc-tile-header panel">
                                        <h2>{tile.label}</h2>
                                        {tile.supportsExtendedView ? <ExtendButton tileIdent={tile.tileId} extended={this.state.expandedTile === tile.tileId} /> : null}
                                    </div>
                                    <div className="provider">
                                        {tile.Component ? <tile.Component /> : null}
                                    </div>
                                </section>
                            );
                        }
                    })}
                    </section>
                </div>
            );
        }
    }

    // ------------------ <WdglanceMain /> ------------------------------

    const WdglanceMain:React.SFC<{
        tiles:Immutable.List<TileFrameProps>;
    }> = (props) => {

        return (
            <div className="WdglanceMain">
                <div className="logo">
                    <h1>Word at a Glance</h1>
                </div>
                <WdglanceControlsBound />
                <TileSections tiles={props.tiles} />
            </div>
        );

    }

    return {
        WdglanceMain: WdglanceMain
    };
}