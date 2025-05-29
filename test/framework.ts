/*
 * Copyright 2020 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import { ActionDispatcher, IModel, IActionDispatcher, Action } from 'kombo';
import sinon from 'sinon';

import { IAppServices, AppServices } from '../src/js/appServices.js';


/**
 * T = Model type
 * U = Model state type
 */
export class TestModelWrapper<T extends IModel<U>, U> {

    appServicesStub:sinon.SinonStubbedInstance<IAppServices>;

    dispatcher:ActionDispatcher;

    lastAction:string; // records last action name received by dispatcher

    model:T;

    /**
     * Wrapper creates its own dispatcher and appServices stub and uses them to create model instance.
     * @param modelType requires model constructor to have args as destructured object
     * @param modelArgs arguments object to create model instance
     * @param appServicesOverrides object to specify appServices stub return values if necessary
     */
    constructor(modelFactory:(dispatcher:IActionDispatcher, appServices:IAppServices)=>T, appServicesOverrides = {}) {
        this.dispatcher = new ActionDispatcher();
        this.dispatcher.registerActionListener((action, _) => {
            this.lastAction = action.name;
        });
        this.appServicesStub = sinon.createStubInstance(AppServices, appServicesOverrides);
        this.model = modelFactory(this.dispatcher, this.appServicesStub);
    }

    /**
     * Method to test model state after dispatching and receiving action
     * @param evokeAction action to dispatch
     * @param checkActionName when this action occurrs call `checkState` function
     * @param checkState function to check model state or called appServices
     */
    checkState(evokeAction:Action, checkActionName:string,
                checkState:(state:U, appServicesStub:sinon.SinonStubbedInstance<IAppServices>) => void) {
        this.model.addListener(state => {
            if (this.lastAction === checkActionName && state !== undefined) {
                checkState(state, this.appServicesStub);
            }
        });
        this.dispatcher.dispatch(evokeAction);
    }
}
