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
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';

import { AppServices } from '../../../appServices';
import { SystemMessageType } from '../../../common/types';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload, HtmlModelState } from './common';
import { RawHtmlAPI, WiktionaryHtmlAPI, GeneralHtmlAPI } from './service';
import { findCurrLemmaVariant } from '../../../models/query';
import { Observable, of as rxOf } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { RecognizedQueries } from '../../../common/query';


export interface HtmlModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:AppServices;
    service:RawHtmlAPI|WiktionaryHtmlAPI;
    maxTileHeight:string;
    initState:HtmlModelState;
    queries:RecognizedQueries;
}


export class HtmlModel extends StatelessModel<HtmlModelState> {

    private readonly queries:RecognizedQueries;

    private readonly service:GeneralHtmlAPI<{}>;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    readonly maxTileHeight:string;

    constructor({dispatcher, tileId, appServices, service, maxTileHeight, initState, queries}:HtmlModelArgs) {
        super(dispatcher, initState);
        this.maxTileHeight = maxTileHeight;
        this.tileId = tileId;
        this.appServices = appServices;
        this.service = service;
        this.queries = queries;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse)  => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.error = action.error.message;

                    } else {
                        newState.data = action.payload.data;
                    }
                    return newState;
                }
                return state;
            }
        }
    }

    private requestData(state:HtmlModelState, variant:string, seDispatch:SEDispatcher):void {
        this.service.call(this.service.stateToArgs(state, variant)).pipe(
            concatMap(
                (ans:string) => {
                    return state.sanitizeHTML ? new Observable<any>((observer) => {
                        import(/* webpackChunkName: "sanitize-html" */ 'sanitize-html').then(
                            (sanitizeHtml) => {
                                observer.next(sanitizeHtml['default'](ans, {
                                    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img'])
                                }));
                                observer.complete();
                            },
                            (err) => {
                                observer.error(err);
                            }
                        )
                    }) : rxOf(ans);
                }
            )
        ).subscribe(
            (data) => {
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: Boolean(data),
                        data: data,
                    }
                });
            },
            (err) => {
                this.appServices.showMessage(SystemMessageType.ERROR, err);
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        data: null,
                    },
                    error: err
                });
            }
        );
    }

    sideEffects(state:HtmlModelState, action:Action, seDispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                const variant = findCurrLemmaVariant(this.queries.get(0));
                this.requestData(state, variant.lemma, seDispatch);
            break;
        }
    }
}