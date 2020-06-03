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

import { IAppServices } from '../../../appServices';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload, HtmlModelState } from './common';
import { findCurrQueryMatch } from '../../../models/query';
import { Observable, of as rxOf } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { RecognizedQueries } from '../../../query/index';
import { IGeneralHtmlAPI } from '../../../api/abstract/html';


export interface HtmlModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:IAppServices;
    service:IGeneralHtmlAPI<{}>;
    initState:HtmlModelState;
    queryMatches:RecognizedQueries;
}


export class HtmlModel extends StatelessModel<HtmlModelState> {

    private readonly queryMatches:RecognizedQueries;

    private readonly service:IGeneralHtmlAPI<{}>;

    private readonly appServices:IAppServices;

    private readonly tileId:number;

    constructor({dispatcher, tileId, appServices, service, initState, queryMatches}:HtmlModelArgs) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.appServices = appServices;
        this.service = service;
        this.queryMatches = queryMatches;

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
            },
            (state, action, seDispatch) => {
                const variant = findCurrQueryMatch(this.queryMatches[0]);
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
        (variant ?
            this.service.call(this.service.stateToArgs(state, variant)) :
            rxOf(null)

        ).pipe(
            concatMap(
                (ans:string) => new Observable<string|null>((observer) => {
                    if (ans === null) {
                        observer.next(null);
                        observer.complete();

                    } else if (state.sanitizeHTML) {
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
                    } else {
                        observer.next(ans);
                        observer.complete();
                    }
                })
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