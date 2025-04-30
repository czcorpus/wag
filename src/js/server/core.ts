/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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
import { Action, IStatelessModel, StatefulModel, IFullActionControl, SEDispatcher, IActionCapturer } from 'kombo';
import { BehaviorSubject, Observable, Subscription, Subject, of as rxOf } from 'rxjs';
import { scan, startWith, mergeMap } from 'rxjs/operators';



export class ServerSideActionDispatcher implements IFullActionControl {

    private readonly inActions:Subject<Action | Observable<Action>>;

    private readonly actions:Observable<Action>;

    constructor() {
        this.inActions = new Subject<Action  | Observable<Action>>();
        this.actions = this.inActions.pipe(
            mergeMap(v => v instanceof Observable ? v : rxOf(v))
        );
    }

    dispatch<T extends Action | Observable<Action>>(action: T): void {
        this.inActions.next(action);
    }

    dispatchSideEffect<T extends Action>(action: T): void {
    }

    registerStatefulModel<T>(model: StatefulModel<T>): Subscription {
        return this.actions.subscribe(model.onAction.bind(model));
    }

    registerActionListener(fn: (action: Action, dispatch: SEDispatcher) => void): Subscription {
        return this.actions.subscribe((a:Action) => fn(a, seAction => this.inActions.next(seAction)));
    }

    registerModel<T>(model: IStatelessModel<T>, initialState: T): [BehaviorSubject<T>, Subscription] {
        const state$ = new BehaviorSubject(initialState);
        const subscr = this.actions.pipe(
            startWith(null),
            scan(
                (state:T, action:Action<{}>) => {
                    if (action !== null) {
                        model.wakeUp(action);
                        if (model.isActive()) {
                            return model.reduce(state, action);
                        }
                    }
                    return state;
                },
                initialState
            )
        ).subscribe(state$);
        return [state$, subscr];
    }

    captureAction(actionName: string, capturer: IActionCapturer): void {
        // TODO
    }

    unregister():void {}
}