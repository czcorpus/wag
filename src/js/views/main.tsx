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
import {ActionNames, Actions} from '../models/actions';
import {KeyCodes} from '../shared/util';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<{}>, model:WdglanceMainFormModel) {

    // ------------------ <QueryLangSelector /> ------------------------------

    const QueryLangSelector:React.SFC<{
        value:string;
        availLanguages:Immutable.List<[string, string]>;

    }> = (props) => {

        const changeHandler = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch<Actions.ChangeTargetLanguage>({
                type: ActionNames.ChangeTargetLanguage,
                payload: {
                    value: evt.target.value
                }
            });
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
            this.queryWritingIn.debounceTime(300).subscribe(
                (v) => {
                    dispatcher.dispatch<Actions.ChangeQueryInput>({
                        type: ActionNames.ChangeQueryInput,
                        payload: {
                            value: v
                        }
                    });
                }
            );
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
            Search
        </button>;
    };

    // ------------------ <WdglanceControls /> ------------------------------

    class WdglanceControls extends React.PureComponent<WdglanceMainState> {

        constructor(props) {
            super(props);
            this.handleSubmit = this.handleSubmit.bind(this);
        }

        private handleSubmit() {
            dispatcher.dispatch({
                type: ActionNames.RequestQueryResponse
            });
        }

        render() {
            return (
                <div>
                    <form className='search-form'>
                        <QueryLangSelector value={this.props.targetLanguage} availLanguages={this.props.availLanguages} />
                        <QueryInput initialValue={this.props.query} onEnter={this.handleSubmit} />
                        <SubmitButton onClick={this.handleSubmit} />
                    </form>
                </div>
            );
        }
    }

    const WdglanceControlsBound = Bound<WdglanceMainState>(WdglanceControls, model);

    // ------------------ <WdglanceMain /> ------------------------------

    class WdglanceMain extends React.PureComponent<{
        windowA:React.ComponentClass;
        windowB:React.ComponentClass;
        windowC:React.ComponentClass;
        windowD:React.ComponentClass;
    }> {

        render() {
            return (
                <div>
                    <h1>Korpus.cz - Word in a Glance (template)</h1>
                    <WdglanceControlsBound />
                    <section className="visualizations">
                        <section className="app-output" id="window1-mount">
                            {this.props.windowA ? <this.props.windowA /> : null}
                        </section>
                        <section className="app-output" id="window2-mount">
                            {this.props.windowB ? <this.props.windowB /> : null}
                        </section>
                        <section className="app-output" id="window3-mount">
                            {this.props.windowC ? <this.props.windowC /> : null}
                        </section>
                        <section className="app-output" id="window4-mount">
                            {this.props.windowD ? <this.props.windowD /> : null}
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