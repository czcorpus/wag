import { ActionDispatcher } from 'kombo';
import * as sinon from 'sinon';

import { AppServices } from '../src/js/appServices';


export class TestModelWrapper<T = {}> {
    appServicesStub: AppServices;
    dispatcher: ActionDispatcher;
    lastAction: string; // records last action name received by dispatcher
    model;

    /**
     * Wrapper creates its own dispatcher and appServices stub and uses them to create model instance.
     * @param modelType requires model constructor to have args as destructured object
     * @param modelArgs arguments object to create model instance
     * @param appServicesOverrides object to specify appServices stub return values if necessary
     */
    constructor(modelType, modelArgs:T, appServicesOverrides = {}) {
        this.dispatcher = new ActionDispatcher();
        this.dispatcher.registerActionListener((action, dispatch) => {
            this.lastAction = action.name;
        });
        this.appServicesStub = sinon.createStubInstance(AppServices, appServicesOverrides);
        this.model = new modelType({...modelArgs, dispatcher: this.dispatcher, appServices: this.appServicesStub});
    }

    /**
     * Method to test model state after dispatching and receiving action
     * @param evokeAction action to dispatch
     * @param checkActionName when this action occurrs call `checkState` function
     * @param checkState function to check model state or called appServices 
     */
    checkState(evokeAction, checkActionName: string, checkState: (state, appServicesStub?) => void) {
        this.model.addListener(state => {
            if (this.lastAction === checkActionName) { checkState(state, this.appServicesStub); }
        });

        this.dispatcher.dispatch(evokeAction);
    }
}