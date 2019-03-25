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
import * as Immutable from 'immutable';
import { Action, ActionDispatcher, SEDispatcher, StatelessModel } from 'kombo';
import { Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { AppServices } from '../../appServices';
import { ConcApi, Line, PCRequestArgs, RequestArgs } from '../../common/api/kontext/concordance';
import { ConcordanceMinState, stateToArgs } from '../../common/models/concordance';
import { Backlink, BacklinkWithArgs, HTTPMethod, SystemMessageType, isSubqueryPayload } from '../../common/types';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { findCurrLemmaVariant, WdglanceMainFormModel } from '../../models/query';
import { importMessageType } from '../../notifications';
import { ActionName, Actions, ConcLoadedPayload } from './actions';



export interface BacklinkArgs {
    corpname:string;
    usesubcorp:string;
    q:string;
}


export interface ConcordanceTileState extends ConcordanceMinState {
    isBusy:boolean;
    error:string|null;
    isTweakMode:boolean;
    isMobile:boolean;
    widthFract:number;
    lines:Immutable.List<Line>;
    currPage:number;
    fullsize:number;
    concsize:number;
    numPages:number;
    resultARF:number;
    resultIPM:number;
    initialKwicLeftCtx:number;
    initialKwicRightCtx:number;
    backlink:BacklinkWithArgs<BacklinkArgs>;
}


export interface ConcordanceTileModelArgs {
    dispatcher:ActionDispatcher;
    tileId:number;
    waitForTile:number;
    appServices:AppServices;
    service:ConcApi;
    mainForm:WdglanceMainFormModel;
    initState:ConcordanceTileState;
    backlink:Backlink;
}


export class ConcordanceTileModel extends StatelessModel<ConcordanceTileState> {

    private readonly service:ConcApi;

    private readonly mainForm:WdglanceMainFormModel;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly backlink:Backlink;

    private readonly waitForTile:number;

    public static readonly CTX_SIZES = [3, 3, 8, 12];

    constructor({dispatcher, tileId, appServices, service, mainForm, initState, waitForTile, backlink}:ConcordanceTileModelArgs) {
        super(dispatcher, initState);
        this.service = service;
        this.mainForm = mainForm;
        this.appServices = appServices;
        this.tileId = tileId;
        this.backlink = backlink;
        this.waitForTile = waitForTile;
        this.actionMatch = {
            [GlobalActionName.SetScreenMode]: (state, action:GlobalActions.SetScreenMode) => {
                if (action.payload.isMobile !== state.isMobile) {
                    const newState = this.copyState(state);
                    newState.isMobile = action.payload.isMobile;
                    if (action.payload.isMobile) {
                        newState.kwicLeftCtx = ConcordanceTileModel.CTX_SIZES[0];
                        newState.kwicRightCtx = ConcordanceTileModel.CTX_SIZES[0];

                    } else {
                        newState.kwicLeftCtx = newState.initialKwicLeftCtx;
                        newState.kwicRightCtx = newState.initialKwicRightCtx;
                    }
                    return newState;
                }
                return state;
            },
            [GlobalActionName.EnableTileTweakMode]: (state, action:GlobalActions.EnableTileTweakMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isTweakMode = true;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.DisableTileTweakMode]: (state, action:GlobalActions.DisableTileTweakMode) => {
                if (action.payload.ident === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isTweakMode = false;
                    return newState;
                }
                return state;
            },
            [GlobalActionName.RequestQueryResponse]: (state, action) => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                newState.concId = null;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<ConcLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.error = action.error.message;

                    } else {
                        // debug:
                        action.payload.data.messages.forEach(msg => console.log(`${importMessageType(msg[0]).toUpperCase()}: conc - ${msg[1]}`));

                        newState.lines = Immutable.List<Line>(action.payload.data.Lines);
                        newState.concsize = action.payload.data.concsize; // TODO fullsize?
                        newState.resultARF = action.payload.data.result_arf;
                        newState.resultIPM = action.payload.data.result_relative_freq;
                        newState.currPage = newState.loadPage;
                        newState.numPages = Math.ceil(newState.concsize / newState.pageSize);
                        newState.backlink = this.createBackLink(state, action);
                        newState.concId = action.payload.data.conc_persistence_op_id;
                    }
                    return newState;
                }
                return state;
            },
            [ActionName.LoadNextPage]: (state, action:Actions.LoadNextPage) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    newState.error = null;
                    newState.loadPage = newState.currPage + 1;
                    return newState;
                }
                return state;
            },
            [ActionName.LoadPrevPage]: (state, action:Actions.LoadNextPage) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.currPage - 1 > 0) {
                        const newState = this.copyState(state);
                        newState.isBusy = true;
                        newState.error = null;
                        newState.loadPage = newState.currPage - 1;
                        return newState;

                    } else {
                        this.appServices.showMessage(SystemMessageType.ERROR, 'Cannot load page < 1');
                    }
                }
                return state;
            },
            [ActionName.SetViewMode]: (state, action:Actions.SetViewMode) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = true;
                    newState.error = null;
                    newState.viewMode = action.payload.mode;
                    return newState;
                }
                return state;
            }
        };
    }

    private createBackLink(state:ConcordanceTileState, action:GlobalActions.TileDataLoaded<ConcLoadedPayload>):BacklinkWithArgs<BacklinkArgs> {
        return this.backlink ?
            {
                url: this.backlink.url,
                method: this.backlink.method || HTTPMethod.GET,
                label: this.backlink.label,
                args: {
                    corpname: state.corpname,
                    usesubcorp: state.subcname,
                    q: `~${action.payload.data.conc_persistence_op_id}`
                }
            } :
            null;
    }

    private reloadData(state:ConcordanceTileState, dispatch:SEDispatcher, otherLangCql:string):void {
        const formState = this.mainForm.getState();
        new Observable<RequestArgs|PCRequestArgs>((observer) => {
            try {
                observer.next(stateToArgs(state, state.concId ? null : findCurrLemmaVariant(formState.lemmas), otherLangCql));
                observer.complete();

            } catch (e) {
                observer.error(e);
            }

        }).pipe(
            concatMap(args => this.service.call(args))
        )
        .subscribe(
            (data) => {
                dispatch<GlobalActions.TileDataLoaded<ConcLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: data.Lines.length === 0,
                        data: data
                    }
                });
            },
            (err) => {
                console.error(err);
                dispatch<GlobalActions.TileDataLoaded<ConcLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        data: null
                    }
                });
            }
        );
    }

    sideEffects(state:ConcordanceTileState, action:Action, dispatch:SEDispatcher):void {
        switch(action.name) {
            case GlobalActionName.RequestQueryResponse:
                if (this.waitForTile) {
                    this.suspend(
                        (action) => {
                            if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile &&
                                    isSubqueryPayload(action.payload)) {
                                const cql = `[word="${action.payload.subqueries.map(v => v.value).join('|')}"]`; // TODO escape
                                this.reloadData(state, dispatch, cql);
                                return true;
                            }
                            return false;
                        }
                    );
                } else {
                    this.reloadData(state, dispatch, null);
                }
            break;
            case ActionName.LoadNextPage:
            case ActionName.LoadPrevPage:
            case ActionName.SetViewMode:
                if (action.payload['tileId'] === this.tileId) {
                    this.reloadData(state, dispatch, null);
                }
            break;
            case GlobalActionName.SetScreenMode:
                if (state.lines.size > 0) {
                    this.reloadData(state, dispatch, null);
                }
            break;
        }
    }
}