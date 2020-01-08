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
import { SEDispatcher, StatelessModel, IActionQueue } from 'kombo';

import { AppServices } from '../../../appServices';
import { SystemMessageType } from '../../../common/types';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload, HtmlModelState } from './common';
import { RawHtmlAPI, WiktionaryHtmlAPI, GeneralHtmlAPI } from './service';
import { findCurrLemmaVariant } from '../../../models/query';
import { Observable, of as rxOf } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { AjaxError } from 'rxjs/ajax';
import { RecognizedQueries } from '../../../common/query';


export interface HtmlModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:AppServices;
    service:RawHtmlAPI|WiktionaryHtmlAPI;
    initState:HtmlModelState;
    lemmas:RecognizedQueries;
}


export class HtmlModel extends StatelessModel<HtmlModelState> {

    private readonly lemmas:RecognizedQueries;

    private readonly service:GeneralHtmlAPI<{}>;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    constructor({dispatcher, tileId, appServices, service, initState, lemmas}:HtmlModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.service = service;
        this.lemmas = lemmas;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, seDispatch) => {
                const variant = findCurrLemmaVariant(this.lemmas[0]);
                this.requestData(state, variant.lemma, seDispatch);
            }
        )
        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.error = action.error.message;

                    } else {
                        state.data = action.payload.data;
                    }
                }
            }
        )
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
                        isEmpty: !data,
                        data: data,
                    }
                });
            },
            (err) => {
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
}