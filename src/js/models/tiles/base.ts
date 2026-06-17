/*
 * Copyright 2026 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2026 Department of Linguistics,
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

import {
    IActionQueue,
    IFullActionControl,
    INewStateReducer,
    SEDispatcher,
    StatefulModel,
    StatelessModel,
} from 'kombo';
import { IAppServices } from '../../appServices.js';
import { Actions } from '../actions.js';
import { LemmatizationLevel } from '../../query/index.js';
import { List } from 'cnc-tskit';
import { IDataStreaming } from '../../page/streaming.js';

function lemLevelSupport(
    conf: Array<LemmatizationLevel> | undefined,
    ll: LemmatizationLevel
): boolean {
    if (!conf || List.empty(conf)) {
        return true;
    }
    return List.findIndex((x) => x === ll, conf) > -1;
}

interface StatelessModelArgs<T> {
    dispatcher: IActionQueue;
    initState: T;
    tileId: number;
    dependentTiles: Array<number>;
    appServices: IAppServices;
    lemLevelSupport: Array<LemmatizationLevel>;
}

/**
 * TileStatelessModel is a WaG-specific extension of
 * StatelessModel with some necessary and/or useful
 * properties required by tile logic. It also provides
 * a simpler way how to handle the main search action
 * (RequestQueryResponse) with DataStreaming already
 * properly prepared.
 */
export abstract class TileStatelessModel<
    T extends object,
> extends StatelessModel<T> {
    protected readonly tileId: number;

    protected readonly appServices: IAppServices;

    protected readonly dependentTiles: Array<number>;

    protected readonly supportedLemLevels: Array<LemmatizationLevel>;

    constructor({
        dispatcher,
        initState,
        tileId,
        dependentTiles,
        appServices,
        lemLevelSupport,
    }: StatelessModelArgs<T>) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.dependentTiles = dependentTiles;
        this.appServices = appServices;
        this.supportedLemLevels = lemLevelSupport;
    }

    addSearchActionHandler(
        reducer: INewStateReducer<
            T,
            typeof Actions.RequestQueryResponse
        > | null,
        seProducer?: (
            state: T,
            action: typeof Actions.RequestQueryResponse,
            seDispatch: SEDispatcher,
            dataStream: IDataStreaming
        ) => void
    ) {
        this.addActionSubtypeHandler(
            Actions.RequestQueryResponse,
            (action) =>
                action.payload?.tileId === undefined ||
                action.payload?.tileId === this.tileId,
            reducer,
            (state, action, seDispatch) => {
                const ds =
                    action.payload?.tileId === undefined
                        ? this.appServices.dataStreaming()
                        : this.appServices
                              .dataStreaming()
                              .startNewSubgroup(
                                  this.tileId,
                                  ...this.dependentTiles
                              );
                seProducer(state, action, seDispatch, ds);
            }
        );
    }

    lemLevelSupport(ll: LemmatizationLevel): boolean {
        return lemLevelSupport(this.supportedLemLevels, ll);
    }
}

interface StatefulModelArgs<T> {
    dispatcher: IFullActionControl;
    initState: T;
    tileId: number;
    dependentTiles: Array<number>;
    appServices: IAppServices;
    lemLevelSupport: Array<LemmatizationLevel>;
}

/**
 * TileStatefulModel is a WaG-specific extension of
 * StatefulModel with some necessary and/or useful
 * properties required by tile logic. It also provides
 * a simpler way how to handle the main search action
 * (RequestQueryResponse) with DataStreaming already
 * properly prepared.
 */
export abstract class TileStatefulModel<
    T extends object,
> extends StatefulModel<T> {
    protected readonly tileId: number;

    protected readonly dependentTiles: Array<number>;

    protected readonly appServices: IAppServices;

    protected readonly supportedLemLevels: Array<LemmatizationLevel>;

    constructor({
        dispatcher,
        initState,
        tileId,
        dependentTiles,
        appServices,
        lemLevelSupport,
    }: StatefulModelArgs<T>) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.dependentTiles = dependentTiles;
        this.appServices = appServices;
        this.supportedLemLevels = lemLevelSupport;
    }

    addSearchActionHandler(
        handler: (
            action: typeof Actions.RequestQueryResponse,
            dataStream: IDataStreaming
        ) => void
    ) {
        this.addActionSubtypeHandler(
            Actions.RequestQueryResponse,
            (action) =>
                action.payload?.tileId === undefined ||
                action.payload?.tileId === this.tileId,
            (action) => {
                const ds =
                    action.payload?.tileId === undefined
                        ? this.appServices.dataStreaming()
                        : this.appServices
                              .dataStreaming()
                              .startNewSubgroup(
                                  this.tileId,
                                  ...this.dependentTiles
                              );
                handler(action, ds);
            }
        );
    }

    lemLevelSupport(ll: LemmatizationLevel): boolean {
        return lemLevelSupport(this.supportedLemLevels, ll);
    }
}
