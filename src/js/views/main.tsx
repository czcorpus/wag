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
import {WdglanceMainState, WdglanceMainFormModel} from '../models/main';
import {ActionNames, Actions, QueryType} from '../models/actions';
import {KeyCodes} from '../shared/util';
import { SystemMessage, SystemMessageType } from '../notifications';
import { GlobalComponents } from './global';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:WdglanceMainFormModel) {

    const globalComponents = ut.getComponents();

    // ------------------ <SystemMessage /> ------------------------------

    const SystemMessage:React.SFC<{
        type:SystemMessageType;
        text:string;
    }> = (props) => {
        return (
            <li className="SystemMessage">
                <div className="wrapper">
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
            initialValue:string,
            onContentChange:(s:string)=>void;
            onEnter:()=>void;
        },
        {value: string}> {

        private queryWritingIn:Rx.Subject<string>;

        private queryWritingInSubsc:Rx.Subscription;

        constructor(props) {
            super(props);
            this.state = {value: this.props.initialValue};
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
            return <input type="text" className="QueryInput"
                    onChange={this.handleInput} value={this.state.value}
                    onKeyDown={this.handleKeyDown} />;
        }
    }

    // ------------------ <SubmitButton /> ------------------------------

    const SubmitButton:React.SFC<{
        onClick:()=>void;

    }> = (props) => {

        return <button className="query-submit" type="button" onClick={props.onClick}>
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
                name: ActionNames.ChangeQueryType,
                payload: {
                    value: evt.target.value as QueryType
                }
            });
        }

        return <div>
            {props.avail.map(v =>
                <label key={v[0]}>
                    <input type="radio" value={v[0]} onChange={handleChange} checked={v[0] === props.value} />
                    {v[1]}
                </label>
            )}
        </div>
    };

    // ------------------ <WdglanceControls /> ------------------------------

    class WdglanceControls extends React.PureComponent<WdglanceMainState> {

        constructor(props) {
            super(props);
            this.handleSubmit = this.handleSubmit.bind(this);
            this.handleQueryInput1 = this.handleQueryInput1.bind(this);
            this.handleQueryInput2 = this.handleQueryInput2.bind(this);
            this.handleTargetLanguageChange = this.handleTargetLanguageChange.bind(this);
            this.handleTargetLanguageChange2 = this.handleTargetLanguageChange2.bind(this);
        }

        private handleSubmit() {
            dispatcher.dispatch({
                name: ActionNames.RequestQueryResponse
            });
        }

        private handleQueryInput1(s:string):void {
            dispatcher.dispatch<Actions.ChangeQueryInput>({
                name: ActionNames.ChangeQueryInput,
                payload: {
                    value: s
                }
            });
        }

        private handleQueryInput2(s:string):void {
            dispatcher.dispatch<Actions.ChangeQueryInput2>({
                name: ActionNames.ChangeQueryInput2,
                payload: {
                    value: s
                }
            });
        }

        private handleTargetLanguageChange(lang:string) {
            dispatcher.dispatch<Actions.ChangeTargetLanguage>({
                name: ActionNames.ChangeTargetLanguage,
                payload: {
                    value: lang
                }
            });
        }

        private handleTargetLanguageChange2(lang:string) {
            dispatcher.dispatch<Actions.ChangeTargetLanguage2>({
                name: ActionNames.ChangeTargetLanguage2,
                payload: {
                    value: lang
                }
            });
        }

        render() {
            return (
                <div>
                    <form className="WdglanceControls">
                        <div className="main">
                            <div className="queries">
                                <div className="query1">
                                    <QueryLangSelector value={this.props.targetLanguage} availLanguages={this.props.availLanguages}
                                            onChange={this.handleTargetLanguageChange} />
                                    <QueryInput initialValue={this.props.query} onEnter={this.handleSubmit}
                                            onContentChange={this.handleQueryInput1} />
                                </div>
                                {
                                    this.props.queryType === QueryType.DOUBLE_QUERY ?
                                    <div className="query2">
                                        <QueryLangSelector value={this.props.targetLanguage2} availLanguages={this.props.availLanguages}
                                            onChange={this.handleTargetLanguageChange2} />
                                        <QueryInput initialValue={this.props.query2} onEnter={this.handleSubmit}
                                            onContentChange={this.handleQueryInput2} />
                                    </div> :
                                    null
                                }
                            </div>
                            <div>
                                <SubmitButton onClick={this.handleSubmit} />
                            </div>
                        </div>
                        <div>
                            <QueryTypeSelector avail={this.props.availQueryTypes} value={this.props.queryType} />
                        </div>
                    </form>
                    {this.props.systemMessages.size > 0 ? <Messages messages={this.props.systemMessages} /> : null}
                </div>
            );
        }
    }

    const WdglanceControlsBound = Bound<WdglanceMainState>(WdglanceControls, model);


    // -------

    const Messages:React.SFC<{
        messages:Immutable.List<SystemMessage>;
    }> = (props) => {
        return <ul className="Messages">{props.messages.map(
            msg => <SystemMessage key={msg.ident} type={msg.type} text={msg.text} />)}</ul>
    };

    // ------------------ <WdglanceMain /> ------------------------------

    class WdglanceMain extends React.PureComponent<{
        window0:React.ComponentClass<{parentRef:React.RefObject<HTMLElement>}>;
        window0Label:string;
        window1:React.ComponentClass<{parentRef:React.RefObject<HTMLElement>}>;
        window1Label:string;
        window2:React.ComponentClass<{parentRef:React.RefObject<HTMLElement>}>;
        window2Label:string;
        window3:React.ComponentClass<{parentRef:React.RefObject<HTMLElement>}>;
        window3Label:string;
    }> {

        private frame0Ref:React.RefObject<HTMLElement>;

        private frame1Ref:React.RefObject<HTMLElement>;

        private frame2Ref:React.RefObject<HTMLElement>;

        private frame3Ref:React.RefObject<HTMLElement>;

        constructor(props) {
            super(props);
            this.frame0Ref = React.createRef();
            this.frame1Ref = React.createRef();
            this.frame2Ref = React.createRef();
            this.frame3Ref = React.createRef();

            window.onresize = () => {
                this.dispatchSizes();
            };
        }

        private getElmSize(elm:HTMLElement):[number, number] {
            return [~~Math.round(elm.clientWidth), ~~Math.round(elm.clientHeight)];
        }

        private dispatchSizes():void {
            dispatcher.dispatch<Actions.AcknowledgeSizes>({
                name: ActionNames.AcknowledgeSizes,
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
            this.dispatchSizes();
        }

        render() {
            return (
                <div className="WdglanceMain">
                    <div className="logo">
                        <h1>Word in a Glance</h1>
                    </div>
                    <WdglanceControlsBound />
                    <section className="tiles">
                        <section className="app-output window1-mount" ref={this.frame0Ref}>
                            <h2>{this.props.window0Label}</h2>
                            {this.props.window0 ? <this.props.window0 parentRef={this.frame0Ref} /> : null}
                        </section>
                        <section className="app-output window2-mount" ref={this.frame1Ref}>
                            <h2>{this.props.window1Label}</h2>
                            {this.props.window1 ? <this.props.window1 parentRef={this.frame1Ref} /> : null}
                        </section>
                        <section className="app-output window3-mount" ref={this.frame2Ref}>
                            <h2>{this.props.window2Label}</h2>
                            {this.props.window2 ? <this.props.window2 parentRef={this.frame2Ref} /> : null}
                        </section>
                        <section className="app-output window4-mount" ref={this.frame3Ref}>
                            <h2>{this.props.window3Label}</h2>
                            {this.props.window3 ? <this.props.window3 parentRef={this.frame0Ref} /> : null}
                        </section>
                    </section>
                </div>
            );
        }

    }

    return {
        WdglanceMain: WdglanceMain
    };
}