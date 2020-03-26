import { ActionDispatcher } from 'kombo';


export class TestModelWrapper<T> {
    dispatcher: ActionDispatcher;
    lastAction: string;
    model;

    constructor(modelType, args:T) {
        this.dispatcher = new ActionDispatcher();
        this.dispatcher.registerActionListener((action, dispatch) => {
            this.lastAction = action.name;
        });
        this.model = new modelType({...args, dispatcher: this.dispatcher});
    }

    checkState(evokeAction, checkAction: string, checkState: (state) => void) {
        this.model.addListener(state => {
            if (this.lastAction === checkAction) { checkState(state); }
        });

        this.dispatcher.dispatch(evokeAction);
    }
}